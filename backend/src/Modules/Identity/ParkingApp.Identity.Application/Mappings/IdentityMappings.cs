using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.ExternalAuth;
using ParkingApp.Identity.Domain.Entities;

namespace ParkingApp.Identity.Application.Mappings;

/// <summary>Identity module mappings.</summary>
public static class IdentityMappings
{
    public static UserDto ToDto(this User user, IReadOnlyList<string>? linkedProviders = null) => new(
        user.Id,
        user.Email?.Value ?? string.Empty,
        user.FirstName,
        user.LastName,
        user.PhoneNumber,
        user.Role,
        user.IsEmailVerified,
        user.IsPhoneVerified,
        user.CreatedAt,
        user.HasPassword,
        linkedProviders ?? LinkedProviderNamesFromNav(user)
    );

    /// <summary>Prefer explicit list from repository; falls back to loaded navigation.</summary>
    private static IReadOnlyList<string> LinkedProviderNamesFromNav(User user)
    {
        if (user.ExternalLogins is null || user.ExternalLogins.Count == 0)
            return Array.Empty<string>();

        return user.ExternalLogins
            .Where(l => !l.IsDeleted)
            .Select(l => ExternalAuthProviderParser.ToWireName(l.Provider))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
