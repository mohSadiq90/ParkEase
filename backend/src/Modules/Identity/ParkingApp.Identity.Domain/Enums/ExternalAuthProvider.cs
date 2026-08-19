namespace ParkingApp.Identity.Domain.Enums;

/// <summary>
/// Marketplace social identity providers (token-exchange). Not used for Corporate SSO.
/// </summary>
public enum ExternalAuthProvider
{
    Google = 1,
    Apple = 2,
    Facebook = 3
}
