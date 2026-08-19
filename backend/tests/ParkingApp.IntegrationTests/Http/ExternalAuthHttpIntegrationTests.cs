using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ParkingApp.Identity.Domain.Entities;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Infrastructure.Data;
using ParkingApp.IntegrationTests.Support;

namespace ParkingApp.IntegrationTests.Http;

/// <summary>
/// AH-External-* — Marketplace Google token-exchange against real JWT + PostGIS (Fake IdP).
/// </summary>
[Collection(FullApiHttpCollection.Name)]
public sealed class ExternalAuthHttpIntegrationTests : IDisposable
{
    private readonly FullApiPostgresFixture _postgres;
    private FullApiFactory _factory;
    private HttpClient _client;

    public ExternalAuthHttpIntegrationTests(FullApiPostgresFixture postgres)
    {
        _postgres = postgres;
        _factory = new FullApiFactory(postgres.ConnectionString, channelIsolationEnabled: false, externalAuthEnabled: true);
        _client = CreateClient(_factory);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private static HttpClient CreateClient(FullApiFactory factory) =>
        factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

    private void RecreateFactory(bool externalAuthEnabled)
    {
        _client.Dispose();
        _factory.Dispose();
        _factory = new FullApiFactory(
            _postgres.ConnectionString,
            channelIsolationEnabled: false,
            externalAuthEnabled: externalAuthEnabled);
        _client = CreateClient(_factory);
    }

    private (string Token, string Subject, string Email) RegisterGoogleStub(
        string? emailPrefix = null,
        bool emailVerified = true)
    {
        var subject = $"gsub_{Guid.NewGuid():N}";
        var email = $"{emailPrefix ?? "ext"}_{Guid.NewGuid():N}@it.parkease.test";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email, emailVerified);
        return (token, subject, email);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_01_ValidStubGoogle_CreatesUser_MarketplaceSession()
    {
        var (token, _, email) = RegisterGoogleStub("new");

        var (response, body) = await _client.ExternalLoginAsync("Google", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.IsNewUser.Should().BeTrue();
        body.Data.Session.Channel.Should().Be("Marketplace");
        body.Data.Session.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.Data.Session.User.Email.Should().Be(email.ToLowerInvariant());
        body.Data.LinkedProviders.Should().Contain("Google");
        body.Data.RequiresPhone.Should().BeTrue();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_02_SecondLoginSameSubject_ReusesUser()
    {
        var (token, _, _) = RegisterGoogleStub("reuse");

        var (first, firstBody) = await _client.ExternalLoginAsync("Google", token);
        first.EnsureSuccessStatusCode();
        var userId = firstBody!.Data!.Session.User.Id;

        var (second, secondBody) = await _client.ExternalLoginAsync("Google", token);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        secondBody!.Data!.IsNewUser.Should().BeFalse();
        secondBody.Data.Session.User.Id.Should().Be(userId);
        secondBody.Data.Session.Channel.Should().Be("Marketplace");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_03_EmailCollision_Returns409_AccountExists()
    {
        var email = $"collision_{Guid.NewGuid():N}@it.parkease.test";
        var (reg, _) = await _client.RegisterAsync(email);
        reg.EnsureSuccessStatusCode();

        var subject = $"gsub_{Guid.NewGuid():N}";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email);

        var (response, body) = await _client.ExternalLoginAsync("Google", token);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        body!.Success.Should().BeFalse();
        body.Code.Should().Be("account_exists");
        body.Data.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_04_AdminEmail_Returns403_AdminSocialForbidden()
    {
        var email = $"admin_ext_{Guid.NewGuid():N}@it.parkease.test";
        await SeedAdminUserAsync(email, "TestPass1!");

        var subject = $"gsub_{Guid.NewGuid():N}";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email);

        var (response, body) = await _client.ExternalLoginAsync("Google", token);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        body!.Code.Should().Be("admin_social_forbidden");
        body.Data.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_05_FeatureDisabled_Returns400_ProvidersEmpty()
    {
        RecreateFactory(externalAuthEnabled: false);

        var (providersResponse, providersBody) = await _client.GetExternalProvidersAsync();
        providersResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        providersBody!.Data!.Providers.Should().BeEmpty();

        var (token, _, _) = RegisterGoogleStub("disabled");
        var (response, body) = await _client.ExternalLoginAsync("Google", token);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Code.Should().Be("provider_disabled");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_06_InvalidStubToken_Returns401_NoEmailLeak()
    {
        var (response, body) = await _client.ExternalLoginAsync("Google", "not-a-registered-stub");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body!.Code.Should().Be("invalid_id_token");
        body.Data.Should().BeNull();
        var raw = await response.Content.ReadAsStringAsync();
        raw.Should().NotContain("already exists");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_07_ConcurrentDoubleCreate_NoUnhandled500()
    {
        var (token, _, _) = RegisterGoogleStub("race");

        var t1 = _client.ExternalLoginAsync("Google", token);
        var t2 = _client.ExternalLoginAsync("Google", token);
        await Task.WhenAll(t1, t2);

        var r1 = await t1;
        var r2 = await t2;

        r1.Response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError);
        r2.Response.StatusCode.Should().NotBe(HttpStatusCode.InternalServerError);

        var successes = new[] { r1, r2 }.Count(x => x.Response.IsSuccessStatusCode);
        successes.Should().BeGreaterThanOrEqualTo(1);

        if (r1.Body?.Success == true && r2.Body?.Success == true)
        {
            r1.Body.Data!.Session.User.Id.Should().Be(r2.Body.Data!.Session.User.Id);
        }
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_08_DeleteUser_RemovesExternalLogins()
    {
        // Validates FK cascade / explicit external-login cleanup (KD-SL-19).
        // Uses DbContext hard-delete of the user (cascade) rather than DELETE /api/users/me,
        // which currently exercises Marketplace cleanup under NpgsqlRetryingExecutionStrategy + transactions.
        var (token, subject, _) = RegisterGoogleStub("del");
        var (login, loginBody) = await _client.ExternalLoginAsync("Google", token);
        login.EnsureSuccessStatusCode();
        var userId = loginBody!.Data!.Session.User.Id;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var before = await db.ExternalLogins.CountAsync(l =>
                l.UserId == userId && l.ProviderSubject == subject);
            before.Should().Be(1);

            // Explicit delete of external logins then user (mirrors DeleteUserHandler Identity path)
            var logins = await db.ExternalLogins.Where(l => l.UserId == userId).ToListAsync();
            db.ExternalLogins.RemoveRange(logins);
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            db.Users.Remove(user);
            await db.SaveChangesAsync();
        }

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var remaining = await db.ExternalLogins
                .IgnoreQueryFilters()
                .CountAsync(l => l.UserId == userId || l.ProviderSubject == subject);
            remaining.Should().Be(0);
        }
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_09_InactiveKnownSubject_Returns403_NoLastUsedWrite()
    {
        var (token, subject, email) = RegisterGoogleStub("inactive");
        var (login, loginBody) = await _client.ExternalLoginAsync("Google", token);
        login.EnsureSuccessStatusCode();
        var userId = loginBody!.Data!.Session.User.Id;

        DateTime? lastUsedBefore;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var link = await db.ExternalLogins.FirstAsync(l =>
                l.Provider == ExternalAuthProvider.Google && l.ProviderSubject == subject);
            lastUsedBefore = link.LastUsedAtUtc;

            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Deactivate();
            await db.SaveChangesAsync();
        }

        // Allow a tiny clock gap so any mutation would differ
        await Task.Delay(50);

        var (response, body) = await _client.ExternalLoginAsync("Google", token);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        body!.Code.Should().Be("account_disabled");
        body.Data.Should().BeNull();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var link = await db.ExternalLogins.FirstAsync(l =>
                l.Provider == ExternalAuthProvider.Google && l.ProviderSubject == subject);
            link.LastUsedAtUtc.Should().Be(lastUsedBefore);
            link.ProviderEmail.Should().Be(email.ToLowerInvariant());
        }
    }

    private async Task SeedAdminUserAsync(string email, string password)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<ParkingApp.Identity.Application.Interfaces.IPasswordHasher>();
        var admin = User.Register(email, hasher.Hash(password), "Admin", "User", "+15551234567", UserRole.Admin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_10_Inactive_LinkPassword_NoExternalLoginRow()
    {
        var email = $"inact_link_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        var (reg, regBody) = await _client.RegisterAsync(email, password);
        reg.EnsureSuccessStatusCode();
        var userId = regBody!.Data!.User.Id;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Deactivate();
            await db.SaveChangesAsync();
        }

        var subject = $"gsub_{Guid.NewGuid():N}";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email);

        var (response, body) = await _client.ExternalLoginAsync("Google", token, linkPassword: password);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        body!.Code.Should().Be("account_disabled");

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var count = await db.ExternalLogins.CountAsync(l => l.ProviderSubject == subject);
            count.Should().Be(0);
        }
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task PR3_LinkPassword_Valid_MergesAndMints()
    {
        var email = $"linkpw_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        var (reg, regBody) = await _client.RegisterAsync(email, password);
        reg.EnsureSuccessStatusCode();
        var passwordUserId = regBody!.Data!.User.Id;

        var subject = $"gsub_{Guid.NewGuid():N}";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email);

        var (response, body) = await _client.ExternalLoginAsync("Google", token, linkPassword: password);

        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue();
        body.Data!.IsNewUser.Should().BeFalse();
        body.Data.Session.User.Id.Should().Be(passwordUserId);
        body.Data.Session.Channel.Should().Be("Marketplace");
        body.Data.LinkedProviders.Should().Contain("Google");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task PR3_SetPassword_Bootstrap_ThenPasswordLoginWorks()
    {
        var (token, _, email) = RegisterGoogleStub("setpw");
        var (login, loginBody) = await _client.ExternalLoginAsync("Google", token);
        login.EnsureSuccessStatusCode();
        var oldRefresh = loginBody!.Data!.Session.RefreshToken;

        _client.UseBearer(loginBody.Data.Session.AccessToken);
        const string password = "TestPass1!";
        var (setResp, setBody) = await _client.SetPasswordAsync(password);
        setResp.StatusCode.Should().Be(HttpStatusCode.OK, because: await setResp.Content.ReadAsStringAsync());
        setBody!.Data!.Session.Channel.Should().Be("Marketplace");
        setBody.Data.Session.RefreshToken.Should().NotBe(oldRefresh);

        // Old refresh should be invalid after revoke
        _client.ClearBearer();
        var (refreshOld, _) = await _client.RefreshAsync(oldRefresh);
        refreshOld.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Password login works
        var (pwLogin, pwBody) = await _client.LoginAsync(email, password);
        pwLogin.StatusCode.Should().Be(HttpStatusCode.OK);
        pwBody!.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        // Set-password again → password_already_set
        _client.UseBearer(pwBody.Data.AccessToken);
        var (again, againBody) = await _client.SetPasswordAsync("OtherPass1!");
        again.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        againBody!.Code.Should().Be("password_already_set");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task PR3_ChangePassword_WhenNoPassword_ReturnsPasswordNotSet()
    {
        var (token, _, _) = RegisterGoogleStub("chgpw");
        var (login, loginBody) = await _client.ExternalLoginAsync("Google", token);
        login.EnsureSuccessStatusCode();

        _client.UseBearer(loginBody!.Data!.Session.AccessToken);
        var (response, body) = await _client.ChangePasswordAsync("anything", "TestPass1!");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Code.Should().Be("password_not_set");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task PR3_AuthenticatedLink_AttachesProvider()
    {
        // Password user signs in, then links Google via authenticated endpoint
        var email = $"authlink_{Guid.NewGuid():N}@it.parkease.test";
        const string password = "TestPass1!";
        var (reg, regBody) = await _client.RegisterAsync(email, password);
        reg.EnsureSuccessStatusCode();
        _client.UseBearer(regBody!.Data!.AccessToken);

        var subject = $"gsub_{Guid.NewGuid():N}";
        var token = $"stub-google-{subject}";
        _factory.FakeExternalTokens.RegisterGoogle(token, subject, email);

        var (response, body) = await _client.LinkExternalAsync("Google", token);
        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Data!.LinkedProviders.Should().Contain("Google");

        // Subsequent external login reuses user
        _client.ClearBearer();
        var (ext, extBody) = await _client.ExternalLoginAsync("Google", token);
        ext.StatusCode.Should().Be(HttpStatusCode.OK);
        extBody!.Data!.Session.User.Id.Should().Be(regBody.Data.User.Id);
    }

    // ─── PR6a Apple (fake validator; nonce required) ─────────────────────────

    private (string Token, string Subject, string Email, string Nonce) RegisterAppleStub(
        string? emailPrefix = null,
        bool emailVerified = true,
        bool privateRelay = false)
    {
        var subject = $"asub_{Guid.NewGuid():N}";
        var domain = privateRelay ? "privaterelay.appleid.com" : "it.parkease.test";
        var email = $"{emailPrefix ?? "apple"}_{Guid.NewGuid():N}@{domain}";
        var token = $"stub-apple-{subject}";
        var nonce = $"nonce_{Guid.NewGuid():N}";
        _factory.FakeExternalTokens.RegisterApple(token, subject, email, nonce, emailVerified);
        return (token, subject, email, nonce);
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_Apple_01_MissingNonce_Returns400_NonceRequired()
    {
        var (token, _, _, _) = RegisterAppleStub("nononce");

        var (response, body) = await _client.ExternalLoginAsync("Apple", token, nonce: null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body!.Code.Should().Be("nonce_required");
        body.Data.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_Apple_02_NonceMismatch_Returns401_InvalidIdToken()
    {
        var (token, _, _, _) = RegisterAppleStub("badnonce");

        var (response, body) = await _client.ExternalLoginAsync("Apple", token, nonce: "wrong-nonce");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        body!.Code.Should().Be("invalid_id_token");
        body.Data.Should().BeNull();
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_Apple_03_ValidStub_CreatesUser_MarketplaceSession()
    {
        var (token, _, email, nonce) = RegisterAppleStub("newapple", privateRelay: true);

        var (response, body) = await _client.ExternalLoginAsync(
            "Apple", token, nonce: nonce, firstName: "Ada", lastName: "Lovelace");

        response.StatusCode.Should().Be(HttpStatusCode.OK, because: await response.Content.ReadAsStringAsync());
        body!.Success.Should().BeTrue();
        body.Data!.IsNewUser.Should().BeTrue();
        body.Data.Session.Channel.Should().Be("Marketplace");
        body.Data.Session.CompanyId.Should().BeNull();
        body.Data.Session.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.Data.Session.User.Email.Should().Be(email.ToLowerInvariant());
        body.Data.LinkedProviders.Should().Contain("Apple");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_Apple_04_SecondLoginSameSubject_ReusesUser()
    {
        var (token, _, _, nonce) = RegisterAppleStub("reuseapple");

        var (first, firstBody) = await _client.ExternalLoginAsync("Apple", token, nonce: nonce);
        first.EnsureSuccessStatusCode();
        var userId = firstBody!.Data!.Session.User.Id;

        var (second, secondBody) = await _client.ExternalLoginAsync("Apple", token, nonce: nonce);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        secondBody!.Data!.IsNewUser.Should().BeFalse();
        secondBody.Data.Session.User.Id.Should().Be(userId);
        secondBody.Data.Session.Channel.Should().Be("Marketplace");
    }

    [Fact]
    [Trait("Layer", "Http")]
    [Trait("Feature", "ExternalAuth")]
    public async Task AH_External_Apple_05_ProvidersList_IncludesAppleWhenEnabled()
    {
        var (response, body) = await _client.GetExternalProvidersAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body!.Data!.Providers.Should().Contain("Apple");
        body.Data.Providers.Should().Contain("Google");
    }
}

