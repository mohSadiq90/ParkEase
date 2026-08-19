using Testcontainers.PostgreSql;

namespace ParkingApp.IntegrationTests.Support;

/// <summary>
/// Shared PostGIS Postgres for L4 full-pipeline HTTP integration tests (EF migrations need PostGIS).
/// Requires Docker. Collection-scoped so one container serves Auth + isolation suites.
/// </summary>
public sealed class FullApiPostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgis/postgis:16-3.4")
        .WithDatabase("parkease_full_http_it")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync() => await _container.StartAsync();

    public async Task DisposeAsync() => await _container.DisposeAsync().AsTask();
}

[CollectionDefinition(Name)]
public sealed class FullApiHttpCollection : ICollectionFixture<FullApiPostgresFixture>
{
    public const string Name = "FullApiHttp";
}
