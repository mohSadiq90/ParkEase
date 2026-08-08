using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ParkingApp.IntegrationTests.Support;
using Xunit;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// L4 WebApplicationFactory HTTP smoke for corporate dual-pool allocation contracts.
/// </summary>
public sealed class DualPoolHttpSmokeTests : IClassFixture<DualPoolApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public DualPoolHttpSmokeTests(DualPoolApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("Feature", "VehicleClassPools")]
    [Trait("Layer", "Http")]
    public async Task GetAllocations_ReturnsTwoAndFourWheelerPools()
    {
        var response = await _client.GetAsync(
            $"/api/v1/corporate/companies/{DualPoolApiFactory.TestCompanyId}/allocations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = root.GetProperty("data");
        data.GetArrayLength().Should().BeGreaterThan(0);
        var alloc = data[0];
        alloc.GetProperty("totalSlots").GetInt32().Should().Be(30);
        alloc.GetProperty("twoWheeler").GetProperty("totalSlots").GetInt32().Should().Be(10);
        alloc.GetProperty("twoWheeler").GetProperty("fixedSlots").GetInt32().Should().Be(2);
        alloc.GetProperty("twoWheeler").GetProperty("sharedSlots").GetInt32().Should().Be(8);
        alloc.GetProperty("fourWheeler").GetProperty("totalSlots").GetInt32().Should().Be(20);
        alloc.GetProperty("fourWheeler").GetProperty("fixedSlots").GetInt32().Should().Be(5);
        alloc.GetProperty("fourWheeler").GetProperty("sharedSlots").GetInt32().Should().Be(15);
    }

    [Fact]
    [Trait("Feature", "VehicleClassPools")]
    [Trait("Layer", "Http")]
    public async Task CreateOwnedAllocation_AcceptsDualPoolBody_AndReturnsPools()
    {
        var body = new
        {
            parkingSpaceId = DualPoolApiFactory.TestSpaceId,
            monthlyRate = 0,
            startDate = "2026-07-01T00:00:00Z",
            endDate = "2026-12-31T00:00:00Z",
            twoWheeler = new { totalSlots = 10, fixedSlots = 0, sharedSlots = 10 },
            fourWheeler = new { totalSlots = 20, fixedSlots = 0, sharedSlots = 20 },
            policy = new
            {
                maxBookingsPerEmployeePerDay = 10,
                maxBookingsPerEmployeePerWeek = 40,
                priorityThreshold = 1,
                allowedStartTime = "00:00:00",
                allowedEndTime = "23:00:00",
                allowWeekends = true
            }
        };

        var response = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{DualPoolApiFactory.TestCompanyId}/parking-spaces/{DualPoolApiFactory.TestSpaceId}/allocations",
            body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = root.GetProperty("data");
        data.GetProperty("twoWheeler").GetProperty("totalSlots").GetInt32().Should().Be(10);
        data.GetProperty("fourWheeler").GetProperty("totalSlots").GetInt32().Should().Be(20);
    }

    [Fact]
    [Trait("Feature", "VehicleClassPools")]
    [Trait("Layer", "Http")]
    public async Task Allocations_RequireAuthentication()
    {
        // IT-Q1: TestAuth is auto-success unless X-Test-Anonymous:1 → NoResult → [Authorize] challenges 401.
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/v1/corporate/companies/{DualPoolApiFactory.TestCompanyId}/allocations");
        request.Headers.Add("X-Test-Anonymous", "1");

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
