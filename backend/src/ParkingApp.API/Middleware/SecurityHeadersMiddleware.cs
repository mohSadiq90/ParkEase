using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace ParkingApp.API.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Prevent clickjacking attacks
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        
        // Prevent MIME type sniffing
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        
        // Enable XSS protection
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        
        // Content Security Policy
        // Stripe Checkout + Marketplace social login (Google GIS / Apple JS).
        // Using a single string to ensure no concatenation errors and easy readability
        const string csp = "default-src 'self'; " +
                           "img-src 'self' data: blob: https: http:; " +
                           "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://appleid.cdn-apple.com; " +
                           "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                           "font-src 'self' https://fonts.gstatic.com; " +
                           "frame-src https://js.stripe.com https://accounts.google.com https://appleid.apple.com; " +
                           "connect-src 'self' ws: wss: https: http:;";

        context.Response.Headers.Append("Content-Security-Policy", csp);

        // Allow OAuth/GIS popups to retain window.opener so the opener can observe
        // popup.closed (avoids Chrome "COOP would block the window.closed call" noise
        // and hung Google Sign-In when FedCM is unavailable). Do NOT use "same-origin"
        // here — that severs opener and breaks ux_mode: 'popup'.
        context.Response.Headers.Append("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        
        // Referrer Policy
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Permissions Policy
        context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        
        // HSTS - only add in production with HTTPS
        if (!context.Request.IsHttps)
        {
            // Uncomment in production with HTTPS
            // context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }

        await _next(context);
    }
}
