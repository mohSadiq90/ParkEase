using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

/// <summary>
/// Routes IdP token validation to the correct provider implementation (Google, Apple; Facebook later).
/// </summary>
internal sealed class CompositeExternalTokenValidator : IExternalTokenValidator
{
    private readonly GoogleExternalTokenValidator _google;
    private readonly AppleExternalTokenValidator _apple;

    public CompositeExternalTokenValidator(
        GoogleExternalTokenValidator google,
        AppleExternalTokenValidator apple)
    {
        _google = google;
        _apple = apple;
    }

    public Task<ExternalTokenValidationResult> ValidateAsync(
        ExternalAuthProvider provider,
        string idToken,
        string? nonce = null,
        CancellationToken cancellationToken = default) =>
        provider switch
        {
            ExternalAuthProvider.Google =>
                _google.ValidateAsync(provider, idToken, nonce, cancellationToken),
            ExternalAuthProvider.Apple =>
                _apple.ValidateAsync(provider, idToken, nonce, cancellationToken),
            _ => Task.FromResult(ExternalTokenValidationResult.Fail(
                "invalid_provider",
                $"Provider {provider} is not supported for token validation yet"))
        };
}
