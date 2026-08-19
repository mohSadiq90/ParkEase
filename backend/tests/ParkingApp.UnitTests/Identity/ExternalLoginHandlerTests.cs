using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Application.Commands.Auth;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Application.Options;
using ParkingApp.Identity.Domain.Entities;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Identity.Domain.Interfaces;
using Xunit;

namespace ParkingApp.UnitTests.Identity;

public class ExternalLoginHandlerTests
{
    private readonly Mock<IIdentityUnitOfWork> _uow = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserExternalLoginRepository> _externalLogins = new();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<IExternalTokenValidator> _validator = new();
    private readonly Mock<ILinkPasswordAttemptTracker> _linkAttempts = new();
    private readonly Mock<ILogger<ExternalLoginHandler>> _logger = new();
    private ExternalAuthOptions _options = CreateEnabledOptions();

    public ExternalLoginHandlerTests()
    {
        _uow.Setup(u => u.Users).Returns(_users.Object);
        _uow.Setup(u => u.ExternalLogins).Returns(_externalLogins.Object);
        _tokens.SetupGet(t => t.AccessTokenExpirationMinutes).Returns(15);
        _tokens.SetupGet(t => t.RefreshTokenExpirationDays).Returns(15);
        _tokens.Setup(t => t.CreateRefreshTokenExpiryUtc()).Returns(() => DateTime.UtcNow.AddDays(15));
        _tokens.Setup(t => t.GenerateAccessToken(It.IsAny<User>(), It.IsAny<ProductChannel>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .Returns("access-token");
        _tokens.Setup(t => t.GenerateRefreshToken()).Returns("refresh-token");
        _externalLogins.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<UserExternalLogin>());
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(
                It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserExternalLogin?)null);
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string?>()))
            .Returns((string p, string? h) => h == $"hash:{p}");
        _linkAttempts.Setup(a => a.IsLimited(It.IsAny<string>())).Returns(false);
    }

    private ExternalLoginHandler CreateHandler()
    {
        var monitor = new Mock<IOptionsMonitor<ExternalAuthOptions>>();
        monitor.Setup(m => m.CurrentValue).Returns(() => _options);
        return new ExternalLoginHandler(
            _uow.Object,
            _tokens.Object,
            _hasher.Object,
            _validator.Object,
            _linkAttempts.Object,
            monitor.Object,
            _logger.Object);
    }

    private static ExternalAuthOptions CreateEnabledOptions() => new()
    {
        Enabled = true,
        RateLimitPerMinute = 20,
        Providers = new Dictionary<string, ExternalProviderOptions>(StringComparer.OrdinalIgnoreCase)
        {
            ["Google"] = new ExternalProviderOptions
            {
                Enabled = true,
                ClientIds = new List<string> { "test-client" }
            },
            ["Apple"] = new ExternalProviderOptions
            {
                Enabled = true,
                ClientIds = new List<string> { "test.apple.client" }
            }
        }
    };

    private static ExternalIdentity GoogleIdentity(
        string subject = "sub-1",
        string email = "social@example.com",
        bool verified = true,
        string? first = "Soc",
        string? last = "User") =>
        new(ExternalAuthProvider.Google, subject, email, verified, first, last);

    [Fact]
    public async Task WhenMasterDisabled_ReturnsProviderDisabled()
    {
        _options = new ExternalAuthOptions { Enabled = false };
        var handler = CreateHandler();

        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "token")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("provider_disabled");
        _validator.Verify(
            v => v.ValidateAsync(It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task WhenInvalidProvider_ReturnsInvalidProvider()
    {
        var handler = CreateHandler();

        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("NotAProvider", "token")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("invalid_provider");
    }

    [Fact]
    public async Task WhenTokenInvalid_ReturnsInvalidIdToken_WithoutUserLookup()
    {
        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "bad", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Fail("invalid_id_token"));

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "bad")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("invalid_id_token");
        _users.Verify(u => u.GetByEmailIncludingDeletedAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(u => u.GetByExternalLoginAsync(It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task NewUser_CreatesUserAndMintsMarketplace()
    {
        var identity = GoogleIdentity();
        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));

        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        User? added = null;
        _users.Setup(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => added = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.IsNewUser.Should().BeTrue();
        result.Data.Session.Channel.Should().Be(nameof(ProductChannel.Marketplace));
        result.Data.Session.AccessToken.Should().Be("access-token");
        result.Data.RequiresPhone.Should().BeTrue();
        result.Data.LinkedProviders.Should().Contain("Google");

        added.Should().NotBeNull();
        added!.HasPassword.Should().BeFalse();
        added.PasswordHash.Should().BeNull();
        added.Role.Should().Be(UserRole.User);
        added.SessionChannel.Should().Be(ProductChannel.Marketplace);
        added.ExternalLogins.Should().ContainSingle(l => l.Provider == ExternalAuthProvider.Google);

        _tokens.Verify(
            t => t.GenerateAccessToken(It.IsAny<User>(), ProductChannel.Marketplace, null, null),
            Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task KnownSubject_SecondLogin_ReusesUser()
    {
        var identity = GoogleIdentity();
        var existing = User.RegisterFromExternal(identity.Email!, "Soc", "User", emailVerified: true);
        existing.LinkExternalLogin(ExternalAuthProvider.Google, identity.Subject, identity.Email);

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeTrue();
        result.Data!.IsNewUser.Should().BeFalse();
        result.Data.Session.User.Id.Should().Be(existing.Id);
        result.Data.Session.Channel.Should().Be(nameof(ProductChannel.Marketplace));
        _users.Verify(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(u => u.Update(existing), Times.Once);
    }

    [Fact]
    public async Task EmailCollision_ReturnsAccountExists_NoTokens()
    {
        var identity = GoogleIdentity();
        var passwordUser = User.Register(identity.Email!, "hash", "Pass", "User", "+15551234567");

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(passwordUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("account_exists");
        result.Data.Should().BeNull();
        _users.Verify(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SoftDeletedEmailCollision_ReturnsAccountExists_NoCreate()
    {
        var identity = GoogleIdentity(email: "deleted@example.com");
        var deleted = User.Register(identity.Email!, "hash", "Del", "User", "+15551234567");
        deleted.IsDeleted = true;

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(deleted);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("account_exists");
        result.Data.Should().BeNull();
        _users.Verify(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AdminUserEmail_ReturnsAdminSocialForbidden_NoWrite()
    {
        var identity = GoogleIdentity(email: "admin@example.com");
        var admin = User.Register(identity.Email!, "hash", "Ad", "Min", "+15551234567", UserRole.Admin);

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(admin);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("admin_social_forbidden");
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task InactiveKnownSubject_ReturnsAccountDisabled_NoLastUsedMutation()
    {
        var identity = GoogleIdentity();
        var user = User.RegisterFromExternal(identity.Email!, "Soc", "User", emailVerified: true);
        var link = user.LinkExternalLogin(ExternalAuthProvider.Google, identity.Subject, identity.Email);
        var lastUsedBefore = link.LastUsedAtUtc;
        user.Deactivate();

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("account_disabled");
        link.LastUsedAtUtc.Should().Be(lastUsedBefore);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(u => u.Update(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task EmailNotVerified_OnCreate_Rejected()
    {
        var identity = GoogleIdentity(verified: false);
        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("email_not_verified");
        _users.Verify(u => u.GetByEmailIncludingDeletedAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProviders_WhenDisabled_ReturnsEmpty()
    {
        _options = new ExternalAuthOptions { Enabled = false };
        var monitor = new Mock<IOptionsMonitor<ExternalAuthOptions>>();
        monitor.Setup(m => m.CurrentValue).Returns(() => _options);
        var handler = new GetExternalProvidersHandler(monitor.Object);

        var result = await handler.HandleAsync(new GetExternalProvidersQuery());

        result.Success.Should().BeTrue();
        result.Data!.Providers.Should().BeEmpty();
    }

    [Fact]
    public async Task GetProviders_WhenGoogleAndAppleEnabled_ReturnsBothSorted()
    {
        var monitor = new Mock<IOptionsMonitor<ExternalAuthOptions>>();
        monitor.Setup(m => m.CurrentValue).Returns(() => _options);
        var handler = new GetExternalProvidersHandler(monitor.Object);

        var result = await handler.HandleAsync(new GetExternalProvidersQuery());

        result.Success.Should().BeTrue();
        result.Data!.Providers.Should().Equal("Apple", "Google");
    }

    [Fact]
    public void IsUniqueConstraintViolation_DetectsPostgres23505()
    {
        var inner = new Exception("23505: duplicate key value violates unique constraint");
        var outer = new Exception("Save failed", inner);
        ExternalLoginHandler.IsUniqueConstraintViolation(outer).Should().BeTrue();
    }

    [Fact]
    public async Task LinkPassword_Valid_MergesAndMintsMarketplace()
    {
        var identity = GoogleIdentity();
        var passwordUser = User.Register(identity.Email!, "hash:TestPass1!", "Pass", "User", "+15551234567");

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(passwordUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good", LinkPassword: "TestPass1!")));

        result.Success.Should().BeTrue();
        result.Data!.IsNewUser.Should().BeFalse();
        result.Data.Session.Channel.Should().Be(nameof(ProductChannel.Marketplace));
        result.Data.Session.User.Id.Should().Be(passwordUser.Id);
        passwordUser.ExternalLogins.Should().ContainSingle(l => l.Provider == ExternalAuthProvider.Google);
        _linkAttempts.Verify(a => a.RecordSuccess(identity.Email!), Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LinkPassword_WrongPassword_NoLinkNoTokens()
    {
        var identity = GoogleIdentity();
        var passwordUser = User.Register(identity.Email!, "hash:TestPass1!", "Pass", "User", "+15551234567");

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(passwordUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good", LinkPassword: "WrongPass1!")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("invalid_credentials");
        result.Data.Should().BeNull();
        passwordUser.ExternalLogins.Should().BeEmpty();
        _linkAttempts.Verify(a => a.RecordFailure(identity.Email!), Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LinkPassword_PasswordlessUser_ReturnsAccountExists()
    {
        var identity = GoogleIdentity();
        var socialUser = User.RegisterFromExternal(identity.Email!, "Soc", "User", emailVerified: true);

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(socialUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good", LinkPassword: "TestPass1!")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("account_exists");
        socialUser.ExternalLogins.Should().BeEmpty();
        _hasher.Verify(h => h.Verify(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task LinkPassword_InactiveUser_Returns403_NoRow()
    {
        var identity = GoogleIdentity();
        var passwordUser = User.Register(identity.Email!, "hash:TestPass1!", "Pass", "User", "+15551234567");
        passwordUser.Deactivate();

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(passwordUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good", LinkPassword: "TestPass1!")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("account_disabled");
        passwordUser.ExternalLogins.Should().BeEmpty();
        _hasher.Verify(h => h.Verify(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LinkPassword_RateLimited_Returns429Code()
    {
        var identity = GoogleIdentity();
        var passwordUser = User.Register(identity.Email!, "hash:TestPass1!", "Pass", "User", "+15551234567");
        _linkAttempts.Setup(a => a.IsLimited(identity.Email!)).Returns(true);

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "good", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));
        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Google, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(passwordUser);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Google", "good", LinkPassword: "TestPass1!")));

        result.Code.Should().Be("rate_limited");
        _hasher.Verify(h => h.Verify(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task Apple_MissingNonce_ReturnsNonceRequired_WithoutValidator()
    {
        var handler = CreateHandler();

        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Apple", "apple-token", Nonce: null)));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("nonce_required");
        _validator.Verify(
            v => v.ValidateAsync(It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Apple_ValidStub_CreatesUser_MarketplaceOnly()
    {
        var identity = new ExternalIdentity(
            ExternalAuthProvider.Apple,
            "apple-sub-1",
            "relay@privaterelay.appleid.com",
            EmailVerified: true,
            FirstName: null,
            LastName: null);

        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Apple, "apple-token", "raw-nonce", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));

        _users.Setup(u => u.GetByExternalLoginAsync(ExternalAuthProvider.Apple, identity.Subject, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(u => u.GetByEmailIncludingDeletedAsync(identity.Email!, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        User? added = null;
        _users.Setup(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => added = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExternalLoginCommand(
            new ExternalLoginDto("Apple", "apple-token", Nonce: "raw-nonce", FirstName: "Ada", LastName: "Lovelace")));

        result.Success.Should().BeTrue();
        result.Data!.Session.Channel.Should().Be(nameof(ProductChannel.Marketplace));
        result.Data.IsNewUser.Should().BeTrue();
        result.Data.LinkedProviders.Should().Contain("Apple");
        result.Data.Session.CompanyId.Should().BeNull();
        added.Should().NotBeNull();
        added!.HasPassword.Should().BeFalse();
        added.ExternalLogins.Should().ContainSingle(l => l.Provider == ExternalAuthProvider.Apple);
        _tokens.Verify(
            t => t.GenerateAccessToken(It.IsAny<User>(), ProductChannel.Marketplace, null, null),
            Times.Once);
    }
}

