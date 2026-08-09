using Microsoft.Extensions.Logging;
using ParkingApp.Application.Caching;
using ParkingApp.Application.CQRS;
using ParkingApp.Application.DTOs;
using ParkingApp.Application.Interfaces;
using ParkingApp.BuildingBlocks.Security;
using ParkingApp.Identity.Application.DTOs;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Domain.Enums;
using ParkingApp.Identity.Domain.Interfaces;

namespace ParkingApp.Identity.Application.Commands.Auth;

/// <summary>
/// Bootstrap password for social-only users (KD-SL-25). Never overwrites an existing password.
/// </summary>
public sealed record SetPasswordCommand(Guid UserId, SetPasswordDto Dto)
    : ICommand<ApiResponse<SetPasswordResultDto>>;

internal sealed class SetPasswordHandler
    : ICommandHandler<SetPasswordCommand, ApiResponse<SetPasswordResultDto>>
{
    private readonly IIdentityUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICacheService _cache;
    private readonly ILogger<SetPasswordHandler> _logger;

    public SetPasswordHandler(
        IIdentityUnitOfWork unitOfWork,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        ICacheService cache,
        ILogger<SetPasswordHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _cache = cache;
        _logger = logger;
    }

    public async Task<ApiResponse<SetPasswordResultDto>> HandleAsync(
        SetPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return new ApiResponse<SetPasswordResultDto>(
                false, "User not found", null, new List<string> { "account_disabled" }, "account_disabled");
        }

        if (!user.IsActive)
        {
            return new ApiResponse<SetPasswordResultDto>(
                false,
                "Account disabled",
                null,
                new List<string> { "account_disabled" },
                "account_disabled");
        }

        // Branch B — already has password: must use change-password (KD-SL-25)
        if (user.HasPassword)
        {
            return new ApiResponse<SetPasswordResultDto>(
                false,
                "Password is already set. Use change-password with your current password.",
                null,
                new List<string> { "password_already_set" },
                "password_already_set");
        }

        // Branch A — social bootstrap
        var hash = _passwordHasher.Hash(command.Dto.NewPassword);
        user.SetPasswordHash(hash);
        // Same session hygiene as ChangePassword: revoke old refresh, then re-mint
        user.RevokeRefreshToken();

        var channel = ProductChannel.Marketplace;
        var accessToken = _tokenService.GenerateAccessToken(user, channel);
        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RecordLogin(refreshToken, _tokenService.CreateRefreshTokenExpiryUtc());
        user.BindSession(channel);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await CacheInvalidation.ForUserChangeAsync(_cache, command.UserId, cancellationToken);

        var session = AuthTokenDtoFactory.Create(
            accessToken,
            refreshToken,
            user,
            channel,
            accessTokenExpirationMinutes: _tokenService.AccessTokenExpirationMinutes);

        _logger.LogInformation("Password set (bootstrap) for user: {UserId}", command.UserId);

        return new ApiResponse<SetPasswordResultDto>(
            true,
            "Password set successfully",
            new SetPasswordResultDto { Session = session });
    }
}
