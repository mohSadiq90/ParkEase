using System.Collections.Concurrent;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.IntegrationTests.Support;

/// <summary>
/// CI-safe IdP stub for FullApiFactory. Maps well-known id_token strings to fixed identities.
/// Never calls real Google/Apple JWKS.
/// For Apple: requires a matching raw nonce when the stub was registered with one.
/// </summary>
public sealed class FakeExternalTokenValidator : IExternalTokenValidator
{
    private readonly ConcurrentDictionary<string, StubEntry> _tokens =
        new(StringComparer.Ordinal);

    private sealed record StubEntry(ExternalIdentity Identity, string? ExpectedRawNonce);

    public void Register(string idToken, ExternalIdentity identity, string? expectedRawNonce = null) =>
        _tokens[idToken] = new StubEntry(identity, expectedRawNonce);

    public void RegisterGoogle(
        string idToken,
        string subject,
        string email,
        bool emailVerified = true,
        string? firstName = "Test",
        string? lastName = "User")
    {
        Register(idToken, new ExternalIdentity(
            ExternalAuthProvider.Google,
            subject,
            email,
            emailVerified,
            firstName,
            lastName));
    }

    public void RegisterApple(
        string idToken,
        string subject,
        string email,
        string expectedRawNonce,
        bool emailVerified = true,
        string? firstName = "Test",
        string? lastName = "User")
    {
        Register(
            idToken,
            new ExternalIdentity(
                ExternalAuthProvider.Apple,
                subject,
                email,
                emailVerified,
                firstName,
                lastName),
            expectedRawNonce);
    }

    public void Clear() => _tokens.Clear();

    public Task<ExternalTokenValidationResult> ValidateAsync(
        ExternalAuthProvider provider,
        string idToken,
        string? nonce = null,
        CancellationToken cancellationToken = default)
    {
        if (provider == ExternalAuthProvider.Apple && string.IsNullOrWhiteSpace(nonce))
        {
            return Task.FromResult(
                ExternalTokenValidationResult.Fail("nonce_required", "Nonce is required for Apple Sign-In"));
        }

        if (string.IsNullOrWhiteSpace(idToken) || !_tokens.TryGetValue(idToken, out var entry))
        {
            return Task.FromResult(
                ExternalTokenValidationResult.Fail("invalid_id_token", "Unknown stub token"));
        }

        if (entry.Identity.Provider != provider)
        {
            return Task.FromResult(
                ExternalTokenValidationResult.Fail("invalid_id_token", "Provider mismatch for stub token"));
        }

        if (provider == ExternalAuthProvider.Apple
            && entry.ExpectedRawNonce is not null
            && !string.Equals(entry.ExpectedRawNonce, nonce, StringComparison.Ordinal))
        {
            return Task.FromResult(
                ExternalTokenValidationResult.Fail("invalid_id_token", "Nonce mismatch"));
        }

        return Task.FromResult(ExternalTokenValidationResult.Ok(entry.Identity));
    }
}
