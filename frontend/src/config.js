// Production co-hosts SPA + API on the same MonsterASP site → use relative URLs
// (avoids CORS). Set VITE_API_URL only when the API is on a different host.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:5129');

export const API_ENDPOINTS = {
  BASE: `${API_BASE_URL}/api`,
  UPLOADS: `${API_BASE_URL}/uploads`,
  HUBS: `${API_BASE_URL}/hubs`,
};

/**
 * Google Identity Services OAuth client ID (web).
 * Required for Marketplace "Continue with Google". Leave unset to hide the button.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Apple Sign-In Services ID (web).
 * Required for Marketplace "Continue with Apple". Leave unset to hide the button.
 */
export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || '';

/**
 * Apple Sign-In redirect URI (must match Services ID config in Apple Developer).
 * Defaults to window origin at runtime when empty (see SocialAuthSection).
 */
export const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI || '';
