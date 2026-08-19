import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy } from './passwordPolicy';

describe('validatePasswordPolicy', () => {
  it('accepts a full-strength password', () => {
    expect(validatePasswordPolicy('TestPass1!')).toBeNull();
  });

  it('rejects short passwords', () => {
    expect(validatePasswordPolicy('Ab1!x')).toMatch(/at least 8/i);
  });

  it('requires uppercase, lowercase, digit, special', () => {
    expect(validatePasswordPolicy('testpass1!')).toMatch(/uppercase/i);
    expect(validatePasswordPolicy('TESTPASS1!')).toMatch(/lowercase/i);
    expect(validatePasswordPolicy('TestPass!!')).toMatch(/digit/i);
    expect(validatePasswordPolicy('TestPass12')).toMatch(/special/i);
  });
});
