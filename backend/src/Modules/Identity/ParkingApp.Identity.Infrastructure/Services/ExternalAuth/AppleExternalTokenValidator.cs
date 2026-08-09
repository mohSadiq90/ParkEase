using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// Validates Apple Sign-In identity tokens via Apple JWKS (KD-SL-10).
/// Requires client <paramref name="nonce"/> and matches the token <c>nonce</c> claim
/// against SHA-256(raw nonce) (hex or base64url) or the raw value.
/// </summary>
internal sealed class AppleExternalTokenValidator : IExternalTokenValidator
{
    public const string AppleIssuer = "https://appleid.apple.com";
    private static readonly TimeSpan ClockSkew = TimeSpan.FromMinutes(5);

    private readonly IOptionsMonitor<ExternalAuthOptions> _options;
    private readonly IAppleJwksKeyProvider _keyProvider;
    private readonly ILogger<AppleExternalTokenValidator> _logger;

    public AppleExternalTokenValidator(
        IOptionsMonitor<ExternalAuthOptions> options,
        IAppleJwksKeyProvider keyProvider,
        ILogger<AppleExternalTokenValidator> logger)
    {
        _options = options;
        _keyProvider = keyProvider;
        _logger = logger;
    }

    public async Task<ExternalTokenValidationResult> ValidateAsync(
        ExternalAuthProvider provider,
        string idToken,
        string? nonce = null,
        CancellationToken cancellationToken = default)
    {
        if (provider != ExternalAuthProvider.Apple)
        {
            return ExternalTokenValidationResult.Fail(
                "invalid_provider",
                $"Provider {provider} is not handled by Apple validator");
        }

        if (string.IsNullOrWhiteSpace(idToken))
        {
            return ExternalTokenValidationResult.Fail("invalid_id_token", "Id token is empty");
        }

        // Handler also enforces this; defense in depth for direct validator use.
        if (string.IsNullOrWhiteSpace(nonce))
        {
            return ExternalTokenValidationResult.Fail(
                "nonce_required",
                "Nonce is required for Apple Sign-In");
        }

        var apple = GetAppleOptions();
        var clientIds = apple?.ClientIds?
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList() ?? new List<string>();

        if (clientIds.Count == 0)
        {
            _logger.LogWarning("Apple external auth has no ClientIds configured");
            return ExternalTokenValidationResult.Fail(
                "provider_disabled",
                "Apple client IDs are not configured");
        }

        try
        {
            var keys = await _keyProvider.GetSigningKeysAsync(forceRefresh: false, cancellationToken)
                .ConfigureAwait(false);

            JwtSecurityToken jwt;
            try
            {
                jwt = ValidateJwt(idToken, keys, clientIds);
            }
            catch (SecurityTokenSignatureKeyNotFoundException)
            {
                // Unknown kid — force JWKS refresh once, then retry (design: refresh on unknown kid).
                _logger.LogInformation("Apple JWT kid not in cache; refreshing JWKS once");
                keys = await _keyProvider.GetSigningKeysAsync(forceRefresh: true, cancellationToken)
                    .ConfigureAwait(false);
                jwt = ValidateJwt(idToken, keys, clientIds);
            }

            if (string.IsNullOrWhiteSpace(jwt.Subject))
            {
                return ExternalTokenValidationResult.Fail("invalid_id_token", "Missing subject");
            }

            if (!NonceMatches(nonce, jwt))
            {
                _logger.LogWarning("Apple id_token nonce claim mismatch");
                return ExternalTokenValidationResult.Fail("invalid_id_token", "Nonce mismatch");
            }

            var email = GetClaim(jwt, "email") ?? GetClaim(jwt, JwtRegisteredClaimNames.Email);
            var emailVerified = ParseEmailVerified(jwt);

            // Name is typically absent after first authorize; client may pass first/last separately.
            return ExternalTokenValidationResult.Ok(new ExternalIdentity(
                Provider: ExternalAuthProvider.Apple,
                Subject: jwt.Subject,
                Email: email,
                EmailVerified: emailVerified,
                FirstName: null,
                LastName: null,
                PictureUrl: null));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Apple JWKS unreachable");
            return ExternalTokenValidationResult.Fail(
                "idp_unavailable",
                "Unable to reach identity provider for token validation");
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Apple id_token validation failed");
            return ExternalTokenValidationResult.Fail("invalid_id_token", ex.Message);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Apple id_token validation unexpected failure");
            return ExternalTokenValidationResult.Fail("invalid_id_token");
        }
    }

    private JwtSecurityToken ValidateJwt(
        string idToken,
        IReadOnlyList<SecurityKey> keys,
        IReadOnlyList<string> clientIds)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = AppleIssuer,
            ValidateAudience = true,
            ValidAudiences = clientIds,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys,
            ClockSkew = ClockSkew,
            // Apple tokens use "sub" as Name claim type by default mapping; keep raw.
            NameClaimType = JwtRegisteredClaimNames.Sub,
        };

        var handler = new JwtSecurityTokenHandler
        {
            // Keep claim types as-is (email, email_verified, nonce, sub).
            MapInboundClaims = false
        };

        handler.ValidateToken(idToken, parameters, out var validated);
        return (JwtSecurityToken)validated;
    }

    /// <summary>
    /// Apple stores a SHA-256 of the client nonce in the token (hex or base64url depending on SDK).
    /// Also accept exact raw match for flows that pass the claim value through unchanged.
    /// </summary>
    internal static bool NonceMatches(string rawNonce, JwtSecurityToken jwt)
    {
        var claim = GetClaim(jwt, "nonce");
        if (string.IsNullOrEmpty(claim))
            return false;

        if (string.Equals(claim, rawNonce, StringComparison.Ordinal))
            return true;

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawNonce));
        var hexLower = Convert.ToHexString(hash).ToLowerInvariant();
        var hexUpper = Convert.ToHexString(hash);
        if (string.Equals(claim, hexLower, StringComparison.Ordinal)
            || string.Equals(claim, hexUpper, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var base64Url = Base64UrlEncoder.Encode(hash);
        return string.Equals(claim, base64Url, StringComparison.Ordinal);
    }

    private static string? GetClaim(JwtSecurityToken jwt, string type) =>
        jwt.Claims.FirstOrDefault(c => string.Equals(c.Type, type, StringComparison.Ordinal))?.Value;

    /// <summary>
    /// Apple may emit <c>email_verified</c> as boolean-like string "true"/"false".
    /// Missing claim with no email → treat as unverified; private relay still verified when claim is true.
    /// </summary>
    private static bool ParseEmailVerified(JwtSecurityToken jwt)
    {
        var raw = GetClaim(jwt, "email_verified");
        if (string.IsNullOrWhiteSpace(raw))
        {
            // If Apple omitted the claim but provided an email on first authorize, treat conservatively as false.
            return false;
        }

        if (bool.TryParse(raw, out var b))
            return b;

        return string.Equals(raw, "true", StringComparison.OrdinalIgnoreCase)
               || raw == "1";
    }

    private ExternalProviderOptions? GetAppleOptions()
    {
        var options = _options.CurrentValue;
        if (options.Providers.TryGetValue(nameof(ExternalAuthProvider.Apple), out var apple))
            return apple;
        return null;
    }
}
