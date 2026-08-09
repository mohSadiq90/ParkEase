import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI, GOOGLE_CLIENT_ID } from '../config';
import { loadGoogleGis } from '../utils/loadGoogleGis';
import { loadAppleAuth } from '../utils/loadAppleAuth';
import { createAppleNonce } from '../utils/appleNonce';

/**
 * Marketplace-only social login controls (Google + Apple web).
 * Fetches GET /api/auth/external/providers and hides when empty or feature off.
 * Never mount on Corporate login or corporate channel tab (PR4 / PR6b AC).
 *
 * @param {{
 *   onGoogleCredential?: (idToken: string) => void | Promise<void>,
 *   onAppleCredential?: (payload: {
 *     idToken: string,
 *     nonce: string,
 *     firstName?: string,
 *     lastName?: string,
 *   }) => void | Promise<void>,
 *   disabled?: boolean,
 * }} props
 */
export default function SocialAuthSection({
  onGoogleCredential,
  onAppleCredential,
  disabled = false,
}) {
  const [providers, setProviders] = useState([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [gisError, setGisError] = useState(null);
  const [appleReady, setAppleReady] = useState(false);
  const [appleError, setAppleError] = useState(null);
  const [appleBusy, setAppleBusy] = useState(false);
  const buttonHostRef = useRef(null);
  const googleApiRef = useRef(null);
  const appleApiRef = useRef(null);
  const googleCallbackRef = useRef(onGoogleCredential);
  const appleCallbackRef = useRef(onAppleCredential);

  useEffect(() => {
    googleCallbackRef.current = onGoogleCredential;
  }, [onGoogleCredential]);

  useEffect(() => {
    appleCallbackRef.current = onAppleCredential;
  }, [onAppleCredential]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getExternalProviders();
        if (cancelled) return;
        const list = res?.success && Array.isArray(res.data?.providers) ? res.data.providers : [];
        setProviders(list);
      } catch {
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setProvidersLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providerEnabled = useCallback(
    (name) => providers.some((p) => String(p).toLowerCase() === name),
    [providers]
  );

  const showGoogle =
    providersLoaded && providerEnabled('google') && !!GOOGLE_CLIENT_ID && !!onGoogleCredential;

  const showApple =
    providersLoaded && providerEnabled('apple') && !!APPLE_CLIENT_ID && !!onAppleCredential;

  // --- Google GIS ---
  useEffect(() => {
    if (!showGoogle) {
      setGisReady(false);
      googleApiRef.current = null;
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleGis();
        if (cancelled) return;
        googleApiRef.current = google;
        setGisError(null);
        setGisReady(true);
      } catch (err) {
        if (!cancelled) {
          googleApiRef.current = null;
          setGisError(err?.message || 'Google Sign-In unavailable');
          setGisReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showGoogle]);

  const renderGoogleButton = useCallback(() => {
    const idApi = googleApiRef.current?.accounts?.id;
    if (!gisReady || !buttonHostRef.current || !idApi) return;

    const host = buttonHostRef.current;
    host.innerHTML = '';

    idApi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const credential = response?.credential;
        if (credential && googleCallbackRef.current) {
          googleCallbackRef.current(credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      // Prefer FedCM so the browser owns the account chooser and COOP does not
      // sever window.opener (reduces "window.closed" console noise / hung popups).
      use_fedcm_for_prompt: true,
    });

    const width = Math.min(host.offsetWidth || 360, 400);
    idApi.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
  }, [gisReady]);

  useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton, disabled]);

  // --- Apple JS ---
  useEffect(() => {
    if (!showApple) {
      setAppleReady(false);
      appleApiRef.current = null;
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const AppleID = await loadAppleAuth();
        if (cancelled) return;

        const redirectURI =
          APPLE_REDIRECT_URI ||
          (typeof window !== 'undefined' ? window.location.origin : '');

        if (!redirectURI) {
          throw new Error('Apple redirect URI is not configured');
        }

        AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI,
          usePopup: true,
        });

        appleApiRef.current = AppleID;
        setAppleError(null);
        setAppleReady(true);
      } catch (err) {
        if (!cancelled) {
          appleApiRef.current = null;
          setAppleError(err?.message || 'Apple Sign-In unavailable');
          setAppleReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showApple]);

  const handleAppleClick = async () => {
    if (disabled || appleBusy || !appleReady || !appleApiRef.current?.auth) return;

    const nonce = createAppleNonce();
    setAppleBusy(true);
    setAppleError(null);

    try {
      const data = await appleApiRef.current.auth.signIn({ nonce });
      const idToken = data?.authorization?.id_token;
      if (!idToken) {
        setAppleError('Apple Sign-In did not return a token');
        return;
      }

      const firstName = data?.user?.name?.firstName || undefined;
      const lastName = data?.user?.name?.lastName || undefined;

      if (appleCallbackRef.current) {
        await appleCallbackRef.current({
          idToken,
          nonce,
          firstName,
          lastName,
        });
      }
    } catch (err) {
      // User cancel is not an error toast from Apple SDK in popup mode (error often "popup_closed_by_user")
      const code = err?.error || err?.message || '';
      const cancelled =
        String(code).includes('popup_closed') ||
        String(code).includes('user_cancelled') ||
        String(code).toLowerCase().includes('cancel');
      if (!cancelled) {
        setAppleError(err?.error || err?.message || 'Apple Sign-In failed');
      }
    } finally {
      setAppleBusy(false);
    }
  };

  if (!providersLoaded || providers.length === 0) {
    return null;
  }

  if (!showGoogle && !showApple) {
    // Providers enabled server-side but client missing VITE_* ids — hide, no secrets.
    return null;
  }

  return (
    <div className="social-auth" data-testid="social-auth-section">
      <div className="auth-divider" role="separator">
        <span>or</span>
      </div>

      <div className="social-auth-buttons">
        {showGoogle &&
          (gisError ? (
            <p className="social-auth-error" role="alert">
              {gisError}
            </p>
          ) : (
            <div
              ref={buttonHostRef}
              className={`google-signin-host${disabled ? ' is-disabled' : ''}`}
              data-testid="google-signin-host"
              aria-busy={!gisReady}
            />
          ))}

        {showApple &&
          (appleError && !appleReady ? (
            <p className="social-auth-error" role="alert">
              {appleError}
            </p>
          ) : (
            <button
              type="button"
              className="apple-signin-btn"
              data-testid="apple-signin-button"
              disabled={disabled || appleBusy || !appleReady}
              onClick={handleAppleClick}
              aria-busy={appleBusy || !appleReady}
            >
              <AppleMark />
              <span>{appleBusy ? 'Signing in…' : 'Continue with Apple'}</span>
            </button>
          ))}
      </div>

      {appleError && appleReady ? (
        <p className="social-auth-error" role="alert">
          {appleError}
        </p>
      ) : null}
    </div>
  );
}

function AppleMark() {
  return (
    <svg
      className="apple-signin-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.95-2.4 1.68-3.68 1.58-.1-1.1.4-2.26 1.2-3.1.9-.95 2.48-1.65 3.68-1.5zM20.5 17.2c-.6 1.38-1.32 2.7-2.38 3.9-1.04 1.18-2.18 2.8-3.78 2.8-1.5 0-1.98-.96-3.7-.96-1.74 0-2.28.94-3.72.98-1.5.04-2.64-1.3-3.7-2.48C1.4 19.2-.1 14.9 1.6 11.9c.9-1.6 2.5-2.62 4.24-2.66 1.46-.03 2.84.98 3.7.98.84 0 2.5-1.22 4.22-1.04.72.03 2.74.3 4.04 2.26-.1.06-2.4 1.4-2.36 4.18.04 3.3 2.9 4.4 2.96 4.42-.02.06-.46 1.58-1.9 3.16z"
      />
    </svg>
  );
}
