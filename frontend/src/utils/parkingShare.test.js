import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isParkingShareable,
  buildParkingShareUrl,
  buildParkingShareContent,
  buildWhatsAppShareUrl,
  buildTelegramShareUrl,
  shareParking,
} from './parkingShare';

const publicParking = {
  id: 'ps-1111-2222',
  title: 'Downtown Covered Spot',
  address: '12 Main St',
  city: 'Mumbai',
  hourlyRate: 50,
  isActive: true,
  isCorporateOnly: false,
};

describe('isParkingShareable', () => {
  it('allows active public marketplace listings', () => {
    expect(isParkingShareable(publicParking)).toBe(true);
  });

  it('rejects missing, corporate-only, and inactive listings', () => {
    expect(isParkingShareable(null)).toBe(false);
    expect(isParkingShareable({})).toBe(false);
    expect(isParkingShareable({ ...publicParking, isCorporateOnly: true })).toBe(false);
    expect(isParkingShareable({ ...publicParking, isActive: false })).toBe(false);
  });
});

describe('buildParkingShareUrl', () => {
  it('builds canonical /parking/{id} path without trailing slash on origin', () => {
    expect(buildParkingShareUrl(publicParking.id, 'https://parkease.example/')).toBe(
      'https://parkease.example/parking/ps-1111-2222'
    );
  });
});

describe('buildParkingShareContent', () => {
  it('returns null for non-shareable inventory', () => {
    expect(buildParkingShareContent({ ...publicParking, isCorporateOnly: true })).toBeNull();
  });

  it('includes title, place, rate, and book URL', () => {
    const content = buildParkingShareContent(publicParking, {
      origin: 'https://parkease.example',
    });
    expect(content).not.toBeNull();
    expect(content.url).toBe('https://parkease.example/parking/ps-1111-2222');
    expect(content.title).toBe('Downtown Covered Spot');
    expect(content.text).toContain('Downtown Covered Spot');
    expect(content.text).toContain('12 Main St, Mumbai');
    expect(content.text).toContain('Book here:');
    expect(content.text).toContain(content.url);
  });
});

describe('messenger deep links', () => {
  it('builds WhatsApp and Telegram URLs', () => {
    const content = buildParkingShareContent(publicParking, {
      origin: 'https://parkease.example',
    });
    const wa = buildWhatsAppShareUrl(content);
    const tg = buildTelegramShareUrl(content);
    expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(tg).toMatch(/^https:\/\/t\.me\/share\/url\?/);
    expect(decodeURIComponent(wa)).toContain(content.url);
    expect(tg).toContain(encodeURIComponent(content.url));
  });
});

describe('shareParking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns not_shareable for corporate-only', async () => {
    const result = await shareParking({ ...publicParking, isCorporateOnly: true });
    expect(result).toEqual({ ok: false, reason: 'not_shareable' });
  });

  it('uses Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    const result = await shareParking(publicParking, { origin: 'https://parkease.example' });
    expect(result).toEqual({ ok: true, method: 'native' });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Downtown Covered Spot',
        url: 'https://parkease.example/parking/ps-1111-2222',
      })
    );
  });

  it('falls back to clipboard when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await shareParking(publicParking, { origin: 'https://parkease.example' });
    expect(result).toEqual({ ok: true, method: 'clipboard' });
    expect(writeText).toHaveBeenCalled();
    expect(writeText.mock.calls[0][0]).toContain('Book here:');
  });

  it('treats AbortError as cancelled', async () => {
    const err = new Error('user cancelled');
    err.name = 'AbortError';
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(err),
    });

    const result = await shareParking(publicParking, { origin: 'https://parkease.example' });
    expect(result).toEqual({ ok: false, reason: 'cancelled' });
  });
});
