using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Domain.Entities;

namespace ParkingApp.Identity.Application.Interfaces;

/// <summary>
/// Application port for JWT / refresh-token issuance and validation.
/// Implemented in Infrastructure.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Access JWT lifetime in minutes (from <c>Jwt:AccessTokenExpirationMinutes</c>).
    /// </summary>
    int AccessTokenExpirationMinutes { get; }

    /// <summary>
    /// Refresh-token lifetime in days (from <c>Jwt:RefreshTokenExpirationDays</c>).
    /// Mobile/web stay-signed-in window; product default is 15 days.
    /// </summary>
    int RefreshTokenExpirationDays { get; }

    /// <summary>
    /// Mint access token with product channel claim (+ optional corporate company_id / company_role).
    /// </summary>
    string GenerateAccessToken(
        User user,
        ProductChannel channel,
        Guid? companyId = null,
        string? companyRole = null);

    string GenerateRefreshToken();
    bool ValidateRefreshToken(User user, string refreshToken);

    /// <summary>UTC expiry for a newly issued refresh token.</summary>
    DateTime CreateRefreshTokenExpiryUtc();
}
