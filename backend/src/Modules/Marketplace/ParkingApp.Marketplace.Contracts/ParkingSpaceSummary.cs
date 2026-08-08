namespace ParkingApp.Marketplace.Contracts;

/// <summary>
/// Cross-module marketplace parking read model. No Domain entity types.
/// OwnershipType is a string name (e.g. IndividualVendor, CompanyOwned).
/// </summary>
public sealed record ParkingSpaceSummary(
    Guid ParkingSpaceId,
    Guid OwnerId,
    string Title,
    bool IsActive,
    int TotalSpots,
    string OwnershipType,
    Guid? CompanyOwnerId = null,
    bool IsLprEnabled = false,
    int TwoWheelerPhysicalSpots = 0,
    int FourWheelerPhysicalSpots = 0)
{
    public bool IsCompanyOwned =>
        string.Equals(OwnershipType, "CompanyOwned", StringComparison.OrdinalIgnoreCase);

    /// <summary>True when the lot has a configured physical 2W/4W split (not untyped total-only).</summary>
    public bool HasTypedPhysicalCapacity =>
        TwoWheelerPhysicalSpots > 0 || FourWheelerPhysicalSpots > 0;
}
