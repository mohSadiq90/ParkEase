namespace ParkingApp.Identity.Application.Options;

/// <summary>
/// Marketplace social login (token-exchange) configuration. Disabled by default in all environments
/// until production gate (PR3) is satisfied.
/// </summary>
public sealed class ExternalAuthOptions
{
    public const string SectionName = "ExternalAuth";

    /// <summary>Master switch. When false, providers list is empty and external login is rejected.</summary>
    public bool Enabled { get; set; }

    /// <summary>Dedicated rate limit for POST /api/auth/external* (requests per minute per IP).</summary>
    public int RateLimitPerMinute { get; set; } = 20;

    public Dictionary<string, ExternalProviderOptions> Providers { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class ExternalProviderOptions
{
    public bool Enabled { get; set; }

    /// <summary>Allowed OIDC audiences (Google Client IDs, Apple Services IDs / bundle ids).</summary>
    public List<string> ClientIds { get; set; } = new();

    /// <summary>Facebook App Id (PR7).</summary>
    public string? AppId { get; set; }

    /// <summary>Facebook App Secret (PR7) — never expose to clients.</summary>
    public string? AppSecret { get; set; }
}
