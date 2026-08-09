using Microsoft.IdentityModel.Tokens;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// Resolves Apple Sign-In JWKS signing keys. Production fetches + caches from Apple;
/// unit tests inject a fixed key set so CI never hits the network.
/// </summary>
internal interface IAppleJwksKeyProvider
{
    /// <param name="forceRefresh">When true, bypass cache (e.g. unknown kid retry).</param>
    Task<IReadOnlyList<SecurityKey>> GetSigningKeysAsync(
        bool forceRefresh,
        CancellationToken cancellationToken = default);
}
