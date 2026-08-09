using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParkingApp.Identity.Domain.Entities;

namespace ParkingApp.Identity.Infrastructure.Configurations;

internal sealed class UserExternalLoginConfiguration : IEntityTypeConfiguration<UserExternalLogin>
{
    public void Configure(EntityTypeBuilder<UserExternalLogin> entity)
    {
        entity.ToTable("UserExternalLogins");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Provider).IsRequired();
        entity.Property(e => e.ProviderSubject).HasMaxLength(255).IsRequired();
        entity.Property(e => e.ProviderEmail).HasMaxLength(255);
        entity.Property(e => e.LinkedAtUtc).IsRequired();

        // Stable IdP identity
        entity.HasIndex(e => new { e.Provider, e.ProviderSubject }).IsUnique();
        // One link per provider per user
        entity.HasIndex(e => new { e.UserId, e.Provider }).IsUnique();
        entity.HasIndex(e => e.UserId);

        entity.HasQueryFilter(e => !e.IsDeleted);

        entity.HasOne(e => e.User)
            .WithMany(u => u.ExternalLogins)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
