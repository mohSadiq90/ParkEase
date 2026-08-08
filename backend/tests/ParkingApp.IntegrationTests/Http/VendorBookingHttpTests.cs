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
/// R8 — L4 vendor approve/reject for non-instant-book marketplace listings.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class VendorBookingHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public VendorBookingHttpTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "VendorBooking")]
    public async Task VB1_Approve_Pending_ToAwaitingPayment()
    {
        var ctx = await SeedPendingBookingAsync("vb1");

        _client.UseBearer(ctx.Vendor.AccessToken);
        var approve = await _client.PostAsync($"/api/bookings/{ctx.BookingId}/approve", null);
        var body = await approve.ReadApiResponseAsync<BookingDto>();

        approve.StatusCode.Should().Be(HttpStatusCode.OK, because: await approve.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue(body.Message);
        body.Data!.Status.Should().Be(BookingStatus.AwaitingPayment);

        // Guest can now create a payment order
        _client.UseBearer(ctx.Guest.AccessToken);
        var order = await _client.PostAsJsonAsync(
            "/api/payments/create-order",
            new { bookingId = ctx.BookingId },
            HttpApiClientExtensions.JsonOptions);
        order.StatusCode.Should().Be(HttpStatusCode.OK, because: await order.Content.ReadAsStringAsync());
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "VendorBooking")]
    public async Task VB2_Reject_Pending_ToRejected()
    {
        var ctx = await SeedPendingBookingAsync("vb2");

        _client.UseBearer(ctx.Vendor.AccessToken);
        var reject = await _client.PostAsJsonAsync(
            $"/api/bookings/{ctx.BookingId}/reject",
            new { reason = "Not available that day" },
            HttpApiClientExtensions.JsonOptions);
        var body = await reject.ReadApiResponseAsync<BookingDto>();

        reject.StatusCode.Should().Be(HttpStatusCode.OK, because: await reject.Content.ReadAsStringAsync());
        body!.Data!.Status.Should().Be(BookingStatus.Rejected);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "VendorBooking")]
    public async Task VB3_NonOwner_CannotApprove()
    {
        var ctx = await SeedPendingBookingAsync("vb3");
        var stranger = await _client.RegisterAndGetTokensAsync("vb3_stranger");

        _client.UseBearer(stranger.AccessToken);
        var approve = await _client.PostAsync($"/api/bookings/{ctx.BookingId}/approve", null);

        approve.StatusCode.Should().Be(HttpStatusCode.BadRequest, because: await approve.Content.ReadAsStringAsync());
        var body = await approve.ReadApiResponseAsync<BookingDto>();
        body!.Success.Should().BeFalse();
    }

    private async Task<PendingCtx> SeedPendingBookingAsync(string prefix)
    {
        var vendor = await _client.RegisterAndGetTokensAsync($"{prefix}_vendor");
        _client.UseBearer(vendor.AccessToken);

        // Commercial + InstantBook false → guest booking stays Pending for vendor queue
        var listing = new
        {
            title = $"Vendor Lot {prefix} {Guid.NewGuid():N}"[..28],
            description = "Non-instant commercial listing for vendor approve/reject IT.",
            address = "200 Vendor Road",
            city = "Bengaluru",
            state = "KA",
            country = "IN",
            postalCode = "560001",
            latitude = 12.97,
            longitude = 77.59,
            parkingType = ParkingType.Garage,
            totalSpots = 3,
            hourlyRate = 80m,
            dailyRate = 400m,
            weeklyRate = 2000m,
            monthlyRate = 7000m,
            is24Hours = true,
            listingCategory = ListingCategory.Commercial,
            instantBook = false
        };

        var createSpace = await _client.PostAsJsonAsync("/api/parking", listing, HttpApiClientExtensions.JsonOptions);
        var spaceBody = await createSpace.ReadApiResponseAsync<ParkingSpaceDto>();
        createSpace.StatusCode.Should().Be(HttpStatusCode.Created, because: await createSpace.Content.ReadAsStringAsync());
        spaceBody!.Data!.InstantBook.Should().BeFalse();
        var spaceId = spaceBody.Data.Id;

        _client.ClearBearer();
        var guest = await _client.RegisterAndGetTokensAsync($"{prefix}_guest");
        _client.UseBearer(guest.AccessToken);

        var start = DateTime.UtcNow.AddHours(2);
        var end = start.AddHours(2);
        var bookResp = await _client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingDto(
                spaceId,
                start,
                end,
                PricingType.Hourly,
                VehicleType.Car,
                null,
                "KA01VB1234",
                "Test",
                "Red",
                null),
            HttpApiClientExtensions.JsonOptions);
        var bookBody = await bookResp.ReadApiResponseAsync<BookingDto>();
        bookResp.StatusCode.Should().Be(HttpStatusCode.Created, because: await bookResp.Content.ReadAsStringAsync());
        bookBody!.Data!.Status.Should().Be(BookingStatus.Pending);

        return new PendingCtx(vendor, guest, spaceId, bookBody.Data.Id);
    }

    private sealed record PendingCtx(TokenDto Vendor, TokenDto Guest, Guid SpaceId, Guid BookingId);
}
