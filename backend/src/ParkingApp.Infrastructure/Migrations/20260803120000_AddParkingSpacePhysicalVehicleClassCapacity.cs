using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ParkingApp.Infrastructure.Data;

#nullable disable

namespace ParkingApp.Infrastructure.Migrations;

/// <summary>
/// Phase B: physical 2W/4W bay capacity on ParkingSpaces (building fabric).
/// Default 0+0 = untyped (allocation constrained only by TotalSpots).
/// </summary>
[DbContext(typeof(ApplicationDbContext))]
[Migration("20260803120000_AddParkingSpacePhysicalVehicleClassCapacity")]
public partial class AddParkingSpacePhysicalVehicleClassCapacity : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "TwoWheelerPhysicalSpots",
            table: "ParkingSpaces",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "FourWheelerPhysicalSpots",
            table: "ParkingSpaces",
            type: "integer",
            nullable: false,
            defaultValue: 0);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "TwoWheelerPhysicalSpots",
            table: "ParkingSpaces");

        migrationBuilder.DropColumn(
            name: "FourWheelerPhysicalSpots",
            table: "ParkingSpaces");
    }
}
