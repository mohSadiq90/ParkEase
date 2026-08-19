/**
 * Load Apple JS Sign-In SDK once per page.
 * @returns {Promise<typeof window.AppleID>}
 */
let loadPromise = null;

export function loadAppleAuth() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Apple Sign-In is only available in the browser'));
  }

  if (window.AppleID?.auth) {
    return Promise.resolve(window.AppleID);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-apple-auth="true"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.AppleID?.auth) resolve(window.AppleID);
        else reject(new Error('Apple Sign-In failed to initialize'));
      });
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('Failed to load Apple Sign-In'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.dataset.appleAuth = 'true';
    script.onload = () => {
      if (window.AppleID?.auth) {
        resolve(window.AppleID);
      } else {
        loadPromise = null;
        reject(new Error('Apple Sign-In failed to initialize'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Apple Sign-In'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Test helper: clear cached loader (vitest). */
export function resetAppleAuthLoader() {
  loadPromise = null;
}
