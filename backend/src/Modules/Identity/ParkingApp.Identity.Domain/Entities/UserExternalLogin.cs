using ParkingApp.BuildingBlocks.Domain;
using ParkingApp.BuildingBlocks.Exceptions;
using ParkingApp.Identity.Domain.Enums;

namespace ParkingApp.Identity.Domain.Entities;

/// <summary>
/// Links a Marketplace user to a stable external IdP subject (provider + sub).
/// Corporate SSO must not use this entity.
/// </summary>
public class UserExternalLogin : BaseEntity
{
    public Guid UserId { get; internal set; }
    public ExternalAuthProvider Provider { get; internal set; }
    public string ProviderSubject { get; internal set; } = string.Empty;
    public string? ProviderEmail { get; internal set; }
    public DateTime LinkedAtUtc { get; internal set; }
    public DateTime? LastUsedAtUtc { get; internal set; }

    public virtual User User { get; internal set; } = null!;

    internal UserExternalLogin()
    {
    }

    public static UserExternalLogin Create(
        Guid userId,
        ExternalAuthProvider provider,
        string providerSubject,
        string? providerEmail = null,
        DateTime? linkedAtUtc = null)
    {
        if (userId == Guid.Empty)
            throw new ValidationException("userId", "User id is required");
        if (string.IsNullOrWhiteSpace(providerSubject))
            throw new ValidationException("providerSubject", "Provider subject is required");

        var now = linkedAtUtc ?? DateTime.UtcNow;
        return new UserExternalLogin
        {
            UserId = userId,
            Provider = provider,
            ProviderSubject = providerSubject.Trim(),
            ProviderEmail = string.IsNullOrWhiteSpace(providerEmail) ? null : providerEmail.Trim(),
            LinkedAtUtc = now,
            LastUsedAtUtc = now
        };
    }

    public void RecordUse(DateTime? usedAtUtc = null)
    {
        LastUsedAtUtc = usedAtUtc ?? DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateProviderEmail(string? email)
    {
        ProviderEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
