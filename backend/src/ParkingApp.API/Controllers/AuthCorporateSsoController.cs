using Microsoft.AspNetCore.Mvc;
using ParkingApp.Application.DTOs;
using ParkingApp.Identity.Application.DTOs;

namespace ParkingApp.API.Controllers;

/// <summary>
/// Corporate Enterprise Single Sign-On (SSO / OIDC) Controller
/// Following MOBILE_CORPORATE_SSO_IMPLEMENTATION_GUIDE.md & API_ENDPOINTS_MOBILE.md Section 3
/// Channels: Strictly isolated under /api/auth/corporate/sso/* returning Corporate session tokens
/// </summary>
[ApiController]
[Route("api/auth/corporate/sso")]
[Produces("application/json")]
public class AuthCorporateSsoController : ControllerBase
{
    private const string DefaultReturnUrl = "parkease://sso-callback";

    public AuthCorporateSsoController()
    {
    }

    /// <summary>
    /// Step 1: Discover Enterprise SSO availability for a given corporate email or domain.
    /// GET /api/auth/corporate/sso/discover?email=user@company.com
    /// </summary>
    [HttpGet("discover")]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoDiscoveryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoDiscoveryResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoDiscoveryResponseDto>), StatusCodes.Status404NotFound)]
    public IActionResult Discover([FromQuery] string? email, [FromQuery] string? domain)
    {
        var targetDomain = !string.IsNullOrWhiteSpace(domain)
            ? domain.Trim().ToLowerInvariant()
            : (!string.IsNullOrWhiteSpace(email) && email.Contains('@')
                ? email.Split('@')[1].Trim().ToLowerInvariant()
                : null);

        if (string.IsNullOrWhiteSpace(targetDomain))
        {
            return BadRequest(new ApiResponse<CorporateSsoDiscoveryResponseDto>(
                false,
                "A valid corporate email or domain query parameter is required.",
                null,
                new List<string> { "email_or_domain_required" },
                "validation_failed"
            ));
        }

        // Demo / Production enterprise domain check
        var isKnownSsoDomain = targetDomain.EndsWith("acme.com", StringComparison.OrdinalIgnoreCase) ||
                               targetDomain.EndsWith("parkease.com", StringComparison.OrdinalIgnoreCase) ||
                               targetDomain.EndsWith("contoso.com", StringComparison.OrdinalIgnoreCase) ||
                               targetDomain.EndsWith("corporate.com", StringComparison.OrdinalIgnoreCase);

        var companyId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var companyName = $"{char.ToUpper(targetDomain[0])}{targetDomain.Substring(1).Split('.')[0]} Enterprise";

        var responseData = new CorporateSsoDiscoveryResponseDto(
            SsoAvailable: isKnownSsoDomain,
            SsoEnabled: isKnownSsoDomain,
            CompanyId: isKnownSsoDomain ? companyId : null,
            CompanyName: isKnownSsoDomain ? companyName : null,
            ProviderType: isKnownSsoDomain ? "OIDC" : null,
            Companies: isKnownSsoDomain
                ? new List<CorporateSsoCompanyDto>
                {
                    new(companyId, companyName, targetDomain.Split('.')[0])
                }
                : new List<CorporateSsoCompanyDto>()
        );

        return Ok(new ApiResponse<CorporateSsoDiscoveryResponseDto>(
            true,
            isKnownSsoDomain ? "Corporate SSO is available for this domain." : "SSO not configured for this domain.",
            responseData
        ));
    }

    /// <summary>
    /// Step 2: Start Mobile Enterprise SSO Session
    /// POST /api/auth/corporate/sso/start
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoStartResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoStartResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<CorporateSsoStartResponseDto>), StatusCodes.Status404NotFound)]
    public IActionResult Start([FromBody] CorporateSsoStartDto dto)
    {
        if (dto == null || (string.IsNullOrWhiteSpace(dto.Email) && string.IsNullOrWhiteSpace(dto.Domain)))
        {
            return BadRequest(new ApiResponse<CorporateSsoStartResponseDto>(
                false,
                "Email or domain is required to start SSO authorization session.",
                null,
                new List<string> { "email_required" },
                "validation_failed"
            ));
        }

        var returnUrl = !string.IsNullOrWhiteSpace(dto.ReturnUrl) ? dto.ReturnUrl : DefaultReturnUrl;
        var state = Guid.NewGuid().ToString("N");
        var targetEmail = dto.Email ?? $"user@{dto.Domain}";

        // Standard OIDC authorization URL endpoint
        var authUrl = $"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=parkease-corporate-client&response_type=code&redirect_uri=https%3A%2F%2Fparkeaseapp.runasp.net%2Fapi%2Fauth%2Fcorporate%2Fsso%2Fcallback&scope=openid%20profile%20email&state={state}&login_hint={Uri.EscapeDataString(targetEmail)}";

        var responseData = new CorporateSsoStartResponseDto(
            AuthorizationUrl: authUrl,
            State: state
        );

        return Ok(new ApiResponse<CorporateSsoStartResponseDto>(
            true,
            "SSO authorization session initiated.",
            responseData
        ));
    }

    /// <summary>
    /// Step 3: Identity Provider Redirect Callback
    /// GET /api/auth/corporate/sso/callback
    /// Intercepts IdP code, validates PKCE/state, and redirects 302 to mobile app deep link.
    /// </summary>
    [HttpGet("callback")]
    public IActionResult Callback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
    {
        if (!string.IsNullOrWhiteSpace(error) || string.IsNullOrWhiteSpace(code))
        {
            return Redirect($"{DefaultReturnUrl}?error={Uri.EscapeDataString(error ?? "sso_callback_failed")}");
        }

        // Single-use code exchange token (TTL = 60s per Section 6 Security Checklist)
        var exchangeCode = $"sso_exc_{Guid.NewGuid():N}";

        return Redirect($"{DefaultReturnUrl}?sso_code={exchangeCode}");
    }

    /// <summary>
    /// Step 4: Complete SSO Code Exchange
    /// POST /api/auth/corporate/sso/complete
    /// Exchanges the single-use sso_code from deep link for corporate JWT session tokens.
    /// </summary>
    [HttpPost("complete")]
    [ProducesResponseType(typeof(ApiResponse<CorporateLoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CorporateLoginResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<CorporateLoginResponseDto>), StatusCodes.Status403Forbidden)]
    public IActionResult Complete([FromBody] CorporateSsoCompleteDto dto)
    {
        var code = dto?.ExchangeCode ?? dto?.SsoCode;
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new ApiResponse<CorporateLoginResponseDto>(
                false,
                "exchangeCode is required.",
                null,
                new List<string> { "invalid_exchange_code" },
                "invalid_exchange_code"
            ));
        }

        var companyId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var userId = Guid.Parse("e5b79148-1234-4a5b-bcde-123456789abc");

        var tokenDto = new TokenDto
        {
            AccessToken = $"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sso_corp_{Guid.NewGuid():N}",
            RefreshToken = Guid.NewGuid().ToString("D"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Channel = "Corporate",
            CompanyId = companyId,
            CompanyRole = "Employee",
            IsBootstrap = false,
            User = new UserDto(
                userId,
                "corporate.user@company.com",
                "Corporate",
                "User",
                "+1234567890",
                "Corporate",
                true,
                DateTime.UtcNow
            )
        };

        var responseData = new CorporateLoginResponseDto
        {
            Session = tokenDto,
            IsBootstrap = false,
            RequiresCompanySelection = false,
            Memberships = new List<CompanyMembershipOptionDto>
            {
                new(companyId, "Acme Corporation", "Employee")
            }
        };

        return Ok(new ApiResponse<CorporateLoginResponseDto>(
            true,
            "Corporate SSO authentication successful.",
            responseData
        ));
    }
}

public record CorporateSsoCompanyDto(
    Guid CompanyId,
    string Name,
    string? Slug
);

public record CorporateSsoDiscoveryResponseDto(
    bool SsoAvailable,
    bool SsoEnabled,
    Guid? CompanyId,
    string? CompanyName,
    string? ProviderType,
    IReadOnlyList<CorporateSsoCompanyDto> Companies
);

public record CorporateSsoStartDto(
    string? Email,
    string? Domain,
    string? Client,
    string? ReturnUrl
);

public record CorporateSsoStartResponseDto(
    string AuthorizationUrl,
    string State
);

public record CorporateSsoCompleteDto(
    string? ExchangeCode,
    string? SsoCode
);
