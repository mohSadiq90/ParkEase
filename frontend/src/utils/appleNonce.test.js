import { describe, it, expect } from 'vitest';
import { createAppleNonce } from './appleNonce';

describe('createAppleNonce', () => {
  it('returns a non-empty base64url string', () => {
    const nonce = createAppleNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(nonce.length).toBeGreaterThanOrEqual(32);
  });

  it('returns unique values across calls', () => {
    const a = createAppleNonce();
    const b = createAppleNonce();
    expect(a).not.toBe(b);
  });
});
