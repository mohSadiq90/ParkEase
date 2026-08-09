using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ParkingApp.Application.Interfaces;
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

public class SetPasswordHandlerTests
{
    private readonly Mock<IIdentityUnitOfWork> _uow = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITokenService> _tokens = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<ICacheService> _cache = new();
    private readonly Mock<ILogger<SetPasswordHandler>> _logger = new();

    public SetPasswordHandlerTests()
    {
        _uow.Setup(u => u.Users).Returns(_users.Object);
        _tokens.SetupGet(t => t.AccessTokenExpirationMinutes).Returns(15);
        _tokens.Setup(t => t.CreateRefreshTokenExpiryUtc()).Returns(() => DateTime.UtcNow.AddDays(15));
        _tokens.Setup(t => t.GenerateAccessToken(It.IsAny<User>(), It.IsAny<ProductChannel>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .Returns("access-token");
        _tokens.Setup(t => t.GenerateRefreshToken()).Returns("new-refresh");
        _hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns((string p) => $"hash:{p}");
    }

    private SetPasswordHandler CreateHandler() =>
        new(_uow.Object, _tokens.Object, _hasher.Object, _cache.Object, _logger.Object);

    [Fact]
    public async Task Bootstrap_WhenNoPassword_SetsHashRevokesAndRemintsMarketplace()
    {
        var user = User.RegisterFromExternal("social@example.com", "Soc", "User", emailVerified: true);
        user.RotateRefreshToken("old-refresh", DateTime.UtcNow.AddDays(7));
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new SetPasswordCommand(
            user.Id, new SetPasswordDto("TestPass1!")));

        result.Success.Should().BeTrue();
        result.Data!.Session.Channel.Should().Be(nameof(ProductChannel.Marketplace));
        result.Data.Session.RefreshToken.Should().Be("new-refresh");
        user.HasPassword.Should().BeTrue();
        user.PasswordHash.Should().Be("hash:TestPass1!");
        user.RefreshToken.Should().Be("new-refresh");
        user.SessionChannel.Should().Be(ProductChannel.Marketplace);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task WhenHasPassword_RejectsPasswordAlreadySet_NoHashChange()
    {
        var user = User.Register("pass@example.com", "hash:OldPass1!", "A", "B", "+15551234567");
        var originalHash = user.PasswordHash;
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new SetPasswordCommand(
            user.Id, new SetPasswordDto("TestPass1!")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("password_already_set");
        user.PasswordHash.Should().Be(originalHash);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Inactive_ReturnsAccountDisabled()
    {
        var user = User.RegisterFromExternal("x@example.com", emailVerified: true);
        user.Deactivate();
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new SetPasswordCommand(
            user.Id, new SetPasswordDto("TestPass1!")));

        result.Code.Should().Be("account_disabled");
        user.HasPassword.Should().BeFalse();
    }
}

public class ChangePasswordSocialTests
{
    private readonly Mock<IIdentityUnitOfWork> _uow = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<ILogger<ChangePasswordHandler>> _logger = new();

    public ChangePasswordSocialTests()
    {
        _uow.Setup(u => u.Users).Returns(_users.Object);
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string?>()))
            .Returns((string p, string? h) => h == $"hash:{p}");
        _hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns((string p) => $"hash:{p}");
    }

    [Fact]
    public async Task WhenNoPassword_ReturnsPasswordNotSet()
    {
        var user = User.RegisterFromExternal("social@example.com", emailVerified: true);
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = new ChangePasswordHandler(_uow.Object, _hasher.Object, _logger.Object);
        var result = await handler.HandleAsync(new ChangePasswordCommand(
            user.Id, new ChangePasswordDto("anything", "TestPass1!")));

        result.Success.Should().BeFalse();
        result.Code.Should().Be("password_not_set");
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}

public class LinkExternalLoginHandlerTests
{
    private readonly Mock<IIdentityUnitOfWork> _uow = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserExternalLoginRepository> _externalLogins = new();
    private readonly Mock<IExternalTokenValidator> _validator = new();
    private readonly Mock<ICacheService> _cache = new();
    private readonly Mock<ILogger<LinkExternalLoginHandler>> _logger = new();
    private readonly ExternalAuthOptions _options = new()
    {
        Enabled = true,
        Providers = new Dictionary<string, ExternalProviderOptions>(StringComparer.OrdinalIgnoreCase)
        {
            ["Google"] = new() { Enabled = true, ClientIds = new List<string> { "c" } }
        }
    };

    public LinkExternalLoginHandlerTests()
    {
        _uow.Setup(u => u.Users).Returns(_users.Object);
        _uow.Setup(u => u.ExternalLogins).Returns(_externalLogins.Object);
        _externalLogins.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<UserExternalLogin>());
        _externalLogins.Setup(r => r.GetByProviderSubjectAsync(
                It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserExternalLogin?)null);
    }

    private LinkExternalLoginHandler CreateHandler()
    {
        var monitor = new Mock<IOptionsMonitor<ExternalAuthOptions>>();
        monitor.Setup(m => m.CurrentValue).Returns(_options);
        return new LinkExternalLoginHandler(
            _uow.Object, _validator.Object, monitor.Object, _cache.Object, _logger.Object);
    }

    [Fact]
    public async Task ValidToken_MatchingEmail_LinksProvider()
    {
        var user = User.Register("me@example.com", "hash:x", "Me", "User", "+15551234567");
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var identity = new ExternalIdentity(
            ExternalAuthProvider.Google, "sub-99", "me@example.com", true, "Me", "User");
        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "tok", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));

        _externalLogins.Setup(r => r.GetByUserIdAsync(user.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => user.ExternalLogins.ToList());

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new LinkExternalLoginCommand(
            user.Id, new LinkExternalLoginDto("Google", "tok")));

        result.Success.Should().BeTrue();
        result.Data!.LinkedProviders.Should().Contain("Google");
        user.ExternalLogins.Should().ContainSingle();
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EmailMismatch_RejectsNoWrite()
    {
        var user = User.Register("me@example.com", "hash:x", "Me", "User", "+15551234567");
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var identity = new ExternalIdentity(
            ExternalAuthProvider.Google, "sub-99", "other@example.com", true, "O", "U");
        _validator.Setup(v => v.ValidateAsync(
                ExternalAuthProvider.Google, "tok", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExternalTokenValidationResult.Ok(identity));

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new LinkExternalLoginCommand(
            user.Id, new LinkExternalLoginDto("Google", "tok")));

        result.Code.Should().Be("email_mismatch");
        user.ExternalLogins.Should().BeEmpty();
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Inactive_ReturnsAccountDisabled_NoWrite()
    {
        var user = User.Register("me@example.com", "hash:x", "Me", "User", "+15551234567");
        user.Deactivate();
        _users.Setup(u => u.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.HandleAsync(new LinkExternalLoginCommand(
            user.Id, new LinkExternalLoginDto("Google", "tok")));

        result.Code.Should().Be("account_disabled");
        _validator.Verify(
            v => v.ValidateAsync(It.IsAny<ExternalAuthProvider>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

public class LinkPasswordAttemptTrackerTests
{
    [Fact]
    public void AfterFiveFailures_IsLimited()
    {
        var tracker = new ParkingApp.Identity.Infrastructure.Services.ExternalAuth.LinkPasswordAttemptTracker(
            maxFailures: 5, window: TimeSpan.FromMinutes(15));

        const string email = "a@example.com";
        for (var i = 0; i < 5; i++)
            tracker.RecordFailure(email);

        tracker.IsLimited(email).Should().BeTrue();
        tracker.RecordSuccess(email);
        tracker.IsLimited(email).Should().BeFalse();
    }
}
