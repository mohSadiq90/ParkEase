using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// Validates Google ID tokens via Google JWKS (<see cref="GoogleJsonWebSignature"/>).
/// Audience must match configured ClientIds. Fail-closed on any validation error.
/// </summary>
internal sealed class GoogleExternalTokenValidator : IExternalTokenValidator
{
    private readonly IOptionsMonitor<ExternalAuthOptions> _options;
    private readonly ILogger<GoogleExternalTokenValidator> _logger;

    public GoogleExternalTokenValidator(
        IOptionsMonitor<ExternalAuthOptions> options,
        ILogger<GoogleExternalTokenValidator> logger)
    {
        _options = options;
        _logger = logger;
    }

    public async Task<ExternalTokenValidationResult> ValidateAsync(
        ExternalAuthProvider provider,
        string idToken,
        string? nonce = null,
        CancellationToken cancellationToken = default)
    {
        if (provider != ExternalAuthProvider.Google)
        {
            return ExternalTokenValidationResult.Fail(
                "invalid_provider",
                $"Provider {provider} is not handled by Google validator");
        }

        if (string.IsNullOrWhiteSpace(idToken))
        {
            return ExternalTokenValidationResult.Fail("invalid_id_token", "Id token is empty");
        }

        var google = GetGoogleOptions();
        var clientIds = google?.ClientIds?
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList() ?? new List<string>();

        if (clientIds.Count == 0)
        {
            _logger.LogWarning("Google external auth has no ClientIds configured");
            return ExternalTokenValidationResult.Fail(
                "provider_disabled",
                "Google client IDs are not configured");
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = clientIds,
                // Library default clock skew is fine; design allows ≤ 5 minutes
            };

            // ValidateAsync fetches JWKS (cached by library). Throws on failure.
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings)
                .ConfigureAwait(false);

            if (payload is null || string.IsNullOrWhiteSpace(payload.Subject))
            {
                return ExternalTokenValidationResult.Fail("invalid_id_token");
            }

            // Issuer: accounts.google.com or https://accounts.google.com (library checks)
            var emailVerified = payload.EmailVerified;
            // GoogleJsonWebSignature uses EmailVerified as bool

            return ExternalTokenValidationResult.Ok(new ExternalIdentity(
                Provider: ExternalAuthProvider.Google,
                Subject: payload.Subject,
                Email: payload.Email,
                EmailVerified: emailVerified,
                FirstName: payload.GivenName,
                LastName: payload.FamilyName,
                PictureUrl: payload.Picture));
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(ex, "Google id_token validation failed");
            return ExternalTokenValidationResult.Fail("invalid_id_token", ex.Message);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Google JWKS unreachable");
            return ExternalTokenValidationResult.Fail(
                "idp_unavailable",
                "Unable to reach identity provider for token validation");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Google id_token validation unexpected failure");
            return ExternalTokenValidationResult.Fail("invalid_id_token");
        }
    }

    private ExternalProviderOptions? GetGoogleOptions()
    {
        var options = _options.CurrentValue;
        if (options.Providers.TryGetValue(nameof(ExternalAuthProvider.Google), out var google))
            return google;
        return null;
    }
}
