using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ParkingApp.Corporate.Application.DTOs;
using ParkingApp.Domain.Enums;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.IntegrationTests.Support;
using ParkingApp.Marketplace.Contracts.Enums;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// R11 — L4 dual-pool allocation JSON contract against <see cref="FullApiFactory"/>
/// (real JWT + real dispatcher + PostGIS). Complements stubbed DualPoolHttpSmokeTests.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class DualPoolFullApiHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public DualPoolFullApiHttpTests(FullApiPostgresFixture postgres)
    {
        _factory = new FullApiFactory(postgres.ConnectionString, channelIsolationEnabled: false);
        _client = _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "VehicleClassPools")]
    public async Task DP1_CreateOwnedDualPoolAllocation_ReturnsTwoAndFourWheelerPools()
    {
        var (companyId, adminToken, spaceId) = await SeedCompanyAndOwnedSpaceAsync("dp1", totalSpots: 30, two: 10, four: 20);
        _client.UseBearer(adminToken);

        var allocDto = new CreateOwnedParkingAllocationDto(
            ParkingSpaceId: spaceId,
            MonthlyRate: 0m,
            StartDate: DateTime.UtcNow.Date.AddDays(-1),
            EndDate: DateTime.UtcNow.Date.AddYears(1),
            Policy: new BookingPolicyDto(
                MaxBookingsPerEmployeePerDay: 10,
                MaxBookingsPerEmployeePerWeek: 40,
                PriorityThreshold: 1,
                AllowedStartTime: TimeSpan.FromHours(0),
                AllowedEndTime: TimeSpan.FromHours(23),
                AllowWeekends: true),
            TwoWheeler: new SlotPoolDto(10, 2, 8),
            FourWheeler: new SlotPoolDto(20, 5, 15));

        var create = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces/{spaceId}/allocations",
            allocDto,
            HttpApiClientExtensions.JsonOptions);
        var createBody = await create.ReadApiResponseAsync<ParkingAllocationDto>();

        create.StatusCode.Should().Be(HttpStatusCode.OK, because: await create.Content.ReadAsStringAsync());
        createBody!.Success.Should().BeTrue(createBody.Message);
        createBody.Data.Should().NotBeNull();
        createBody.Data!.TotalSlots.Should().Be(30);
        createBody.Data.TwoWheeler.Should().NotBeNull();
        createBody.Data.TwoWheeler!.TotalSlots.Should().Be(10);
        createBody.Data.TwoWheeler.FixedSlots.Should().Be(2);
        createBody.Data.TwoWheeler.SharedSlots.Should().Be(8);
        createBody.Data.FourWheeler.Should().NotBeNull();
        createBody.Data.FourWheeler!.TotalSlots.Should().Be(20);
        createBody.Data.FourWheeler.FixedSlots.Should().Be(5);
        createBody.Data.FourWheeler.SharedSlots.Should().Be(15);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "VehicleClassPools")]
    public async Task DP2_GetAllocations_ReturnsPersistedDualPools()
    {
        var (companyId, adminToken, spaceId) = await SeedCompanyAndOwnedSpaceAsync("dp2", totalSpots: 12, two: 4, four: 8);
        _client.UseBearer(adminToken);

        var allocDto = new CreateOwnedParkingAllocationDto(
            ParkingSpaceId: spaceId,
            MonthlyRate: 100m,
            StartDate: DateTime.UtcNow.Date.AddDays(-1),
            EndDate: DateTime.UtcNow.Date.AddMonths(6),
            TwoWheeler: new SlotPoolDto(4, 0, 4),
            FourWheeler: new SlotPoolDto(8, 1, 7));

        var create = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces/{spaceId}/allocations",
            allocDto,
            HttpApiClientExtensions.JsonOptions);
        create.EnsureSuccessStatusCode();
        var created = await create.ReadApiResponseAsync<ParkingAllocationDto>();
        var allocationId = created!.Data!.Id;

        var get = await _client.GetAsync($"/api/v1/corporate/companies/{companyId}/allocations");
        var getBody = await get.ReadApiResponseAsync<List<ParkingAllocationDto>>();

        get.StatusCode.Should().Be(HttpStatusCode.OK, because: await get.Content.ReadAsStringAsync());
        getBody!.Success.Should().BeTrue();
        getBody.Data.Should().NotBeNull();
        var allocations = getBody.Data!;
        allocations.Should().Contain(a => a.Id == allocationId);

        var match = allocations.Single(a => a.Id == allocationId);
        match.TwoWheeler!.TotalSlots.Should().Be(4);
        match.TwoWheeler.SharedSlots.Should().Be(4);
        match.FourWheeler!.TotalSlots.Should().Be(8);
        match.FourWheeler.FixedSlots.Should().Be(1);
        match.FourWheeler.SharedSlots.Should().Be(7);
        match.TotalSlots.Should().Be(12);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "VehicleClassPools")]
    public async Task DP3_GetAllocations_WithoutToken_Returns401()
    {
        _client.ClearBearer();
        var response = await _client.GetAsync(
            $"/api/v1/corporate/companies/{Guid.NewGuid()}/allocations");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<(Guid CompanyId, string AdminToken, Guid SpaceId)> SeedCompanyAndOwnedSpaceAsync(
        string prefix,
        int totalSpots,
        int two,
        int four)
    {
        var (_, tokens) = await _client.RegisterUserAsync($"{prefix}_admin");
        _client.UseBearer(tokens.AccessToken);

        var (switchResp, switchBody) = await _client.SwitchChannelAsync("Corporate", bootstrap: true);
        switchResp.EnsureSuccessStatusCode();
        _client.UseBearer(switchBody!.Data!.AccessToken);

        var createCompany = await _client.PostAsJsonAsync(
            "/api/v1/corporate/companies",
            new CreateCompanyDto(
                $"DualPool Co {prefix} {Guid.NewGuid():N}"[..40],
                $"REG-{Guid.NewGuid():N}"[..20],
                $"billing_{prefix}@it.parkease.test",
                "+919876543210",
                "1 Dual Pool Way",
                BillingType.ReservedSlots),
            HttpApiClientExtensions.JsonOptions);
        var companyBody = await createCompany.ReadApiResponseAsync<CreateCompanyResultDto>();
        createCompany.StatusCode.Should().Be(HttpStatusCode.Created, because: await createCompany.Content.ReadAsStringAsync());

        string adminToken;
        if (companyBody!.Data!.Session is JsonElement sessionEl
            && sessionEl.ValueKind == JsonValueKind.Object
            && sessionEl.TryGetProperty("accessToken", out var at)
            && at.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(at.GetString()))
        {
            adminToken = at.GetString()!;
        }
        else
        {
            var (ch, chBody) = await _client.SwitchChannelAsync(
                "Corporate", companyId: companyBody.Data.Company.Id);
            ch.EnsureSuccessStatusCode();
            adminToken = chBody!.Data!.AccessToken;
        }

        var companyId = companyBody.Data.Company.Id;
        _client.UseBearer(adminToken);

        var parkingDto = new
        {
            title = $"Dual Lot {prefix}",
            description = "Owned dual-pool space for FullApi allocation contract IT.",
            address = "100 Dual Ave",
            city = "Bengaluru",
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.97,
            longitude = 77.59,
            parkingType = ParkingType.Garage,
            totalSpots,
            hourlyRate = 0m,
            dailyRate = 0m,
            weeklyRate = 0m,
            monthlyRate = 0m,
            is24Hours = true,
            twoWheelerPhysicalSpots = two,
            fourWheelerPhysicalSpots = four
        };

        var park = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces",
            parkingDto,
            HttpApiClientExtensions.JsonOptions);
        var parkBody = await park.ReadApiResponseAsync<CorporateParkingSpaceDto>();
        park.StatusCode.Should().Be(HttpStatusCode.Created, because: await park.Content.ReadAsStringAsync());

        return (companyId, adminToken, parkBody!.Data!.Id);
    }
}
