using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using ParkingApp.API.Middleware;
using ParkingApp.IntegrationTests.Support;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// P0-2 — L4 channel isolation with <c>ChannelIsolation:Enabled=true</c>.
/// Automates core matrix rows C1–C5 (+ channel-context isolation signal).
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class ChannelIsolationHttpTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public ChannelIsolationHttpTests(FullApiPostgresFixture postgres)
    {
        _factory = new FullApiFactory(postgres.ConnectionString, channelIsolationEnabled: true);
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
    [Trait("Feature", "ChannelIsolation")]
    public async Task A1_ChannelContext_ReportsIsolationEnabled()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("iso_ctx");
        _client.UseBearer(tokens.AccessToken);

        var response = await _client.GetAsync("/api/auth/channel-context");
        var body = await response.ReadApiResponseAsync<ParkingApp.Identity.Application.DTOs.ChannelContextDto>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Data!.IsolationEnabled.Should().BeTrue();
        body.Data.Channel.Should().Be("Marketplace");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C1_Marketplace_CannotCallCorporateDashboard()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("iso_c1");
        _client.UseBearer(tokens.AccessToken);
        var companyId = Guid.NewGuid();

        var response = await _client.GetAsync($"/api/v1/corporate/companies/{companyId}/dashboard");

        await AssertChannelForbiddenAsync(response);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C2_CorporateBootstrap_CannotCreateMarketplaceBooking()
    {
        var corpTokens = await MintCorporateBootstrapAsync("iso_c2");
        _client.UseBearer(corpTokens);

        var response = await _client.PostAsJsonAsync("/api/bookings", new
        {
            parkingSpaceId = Guid.NewGuid(),
            startDateTime = DateTime.UtcNow.AddHours(1),
            endDateTime = DateTime.UtcNow.AddHours(3),
            vehicleNumber = "TEST1234"
        }, HttpApiClientExtensions.JsonOptions);

        await AssertChannelForbiddenAsync(response);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C3_CorporateBootstrap_CannotListFavorites()
    {
        var corpTokens = await MintCorporateBootstrapAsync("iso_c3");
        _client.UseBearer(corpTokens);

        var response = await _client.GetAsync("/api/favorites");

        await AssertChannelForbiddenAsync(response);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C4_CorporateBootstrap_CannotListMyListings()
    {
        var corpTokens = await MintCorporateBootstrapAsync("iso_c4");
        _client.UseBearer(corpTokens);

        var response = await _client.GetAsync("/api/parking/my-listings");

        await AssertChannelForbiddenAsync(response);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C5_Marketplace_CannotCreateCompany()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("iso_c5");
        _client.UseBearer(tokens.AccessToken);

        var response = await _client.PostAsJsonAsync("/api/v1/corporate/companies", new
        {
            name = "Iso Corp Ltd",
            registrationNumber = $"REG-{Guid.NewGuid():N}"[..20],
            contactEmail = tokens.User.Email,
            contactPhone = "+919876543210",
            billingAddress = "1 Isolation Street, Test City",
            billingType = 0
        }, HttpApiClientExtensions.JsonOptions);

        await AssertChannelForbiddenAsync(response);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ChannelIsolation")]
    public async Task C8_CorporateBootstrap_CannotAccessPayments()
    {
        var corpTokens = await MintCorporateBootstrapAsync("iso_c8");
        _client.UseBearer(corpTokens);

        var response = await _client.GetAsync($"/api/payments/{Guid.NewGuid()}");

        await AssertChannelForbiddenAsync(response);
    }

    private async Task<string> MintCorporateBootstrapAsync(string prefix)
    {
        var tokens = await _client.RegisterAndGetTokensAsync(prefix);
        _client.UseBearer(tokens.AccessToken);
        var (switchResponse, body) = await _client.SwitchChannelAsync("Corporate", bootstrap: true);
        switchResponse.EnsureSuccessStatusCode();
        body!.Success.Should().BeTrue();
        body.Data!.Channel.Should().Be("Corporate");
        return body.Data.AccessToken;
    }

    private static async Task AssertChannelForbiddenAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeFalse();
        root.GetProperty("code").GetString().Should().Be(ChannelAuthorizationMiddleware.ChannelForbiddenCode);

        if (root.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Array)
        {
            errors.EnumerateArray()
                .Select(e => e.GetString())
                .Should()
                .Contain(ChannelAuthorizationMiddleware.ChannelForbiddenCode);
        }
        else
        {
            json.Should().Contain(ChannelAuthorizationMiddleware.ChannelForbiddenCode);
        }
    }
}
