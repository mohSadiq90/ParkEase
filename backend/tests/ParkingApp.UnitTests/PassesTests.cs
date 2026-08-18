using System;
using System.Collections.Generic;
using FluentAssertions;
using Xunit;
using ParkingApp.BuildingBlocks.ValueObjects;
using ParkingApp.Marketplace.Contracts.Enums;
using ParkingApp.Marketplace.Domain.Entities;
using ParkingApp.Marketplace.Domain.ValueObjects;

namespace ParkingApp.UnitTests;

public class PassesTests
{
    [Fact]
    public void CreateParkingPass_WithValidMonthlyPass_SetsPropertiesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var parkingSpaceId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var duration = Duration.Create(now, now.AddDays(30));
        var usagePolicy = UsagePolicy.UnlimitedEntries();
        var discount = 25.0m;

        // Act
        var pass = ParkingPass.Create(
            userId,
            PassType.Monthly(),
            duration,
            usagePolicy,
            discount,
            parkingSpaceId,
            null);

        // Assert
        pass.Should().NotBeNull();
        pass.UserId.Should().Be(userId);
        pass.ParkingSpaceId.Should().Be(parkingSpaceId);
        pass.CoverageType.Should().Be(PassCoverageType.ParkingSpace);
        pass.PassType.Kind.Should().Be(PassTypeKind.Monthly);
        pass.DiscountPercentage.Should().Be(25.0m);
        pass.IsActiveOn(now.AddDays(5)).Should().BeTrue();
        pass.IsExpiredOn(now.AddDays(35)).Should().BeTrue();
    }

    [Fact]
    public void CreateParkingPass_WithZoneCoverage_SetsZoneCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var duration = Duration.Create(now, now.AddDays(7));
        var usagePolicy = UsagePolicy.CappedDailyHours(8);

        // Act
        var pass = ParkingPass.Create(
            userId,
            PassType.Weekly(),
            duration,
            usagePolicy,
            15.0m,
            null,
            "ZONE-CENTRAL");

        // Assert
        pass.CoverageType.Should().Be(PassCoverageType.ParkingZone);
        pass.ParkingZoneCode.Should().Be("ZONE-CENTRAL");
        pass.PassType.Kind.Should().Be(PassTypeKind.Weekly);
    }

    [Fact]
    public void CreateParkingPass_WithoutUser_ThrowsArgumentException()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var duration = Duration.Create(now, now.AddDays(30));

        // Act
        Action act = () => ParkingPass.Create(
            Guid.Empty,
            PassType.Monthly(),
            duration,
            UsagePolicy.UnlimitedEntries(),
            10.0m,
            Guid.NewGuid(),
            null);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*valid user*");
    }
}
