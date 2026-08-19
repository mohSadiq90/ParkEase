using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// Fetches Apple JWKS (<c>https://appleid.apple.com/auth/keys</c>) with ~1h in-process cache (KD-SL-10).
/// Fail-closed when JWKS is unreachable and no unexpired cache remains.
/// </summary>
internal sealed class HttpAppleJwksKeyProvider : IAppleJwksKeyProvider
{
    public const string HttpClientName = "external-auth-jwks";
    public const string JwksUrl = "https://appleid.apple.com/auth/keys";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<HttpAppleJwksKeyProvider> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private IReadOnlyList<SecurityKey>? _cachedKeys;
    private DateTimeOffset _cacheExpiresAt = DateTimeOffset.MinValue;

    public HttpAppleJwksKeyProvider(
        IHttpClientFactory httpClientFactory,
        ILogger<HttpAppleJwksKeyProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SecurityKey>> GetSigningKeysAsync(
        bool forceRefresh,
        CancellationToken cancellationToken = default)
    {
        if (!forceRefresh
            && _cachedKeys is { Count: > 0 }
            && DateTimeOffset.UtcNow < _cacheExpiresAt)
        {
            return _cachedKeys;
        }

        await _refreshLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (!forceRefresh
                && _cachedKeys is { Count: > 0 }
                && DateTimeOffset.UtcNow < _cacheExpiresAt)
            {
                return _cachedKeys;
            }

            var client = _httpClientFactory.CreateClient(HttpClientName);
            using var response = await client
                .GetAsync(JwksUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken)
                .ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Apple JWKS fetch failed with HTTP {StatusCode}",
                    (int)response.StatusCode);
                throw new HttpRequestException(
                    $"Apple JWKS returned {(int)response.StatusCode}");
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(json))
            {
                throw new InvalidOperationException("Apple JWKS response was empty");
            }

            var jwks = new JsonWebKeySet(json);
            var keys = jwks.GetSigningKeys().ToList();
            if (keys.Count == 0)
            {
                throw new InvalidOperationException("Apple JWKS produced no signing keys");
            }

            _cachedKeys = keys;
            _cacheExpiresAt = DateTimeOffset.UtcNow.Add(CacheDuration);
            _logger.LogDebug(
                "Apple JWKS cached with {KeyCount} keys for {Duration}",
                keys.Count,
                CacheDuration);
            return keys;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
