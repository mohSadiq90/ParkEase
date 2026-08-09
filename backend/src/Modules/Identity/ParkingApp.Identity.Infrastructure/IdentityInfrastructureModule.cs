using Microsoft.Extensions.DependencyInjection;
using ParkingApp.Identity.Application.Interfaces;
using ParkingApp.Identity.Contracts;
using ParkingApp.Identity.Domain.Interfaces;
using ParkingApp.Identity.Infrastructure.ModuleAdapters;
using ParkingApp.Identity.Infrastructure.Repositories;
using ParkingApp.Identity.Infrastructure.Services.ExternalAuth;

namespace ParkingApp.Identity.Infrastructure;

/// <summary>
/// Identity module infrastructure registration (repos + outward contracts).
/// Host must register <c>IIdentityDbContext</c> and <c>IIdentityUnitOfWork</c> facades.
/// Host also registers <see cref="ISessionRebindService"/> (needs shared UoW + ITokenService).
/// Host binds <c>ExternalAuthOptions</c> from configuration.
/// </summary>
public static class IdentityInfrastructureModule
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IVehicleRepository, VehicleRepository>();
        services.AddScoped<IDeviceTokenRepository, DeviceTokenRepository>();
        services.AddScoped<IUserLookup, UserLookup>();
        services.AddScoped<IDeviceTokenLookup, DeviceTokenLookup>();

        // External IdP validators (Google + Apple; composite routes by provider)
        services.AddHttpClient(HttpAppleJwksKeyProvider.HttpClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.TryAddWithoutValidation(
                "User-Agent",
                "ParkEase-ExternalAuth/1.0");
        });
        services.AddSingleton<IAppleJwksKeyProvider, HttpAppleJwksKeyProvider>();
        services.AddScoped<GoogleExternalTokenValidator>();
        services.AddScoped<AppleExternalTokenValidator>();
        services.AddScoped<IExternalTokenValidator, CompositeExternalTokenValidator>();

        services.AddSingleton<ILinkPasswordAttemptTracker, LinkPasswordAttemptTracker>();
        return services;
    }
}
