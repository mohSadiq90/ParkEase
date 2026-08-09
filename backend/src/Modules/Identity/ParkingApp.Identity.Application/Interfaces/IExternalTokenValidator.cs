using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Application.Interfaces;

/// <summary>
/// Normalized claims from a verified external IdP token.
/// </summary>
public sealed record ExternalIdentity(
    ExternalAuthProvider Provider,
    string Subject,
    string? Email,
    bool EmailVerified,
    string? FirstName,
    string? LastName,
    string? PictureUrl = null);

/// <summary>
/// Result of IdP token verification. Never includes the raw id_token.
/// </summary>
public sealed record ExternalTokenValidationResult(
    bool Success,
    ExternalIdentity? Identity = null,
    string? ErrorCode = null,
    string? ErrorMessage = null)
{
    public static ExternalTokenValidationResult Ok(ExternalIdentity identity) =>
        new(true, identity);

    public static ExternalTokenValidationResult Fail(string errorCode, string? message = null) =>
        new(false, null, errorCode, message);
}

/// <summary>
/// Verifies provider id_tokens (Google JWKS, Apple JWKS, etc.). Implementations live in Infrastructure.
/// </summary>
public interface IExternalTokenValidator
{
    /// <summary>
    /// Validate an IdP token. For Apple, <paramref name="nonce"/> is required by the handler before calling.
    /// </summary>
    Task<ExternalTokenValidationResult> ValidateAsync(
        ExternalAuthProvider provider,
        string idToken,
        string? nonce = null,
        CancellationToken cancellationToken = default);
}
