import { describe, expect, it } from 'vitest';
import { needsMfaChallenge, pickTotpFactor } from '../lib/auth/mfa';

describe('mfa helpers', () => {
  it('picks verified totp factor', () => {
    const factor = pickTotpFactor([
      { id: 'a', status: 'unverified', factor_type: 'totp' },
      { id: 'b', status: 'verified', factor_type: 'totp' },
    ]);
    expect(factor?.id).toBe('b');
  });

  it('detects aal2 / mfa errors', () => {
    expect(needsMfaChallenge({ message: 'AAL2 required' })).toBe(true);
    expect(needsMfaChallenge({ code: 'mfa_required' })).toBe(true);
    expect(needsMfaChallenge({ message: 'invalid login' })).toBe(false);
  });
});
