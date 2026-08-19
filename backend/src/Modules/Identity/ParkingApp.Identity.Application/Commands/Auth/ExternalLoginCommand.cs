using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParkingApp.Application.CQRS;
using ParkingApp.Application.DTOs;
using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.ExternalAuth;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Entities;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Identity.Domain.Interfaces;

namespace ParkingApp.Identity.Application.Commands.Auth;

// ═══════════════════════════════════════════════════════════════════════════════
// Commands / Queries
// ═══════════════════════════════════════════════════════════════════════════════

public sealed record ExternalLoginCommand(ExternalLoginDto Dto)
    : ICommand<ApiResponse<ExternalAuthSessionDto>>;

public sealed record GetExternalProvidersQuery
    : IQuery<ApiResponse<ExternalProvidersDto>>;

// ═══════════════════════════════════════════════════════════════════════════════
// Handlers
// ═══════════════════════════════════════════════════════════════════════════════

internal sealed class ExternalLoginHandler
    : ICommandHandler<ExternalLoginCommand, ApiResponse<ExternalAuthSessionDto>>
{
    private readonly IIdentityUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IExternalTokenValidator _tokenValidator;
    private readonly ILinkPasswordAttemptTracker _linkPasswordAttempts;
    private readonly IOptionsMonitor<ExternalAuthOptions> _options;
    private readonly ILogger<ExternalLoginHandler> _logger;

    public ExternalLoginHandler(
        IIdentityUnitOfWork unitOfWork,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        IExternalTokenValidator tokenValidator,
        ILinkPasswordAttemptTracker linkPasswordAttempts,
        IOptionsMonitor<ExternalAuthOptions> options,
        ILogger<ExternalLoginHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _tokenValidator = tokenValidator;
        _linkPasswordAttempts = linkPasswordAttempts;
        _options = options;
        _logger = logger;
    }

    public async Task<ApiResponse<ExternalAuthSessionDto>> HandleAsync(
        ExternalLoginCommand command,
        CancellationToken cancellationToken = default)
    {
        var dto = command.Dto;
        var options = _options.CurrentValue;

        if (!options.Enabled)
        {
            return Fail("provider_disabled", "External authentication is disabled");
        }

        if (!ExternalAuthProviderParser.TryParse(dto.Provider, out var provider))
        {
            return Fail("invalid_provider", "Unknown or unsupported identity provider");
        }

        if (!IsProviderEnabled(options, provider))
        {
            return Fail("provider_disabled", $"{provider} sign-in is not enabled");
        }

        // Apple nonce is required; Google ignores nonce.
        if (provider == ExternalAuthProvider.Apple && string.IsNullOrWhiteSpace(dto.Nonce))
        {
            return Fail("nonce_required", "Nonce is required for Apple Sign-In");
        }

        var validation = await _tokenValidator.ValidateAsync(
            provider, dto.IdToken, dto.Nonce, cancellationToken);

        if (!validation.Success || validation.Identity is null)
        {
            var code = validation.ErrorCode ?? "invalid_id_token";
            LogOutcome(provider, "fail", code, userId: null, isNewUser: null);
            // Never reveal email existence on invalid tokens (KD-SL-23)
            if (string.Equals(code, "idp_unavailable", StringComparison.OrdinalIgnoreCase))
            {
                return new ApiResponse<ExternalAuthSessionDto>(
                    false,
                    validation.ErrorMessage ?? "Identity provider is temporarily unavailable",
                    null,
                    new List<string> { code },
                    code);
            }

            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Invalid or expired identity token",
                null,
                new List<string> { "invalid_id_token" },
                "invalid_id_token");
        }

        var identity = validation.Identity;
        if (string.IsNullOrWhiteSpace(identity.Subject))
        {
            LogOutcome(provider, "fail", "invalid_id_token", null, null);
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Invalid or expired identity token",
                null,
                new List<string> { "invalid_id_token" },
                "invalid_id_token");
        }

        try
        {
            return await ProcessIdentityAsync(dto, provider, identity, cancellationToken);
        }
        catch (Exception ex) when (IsUniqueConstraintViolation(ex))
        {
            // Concurrent create race: discard failed trackers, reload, re-apply gates, mint as login
            _logger.LogInformation(
                "External auth unique constraint race Provider={Provider} — reloading",
                provider);

            _unitOfWork.ClearChangeTracker();

            var raced = await _unitOfWork.Users.GetByExternalLoginAsync(
                provider, identity.Subject, cancellationToken);

            if (raced is not null)
            {
                var gate = GateUser(raced);
                if (gate is not null)
                {
                    LogOutcome(provider, "fail", gate.Code!, raced.Id, false);
                    return gate;
                }

                return await MintAsync(raced, provider, identity, isNewUser: false, cancellationToken);
            }

            // Email collision without this link → account_exists
            // Include soft-deleted: IX_Users_Email still holds those emails.
            if (!string.IsNullOrWhiteSpace(identity.Email))
            {
                var byEmail = await _unitOfWork.Users.GetByEmailIncludingDeletedAsync(
                    identity.Email.Trim().ToLowerInvariant(), cancellationToken);
                if (byEmail is not null)
                {
                    if (byEmail.IsDeleted)
                    {
                        LogOutcome(provider, "fail", "account_exists", byEmail.Id, false);
                        return AccountExists();
                    }

                    var gate = GateUser(byEmail);
                    if (gate is not null)
                    {
                        LogOutcome(provider, "fail", gate.Code!, byEmail.Id, false);
                        return gate;
                    }

                    LogOutcome(provider, "fail", "account_exists", byEmail.Id, false);
                    return AccountExists();
                }
            }

            // Fail closed: unique violation on create without a resolvable row must not 500.
            // Most common leftover: email unique race / soft-delete edge the lookup missed.
            if (!string.IsNullOrWhiteSpace(identity.Email))
            {
                LogOutcome(provider, "fail", "account_exists", null, false);
                return AccountExists();
            }

            throw;
        }
    }

    private async Task<ApiResponse<ExternalAuthSessionDto>> ProcessIdentityAsync(
        ExternalLoginDto dto,
        ExternalAuthProvider provider,
        ExternalIdentity identity,
        CancellationToken cancellationToken)
    {
        // 1) Known (provider, subject)
        var user = await _unitOfWork.Users.GetByExternalLoginAsync(
            provider, identity.Subject, cancellationToken);

        if (user is not null)
        {
            // KD-SL-24: active + non-admin gates BEFORE LastUsedAt / mint
            var gate = GateUser(user);
            if (gate is not null)
            {
                LogOutcome(provider, "fail", gate.Code!, user.Id, false);
                return gate;
            }

            return await MintAsync(user, provider, identity, isNewUser: false, cancellationToken);
        }

        // 2) No existing link — create or collide
        if (string.IsNullOrWhiteSpace(identity.Email))
        {
            LogOutcome(provider, "fail", "email_required", null, null);
            return Fail("email_required", "Email is required from the identity provider");
        }

        if (!identity.EmailVerified)
        {
            LogOutcome(provider, "fail", "email_not_verified", null, null);
            return Fail("email_not_verified", "Email must be verified by the identity provider");
        }

        var email = identity.Email.Trim().ToLowerInvariant();
        // Include soft-deleted: unique index still blocks re-create for those emails.
        var existing = await _unitOfWork.Users.GetByEmailIncludingDeletedAsync(email, cancellationToken);

        if (existing is not null)
        {
            // Soft-deleted holds the email slot — do not create, link, or mint
            if (existing.IsDeleted)
            {
                LogOutcome(provider, "fail", "account_exists", existing.Id, false);
                return AccountExists();
            }

            // Gate BEFORE any link insert or password side effects (KD-SL-24)
            var gate = GateUser(existing);
            if (gate is not null)
            {
                LogOutcome(provider, "fail", gate.Code!, existing.Id, false);
                return gate;
            }

            // Password-proof link (PR3)
            if (!string.IsNullOrEmpty(dto.LinkPassword))
            {
                return await TryLinkWithPasswordAsync(
                    existing, provider, identity, dto.LinkPassword, email, cancellationToken);
            }

            // Step-up: already-linked provider proves ownership (passwordless multi-provider)
            if (!string.IsNullOrWhiteSpace(dto.ProofProvider) && !string.IsNullOrWhiteSpace(dto.ProofIdToken))
            {
                return await TryLinkWithStepUpAsync(
                    existing, provider, identity, dto, cancellationToken);
            }

            LogOutcome(provider, "fail", "account_exists", existing.Id, false);
            return AccountExists();
        }

        // 3) Brand-new user
        var firstName = dto.FirstName ?? identity.FirstName;
        var lastName = dto.LastName ?? identity.LastName;
        var newUser = User.RegisterFromExternal(
            email,
            firstName,
            lastName,
            phoneNumber: null,
            emailVerified: identity.EmailVerified);

        newUser.LinkExternalLogin(provider, identity.Subject, identity.Email);

        await _unitOfWork.Users.AddAsync(newUser, cancellationToken);

        // Mint after add (still need SaveChanges once with refresh token updates)
        return await MintAsync(newUser, provider, identity, isNewUser: true, cancellationToken);
    }

    private async Task<ApiResponse<ExternalAuthSessionDto>> TryLinkWithPasswordAsync(
        User existing,
        ExternalAuthProvider provider,
        ExternalIdentity identity,
        string linkPassword,
        string emailNormalized,
        CancellationToken cancellationToken)
    {
        // Passwordless accounts cannot use linkPassword — sign in with existing provider then authenticated link
        if (!existing.HasPassword)
        {
            LogOutcome(provider, "fail", "account_exists", existing.Id, false);
            return AccountExistsPasswordless();
        }

        // email_verified required for any new bind (already checked for create path; re-assert)
        if (!identity.EmailVerified)
        {
            LogOutcome(provider, "fail", "email_not_verified", existing.Id, false);
            return Fail("email_not_verified", "Email must be verified by the identity provider");
        }

        if (_linkPasswordAttempts.IsLimited(emailNormalized))
        {
            LogOutcome(provider, "fail", "rate_limited", existing.Id, false);
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Too many failed link attempts. Please try again later.",
                null,
                new List<string> { "rate_limited" },
                "rate_limited");
        }

        if (!_passwordHasher.Verify(linkPassword, existing.PasswordHash))
        {
            _linkPasswordAttempts.RecordFailure(emailNormalized);
            LogOutcome(provider, "fail", "invalid_credentials", existing.Id, false);
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Invalid credentials",
                null,
                new List<string> { "invalid_credentials" },
                "invalid_credentials");
        }

        _linkPasswordAttempts.RecordSuccess(emailNormalized);

        var attach = await AttachProviderIfNeededAsync(existing, provider, identity, cancellationToken);
        if (attach is not null)
        {
            LogOutcome(provider, "fail", attach.Code!, existing.Id, false);
            return attach;
        }

        _unitOfWork.Users.Update(existing);
        return await MintAsync(existing, provider, identity, isNewUser: false, cancellationToken);
    }

    private async Task<ApiResponse<ExternalAuthSessionDto>> TryLinkWithStepUpAsync(
        User existing,
        ExternalAuthProvider newProvider,
        ExternalIdentity newIdentity,
        ExternalLoginDto dto,
        CancellationToken cancellationToken)
    {
        if (!ExternalAuthProviderParser.TryParse(dto.ProofProvider, out var proofProvider))
        {
            return Fail("invalid_provider", "Unknown or unsupported proof identity provider");
        }

        if (proofProvider == ExternalAuthProvider.Apple && string.IsNullOrWhiteSpace(dto.ProofNonce))
        {
            return Fail("nonce_required", "Nonce is required for Apple Sign-In proof");
        }

        if (!newIdentity.EmailVerified)
        {
            LogOutcome(newProvider, "fail", "email_not_verified", existing.Id, false);
            return Fail("email_not_verified", "Email must be verified by the identity provider");
        }

        var proofValidation = await _tokenValidator.ValidateAsync(
            proofProvider, dto.ProofIdToken!, dto.ProofNonce, cancellationToken);

        if (!proofValidation.Success || proofValidation.Identity is null
            || string.IsNullOrWhiteSpace(proofValidation.Identity.Subject))
        {
            LogOutcome(newProvider, "fail", "invalid_id_token", existing.Id, false);
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Invalid or expired identity token",
                null,
                new List<string> { "invalid_id_token" },
                "invalid_id_token");
        }

        var proofSubject = proofValidation.Identity.Subject.Trim();
        var existingLogins = await _unitOfWork.ExternalLogins.GetByUserIdAsync(existing.Id, cancellationToken);
        var proofLinked = existingLogins.Any(l =>
            l.Provider == proofProvider
            && string.Equals(l.ProviderSubject, proofSubject, StringComparison.Ordinal));

        if (!proofLinked)
        {
            // Do not leak whether email exists with a different proof shape
            LogOutcome(newProvider, "fail", "invalid_credentials", existing.Id, false);
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Invalid credentials",
                null,
                new List<string> { "invalid_credentials" },
                "invalid_credentials");
        }

        var attach = await AttachProviderIfNeededAsync(existing, newProvider, newIdentity, cancellationToken);
        if (attach is not null)
        {
            LogOutcome(newProvider, "fail", attach.Code!, existing.Id, false);
            return attach;
        }

        _unitOfWork.Users.Update(existing);
        return await MintAsync(existing, newProvider, newIdentity, isNewUser: false, cancellationToken);
    }

    /// <summary>
    /// Links provider if not already present. Returns failure or null when ready to mint.
    /// Hydrates <see cref="User.ExternalLogins"/> for mint LastUsedAt updates.
    /// </summary>
    private async Task<ApiResponse<ExternalAuthSessionDto>?> AttachProviderIfNeededAsync(
        User user,
        ExternalAuthProvider provider,
        ExternalIdentity identity,
        CancellationToken cancellationToken)
    {
        var subject = identity.Subject.Trim();
        var owned = await _unitOfWork.ExternalLogins.GetByProviderSubjectAsync(
            provider, subject, cancellationToken);

        if (owned is not null && owned.UserId != user.Id)
        {
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "This identity is already linked to another account",
                null,
                new List<string> { "provider_already_linked" },
                "provider_already_linked");
        }

        var userLogins = await _unitOfWork.ExternalLogins.GetByUserIdAsync(user.Id, cancellationToken);
        foreach (var login in userLogins)
        {
            if (!user.ExternalLogins.Any(l => l.Id == login.Id))
                user.ExternalLogins.Add(login);
        }

        if (owned is not null && owned.UserId == user.Id)
        {
            // Already linked — mint only
            return null;
        }

        if (userLogins.Any(l => l.Provider == provider))
        {
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "This provider is already linked to the account",
                null,
                new List<string> { "provider_already_linked" },
                "provider_already_linked");
        }

        user.LinkExternalLogin(provider, subject, identity.Email);
        return null;
    }

    private static ApiResponse<ExternalAuthSessionDto> AccountExistsPasswordless() =>
        new(
            false,
            "An account with this email already exists and uses social sign-in. Sign in with your existing provider, then link this provider in account settings.",
            null,
            new List<string> { "account_exists" },
            "account_exists");

    private async Task<ApiResponse<ExternalAuthSessionDto>> MintAsync(
        User user,
        ExternalAuthProvider provider,
        ExternalIdentity identity,
        bool isNewUser,
        CancellationToken cancellationToken)
    {
        // Update LastUsedAt / ProviderEmail only after gates passed
        var login = user.ExternalLogins.FirstOrDefault(l =>
            l.Provider == provider
            && string.Equals(l.ProviderSubject, identity.Subject.Trim(), StringComparison.Ordinal)
            && !l.IsDeleted);

        if (login is not null)
        {
            login.RecordUse();
            login.UpdateProviderEmail(identity.Email);
        }

        // ALWAYS Marketplace (KD-SL-2)
        var channel = ProductChannel.Marketplace;
        var accessToken = _tokenService.GenerateAccessToken(user, channel);
        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RecordLogin(refreshToken, _tokenService.CreateRefreshTokenExpiryUtc());
        user.BindSession(channel);

        if (!isNewUser)
            _unitOfWork.Users.Update(user);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var linked = await ResolveLinkedProvidersAsync(user, cancellationToken);

        var session = AuthTokenDtoFactory.Create(
            accessToken,
            refreshToken,
            user,
            channel,
            accessTokenExpirationMinutes: _tokenService.AccessTokenExpirationMinutes);

        var payload = new ExternalAuthSessionDto
        {
            Session = session,
            IsNewUser = isNewUser,
            RequiresPhone = string.IsNullOrWhiteSpace(user.PhoneNumber),
            LinkedProviders = linked
        };

        LogOutcome(provider, "success", null, user.Id, isNewUser);
        return new ApiResponse<ExternalAuthSessionDto>(true, "Login successful", payload);
    }

    private async Task<IReadOnlyList<string>> ResolveLinkedProvidersAsync(
        User user,
        CancellationToken cancellationToken)
    {
        // Prefer in-memory navigation; fall back to repo if empty (new user has in-memory list)
        if (user.ExternalLogins.Count > 0)
        {
            return user.ExternalLogins
                .Where(l => !l.IsDeleted)
                .Select(l => ExternalAuthProviderParser.ToWireName(l.Provider))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        var rows = await _unitOfWork.ExternalLogins.GetByUserIdAsync(user.Id, cancellationToken);
        return rows
            .Select(l => ExternalAuthProviderParser.ToWireName(l.Provider))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>
    /// Active + non-admin gates with zero side effects (KD-SL-24). Returns failure response or null if OK.
    /// </summary>
    private static ApiResponse<ExternalAuthSessionDto>? GateUser(User user)
    {
        if (user.Role == UserRole.Admin)
        {
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Admin accounts cannot use social login",
                null,
                new List<string> { "admin_social_forbidden" },
                "admin_social_forbidden");
        }

        if (!user.IsActive)
        {
            return new ApiResponse<ExternalAuthSessionDto>(
                false,
                "Account disabled",
                null,
                new List<string> { "account_disabled" },
                "account_disabled");
        }

        return null;
    }

    private static ApiResponse<ExternalAuthSessionDto> AccountExists() =>
        new(
            false,
            "An account with this email already exists. Sign in with your existing method, then link this provider in account settings.",
            null,
            new List<string> { "account_exists" },
            "account_exists");

    private static ApiResponse<ExternalAuthSessionDto> Fail(string code, string message) =>
        new(false, message, null, new List<string> { code }, code);

    private static bool IsProviderEnabled(ExternalAuthOptions options, ExternalAuthProvider provider)
    {
        if (!options.Providers.TryGetValue(provider.ToString(), out var providerOptions))
            return false;
        return providerOptions.Enabled;
    }

    private void LogOutcome(
        ExternalAuthProvider provider,
        string outcome,
        string? errorCode,
        Guid? userId,
        bool? isNewUser)
    {
        // Structured fields for Serilog; never log tokens
        _logger.LogInformation(
            "ExternalAuth Provider={Provider} Outcome={Outcome} ErrorCode={ErrorCode} UserId={UserId} IsNewUser={IsNewUser}",
            provider,
            outcome,
            errorCode,
            userId,
            isNewUser);
    }

    /// <summary>
    /// Detect unique index violations (Postgres 23505 / EF DbUpdateException) without a hard EF dependency.
    /// </summary>
    internal static bool IsUniqueConstraintViolation(Exception ex)
    {
        for (Exception? current = ex; current is not null; current = current.InnerException)
        {
            var typeName = current.GetType().FullName ?? string.Empty;
            if (typeName.Contains("PostgresException", StringComparison.Ordinal))
            {
                var sqlState = current.GetType().GetProperty("SqlState")?.GetValue(current) as string;
                if (sqlState == "23505")
                    return true;
            }

            if (typeName.Contains("DbUpdateException", StringComparison.Ordinal))
            {
                // Inspect nested causes; also accept common message patterns
            }

            var message = current.Message ?? string.Empty;
            if (message.Contains("23505", StringComparison.Ordinal)
                || message.Contains("unique constraint", StringComparison.OrdinalIgnoreCase)
                || message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)
                || message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}

internal sealed class GetExternalProvidersHandler
    : IQueryHandler<GetExternalProvidersQuery, ApiResponse<ExternalProvidersDto>>
{
    private readonly IOptionsMonitor<ExternalAuthOptions> _options;

    public GetExternalProvidersHandler(IOptionsMonitor<ExternalAuthOptions> options)
    {
        _options = options;
    }

    public Task<ApiResponse<ExternalProvidersDto>> HandleAsync(
        GetExternalProvidersQuery query,
        CancellationToken cancellationToken = default)
    {
        var options = _options.CurrentValue;
        if (!options.Enabled)
        {
            return Task.FromResult(new ApiResponse<ExternalProvidersDto>(
                true,
                null,
                new ExternalProvidersDto { Providers = Array.Empty<string>() }));
        }

        var names = new List<string>();
        foreach (var provider in Enum.GetValues<ExternalAuthProvider>())
        {
            if (options.Providers.TryGetValue(provider.ToString(), out var po) && po.Enabled)
                names.Add(provider.ToString());
        }

        names.Sort(StringComparer.OrdinalIgnoreCase);

        return Task.FromResult(new ApiResponse<ExternalProvidersDto>(
            true,
            null,
            new ExternalProvidersDto { Providers = names }));
    }
}
