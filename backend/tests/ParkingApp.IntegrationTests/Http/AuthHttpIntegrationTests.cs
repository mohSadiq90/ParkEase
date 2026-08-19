using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.IntegrationTests.Support;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// P0-1 — L4 Auth HTTP suite against real JWT + PostGIS (Testcontainers).
/// Covers register / login / refresh / me / corporate login / channel switch.
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class AuthHttpIntegrationTests : IDisposable
{
    private readonly FullApiFactory _factory;
    private readonly HttpClient _client;

    public AuthHttpIntegrationTests(FullApiPostgresFixture postgres)
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
    [Trait("Feature", "Auth")]
    public async Task AH1_Register_ValidBody_ReturnsCreatedWithMarketplaceTokens()
    {
        var email = $"reg_{Guid.NewGuid():N}@it.parkease.test";
        var (response, body) = await _client.RegisterAsync(email);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        body.Should().NotBeNull();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.Data.RefreshToken.Should().NotBeNullOrWhiteSpace();
        body.Data.Channel.Should().Be("Marketplace");
        body.Data.User.Email.Should().Be(email.ToLowerInvariant());
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH2_Login_GoodCredentials_ReturnsTokens()
    {
        var email = $"login_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        var (reg, _) = await _client.RegisterAsync(email, password);
        reg.EnsureSuccessStatusCode();

        var (response, body) = await _client.LoginAsync(email, password);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Success.Should().BeTrue();
        body.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.Data.Channel.Should().Be("Marketplace");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH3_Login_BadPassword_ReturnsUnauthorized()
    {
        var email = $"badpw_{Guid.NewGuid():N}@it.parkease.test";
        var (reg, _) = await _client.RegisterAsync(email);
        reg.EnsureSuccessStatusCode();

        var (response, body) = await _client.LoginAsync(email, "WrongPass1!");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body!.Success.Should().BeFalse();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH4_Refresh_ValidToken_ReturnsNewAccessAndPreservesChannel()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("refresh");

        var (response, body) = await _client.RefreshAsync(tokens.RefreshToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Success.Should().BeTrue();
        body.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.Data.AccessToken.Should().NotBe(tokens.AccessToken);
        body.Data.Channel.Should().Be("Marketplace");
        body.Data.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH5_Refresh_InvalidToken_ReturnsUnauthorized()
    {
        var (response, body) = await _client.RefreshAsync("not-a-valid-refresh-token");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body!.Success.Should().BeFalse();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH6_GetMe_WithToken_ReturnsProfile()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("me");
        tokens.AccessToken.Should().NotBeNullOrWhiteSpace();
        _client.UseBearer(tokens.AccessToken);

        var response = await _client.GetAsync("/api/users/me");
        var body = await response.ReadApiResponseAsync<UserDto>();

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: await response.Content.ReadAsStringAsync());
        body.Should().NotBeNull();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.Email.Should().Be(tokens.User.Email);
        body.Data.Id.Should().Be(tokens.User.Id);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH7_GetMe_WithoutToken_ReturnsUnauthorized()
    {
        _client.ClearBearer();
        var response = await _client.GetAsync("/api/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH8_CorporateLogin_NoMemberships_ReturnsBootstrapSession()
    {
        var email = $"corp_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        var (reg, _) = await _client.RegisterAsync(email, password);
        reg.EnsureSuccessStatusCode();

        var (response, body) = await _client.CorporateLoginAsync(email, password);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.IsBootstrap.Should().BeTrue();
        body.Data.Session.Should().NotBeNull();
        body.Data.Session!.Channel.Should().Be("Corporate");
        body.Data.Session.CompanyId.Should().BeNull();
        body.Data.Session.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH9_SwitchChannel_MarketplaceToCorporateBootstrap_RemintsTokens()
    {
        var tokens = await _client.RegisterAndGetTokensAsync("switch");
        _client.UseBearer(tokens.AccessToken);

        var (response, body) = await _client.SwitchChannelAsync("Corporate", bootstrap: true);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: await response.Content.ReadAsStringAsync());
        body.Should().NotBeNull("channel switch must return a JSON ApiResponse body");
        body!.Success.Should().BeTrue();
        body.Data!.Channel.Should().Be("Corporate");
        body.Data.IsBootstrap.Should().BeTrue();
        body.Data.AccessToken.Should().NotBe(tokens.AccessToken);

        // Channel context reflects isolation flag (off in this factory)
        _client.UseBearer(body.Data.AccessToken);
        var ctxResponse = await _client.GetAsync("/api/auth/channel-context");
        var ctx = await ctxResponse.ReadApiResponseAsync<ChannelContextDto>();
        ctxResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        ctx!.Data!.Channel.Should().Be("Corporate");
        ctx.Data.IsBootstrap.Should().BeTrue();
        ctx.Data.IsolationEnabled.Should().BeFalse();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "Auth")]
    public async Task AH10_Register_DuplicateEmail_ReturnsBadRequest()
    {
        var email = $"dup_{Guid.NewGuid():N}@it.parkease.test";
        var (first, _) = await _client.RegisterAsync(email);
        first.EnsureSuccessStatusCode();

        var (second, body) = await _client.RegisterAsync(email);

        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Success.Should().BeFalse();
    }
}
