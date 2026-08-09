using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Application.ExternalAuth;

/// <summary>
/// Parses wire-format provider strings (KD-SL-21) into <see cref="ExternalAuthProvider"/>.
/// </summary>
public static class ExternalAuthProviderParser
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        nameof(ExternalAuthProvider.Google),
        nameof(ExternalAuthProvider.Apple),
        nameof(ExternalAuthProvider.Facebook)
    };

    public static bool TryParse(string? value, out ExternalAuthProvider provider)
    {
        provider = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var trimmed = value.Trim();
        if (!Allowed.Contains(trimmed))
            return false;

        // Normalize to defined enum member (case-insensitive name match, reject numeric).
        if (int.TryParse(trimmed, out _))
            return false;

        return Enum.TryParse(trimmed, ignoreCase: true, out provider)
               && Enum.IsDefined(provider);
    }

    public static string ToWireName(ExternalAuthProvider provider) => provider.ToString();
}
