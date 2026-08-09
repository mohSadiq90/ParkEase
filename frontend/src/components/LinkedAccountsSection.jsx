import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI, GOOGLE_CLIENT_ID } from '../config';
import { loadGoogleGis } from '../utils/loadGoogleGis';
import { loadAppleAuth } from '../utils/loadAppleAuth';
import { createAppleNonce } from '../utils/appleNonce';

/**
 * Profile "Linked accounts" — show linked IdPs and link additional Google/Apple (authenticated).
 *
 * @param {{
 *   linkedProviders: string[],
 *   onLink: (payload: { provider: string, idToken: string, nonce?: string }) => void | Promise<void>,
 *   disabled?: boolean,
 * }} props
 */
export default function LinkedAccountsSection({
  linkedProviders = [],
  onLink,
  disabled = false,
}) {
  const [enabledProviders, setEnabledProviders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const googleHostRef = useRef(null);
  const googleApiRef = useRef(null);
  const appleApiRef = useRef(null);
  const onLinkRef = useRef(onLink);

  useEffect(() => {
    onLinkRef.current = onLink;
  }, [onLink]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getExternalProviders();
        if (cancelled) return;
        const list =
          res?.success && Array.isArray(res.data?.providers) ? res.data.providers : [];
        setEnabledProviders(list);
      } catch {
        if (!cancelled) setEnabledProviders([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLinked = useCallback(
    (name) =>
      linkedProviders.some((p) => String(p).toLowerCase() === name.toLowerCase()),
    [linkedProviders]
  );

  const providerOn = useCallback(
    (name) =>
      enabledProviders.some((p) => String(p).toLowerCase() === name.toLowerCase()),
    [enabledProviders]
  );

  const showGoogleLink =
    loaded && providerOn('Google') && !!GOOGLE_CLIENT_ID && !isLinked('Google');
  const showAppleLink =
    loaded && providerOn('Apple') && !!APPLE_CLIENT_ID && !isLinked('Apple');

  // Google GIS (link only — not auto-shown as sign-in on login page)
  useEffect(() => {
    if (!showGoogleLink) {
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
        setGisReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Google Sign-In unavailable');
          setGisReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showGoogleLink]);

  const renderGoogleButton = useCallback(() => {
    const idApi = googleApiRef.current?.accounts?.id;
    if (!gisReady || !googleHostRef.current || !idApi) return;

    const host = googleHostRef.current;
    host.innerHTML = '';

    idApi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        const credential = response?.credential;
        if (!credential || !onLinkRef.current) return;
        setBusy(true);
        setError(null);
        try {
          await onLinkRef.current({ provider: 'Google', idToken: credential });
        } catch (err) {
          setError(err?.message || 'Failed to link Google');
        } finally {
          setBusy(false);
        }
      },
      auto_select: false,
      context: 'use',
      ux_mode: 'popup',
      // Prefer FedCM so COOP does not break popup.closed / credential delivery.
      use_fedcm_for_prompt: true,
    });

    const width = Math.min(host.offsetWidth || 320, 360);
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
  }, [renderGoogleButton, disabled, busy]);

  // Apple
  useEffect(() => {
    if (!showAppleLink) {
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
        if (!redirectURI) throw new Error('Apple redirect URI is not configured');
        AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI,
          usePopup: true,
        });
        appleApiRef.current = AppleID;
        setAppleReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Apple Sign-In unavailable');
          setAppleReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAppleLink]);

  const handleAppleLink = async () => {
    if (disabled || busy || !appleReady || !appleApiRef.current?.auth) return;
    const nonce = createAppleNonce();
    setBusy(true);
    setError(null);
    try {
      const data = await appleApiRef.current.auth.signIn({ nonce });
      const idToken = data?.authorization?.id_token;
      if (!idToken) {
        setError('Apple Sign-In did not return a token');
        return;
      }
      if (onLinkRef.current) {
        await onLinkRef.current({ provider: 'Apple', idToken, nonce });
      }
    } catch (err) {
      const code = err?.error || err?.message || '';
      const cancelled =
        String(code).includes('popup_closed') ||
        String(code).toLowerCase().includes('cancel');
      if (!cancelled) setError(err?.error || err?.message || 'Apple link failed');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return (
      <div className="profile-section" data-testid="linked-accounts-section">
        <h2>🔗 Linked accounts</h2>
        <p className="profile-section-hint">Loading…</p>
      </div>
    );
  }

  const hasAnySocialSurface =
    enabledProviders.length > 0 || linkedProviders.length > 0;

  if (!hasAnySocialSurface) {
    return null;
  }

  const displayLinked =
    linkedProviders.length > 0
      ? linkedProviders
      : [];

  return (
    <div className="profile-section" data-testid="linked-accounts-section">
      <h2>🔗 Linked accounts</h2>
      <p className="profile-section-hint">
        Link Google or Apple to sign in without a password, or to recover access if one
        provider is lost. Email on the provider must match this account.
      </p>

      <ul className="linked-accounts-list" data-testid="linked-providers-list">
        {displayLinked.length === 0 ? (
          <li className="linked-accounts-empty">No social providers linked yet.</li>
        ) : (
          displayLinked.map((name) => (
            <li key={name} className="linked-accounts-item">
              <span className="linked-accounts-badge" data-testid={`linked-${name}`}>
                {name}
              </span>
              <span className="linked-accounts-status">Linked</span>
            </li>
          ))
        )}
      </ul>

      {(showGoogleLink || showAppleLink) && (
        <div className="linked-accounts-actions">
          <p className="profile-section-hint">Link another provider:</p>
          {showGoogleLink && (
            <div
              ref={googleHostRef}
              className={`google-signin-host${disabled || busy ? ' is-disabled' : ''}`}
              data-testid="link-google-host"
              aria-busy={!gisReady || busy}
            />
          )}
          {showAppleLink && (
            <button
              type="button"
              className="apple-signin-btn"
              data-testid="link-apple-button"
              disabled={disabled || busy || !appleReady}
              onClick={handleAppleLink}
            >
              Continue with Apple
            </button>
          )}
        </div>
      )}

      {error ? (
        <p className="social-auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
