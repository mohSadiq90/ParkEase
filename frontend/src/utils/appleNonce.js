/**
 * Cryptographically random nonce for Apple Sign-In.
 * Sent raw to POST /api/auth/external; Apple hashes it into the id_token claim.
 * Backend matches SHA-256(raw) (hex / base64url) or raw value (PR6a).
 *
 * @returns {string} base64url-encoded 32 random bytes
 */
export function createAppleNonce() {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return toBase64Url(bytes);
}

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
