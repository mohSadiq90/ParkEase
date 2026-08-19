using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using ParkingApp.Application.CQRS;
using ParkingApp.Identity.Application.DTOs;

using ParkingApp.Identity.Application.Validators;

namespace ParkingApp.Identity.Application;

/// <summary>
/// Identity module application registration. Call after <c>AddApplication</c>.
/// </summary>
public static class IdentityApplicationModule
{
    public static IServiceCollection AddIdentityApplication(this IServiceCollection services)
    {
        services.AddScoped<IValidator<RegisterDto>, RegisterDtoValidator>();
        services.AddScoped<IValidator<LoginDto>, LoginDtoValidator>();
        services.AddScoped<IValidator<ExternalLoginDto>, ExternalLoginDtoValidator>();
        services.AddScoped<IValidator<LinkExternalLoginDto>, LinkExternalLoginDtoValidator>();
        services.AddScoped<IValidator<SetPasswordDto>, SetPasswordDtoValidator>();
        services.AddScoped<IValidator<ChangePasswordDto>, ChangePasswordDtoValidator>();
        services.AddHandlersFromAssembly(Assembly.GetExecutingAssembly(), throwIfMissingHandlers: false);
        return services;
    }
}
