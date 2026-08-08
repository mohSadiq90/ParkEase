using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Domain.Entities;

namespace ParkingApp.Identity.Infrastructure.Services;

internal class JwtTokenService : ITokenService
{
    /// <summary>Default access JWT lifetime when config is missing or invalid.</summary>
    public const int DefaultAccessTokenExpirationMinutes = 15;

    /// <summary>Default stay-signed-in window when config is missing or invalid (product: ≥15 days).</summary>
    public const int DefaultRefreshTokenExpirationDays = 15;

    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;

    public int AccessTokenExpirationMinutes { get; }
    public int RefreshTokenExpirationDays { get; }

    public JwtTokenService(IConfiguration configuration)
    {
        _secretKey = configuration["Jwt:SecretKey"] ?? throw new ArgumentNullException("Jwt:SecretKey is not configured");
        _issuer = configuration["Jwt:Issuer"] ?? "ParkingApp";
        _audience = configuration["Jwt:Audience"] ?? "ParkingApp";
        AccessTokenExpirationMinutes = ParsePositiveInt(
            configuration["Jwt:AccessTokenExpirationMinutes"],
            DefaultAccessTokenExpirationMinutes,
            min: 1,
            max: 24 * 60);
        RefreshTokenExpirationDays = ParsePositiveInt(
            configuration["Jwt:RefreshTokenExpirationDays"],
            DefaultRefreshTokenExpirationDays,
            min: 1,
            max: 90);
    }

    public string GenerateAccessToken(
        User user,
        ProductChannel channel,
        Guid? companyId = null,
        string? companyRole = null)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ParkEaseClaimTypes.Channel, channel.ToString())
        };

        // Company claims only when Corporate channel (documented mint invariant).
        if (channel == ProductChannel.Corporate)
        {
            if (companyId.HasValue)
                claims.Add(new Claim(ParkEaseClaimTypes.CompanyId, companyId.Value.ToString()));

            if (!string.IsNullOrWhiteSpace(companyRole))
                claims.Add(new Claim(ParkEaseClaimTypes.CompanyRole, companyRole));
        }

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(AccessTokenExpirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public bool ValidateRefreshToken(User user, string refreshToken)
    {
        if (string.IsNullOrEmpty(user.RefreshToken) || user.RefreshToken != refreshToken)
            return false;

        if (user.RefreshTokenExpiryTime == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            return false;

        return true;
    }

    public DateTime CreateRefreshTokenExpiryUtc() =>
        DateTime.UtcNow.AddDays(RefreshTokenExpirationDays);

    private static int ParsePositiveInt(string? raw, int defaultValue, int min, int max)
    {
        if (!int.TryParse(raw, out var value))
            return defaultValue;
        return Math.Clamp(value, min, max);
    }
}
