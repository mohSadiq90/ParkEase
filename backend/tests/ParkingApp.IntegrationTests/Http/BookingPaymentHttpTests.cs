using System.Net;
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
/// P0-3 — L4 marketplace book → pay (deterministic gateway) → check-in/out on FullApiFactory.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class BookingPaymentHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public BookingPaymentHttpTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "BookingPayment")]
    public async Task BH1_CreatePublicListing_ThenSearchFindsIt()
    {
        var vendor = await _client.RegisterAndGetTokensAsync("bh1_vendor");
        _client.UseBearer(vendor.AccessToken);

        var title = $"IT Driveway {Guid.NewGuid():N}"[..28];
        // Unique city avoids shared-DB pagination noise from other FullApi HTTP tests.
        var city = $"ITCity{Guid.NewGuid():N}"[..16];
        var space = await CreateInstantBookListingAsync(title, city: city);

        var byId = await _client.GetAsync($"/api/parking/{space.Id}");
        var byIdBody = await byId.ReadApiResponseAsync<ParkingSpaceDto>();
        byId.StatusCode.Should().Be(HttpStatusCode.OK);
        byIdBody!.Data!.Title.Should().Be(title);

        var search = await _client.GetAsync(
            $"/api/parking/search?city={Uri.EscapeDataString(city)}&page=1&pageSize=20");
        var body = await search.ReadApiResponseAsync<ParkingSearchResultDto>();

        search.StatusCode.Should().Be(HttpStatusCode.OK, because: await search.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue();
        body.Data!.ParkingSpaces.Should().Contain(p => p.Id == space.Id && p.Title == title);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH2_CreateBooking_InstantBook_ReturnsAwaitingPayment()
    {
        var (_, guest, spaceId) = await SeedVendorAndGuestListingAsync("bh2");

        _client.UseBearer(guest.AccessToken);
        var start = DateTime.UtcNow.AddMinutes(30);
        var end = start.AddHours(2);

        var (response, booking) = await CreateBookingAsync(spaceId, start, end);

        response.StatusCode.Should().Be(HttpStatusCode.Created, because: await response.Content.ReadAsStringAsync());
        booking.Should().NotBeNull();
        booking!.Success.Should().BeTrue();
        booking.Data.Should().NotBeNull();
        booking.Data!.Status.Should().Be(BookingStatus.AwaitingPayment);
        booking.Data.TotalAmount.Should().BeGreaterThan(0);
        booking.Data.ParkingSpaceId.Should().Be(spaceId);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH3_CreateOrder_Verify_ConfirmsBooking()
    {
        var (_, guest, spaceId) = await SeedVendorAndGuestListingAsync("bh3");
        _client.UseBearer(guest.AccessToken);

        var start = DateTime.UtcNow.AddMinutes(30);
        var end = start.AddHours(2);
        var (createResp, created) = await CreateBookingAsync(spaceId, start, end);
        createResp.EnsureSuccessStatusCode();
        var bookingId = created!.Data!.Id;

        var orderResponse = await _client.PostAsJsonAsync(
            "/api/payments/create-order",
            new { bookingId },
            HttpApiClientExtensions.JsonOptions);
        var orderBody = await orderResponse.ReadApiResponseAsync<string>();

        orderResponse.StatusCode.Should().Be(HttpStatusCode.OK, because: await orderResponse.Content.ReadAsStringAsync());
        orderBody!.Success.Should().BeTrue();
        orderBody.Data.Should().NotBeNullOrWhiteSpace();
        _factory.PaymentService.LastOrderId.Should().Be(orderBody.Data);

        var paymentId = $"pi_http_{Guid.NewGuid():N}"[..20];
        var verifyResponse = await _client.PostAsJsonAsync(
            "/api/payments/verify",
            new VerifyPaymentDto
            {
                BookingId = bookingId,
                RazorpayPaymentId = paymentId,
                RazorpayOrderId = orderBody.Data,
                RazorpaySignature = "test_sig"
            },
            HttpApiClientExtensions.JsonOptions);
        var verifyBody = await verifyResponse.ReadApiResponseAsync<PaymentResultDto>();

        verifyResponse.StatusCode.Should().Be(HttpStatusCode.OK, because: await verifyResponse.Content.ReadAsStringAsync());
        verifyBody!.Success.Should().BeTrue();
        verifyBody.Data!.Success.Should().BeTrue();
        verifyBody.Data.Status.Should().Be(PaymentStatus.Completed);

        var getBooking = await _client.GetAsync($"/api/bookings/{bookingId}");
        var bookingBody = await getBooking.ReadApiResponseAsync<BookingDto>();
        getBooking.StatusCode.Should().Be(HttpStatusCode.OK);
        bookingBody!.Data!.Status.Should().Be(BookingStatus.Confirmed);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH4_CheckIn_CheckOut_AndRejectDoubleCheckIn()
    {
        var bookingId = await SeedPaidConfirmedBookingAsync("bh4");

        var checkIn = await _client.PostAsync($"/api/bookings/{bookingId}/check-in", null);
        var checkInBody = await checkIn.ReadApiResponseAsync<BookingDto>();
        checkIn.StatusCode.Should().Be(HttpStatusCode.OK, because: await checkIn.Content.ReadAsStringAsync());
        checkInBody!.Data!.Status.Should().Be(BookingStatus.InProgress);
        checkInBody.Data.CheckInTime.Should().NotBeNull();

        var doubleCheckIn = await _client.PostAsync($"/api/bookings/{bookingId}/check-in", null);
        doubleCheckIn.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var checkOut = await _client.PostAsync($"/api/bookings/{bookingId}/check-out", null);
        var checkOutBody = await checkOut.ReadApiResponseAsync<BookingDto>();
        checkOut.StatusCode.Should().Be(HttpStatusCode.OK, because: await checkOut.Content.ReadAsStringAsync());
        checkOutBody!.Data!.Status.Should().Be(BookingStatus.Completed);
        checkOutBody.Data.CheckOutTime.Should().NotBeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH5_CancelBeforePay_FreesInventory()
    {
        var (_, guest, spaceId) = await SeedVendorAndGuestListingAsync("bh5");
        _client.UseBearer(guest.AccessToken);

        var start = DateTime.UtcNow.AddMinutes(30);
        var end = start.AddHours(2);
        var (createResp, created) = await CreateBookingAsync(spaceId, start, end);
        createResp.EnsureSuccessStatusCode();
        var bookingId = created!.Data!.Id;
        created.Data.Status.Should().Be(BookingStatus.AwaitingPayment);

        var cancel = await _client.PostAsJsonAsync(
            $"/api/bookings/{bookingId}/cancel",
            new CancelBookingDto("Changed plans"),
            HttpApiClientExtensions.JsonOptions);
        var cancelBody = await cancel.ReadApiResponseAsync<BookingDto>();

        cancel.StatusCode.Should().Be(HttpStatusCode.OK, because: await cancel.Content.ReadAsStringAsync());
        cancelBody!.Data!.Status.Should().Be(BookingStatus.Cancelled);

        // Same window should be bookable again by the same guest
        var (againResp, again) = await CreateBookingAsync(spaceId, start, end);
        againResp.StatusCode.Should().Be(HttpStatusCode.Created, because: await againResp.Content.ReadAsStringAsync());
        again!.Data!.Status.Should().Be(BookingStatus.AwaitingPayment);
        again.Data.Id.Should().NotBe(bookingId);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH6_Refund_Owner_Succeeds()
    {
        var bookingId = await SeedPaidConfirmedBookingAsync("bh6");

        var payGet = await _client.GetAsync($"/api/payments/booking/{bookingId}");
        var payBody = await payGet.ReadApiResponseAsync<PaymentDto>();
        payGet.StatusCode.Should().Be(HttpStatusCode.OK, because: await payGet.Content.ReadAsStringAsync());
        payBody!.Data.Should().NotBeNull();
        payBody.Data!.Status.Should().Be(PaymentStatus.Completed);
        var paymentId = payBody.Data.Id;
        var amount = payBody.Data.Amount;

        var refund = await _client.PostAsJsonAsync(
            "/api/payments/refund",
            new RefundRequestDto(paymentId, amount, "Customer cancelled after pay"),
            HttpApiClientExtensions.JsonOptions);
        var refundBody = await refund.ReadApiResponseAsync<RefundResultDto>();

        refund.StatusCode.Should().Be(HttpStatusCode.OK, because: await refund.Content.ReadAsStringAsync());
        refundBody!.Success.Should().BeTrue(refundBody.Message);
        refundBody.Data!.Success.Should().BeTrue();
        refundBody.Data.RefundedAmount.Should().Be(amount);

        var payAgain = await _client.GetAsync($"/api/payments/booking/{bookingId}");
        var payAfter = await payAgain.ReadApiResponseAsync<PaymentDto>();
        payAfter!.Data!.Status.Should().Be(PaymentStatus.Refunded);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "BookingPayment")]
    public async Task BH7_Refund_NonOwner_Unauthorized()
    {
        var bookingId = await SeedPaidConfirmedBookingAsync("bh7");

        var payGet = await _client.GetAsync($"/api/payments/booking/{bookingId}");
        var payBody = await payGet.ReadApiResponseAsync<PaymentDto>();
        payGet.EnsureSuccessStatusCode();
        var paymentId = payBody!.Data!.Id;
        var amount = payBody.Data.Amount;

        var attacker = await _client.RegisterAndGetTokensAsync("bh7_attacker");
        _client.UseBearer(attacker.AccessToken);

        var refund = await _client.PostAsJsonAsync(
            "/api/payments/refund",
            new RefundRequestDto(paymentId, amount, "Fraud attempt"),
            HttpApiClientExtensions.JsonOptions);

        refund.StatusCode.Should().Be(HttpStatusCode.BadRequest, because: await refund.Content.ReadAsStringAsync());
        var refundBody = await refund.ReadApiResponseAsync<RefundResultDto>();
        refundBody!.Success.Should().BeFalse();
        refundBody.Message.Should().Be("Unauthorized");
    }

    private async Task<Guid> SeedPaidConfirmedBookingAsync(string prefix)
    {
        var (_, guest, spaceId) = await SeedVendorAndGuestListingAsync(prefix);
        _client.UseBearer(guest.AccessToken);

        // Within check-in window (start − 1h … end)
        var start = DateTime.UtcNow.AddMinutes(20);
        var end = start.AddHours(2);
        var (createResp, created) = await CreateBookingAsync(spaceId, start, end);
        createResp.EnsureSuccessStatusCode();
        var bookingId = created!.Data!.Id;

        var orderResponse = await _client.PostAsJsonAsync(
            "/api/payments/create-order",
            new { bookingId },
            HttpApiClientExtensions.JsonOptions);
        var orderBody = await orderResponse.ReadApiResponseAsync<string>();
        orderResponse.EnsureSuccessStatusCode();

        var verifyResponse = await _client.PostAsJsonAsync(
            "/api/payments/verify",
            new VerifyPaymentDto
            {
                BookingId = bookingId,
                RazorpayPaymentId = $"pi_{prefix}_{Guid.NewGuid():N}"[..22],
                RazorpayOrderId = orderBody!.Data,
                RazorpaySignature = "ok"
            },
            HttpApiClientExtensions.JsonOptions);
        verifyResponse.EnsureSuccessStatusCode();
        return bookingId;
    }

    private async Task<(TokenDto Vendor, TokenDto Guest, Guid SpaceId)>
        SeedVendorAndGuestListingAsync(string prefix)
    {
        var vendor = await _client.RegisterAndGetTokensAsync($"{prefix}_vendor");
        _client.UseBearer(vendor.AccessToken);
        var space = await CreateInstantBookListingAsync($"IT Spot {prefix} {Guid.NewGuid():N}"[..30]);

        _client.ClearBearer();
        var guest = await _client.RegisterAndGetTokensAsync($"{prefix}_guest");
        return (vendor, guest, space.Id);
    }

    private async Task<ParkingSpaceDto> CreateInstantBookListingAsync(string title, string city = "Bengaluru")
    {
        // InstantBook=true → AwaitingPayment without vendor approve queue
        var dto = new
        {
            title,
            description = "Integration test public parking listing for book/pay/check-in.",
            address = "100 IT Test Road",
            city,
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.9716,
            longitude = 77.5946,
            parkingType = ParkingType.Open,
            totalSpots = 2,
            hourlyRate = 50m,
            dailyRate = 300m,
            weeklyRate = 1500m,
            monthlyRate = 5000m,
            openTime = (TimeSpan?)null,
            closeTime = (TimeSpan?)null,
            is24Hours = true,
            amenities = (List<string>?)null,
            allowedVehicleTypes = (List<VehicleType>?)null,
            imageUrls = (List<string>?)null,
            specialInstructions = (string?)null,
            zoneCode = (string?)null,
            isLprEnabled = false,
            isDynamicPricingEnabled = false,
            listingCategory = ListingCategory.Residential,
            instantBook = true
        };

        var response = await _client.PostAsJsonAsync("/api/parking", dto, HttpApiClientExtensions.JsonOptions);
        var body = await response.ReadApiResponseAsync<ParkingSpaceDto>();
        response.StatusCode.Should().Be(HttpStatusCode.Created, because: await response.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.InstantBook.Should().BeTrue();
        return body.Data;
    }

    private async Task<(HttpResponseMessage Response, ApiResponse<BookingDto>? Body)> CreateBookingAsync(
        Guid parkingSpaceId,
        DateTime startUtc,
        DateTime endUtc)
    {
        var dto = new CreateBookingDto(
            parkingSpaceId,
            startUtc,
            endUtc,
            PricingType.Hourly,
            VehicleType.Car,
            SlotNumber: null,
            VehicleNumber: "KA01IT1234",
            VehicleModel: "Test",
            VehicleColor: "Blue",
            DiscountCode: null);

        var response = await _client.PostAsJsonAsync("/api/bookings", dto, HttpApiClientExtensions.JsonOptions);
        var body = await response.ReadApiResponseAsync<BookingDto>();
        return (response, body);
    }
}
