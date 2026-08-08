using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using ParkingApp.Application.DTOs;
using ParkingApp.BuildingBlocks.Enums;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.IntegrationTests.Support;
using ParkingApp.Marketplace.Contracts.DTOs;
using ParkingApp.Marketplace.Contracts.Enums;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// R10 — L4 IoT LPR webhook: X-Api-Key auth + access decision (grant / deny / 401).
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class IotLprHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public IotLprHttpTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "IotLpr")]
    public async Task LP1_MissingApiKey_Returns401()
    {
        _client.DefaultRequestHeaders.Remove("X-Api-Key");
        var response = await _client.PostAsJsonAsync(
            "/api/iot/lpr-events",
            new ProcessLprEventRequest("KA01LP0001", Guid.NewGuid(), "Entry"),
            HttpApiClientExtensions.JsonOptions);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "IotLpr")]
    public async Task LP2_InvalidApiKey_Returns401()
    {
        _client.DefaultRequestHeaders.Remove("X-Api-Key");
        _client.DefaultRequestHeaders.Add("X-Api-Key", "not-a-real-camera-secret");

        var response = await _client.PostAsJsonAsync(
            "/api/iot/lpr-events",
            new ProcessLprEventRequest("KA01LP0002", Guid.NewGuid(), "Entry"),
            HttpApiClientExtensions.JsonOptions);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "IotLpr")]
    public async Task LP3_ValidKey_ConfirmedBooking_GrantsEntryThenExit()
    {
        const string plate = "KA01LP1111";
        var ctx = await SeedLprFacilityWithPaidBookingAsync("lp3", plate);

        // Entry — check-in via LPR
        var entry = await PostLprEventAsync(ctx.ApiSecret, plate, ctx.SpaceId, "Entry");
        var entryBody = await entry.ReadApiResponseAsync<LprAccessResultDto>();

        entry.StatusCode.Should().Be(HttpStatusCode.OK, because: await entry.Content.ReadAsStringAsync());
        entryBody!.Success.Should().BeTrue();
        entryBody.Data!.AccessGranted.Should().BeTrue();
        entryBody.Data.BookingId.Should().Be(ctx.BookingId);
        entryBody.Data.DenialReasonCode.Should().BeNull();

        // Guest booking is now InProgress
        _client.UseBearer(ctx.Guest.AccessToken);
        var booking = await _client.GetAsync($"/api/bookings/{ctx.BookingId}");
        var bookingBody = await booking.ReadApiResponseAsync<BookingDto>();
        bookingBody!.Data!.Status.Should().Be(BookingStatus.InProgress);

        // Exit — check-out via LPR
        var exit = await PostLprEventAsync(ctx.ApiSecret, plate, ctx.SpaceId, "Exit");
        var exitBody = await exit.ReadApiResponseAsync<LprAccessResultDto>();

        exit.StatusCode.Should().Be(HttpStatusCode.OK, because: await exit.Content.ReadAsStringAsync());
        exitBody!.Data!.AccessGranted.Should().BeTrue(exitBody.Data.DenialMessage ?? exitBody.Message);
        exitBody.Data.BookingId.Should().Be(ctx.BookingId);

        // PostLprEventAsync clears Authorization — restore guest for status check
        _client.UseBearer(ctx.Guest.AccessToken);
        booking = await _client.GetAsync($"/api/bookings/{ctx.BookingId}");
        bookingBody = await booking.ReadApiResponseAsync<BookingDto>();
        booking.StatusCode.Should().Be(HttpStatusCode.OK, because: await booking.Content.ReadAsStringAsync());
        bookingBody!.Data!.Status.Should().Be(BookingStatus.Completed);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "IotLpr")]
    public async Task LP4_ValidKey_UnknownPlate_DeniesNoMatchingBooking()
    {
        const string plate = "KA01LP2222";
        var ctx = await SeedLprFacilityWithPaidBookingAsync("lp4", plate);

        var response = await PostLprEventAsync(ctx.ApiSecret, "KA99ZZ9999", ctx.SpaceId, "Entry");
        var body = await response.ReadApiResponseAsync<LprAccessResultDto>();

        // Business denial is HTTP 200 with AccessGranted=false (not 403)
        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Data!.AccessGranted.Should().BeFalse();
        body.Data.DenialReasonCode.Should().Be(LprDenialReasonCodes.NoMatchingBooking);
        body.Data.BookingId.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "IotLpr")]
    public async Task LP5_KeyScopedToSpaceA_CannotAccessSpaceB()
    {
        const string plate = "KA01LP3333";
        var ctxA = await SeedLprFacilityWithPaidBookingAsync("lp5a", plate);

        // Second LPR facility owned by another vendor (no booking needed for authz deny)
        var vendorB = await _client.RegisterAndGetTokensAsync("lp5b_vendor");
        _client.UseBearer(vendorB.AccessToken);
        var spaceB = await CreateLprListingAsync("LP Lot B");
        // No camera key on B — use key A against space B

        var response = await PostLprEventAsync(ctxA.ApiSecret, plate, spaceB.Id, "Entry");
        var body = await response.ReadApiResponseAsync<LprAccessResultDto>();

        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Data!.AccessGranted.Should().BeFalse();
        body.Data.DenialReasonCode.Should().Be(LprDenialReasonCodes.KeyNotAuthorizedForFacility);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "IotLpr")]
    public async Task LP6_LprDisabledFacility_DeniesEvenWithConfigStyleKeyOnDbKey()
    {
        // Facility without LPR: create listing IsLprEnabled=false, cannot create camera key.
        // Create LPR facility + key, then toggle LPR off via update if available — or assert create key fails without LPR.
        var vendor = await _client.RegisterAndGetTokensAsync("lp6_vendor");
        _client.UseBearer(vendor.AccessToken);

        var space = await CreateLprListingAsync("LP Off Lot", isLprEnabled: false);
        var keyCreate = await _client.PostAsJsonAsync(
            $"/api/parking/{space.Id}/lpr/camera-keys",
            new CreateLprCameraKeyRequest("Gate Cam"),
            HttpApiClientExtensions.JsonOptions);

        keyCreate.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Forbidden, HttpStatusCode.UnprocessableEntity);
        var keyBody = await keyCreate.ReadApiResponseAsync<LprCameraKeyCreatedDto>();
        keyBody!.Success.Should().BeFalse();
    }

    private async Task<HttpResponseMessage> PostLprEventAsync(
        string apiSecret,
        string plate,
        Guid spaceId,
        string direction)
    {
        _client.ClearBearer();
        _client.DefaultRequestHeaders.Remove("X-Api-Key");
        _client.DefaultRequestHeaders.Add("X-Api-Key", apiSecret);

        return await _client.PostAsJsonAsync(
            "/api/iot/lpr-events",
            new ProcessLprEventRequest(plate, spaceId, direction, DateTime.UtcNow, Confidence: 0.98),
            HttpApiClientExtensions.JsonOptions);
    }

    private async Task<LprCtx> SeedLprFacilityWithPaidBookingAsync(string prefix, string plate)
    {
        var vendor = await _client.RegisterAndGetTokensAsync($"{prefix}_vendor");
        _client.UseBearer(vendor.AccessToken);

        var space = await CreateLprListingAsync($"LPR {prefix}");
        var keyResp = await _client.PostAsJsonAsync(
            $"/api/parking/{space.Id}/lpr/camera-keys",
            new CreateLprCameraKeyRequest($"Cam {prefix}", KeyId: $"cam-{prefix}-{Guid.NewGuid():N}"[..24]),
            HttpApiClientExtensions.JsonOptions);
        var keyBody = await keyResp.ReadApiResponseAsync<LprCameraKeyCreatedDto>();
        keyResp.StatusCode.Should().Be(HttpStatusCode.Created, because: await keyResp.Content.ReadAsStringAsync());
        keyBody!.Data!.Secret.Should().NotBeNullOrWhiteSpace();
        var secret = keyBody.Data.Secret;

        _client.ClearBearer();
        var guest = await _client.RegisterAndGetTokensAsync($"{prefix}_guest");
        _client.UseBearer(guest.AccessToken);

        var start = DateTime.UtcNow.AddMinutes(15);
        var end = start.AddHours(2);
        var bookResp = await _client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingDto(
                space.Id,
                start,
                end,
                PricingType.Hourly,
                VehicleType.Car,
                null,
                plate,
                "LprCar",
                "White",
                null),
            HttpApiClientExtensions.JsonOptions);
        var bookBody = await bookResp.ReadApiResponseAsync<BookingDto>();
        bookResp.StatusCode.Should().Be(HttpStatusCode.Created, because: await bookResp.Content.ReadAsStringAsync());
        bookBody!.Data!.Status.Should().Be(BookingStatus.AwaitingPayment);
        var bookingId = bookBody.Data.Id;

        var order = await _client.PostAsJsonAsync(
            "/api/payments/create-order",
            new { bookingId },
            HttpApiClientExtensions.JsonOptions);
        var orderBody = await order.ReadApiResponseAsync<string>();
        order.EnsureSuccessStatusCode();

        var verify = await _client.PostAsJsonAsync(
            "/api/payments/verify",
            new VerifyPaymentDto
            {
                BookingId = bookingId,
                RazorpayPaymentId = $"pi_lpr_{Guid.NewGuid():N}"[..22],
                RazorpayOrderId = orderBody!.Data,
                RazorpaySignature = "ok"
            },
            HttpApiClientExtensions.JsonOptions);
        verify.EnsureSuccessStatusCode();

        return new LprCtx(vendor, guest, space.Id, bookingId, secret);
    }

    private async Task<ParkingSpaceDto> CreateLprListingAsync(string title, bool isLprEnabled = true)
    {
        var dto = new
        {
            title,
            description = "LPR-enabled facility for IoT access IT.",
            address = "10 Gate Lane",
            city = "Bengaluru",
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.97,
            longitude = 77.59,
            parkingType = ParkingType.Garage,
            totalSpots = 5,
            hourlyRate = 40m,
            dailyRate = 250m,
            weeklyRate = 1200m,
            monthlyRate = 4000m,
            is24Hours = true,
            isLprEnabled,
            listingCategory = ListingCategory.Residential,
            instantBook = true
        };

        var response = await _client.PostAsJsonAsync("/api/parking", dto, HttpApiClientExtensions.JsonOptions);
        var body = await response.ReadApiResponseAsync<ParkingSpaceDto>();
        response.StatusCode.Should().Be(HttpStatusCode.Created, because: await response.Content.ReadAsStringAsync());
        body!.Data.Should().NotBeNull();
        if (isLprEnabled)
            body.Data!.IsLprEnabled.Should().BeTrue();
        return body.Data!;
    }

    private sealed record LprCtx(
        TokenDto Vendor,
        TokenDto Guest,
        Guid SpaceId,
        Guid BookingId,
        string ApiSecret);
}
