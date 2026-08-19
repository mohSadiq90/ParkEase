using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ParkingApp.Application.Interfaces;
using ParkingApp.Infrastructure.Data;

namespace ParkingApp.IntegrationTests.Support;

/// <summary>
/// WebApplicationFactory ConfigureAppConfiguration often loses to appsettings placeholders when
/// Program registers DbContext during top-level startup. Re-bind EF + Dapper after host services
/// so CI (no user secrets) and local secrets both use the test connection string.
/// </summary>
internal static class TestDbContextRegistration
{
    public static void ReplacePostgres(
        IServiceCollection services,
        string connectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);

        // Remove EF Core options + context registrations that closed over the appsettings placeholder.
        services.RemoveAll<ApplicationDbContext>();
        services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
        services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
        services.RemoveAll<ISqlConnectionFactory>();

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.UseNetTopologySuite();
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
            }));

        services.AddSingleton<ISqlConnectionFactory>(new NpgsqlConnectionFactory(connectionString));
    }
}