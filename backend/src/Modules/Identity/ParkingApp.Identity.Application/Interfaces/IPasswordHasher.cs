namespace ParkingApp.Identity.Application.Interfaces;

/// <summary>
/// Application port for password hashing/verification.
/// Implemented in Infrastructure (e.g. BCrypt).
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Verifies a password against a stored hash. Returns false when <paramref name="passwordHash"/>
    /// is null or empty (social-only / no password) — fail-closed, never throws.
    /// </summary>
    bool Verify(string password, string? passwordHash);
}
