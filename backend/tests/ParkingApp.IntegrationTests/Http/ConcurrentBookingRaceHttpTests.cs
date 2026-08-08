using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ParkingApp.BuildingBlocks.Enums;
using ParkingApp.Corporate.Application.DTOs;
using ParkingApp.Domain.Enums;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.IntegrationTests.Support;
using ParkingApp.Marketplace.Contracts.DTOs;
using ParkingApp.Marketplace.Contracts.Enums;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// R12 — concurrent oversell protection under FullApi (real JWT + dispatcher + PostGIS).
/// Corporate dual-pool uses per-allocation cache lock; two simultaneous 4W books against 1 shared slot
/// must not both become confirmed bookings.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class ConcurrentBookingRaceHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public ConcurrentBookingRaceHttpTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "Concurrency")]
    public async Task CR1_Concurrent4WBooks_AgainstSingleSlot_AtMostOneConfirmed()
    {
        var ctx = await SeedCompanyWithOne4WSlotAndTwoEmployeesAsync("cr1");
        var (start, end) = WeekdayWindow();

        var dtoA = new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01RACE1");
        var dtoB = new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01RACE2");

        // Fire both employee book requests as close as possible
        using var clientA = _factory.CreateClient();
        using var clientB = _factory.CreateClient();
        clientA.UseBearer(ctx.EmployeeAToken);
        clientB.UseBearer(ctx.EmployeeBToken);

        var path = $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee";
        var taskA = clientA.PostAsJsonAsync(path, dtoA, HttpApiClientExtensions.JsonOptions);
        var taskB = clientB.PostAsJsonAsync(path, dtoB, HttpApiClientExtensions.JsonOptions);
        await Task.WhenAll(taskA, taskB);

        var respA = await taskA;
        var respB = await taskB;
        var bodyA = await respA.ReadApiResponseAsync<CorporateReservationResultDto>();
        var bodyB = await respB.ReadApiResponseAsync<CorporateReservationResultDto>();

        // Both may return 200 (book or waitlist) or one may fail lock contention with 400
        var outcomes = new[]
        {
            (respA.StatusCode, bodyA),
            (respB.StatusCode, bodyB)
        };

        var confirmed = outcomes.Count(o =>
            o.StatusCode == HttpStatusCode.OK
            && o.Item2?.Success == true
            && o.Item2.Data?.Booking is not null);

        var waitlisted = outcomes.Count(o =>
            o.StatusCode == HttpStatusCode.OK
            && o.Item2?.Success == true
            && o.Item2.Data?.Booking is null
            && o.Item2.Data?.Waitlist is not null);

        var lockRejected = outcomes.Count(o =>
            o.StatusCode == HttpStatusCode.BadRequest
            || (o.Item2?.Success == false
                && (o.Item2.Message?.Contains("lock", StringComparison.OrdinalIgnoreCase) == true
                    || o.Item2.Message?.Contains("processing", StringComparison.OrdinalIgnoreCase) == true)));

        confirmed.Should().BeLessThanOrEqualTo(1,
            "at most one concurrent request may occupy the single 4W shared slot");

        // Product-acceptable outcomes: 1 confirmed + 1 waitlist, or 1 confirmed + lock reject,
        // or (rare) 1 waitlist + lock reject after first filled — never 2 confirmed.
        (confirmed + waitlisted + lockRejected).Should().Be(2,
            because: $"A={respA.StatusCode}/{bodyA?.Success}/{bodyA?.Message}/book={bodyA?.Data?.Booking != null}/wl={bodyA?.Data?.Waitlist != null}; " +
                     $"B={respB.StatusCode}/{bodyB?.Success}/{bodyB?.Message}/book={bodyB?.Data?.Booking != null}/wl={bodyB?.Data?.Waitlist != null}");

        confirmed.Should().Be(1,
            "exactly one booking should win the race under capacity=1 (or retry semantics leave one confirmed)");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Concurrency")]
    public async Task CR2_Marketplace_SingleSpot_SecondBookAfterFirst_Rejected()
    {
        // Sequential control: TotalSpots=1; second overlapping book after first succeeds must fail.
        // Complements CR1 (true concurrency) with deterministic capacity assertion.
        var vendor = await _client.RegisterAndGetTokensAsync("cr2_vendor");
        _client.UseBearer(vendor.AccessToken);

        var listing = new
        {
            title = $"Race Lot {Guid.NewGuid():N}"[..24],
            description = "Single-spot listing for capacity IT.",
            address = "1 Spot Lane",
            city = "Bengaluru",
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.97,
            longitude = 77.59,
            parkingType = ParkingType.Open,
            totalSpots = 1,
            hourlyRate = 50m,
            dailyRate = 300m,
            weeklyRate = 1500m,
            monthlyRate = 5000m,
            is24Hours = true,
            listingCategory = ListingCategory.Residential,
            instantBook = true
        };

        var createSpace = await _client.PostAsJsonAsync("/api/parking", listing, HttpApiClientExtensions.JsonOptions);
        var spaceBody = await createSpace.ReadApiResponseAsync<ParkingSpaceDto>();
        createSpace.EnsureSuccessStatusCode();
        var spaceId = spaceBody!.Data!.Id;

        var start = DateTime.UtcNow.AddHours(3);
        var end = start.AddHours(2);

        var guest1 = await _client.RegisterAndGetTokensAsync("cr2_g1");
        _client.UseBearer(guest1.AccessToken);
        var book1 = await _client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingDto(spaceId, start, end, PricingType.Hourly, VehicleType.Car, null, "KA01ONE1", null, null, null),
            HttpApiClientExtensions.JsonOptions);
        book1.StatusCode.Should().Be(HttpStatusCode.Created, because: await book1.Content.ReadAsStringAsync());

        var guest2 = await _client.RegisterAndGetTokensAsync("cr2_g2");
        _client.UseBearer(guest2.AccessToken);
        var book2 = await _client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingDto(spaceId, start, end, PricingType.Hourly, VehicleType.Car, null, "KA01TWO2", null, null, null),
            HttpApiClientExtensions.JsonOptions);
        var body2 = await book2.ReadApiResponseAsync<BookingDto>();

        book2.StatusCode.Should().Be(HttpStatusCode.BadRequest, because: await book2.Content.ReadAsStringAsync());
        body2!.Success.Should().BeFalse();
        body2.Message.Should().ContainEquivalentOf("no spots");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Concurrency")]
    public async Task CR3_Marketplace_ConcurrentBooks_OnCapacityOne_AtMostOneSucceeds()
    {
        // True parallel create against TotalSpots=1 — proves marketplace space lock (R12 product fix).
        var vendor = await _client.RegisterAndGetTokensAsync("cr3_vendor");
        _client.UseBearer(vendor.AccessToken);

        var listing = new
        {
            title = $"Mkt Race {Guid.NewGuid():N}"[..24],
            description = "Capacity-1 concurrent marketplace oversell race.",
            address = "3 Race Lane",
            city = $"CR3City{Guid.NewGuid():N}"[..16],
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.97,
            longitude = 77.59,
            parkingType = ParkingType.Open,
            totalSpots = 1,
            hourlyRate = 50m,
            dailyRate = 300m,
            weeklyRate = 1500m,
            monthlyRate = 5000m,
            is24Hours = true,
            listingCategory = ListingCategory.Residential,
            instantBook = true
        };

        var createSpace = await _client.PostAsJsonAsync("/api/parking", listing, HttpApiClientExtensions.JsonOptions);
        var spaceBody = await createSpace.ReadApiResponseAsync<ParkingSpaceDto>();
        createSpace.EnsureSuccessStatusCode();
        var spaceId = spaceBody!.Data!.Id;

        var guest1 = await _client.RegisterAndGetTokensAsync("cr3_g1");
        var guest2 = await _client.RegisterAndGetTokensAsync("cr3_g2");

        var start = DateTime.UtcNow.AddHours(4);
        var end = start.AddHours(2);
        var dto1 = new CreateBookingDto(spaceId, start, end, PricingType.Hourly, VehicleType.Car, null, "KA01CR3A", null, null, null);
        var dto2 = new CreateBookingDto(spaceId, start, end, PricingType.Hourly, VehicleType.Car, null, "KA01CR3B", null, null, null);

        using var clientA = _factory.CreateClient();
        using var clientB = _factory.CreateClient();
        clientA.UseBearer(guest1.AccessToken);
        clientB.UseBearer(guest2.AccessToken);

        var taskA = clientA.PostAsJsonAsync("/api/bookings", dto1, HttpApiClientExtensions.JsonOptions);
        var taskB = clientB.PostAsJsonAsync("/api/bookings", dto2, HttpApiClientExtensions.JsonOptions);
        await Task.WhenAll(taskA, taskB);

        var respA = await taskA;
        var respB = await taskB;
        var bodyA = await respA.ReadApiResponseAsync<BookingDto>();
        var bodyB = await respB.ReadApiResponseAsync<BookingDto>();

        var wins = new[] { (respA, bodyA), (respB, bodyB) }
            .Count(x => x.Item1.StatusCode == HttpStatusCode.Created && x.Item2?.Success == true);

        wins.Should().Be(1,
            because: $"oversell if >1: A={respA.StatusCode}/{bodyA?.Message}; B={respB.StatusCode}/{bodyB?.Message}");

        var losses = new[] { (respA, bodyA), (respB, bodyB) }
            .Where(x => !(x.Item1.StatusCode == HttpStatusCode.Created && x.Item2?.Success == true))
            .ToList();
        losses.Should().HaveCount(1);
        losses[0].Item2!.Success.Should().BeFalse();
        losses[0].Item2.Message.Should().NotBeNullOrWhiteSpace();
    }

    private async Task<RaceCtx> SeedCompanyWithOne4WSlotAndTwoEmployeesAsync(string prefix)
    {
        var (_, adminTokens) = await _client.RegisterUserAsync($"{prefix}_admin");
        _client.UseBearer(adminTokens.AccessToken);
        var (sw, swBody) = await _client.SwitchChannelAsync("Corporate", bootstrap: true);
        sw.EnsureSuccessStatusCode();
        _client.UseBearer(swBody!.Data!.AccessToken);

        var createCompany = await _client.PostAsJsonAsync(
            "/api/v1/corporate/companies",
            new CreateCompanyDto(
                $"Race Co {prefix} {Guid.NewGuid():N}"[..40],
                $"REG-{Guid.NewGuid():N}"[..20],
                $"billing_{prefix}@it.parkease.test",
                "+919876543210",
                "1 Race Way",
                BillingType.ReservedSlots),
            HttpApiClientExtensions.JsonOptions);
        var companyBody = await createCompany.ReadApiResponseAsync<CreateCompanyResultDto>();
        createCompany.EnsureSuccessStatusCode();

        string adminToken;
        if (companyBody!.Data!.Session is JsonElement el
            && el.ValueKind == JsonValueKind.Object
            && el.TryGetProperty("accessToken", out var at)
            && at.ValueKind == JsonValueKind.String)
        {
            adminToken = at.GetString()!;
        }
        else
        {
            var (ch, chBody) = await _client.SwitchChannelAsync("Corporate", companyId: companyBody.Data.Company.Id);
            ch.EnsureSuccessStatusCode();
            adminToken = chBody!.Data!.AccessToken;
        }

        var companyId = companyBody.Data.Company.Id;
        _client.UseBearer(adminToken);

        var park = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces",
            new
            {
                title = $"Race Lot {prefix}",
                description = "One 4W shared slot for concurrency IT.",
                address = "2 Race Rd",
                city = "Bengaluru",
                state = "KA",
                country = "IN",
                postalCode = "560001",
                latitude = 12.98,
                longitude = 77.60,
                parkingType = ParkingType.Garage,
                totalSpots = 3,
                hourlyRate = 0m,
                dailyRate = 0m,
                weeklyRate = 0m,
                monthlyRate = 0m,
                is24Hours = true,
                twoWheelerPhysicalSpots = 2,
                fourWheelerPhysicalSpots = 1
            },
            HttpApiClientExtensions.JsonOptions);
        var parkBody = await park.ReadApiResponseAsync<CorporateParkingSpaceDto>();
        park.EnsureSuccessStatusCode();
        var spaceId = parkBody!.Data!.Id;

        var alloc = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces/{spaceId}/allocations",
            new CreateOwnedParkingAllocationDto(
                ParkingSpaceId: spaceId,
                MonthlyRate: 0m,
                StartDate: DateTime.UtcNow.Date.AddDays(-1),
                EndDate: DateTime.UtcNow.Date.AddYears(1),
                Policy: new BookingPolicyDto(5, 20, 1, TimeSpan.Zero, TimeSpan.FromHours(23), true),
                TwoWheeler: new SlotPoolDto(2, 0, 2),
                FourWheeler: new SlotPoolDto(1, 0, 1)),
            HttpApiClientExtensions.JsonOptions);
        var allocBody = await alloc.ReadApiResponseAsync<ParkingAllocationDto>();
        alloc.EnsureSuccessStatusCode();
        var allocationId = allocBody!.Data!.Id;

        async Task<string> InviteAndBindEmployeeAsync(string empPrefix)
        {
            var email = $"{empPrefix}_{Guid.NewGuid():N}@it.parkease.test";
            const string password = "TestPass1!";
            _client.ClearBearer();
            var (reg, _) = await _client.RegisterAsync(email, password);
            reg.EnsureSuccessStatusCode();

            _client.UseBearer(adminToken);
            var invite = await _client.PostAsJsonAsync(
                $"/api/v1/corporate/companies/{companyId}/invitations",
                new InviteMemberDto(email, CompanyRole.Employee),
                HttpApiClientExtensions.JsonOptions);
            var invBody = await invite.ReadApiResponseAsync<InvitationDto>();
            invite.EnsureSuccessStatusCode();

            _client.ClearBearer();
            var (login, loginBody) = await _client.LoginAsync(email, password);
            login.EnsureSuccessStatusCode();
            _client.UseBearer(loginBody!.Data!.AccessToken);

            var acceptContent = new StringContent(
                JsonSerializer.Serialize(invBody!.Data!.InvitationToken!, HttpApiClientExtensions.JsonOptions),
                System.Text.Encoding.UTF8,
                "application/json");
            var accept = await _client.PostAsync("/api/v1/corporate/invitations/accept", acceptContent);
            accept.EnsureSuccessStatusCode();

            var (empSw, empSwBody) = await _client.SwitchChannelAsync("Corporate", companyId: companyId);
            empSw.EnsureSuccessStatusCode();
            return empSwBody!.Data!.AccessToken;
        }

        var empA = await InviteAndBindEmployeeAsync($"{prefix}_a");
        var empB = await InviteAndBindEmployeeAsync($"{prefix}_b");

        return new RaceCtx(companyId, allocationId, empA, empB);
    }

    private static (DateTime Start, DateTime End) WeekdayWindow()
    {
        var day = DateTime.UtcNow.Date.AddDays(1);
        while (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            day = day.AddDays(1);
        var start = DateTime.SpecifyKind(day.AddHours(10), DateTimeKind.Utc);
        return (start, start.AddHours(2));
    }

    private sealed record RaceCtx(
        Guid CompanyId,
        Guid AllocationId,
        string EmployeeAToken,
        string EmployeeBToken);
}
