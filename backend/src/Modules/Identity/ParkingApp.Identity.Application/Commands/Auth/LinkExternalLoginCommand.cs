using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParkingApp.Application.Caching;
using ParkingApp.Application.CQRS;
using ParkingApp.Application.DTOs;
using ParkingApp.Application.Interfaces;
using ParkingApp.BuildingBlocks.Exceptions;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.ExternalAuth;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Entities;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Identity.Domain.Interfaces;

namespace ParkingApp.Identity.Application.Commands.Auth;

public sealed record LinkExternalLoginCommand(Guid UserId, LinkExternalLoginDto Dto)
    : ICommand<ApiResponse<LinkExternalLoginResultDto>>;

internal sealed class LinkExternalLoginHandler
    : ICommandHandler<LinkExternalLoginCommand, ApiResponse<LinkExternalLoginResultDto>>
{
    private readonly IIdentityUnitOfWork _unitOfWork;
    private readonly IExternalTokenValidator _tokenValidator;
    private readonly IOptionsMonitor<ExternalAuthOptions> _options;
    private readonly ICacheService _cache;
    private readonly ILogger<LinkExternalLoginHandler> _logger;

    public LinkExternalLoginHandler(
        IIdentityUnitOfWork unitOfWork,
        IExternalTokenValidator tokenValidator,
        IOptionsMonitor<ExternalAuthOptions> options,
        ICacheService cache,
        ILogger<LinkExternalLoginHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _tokenValidator = tokenValidator;
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    public async Task<ApiResponse<LinkExternalLoginResultDto>> HandleAsync(
        LinkExternalLoginCommand command,
        CancellationToken cancellationToken = default)
    {
        var options = _options.CurrentValue;
        if (!options.Enabled)
            return Fail("provider_disabled", "External authentication is disabled");

        if (!ExternalAuthProviderParser.TryParse(command.Dto.Provider, out var provider))
            return Fail("invalid_provider", "Unknown or unsupported identity provider");

        if (!IsProviderEnabled(options, provider))
            return Fail("provider_disabled", $"{provider} sign-in is not enabled");

        if (provider == ExternalAuthProvider.Apple && string.IsNullOrWhiteSpace(command.Dto.Nonce))
            return Fail("nonce_required", "Nonce is required for Apple Sign-In");

        var user = await _unitOfWork.Users.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
            return Fail("account_disabled", "User not found");

        // KD-SL-24: inactive before any write
        if (!user.IsActive)
        {
            _logger.LogInformation(
                "ExternalAuth Link Outcome=fail ErrorCode=account_disabled UserId={UserId}",
                user.Id);
            return Fail("account_disabled", "Account disabled");
        }

        if (user.Role == UserRole.Admin)
        {
            return Fail("admin_social_forbidden", "Admin accounts cannot link social providers");
        }

        var validation = await _tokenValidator.ValidateAsync(
            provider, command.Dto.IdToken, command.Dto.Nonce, cancellationToken);

        if (!validation.Success || validation.Identity is null
            || string.IsNullOrWhiteSpace(validation.Identity.Subject))
        {
            var code = validation.ErrorCode ?? "invalid_id_token";
            if (string.Equals(code, "idp_unavailable", StringComparison.OrdinalIgnoreCase))
                return Fail("idp_unavailable", validation.ErrorMessage ?? "Identity provider is temporarily unavailable");

            return Fail("invalid_id_token", "Invalid or expired identity token");
        }

        var identity = validation.Identity;

        // When IdP returns email: must be verified and must match current user (never overwrite)
        if (!string.IsNullOrWhiteSpace(identity.Email))
        {
            if (!identity.EmailVerified)
                return Fail("email_not_verified", "Email must be verified by the identity provider");

            if (!string.Equals(
                    identity.Email.Trim(),
                    user.Email.Value,
                    StringComparison.OrdinalIgnoreCase))
            {
                return Fail("email_mismatch", "Provider email does not match the signed-in account");
            }
        }
        // Empty email: allow link with uniqueness checks only (Apple private relay edge cases)

        var subject = identity.Subject.Trim();
        var owned = await _unitOfWork.ExternalLogins.GetByProviderSubjectAsync(
            provider, subject, cancellationToken);

        if (owned is not null && owned.UserId != user.Id)
        {
            return Fail("provider_already_linked", "This identity is already linked to another account");
        }

        var userLogins = await _unitOfWork.ExternalLogins.GetByUserIdAsync(user.Id, cancellationToken);
        foreach (var login in userLogins)
        {
            if (!user.ExternalLogins.Any(l => l.Id == login.Id))
                user.ExternalLogins.Add(login);
        }

        if (owned is not null && owned.UserId == user.Id)
        {
            // Already linked — no-op success
            return Success(userLogins);
        }

        if (userLogins.Any(l => l.Provider == provider))
        {
            return Fail("provider_already_linked", "This provider is already linked to the account");
        }

        try
        {
            user.LinkExternalLogin(provider, subject, identity.Email);
        }
        catch (BusinessRuleException)
        {
            return Fail("provider_already_linked", "This provider is already linked to the account");
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await CacheInvalidation.ForUserChangeAsync(_cache, user.Id, cancellationToken);

        var linked = await _unitOfWork.ExternalLogins.GetByUserIdAsync(user.Id, cancellationToken);
        _logger.LogInformation(
            "ExternalAuth Link Outcome=success Provider={Provider} UserId={UserId}",
            provider, user.Id);

        return Success(linked);
    }

    private static ApiResponse<LinkExternalLoginResultDto> Success(IReadOnlyList<UserExternalLogin> logins)
    {
        var names = logins
            .Select(l => ExternalAuthProviderParser.ToWireName(l.Provider))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ApiResponse<LinkExternalLoginResultDto>(
            true,
            "Provider linked",
            new LinkExternalLoginResultDto { LinkedProviders = names });
    }

    private static ApiResponse<LinkExternalLoginResultDto> Fail(string code, string message) =>
        new(false, message, null, new List<string> { code }, code);

    private static bool IsProviderEnabled(ExternalAuthOptions options, ExternalAuthProvider provider)
    {
        if (!options.Providers.TryGetValue(provider.ToString(), out var providerOptions))
            return false;
        return providerOptions.Enabled;
    }
}
