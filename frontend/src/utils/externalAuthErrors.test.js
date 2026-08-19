import { describe, it, expect } from 'vitest';
import {
  externalAuthErrorMessage,
  resolveExternalAuthCode,
} from './externalAuthErrors';

describe('externalAuthErrorMessage', () => {
  it('shows friendly copy for account_exists code', () => {
    expect(
      externalAuthErrorMessage({
        code: 'account_exists',
        message: 'account_exists',
        errors: ['account_exists'],
      }),
    ).toMatch(/already registered|already exists/i);
  });

  it('detects code from errors array when code field missing', () => {
    expect(
      externalAuthErrorMessage({
        message: 'account_exists',
        errors: ['account_exists'],
      }),
    ).toMatch(/already registered|already exists/i);
  });

  it('does not surface machine code tokens as toast text', () => {
    const text = externalAuthErrorMessage({
      code: 'account_exists',
      message: 'account_exists',
      errors: ['account_exists'],
    });
    expect(text).not.toBe('account_exists');
    expect(text).not.toMatch(/^account_exists$/);
  });

  it('falls back to generic social failure', () => {
    expect(externalAuthErrorMessage({})).toMatch(/social sign-in failed/i);
  });
});

describe('resolveExternalAuthCode', () => {
  it('prefers code field', () => {
    expect(
      resolveExternalAuthCode({ code: 'account_exists', errors: ['other'] }),
    ).toBe('account_exists');
  });
});
