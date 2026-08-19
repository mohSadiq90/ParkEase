namespace ParkingApp.Identity.Application.Interfaces;

/// <summary>
/// Soft rate limit for failed <c>linkPassword</c> attempts (per email), e.g. 5 / 15 min → 429.
/// </summary>
public interface ILinkPasswordAttemptTracker
{
    bool IsLimited(string emailNormalized);

    void RecordFailure(string emailNormalized);

    void RecordSuccess(string emailNormalized);
}
