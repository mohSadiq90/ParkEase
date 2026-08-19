/**
 * Load Google Identity Services (accounts.google.com/gsi/client) once per page.
 * @returns {Promise<typeof window.google>}
 */
let loadPromise = null;

export function loadGoogleGis() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Sign-In is only available in the browser'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gis="true"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.accounts?.id) resolve(window.google);
        else reject(new Error('Google Identity Services failed to initialize'));
      });
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('Failed to load Google Identity Services'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = 'true';
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
      } else {
        loadPromise = null;
        reject(new Error('Google Identity Services failed to initialize'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Test helper: clear cached loader (vitest). */
export function resetGoogleGisLoader() {
  loadPromise = null;
}
