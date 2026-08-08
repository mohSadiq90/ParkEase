using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.Mappings;
using ParkingApp.Identity.Domain.Entities;

namespace ParkingApp.Identity.Application.Commands.Auth;

/// <summary>
/// Builds property-init <see cref="TokenDto"/> responses for auth mint paths.
/// Prefer passing access TTL from the token service so ExpiresAt matches the minted JWT.
/// </summary>
internal static class AuthTokenDtoFactory
{
    /// <summary>Fallback access-token lifetime minutes when caller does not supply TTL (mirrors Jwt default).</summary>
    public const int DefaultAccessTokenExpirationMinutes = 15;

    public static TokenDto Create(
        string accessToken,
        string refreshToken,
        User user,
        ProductChannel channel,
        Guid? companyId = null,
        string? companyRole = null,
        int accessTokenExpirationMinutes = DefaultAccessTokenExpirationMinutes)
    {
        // Company fields only meaningful on Corporate channel (mint invariant).
        var effectiveCompanyId = channel == ProductChannel.Corporate ? companyId : null;
        var effectiveCompanyRole = channel == ProductChannel.Corporate ? companyRole : null;

        return new TokenDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpirationMinutes),
            User = user.ToDto(),
            Channel = channel.ToString(),
            CompanyId = effectiveCompanyId,
            CompanyRole = effectiveCompanyRole,
            // Null for Marketplace/Admin so JSON can omit bootstrap noise; true/false only on Corporate.
            IsBootstrap = channel == ProductChannel.Corporate
                ? effectiveCompanyId is null
                : null
        };
    }
}
