/**
 * Marketplace parking share helpers (web).
 * Public listings only — corporate-only inventory must never be shared externally.
 */

import { formatInr } from './formatCurrency';

/**
 * Whether a parking listing may be shared outside the app.
 * Corporate-only inventory is company surface only (channel isolation).
 * Inactive listings are not advertised via share.
 *
 * @param {object|null|undefined} parking
 * @returns {boolean}
 */
export function isParkingShareable(parking) {
  if (!parking?.id) return false;
  if (parking.isCorporateOnly === true) return false;
  if (parking.isActive === false) return false;
  return true;
}

/**
 * Canonical public web URL for a marketplace listing.
 * @param {string} parkingId
 * @param {string} [origin] - defaults to window.location.origin in browser
 * @returns {string}
 */
export function buildParkingShareUrl(parkingId, origin) {
  const resolvedOrigin =
    origin ??
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '');
  const base = String(resolvedOrigin || '').replace(/\/$/, '');
  return `${base}/parking/${parkingId}`;
}

/**
 * Build share title / text / url for a public marketplace parking space.
 * @param {object} parking
 * @param {{ origin?: string }} [options]
 * @returns {{ title: string, text: string, url: string } | null}
 */
export function buildParkingShareContent(parking, options = {}) {
  if (!isParkingShareable(parking)) return null;

  const url = buildParkingShareUrl(parking.id, options.origin);
  const title = parking.title || 'ParkEase Parking Spot';
  const place =
    [parking.address, parking.city].filter(Boolean).join(', ') || 'See location in ParkEase';
  const rate = formatInr(parking.hourlyRate, { fallback: '₹0' });

  const text =
    `Check out "${title}" on ParkEase!\n` +
    `📍 ${place}\n` +
    `💰 ${rate}/hr\n\n` +
    `Book here: ${url}`;

  return { title, text, url };
}

/**
 * WhatsApp share deep link (opens app/web with prefilled message).
 * @param {{ text: string, url: string }} content
 * @returns {string}
 */
export function buildWhatsAppShareUrl(content) {
  const message = content?.text || content?.url || '';
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Telegram share deep link.
 * @param {{ text: string, url: string, title?: string }} content
 * @returns {string}
 */
export function buildTelegramShareUrl(content) {
  const url = content?.url || '';
  const text = content?.text || content?.title || '';
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/**
 * Share a public parking listing via Web Share API, with clipboard fallback.
 *
 * @param {object} parking
 * @param {{ origin?: string }} [options]
 * @returns {Promise<{ ok: boolean, method?: 'native'|'clipboard', reason?: string }>}
 */
export async function shareParking(parking, options = {}) {
  const content = buildParkingShareContent(parking, options);
  if (!content) {
    return { ok: false, reason: 'not_shareable' };
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url,
      });
      return { ok: true, method: 'native' };
    } catch (err) {
      // User dismissed the sheet — not an error to surface.
      if (err && err.name === 'AbortError') {
        return { ok: false, reason: 'cancelled' };
      }
      // Fall through to clipboard for unsupported share payloads / permission issues.
    }
  }

  const clipboardText = content.text;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return { ok: true, method: 'clipboard' };
    } catch {
      // continue
    }
  }

  // Last resort: legacy execCommand copy
  if (typeof document !== 'undefined') {
    try {
      const el = document.createElement('textarea');
      el.value = clipboardText;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(el);
      if (copied) return { ok: true, method: 'clipboard' };
    } catch {
      // continue
    }
  }

  return { ok: false, reason: 'failed' };
}
