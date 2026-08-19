using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Identity.Infrastructure.Services.ExternalAuth;
using Xunit;

namespace ParkingApp.UnitTests.Identity;

/// <summary>
/// PR6a — Apple JWKS validator (self-signed RSA; no network).
/// </summary>
public class AppleExternalTokenValidatorTests : IDisposable
{
    private const string Audience = "com.parkease.test.service";
    private readonly RSA _rsa = RSA.Create(2048);
    private readonly RsaSecurityKey _signingKey;
    private readonly string _kid = "test-apple-kid";

    public AppleExternalTokenValidatorTests()
    {
        _signingKey = new RsaSecurityKey(_rsa) { KeyId = _kid };
    }

    public void Dispose() => _rsa.Dispose();

    private AppleExternalTokenValidator CreateValidator(params string[] clientIds)
    {
        var options = new ExternalAuthOptions
        {
            Enabled = true,
            Providers = new Dictionary<string, ExternalProviderOptions>(StringComparer.OrdinalIgnoreCase)
            {
                ["Apple"] = new ExternalProviderOptions
                {
                    Enabled = true,
                    ClientIds = clientIds.Length > 0 ? clientIds.ToList() : new List<string> { Audience }
                }
            }
        };
        var monitor = new MockOptionsMonitor(options);
        var provider = new StaticAppleJwksKeyProvider(_signingKey);
        return new AppleExternalTokenValidator(
            monitor,
            provider,
            NullLogger<AppleExternalTokenValidator>.Instance);
    }

    private string CreateAppleJwt(
        string subject,
        string? email,
        string? nonceClaim,
        string audience = Audience,
        string issuer = AppleExternalTokenValidator.AppleIssuer,
        bool? emailVerified = true,
        DateTime? expires = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject)
        };
        if (email is not null)
            claims.Add(new Claim("email", email));
        if (emailVerified.HasValue)
            claims.Add(new Claim("email_verified", emailVerified.Value ? "true" : "false"));
        if (nonceClaim is not null)
            claims.Add(new Claim("nonce", nonceClaim));

        var creds = new SigningCredentials(_signingKey, SecurityAlgorithms.RsaSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: expires ?? DateTime.UtcNow.AddMinutes(10),
            signingCredentials: creds);
        token.Header["kid"] = _kid;
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string Sha256Hex(string raw)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Sha256Base64Url(string raw)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Base64UrlEncoder.Encode(hash);
    }

    [Fact]
    public async Task MissingNonce_ReturnsNonceRequired()
    {
        var validator = CreateValidator();
        var jwt = CreateAppleJwt("sub1", "a@privaterelay.appleid.com", nonceClaim: Sha256Hex("n1"));

        var result = await validator.ValidateAsync(ExternalAuthProvider.Apple, jwt, nonce: null);

        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("nonce_required");
    }

    [Fact]
    public async Task NonceMismatch_ReturnsInvalidIdToken()
    {
        var validator = CreateValidator();
        var jwt = CreateAppleJwt("sub1", "a@example.com", nonceClaim: Sha256Hex("correct-nonce"));

        var result = await validator.ValidateAsync(
            ExternalAuthProvider.Apple, jwt, nonce: "wrong-nonce");

        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("invalid_id_token");
    }

    [Fact]
    public async Task ValidToken_HexNonce_ReturnsIdentity_MarketplaceReady()
    {
        var validator = CreateValidator();
        const string rawNonce = "raw-nonce-value-abc";
        var jwt = CreateAppleJwt(
            "apple.sub.001",
            "user@privaterelay.appleid.com",
            nonceClaim: Sha256Hex(rawNonce),
            emailVerified: true);

        var result = await validator.ValidateAsync(
            ExternalAuthProvider.Apple, jwt, nonce: rawNonce);

        result.Success.Should().BeTrue();
        result.Identity.Should().NotBeNull();
        result.Identity!.Provider.Should().Be(ExternalAuthProvider.Apple);
        result.Identity.Subject.Should().Be("apple.sub.001");
        result.Identity.Email.Should().Be("user@privaterelay.appleid.com");
        result.Identity.EmailVerified.Should().BeTrue();
    }

    [Fact]
    public async Task ValidToken_Base64UrlNonce_Accepts()
    {
        var validator = CreateValidator();
        const string rawNonce = "nonce-b64url";
        var jwt = CreateAppleJwt(
            "apple.sub.002",
            "b@example.com",
            nonceClaim: Sha256Base64Url(rawNonce));

        var result = await validator.ValidateAsync(
            ExternalAuthProvider.Apple, jwt, nonce: rawNonce);

        result.Success.Should().BeTrue();
        result.Identity!.Subject.Should().Be("apple.sub.002");
    }

    [Fact]
    public async Task ValidToken_RawNonceClaim_Accepts()
    {
        var validator = CreateValidator();
        const string rawNonce = "plaintext-nonce";
        var jwt = CreateAppleJwt("apple.sub.003", "c@example.com", nonceClaim: rawNonce);

        var result = await validator.ValidateAsync(
            ExternalAuthProvider.Apple, jwt, nonce: rawNonce);

        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task WrongAudience_ReturnsInvalidIdToken()
    {
        var validator = CreateValidator("com.other.aud");
        const string rawNonce = "n";
        var jwt = CreateAppleJwt("sub", "e@example.com", Sha256Hex(rawNonce), audience: Audience);

        var result = await validator.ValidateAsync(ExternalAuthProvider.Apple, jwt, rawNonce);

        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("invalid_id_token");
    }

    [Fact]
    public async Task WrongIssuer_ReturnsInvalidIdToken()
    {
        var validator = CreateValidator();
        const string rawNonce = "n";
        var jwt = CreateAppleJwt(
            "sub", "e@example.com", Sha256Hex(rawNonce), issuer: "https://evil.example");

        var result = await validator.ValidateAsync(ExternalAuthProvider.Apple, jwt, rawNonce);

        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("invalid_id_token");
    }

    [Fact]
    public async Task NoClientIdsConfigured_ReturnsProviderDisabled()
    {
        var options = new ExternalAuthOptions
        {
            Providers = new Dictionary<string, ExternalProviderOptions>
            {
                ["Apple"] = new ExternalProviderOptions { Enabled = true, ClientIds = new List<string>() }
            }
        };
        var validator = new AppleExternalTokenValidator(
            new MockOptionsMonitor(options),
            new StaticAppleJwksKeyProvider(_signingKey),
            NullLogger<AppleExternalTokenValidator>.Instance);

        var result = await validator.ValidateAsync(
            ExternalAuthProvider.Apple, "any.jwt", "nonce");

        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("provider_disabled");
    }

    [Fact]
    public async Task NonAppleProvider_ReturnsInvalidProvider()
    {
        var validator = CreateValidator();
        var result = await validator.ValidateAsync(ExternalAuthProvider.Google, "tok", "n");
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("invalid_provider");
    }

    private sealed class StaticAppleJwksKeyProvider : IAppleJwksKeyProvider
    {
        private readonly SecurityKey _key;

        public StaticAppleJwksKeyProvider(SecurityKey key) => _key = key;

        public Task<IReadOnlyList<SecurityKey>> GetSigningKeysAsync(
            bool forceRefresh,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<SecurityKey>>(new[] { _key });
    }

    private sealed class MockOptionsMonitor : IOptionsMonitor<ExternalAuthOptions>
    {
        public MockOptionsMonitor(ExternalAuthOptions current) => CurrentValue = current;
        public ExternalAuthOptions CurrentValue { get; }
        public ExternalAuthOptions Get(string? name) => CurrentValue;
        public IDisposable? OnChange(Action<ExternalAuthOptions, string?> listener) => null;
    }
}
