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
/// P0-4 — L4 corporate create → invite → accept → employee book (owned dual-pool allocation).
/// Isolation off so multi-step channel rebinds use FullApi real JWT.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class CorporateLifecycleHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public CorporateLifecycleHttpTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "CorporateLifecycle")]
    public async Task CH1_CreateCompany_ReturnsAdminSession_AndDashboardOk()
    {
        var (_, companyId, adminToken) = await BootstrapCompanyAsync("ch1");

        _client.UseBearer(adminToken);
        var dash = await _client.GetAsync($"/api/v1/corporate/companies/{companyId}/dashboard");
        var dashBody = await dash.ReadApiResponseAsync<CompanyDashboardDto>();

        dash.StatusCode.Should().Be(HttpStatusCode.OK, because: await dash.Content.ReadAsStringAsync());
        dashBody!.Success.Should().BeTrue();
        dashBody.Data.Should().NotBeNull();
        dashBody.Data!.TotalMembers.Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "CorporateLifecycle")]
    public async Task CH2_Invite_Accept_AppearsInMembersList()
    {
        var (adminEmail, companyId, adminToken) = await BootstrapCompanyAsync("ch2");
        _ = adminEmail;

        var employeeEmail = $"emp_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";

        // Employee registers on marketplace first
        _client.ClearBearer();
        var (reg, _) = await _client.RegisterAsync(employeeEmail, password);
        reg.EnsureSuccessStatusCode();

        _client.UseBearer(adminToken);
        var inviteResponse = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/invitations",
            new InviteMemberDto(employeeEmail, CompanyRole.Employee),
            HttpApiClientExtensions.JsonOptions);
        var inviteBody = await inviteResponse.ReadApiResponseAsync<InvitationDto>();

        inviteResponse.StatusCode.Should().Be(HttpStatusCode.OK, because: await inviteResponse.Content.ReadAsStringAsync());
        inviteBody!.Success.Should().BeTrue();
        inviteBody.Data!.InvitationToken.Should().NotBeNullOrWhiteSpace();
        var token = inviteBody.Data.InvitationToken!;

        // Accept as employee (marketplace JWT is fine with isolation off)
        _client.ClearBearer();
        var (login, loginBody) = await _client.LoginAsync(employeeEmail, password);
        login.EnsureSuccessStatusCode();
        _client.UseBearer(loginBody!.Data!.AccessToken);

        var acceptContent = new StringContent(
            JsonSerializer.Serialize(token, HttpApiClientExtensions.JsonOptions),
            System.Text.Encoding.UTF8,
            "application/json");
        var accept = await _client.PostAsync("/api/v1/corporate/invitations/accept", acceptContent);
        var acceptBody = await accept.ReadApiResponseAsync<MembershipDto>();

        accept.StatusCode.Should().Be(HttpStatusCode.OK, because: await accept.Content.ReadAsStringAsync());
        acceptBody!.Success.Should().BeTrue();
        acceptBody.Data!.UserEmail.Should().Be(employeeEmail.ToLowerInvariant());
        acceptBody.Data.Role.Should().Be(CompanyRole.Employee);

        // Admin sees member
        _client.UseBearer(adminToken);
        var members = await _client.GetAsync($"/api/v1/corporate/companies/{companyId}/members?page=1&pageSize=50");
        var membersBody = await members.ReadApiResponseAsync<CompanyMembersDto>();

        members.StatusCode.Should().Be(HttpStatusCode.OK, because: await members.Content.ReadAsStringAsync());
        membersBody!.Data!.Members.Should().Contain(m =>
            m.UserEmail.Equals(employeeEmail, StringComparison.OrdinalIgnoreCase)
            && m.Role == CompanyRole.Employee
            && m.IsActive);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "CorporateLifecycle")]
    public async Task CH3_EmployeeBook_2WWhenFree_Succeeds()
    {
        var ctx = await SeedCompanyWithDualPoolAndEmployeeAsync("ch3");
        var (start, end) = WeekdayWindow();

        _client.UseBearer(ctx.EmployeeToken);
        var book = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee",
            new BookCorporateParkingDto(
                ctx.AllocationId,
                start,
                end,
                VehicleType.Motorcycle,
                "KA01BIKE1"),
            HttpApiClientExtensions.JsonOptions);
        var bookBody = await book.ReadApiResponseAsync<CorporateReservationResultDto>();

        book.StatusCode.Should().Be(HttpStatusCode.OK, because: await book.Content.ReadAsStringAsync());
        bookBody!.Success.Should().BeTrue(bookBody.Message);
        bookBody.Data!.Booking.Should().NotBeNull();
        bookBody.Data.Waitlist.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "CorporateLifecycle")]
    public async Task CH4_EmployeeBook_4WWhenFull_GoesToWaitlist()
    {
        var ctx = await SeedCompanyWithDualPoolAndEmployeeAsync(
            "ch4",
            twoWheelerSlots: 2,
            fourWheelerSlots: 1);

        var (start, end) = WeekdayWindow();

        // Fill the single 4W slot with admin self-book
        _client.UseBearer(ctx.AdminToken);
        var fill = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee",
            new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01FULL1"),
            HttpApiClientExtensions.JsonOptions);
        var fillBody = await fill.ReadApiResponseAsync<CorporateReservationResultDto>();
        fill.StatusCode.Should().Be(HttpStatusCode.OK, because: await fill.Content.ReadAsStringAsync());
        fillBody!.Data!.Booking.Should().NotBeNull("first 4W book should succeed");

        // Employee tries second 4W → waitlist
        _client.UseBearer(ctx.EmployeeToken);
        var book = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee",
            new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01WAIT1"),
            HttpApiClientExtensions.JsonOptions);
        var bookBody = await book.ReadApiResponseAsync<CorporateReservationResultDto>();

        book.StatusCode.Should().Be(HttpStatusCode.OK, because: await book.Content.ReadAsStringAsync());
        bookBody!.Success.Should().BeTrue(bookBody.Message);
        bookBody.Data!.Booking.Should().BeNull();
        bookBody.Data.Waitlist.Should().NotBeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "CorporateLifecycle")]
    public async Task CH5_CancelFreesSlot_AdminPromoteWaitlist_CreatesBooking()
    {
        var ctx = await SeedCompanyWithDualPoolAndEmployeeAsync(
            "ch5",
            twoWheelerSlots: 2,
            fourWheelerSlots: 1);
        var (start, end) = WeekdayWindow();

        // Fill sole 4W slot
        _client.UseBearer(ctx.AdminToken);
        var fill = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee",
            new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01ADM1"),
            HttpApiClientExtensions.JsonOptions);
        var fillBody = await fill.ReadApiResponseAsync<CorporateReservationResultDto>();
        fill.StatusCode.Should().Be(HttpStatusCode.OK, because: await fill.Content.ReadAsStringAsync());
        fillBody!.Data!.Booking.Should().NotBeNull();
        var adminMarketplaceBookingId = fillBody.Data.Booking!.BookingId;

        // Employee waitlisted on same 4W window
        _client.UseBearer(ctx.EmployeeToken);
        var wait = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/employee",
            new BookCorporateParkingDto(ctx.AllocationId, start, end, VehicleType.Car, "KA01WL1"),
            HttpApiClientExtensions.JsonOptions);
        var waitBody = await wait.ReadApiResponseAsync<CorporateReservationResultDto>();
        wait.StatusCode.Should().Be(HttpStatusCode.OK, because: await wait.Content.ReadAsStringAsync());
        waitBody!.Data!.Waitlist.Should().NotBeNull();
        var waitlistId = waitBody.Data.Waitlist!.Id;

        // Admin cancels own booking → frees pool capacity
        _client.UseBearer(ctx.AdminToken);
        var cancel = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/bookings/{adminMarketplaceBookingId}/cancel",
            new CancelBookingDto("Freeing slot for waitlist promote"),
            HttpApiClientExtensions.JsonOptions);
        cancel.StatusCode.Should().Be(HttpStatusCode.OK, because: await cancel.Content.ReadAsStringAsync());

        // Promote waitlist head
        var promote = await _client.PostAsync(
            $"/api/v1/corporate/companies/{ctx.CompanyId}/waitlist/{waitlistId}/promote",
            null);
        var promoteBody = await promote.ReadApiResponseAsync<CorporateReservationResultDto>();

        promote.StatusCode.Should().Be(HttpStatusCode.OK, because: await promote.Content.ReadAsStringAsync());
        promoteBody!.Success.Should().BeTrue(promoteBody.Message);
        promoteBody.Data!.Booking.Should().NotBeNull("promoted waitlist must become a confirmed booking");
        promoteBody.Data.Waitlist.Should().BeNull();
        promoteBody.Data.Booking!.BookingId.Should().NotBe(adminMarketplaceBookingId);
        promoteBody.Data.Booking.BookingStatus.Should().Be(BookingStatus.Confirmed);
    }

    private async Task<(string AdminEmail, Guid CompanyId, string AdminAccessToken)> BootstrapCompanyAsync(string prefix)
    {
        var (email, tokens) = await _client.RegisterUserAsync($"{prefix}_admin");
        _client.UseBearer(tokens.AccessToken);

        var (switchResp, switchBody) = await _client.SwitchChannelAsync("Corporate", bootstrap: true);
        switchResp.EnsureSuccessStatusCode();
        switchBody!.Data.Should().NotBeNull();
        _client.UseBearer(switchBody.Data!.AccessToken);

        var regNo = $"REG-{Guid.NewGuid():N}"[..20];
        var createResponse = await _client.PostAsJsonAsync(
            "/api/v1/corporate/companies",
            new CreateCompanyDto(
                $"IT Co {prefix} {Guid.NewGuid():N}"[..40],
                regNo,
                $"billing_{prefix}@it.parkease.test",
                "+919876543210",
                "1 Corporate Way, Bengaluru",
                BillingType.ReservedSlots),
            HttpApiClientExtensions.JsonOptions);
        var createBody = await createResponse.ReadApiResponseAsync<CreateCompanyResultDto>();

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created, because: await createResponse.Content.ReadAsStringAsync());
        createBody!.Success.Should().BeTrue();
        createBody.Data!.Company.Id.Should().NotBeEmpty();

        // Prefer re-minted session from create response; fall back to channel switch
        string adminToken;
        if (createBody.Data.Session is JsonElement sessionEl
            && sessionEl.ValueKind == JsonValueKind.Object
            && sessionEl.TryGetProperty("accessToken", out var at)
            && at.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(at.GetString()))
        {
            adminToken = at.GetString()!;
        }
        else if (createBody.Data.Session is TokenDto td && !string.IsNullOrWhiteSpace(td.AccessToken))
        {
            adminToken = td.AccessToken;
        }
        else
        {
            var (ch, chBody) = await _client.SwitchChannelAsync(
                "Corporate",
                companyId: createBody.Data.Company.Id);
            ch.EnsureSuccessStatusCode();
            adminToken = chBody!.Data!.AccessToken;
        }

        return (email, createBody.Data.Company.Id, adminToken);
    }

    private async Task<CorpBookContext> SeedCompanyWithDualPoolAndEmployeeAsync(
        string prefix,
        int twoWheelerSlots = 2,
        int fourWheelerSlots = 5)
    {
        var (_, companyId, adminToken) = await BootstrapCompanyAsync(prefix);
        _client.UseBearer(adminToken);

        // Company-owned parking
        var parkingDto = new
        {
            title = $"Corp Lot {prefix}",
            description = "Corporate owned dual-pool lot for HTTP IT.",
            address = "50 Corp Campus",
            city = "Bengaluru",
            state = "KA",
            country = "IN",
            postalCode = "560002",
            latitude = 12.98,
            longitude = 77.60,
            parkingType = ParkingType.Garage,
            totalSpots = twoWheelerSlots + fourWheelerSlots,
            hourlyRate = 0m,
            dailyRate = 0m,
            weeklyRate = 0m,
            monthlyRate = 0m,
            is24Hours = true,
            twoWheelerPhysicalSpots = twoWheelerSlots,
            fourWheelerPhysicalSpots = fourWheelerSlots
        };

        var parkResp = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces",
            parkingDto,
            HttpApiClientExtensions.JsonOptions);
        var parkBody = await parkResp.ReadApiResponseAsync<CorporateParkingSpaceDto>();
        parkResp.StatusCode.Should().Be(HttpStatusCode.Created, because: await parkResp.Content.ReadAsStringAsync());
        var spaceId = parkBody!.Data!.Id;

        var allocDto = new CreateOwnedParkingAllocationDto(
            ParkingSpaceId: spaceId,
            MonthlyRate: 0m,
            StartDate: DateTime.UtcNow.Date.AddDays(-1),
            EndDate: DateTime.UtcNow.Date.AddYears(1),
            Policy: new BookingPolicyDto(
                MaxBookingsPerEmployeePerDay: 5,
                MaxBookingsPerEmployeePerWeek: 20,
                PriorityThreshold: 1,
                AllowedStartTime: TimeSpan.FromHours(0),
                AllowedEndTime: TimeSpan.FromHours(23),
                AllowWeekends: true),
            TwoWheeler: new SlotPoolDto(twoWheelerSlots, 0, twoWheelerSlots),
            FourWheeler: new SlotPoolDto(fourWheelerSlots, 0, fourWheelerSlots));

        var allocResp = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/parking-spaces/{spaceId}/allocations",
            allocDto,
            HttpApiClientExtensions.JsonOptions);
        var allocBody = await allocResp.ReadApiResponseAsync<ParkingAllocationDto>();
        allocResp.StatusCode.Should().Be(HttpStatusCode.OK, because: await allocResp.Content.ReadAsStringAsync());
        var allocationId = allocBody!.Data!.Id;

        // Invite + accept employee
        var employeeEmail = $"emp_{prefix}_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        _client.ClearBearer();
        var (reg, _) = await _client.RegisterAsync(employeeEmail, password);
        reg.EnsureSuccessStatusCode();

        _client.UseBearer(adminToken);
        var inviteResponse = await _client.PostAsJsonAsync(
            $"/api/v1/corporate/companies/{companyId}/invitations",
            new InviteMemberDto(employeeEmail, CompanyRole.Employee),
            HttpApiClientExtensions.JsonOptions);
        var inviteBody = await inviteResponse.ReadApiResponseAsync<InvitationDto>();
        inviteResponse.EnsureSuccessStatusCode();
        var invToken = inviteBody!.Data!.InvitationToken!;

        _client.ClearBearer();
        var (login, loginBody) = await _client.LoginAsync(employeeEmail, password);
        login.EnsureSuccessStatusCode();
        _client.UseBearer(loginBody!.Data!.AccessToken);

        var acceptContent = new StringContent(
            JsonSerializer.Serialize(invToken, HttpApiClientExtensions.JsonOptions),
            System.Text.Encoding.UTF8,
            "application/json");
        var accept = await _client.PostAsync("/api/v1/corporate/invitations/accept", acceptContent);
        accept.EnsureSuccessStatusCode();

        // Bind employee to company channel for booking
        var (empSwitch, empSwitchBody) = await _client.SwitchChannelAsync("Corporate", companyId: companyId);
        empSwitch.EnsureSuccessStatusCode();
        var employeeToken = empSwitchBody!.Data!.AccessToken;

        return new CorpBookContext(companyId, allocationId, adminToken, employeeToken);
    }

    /// <summary>Next weekday 10:00–12:00 UTC so policy AllowWeekends still works but mirrors L2 fixtures.</summary>
    private static (DateTime Start, DateTime End) WeekdayWindow()
    {
        var day = DateTime.UtcNow.Date.AddDays(1);
        while (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            day = day.AddDays(1);
        var start = DateTime.SpecifyKind(day.AddHours(10), DateTimeKind.Utc);
        return (start, start.AddHours(2));
    }

    private sealed record CorpBookContext(
        Guid CompanyId,
        Guid AllocationId,
        string AdminToken,
        string EmployeeToken);
}
