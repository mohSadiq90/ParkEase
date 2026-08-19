using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ParkingApp.BuildingBlocks.Domain;
using ParkingApp.Marketplace.Domain.Entities;
using ParkingApp.Identity.Domain.Entities;
using ParkingApp.Messaging.Domain.Entities;
using ParkingApp.Corporate.Domain;
using ParkingApp.Infrastructure.Data;
using Xunit;

namespace ParkingApp.UnitTests.Infrastructure.Data;

public class ApplicationDbContextTests
{
    private DbContextOptions<ApplicationDbContext> CreateOptions()
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task SaveChangesAsync_SetsCreatedAt_ForNewEntities()
    {
        // Arrange
        using var context = new ApplicationDbContext(CreateOptions());
        var user = new User { Id = Guid.NewGuid(), Email = "test@example.com", PasswordHash = "hash", FirstName = "Test", LastName = "User", PhoneNumber = "1", IsActive = true };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert
        user.CreatedAt.Should().NotBe(default);
        user.UpdatedAt.Should().BeNull();
    }

    [Fact]
    public async Task SaveChangesAsync_SetsUpdatedAt_ForModifiedEntities()
    {
        // Arrange
        using var context = new ApplicationDbContext(CreateOptions());
        var user = new User { Id = Guid.NewGuid(), Email = "test@example.com", PasswordHash = "hash", FirstName = "Test", LastName = "User", PhoneNumber = "1", IsActive = true };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var initialCreatedAt = user.CreatedAt;

        // Act
        user.FirstName = "Updated";
        await context.SaveChangesAsync();

        // Assert
        user.CreatedAt.Should().Be(initialCreatedAt);
        user.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public void ModelCreating_DoesNotThrow()
    {
        // Arrange
        var options = CreateOptions();
        using var context = new ApplicationDbContext(options);

        // Act
        var action = () => { _ = context.Model.GetEntityTypes(); };

        // Assert
        action.Should().NotThrow();
    }

    [Fact]
    public async Task CorporateTenantFilters_WhenNoTenantContext_DoNotThrowOnQuery()
    {
        // Background waitlist auto-promotion and similar jobs run without ICorporateTenantContext.
        // Query filters must not call Nullable.Value when CurrentTenantId is null.
        using var context = new ApplicationDbContext(CreateOptions(), tenantContext: null);

        var query = async () =>
        {
            _ = await context.Set<CorporateWaitlistEntry>()
                .AsNoTracking()
                .FirstOrDefaultAsync();
            _ = await context.Set<UserCompanyMembership>()
                .AsNoTracking()
                .FirstOrDefaultAsync();
            _ = await context.Set<ParkingAllocation>()
                .AsNoTracking()
                .FirstOrDefaultAsync();
        };

        await query.Should().NotThrowAsync();
    }
}





