import { describe, expect, it } from 'vitest';
import { isV2RedesignEnabled } from '../lib/feature-flags';
import { dict } from '../lib/i18n';

describe('v2 redesign rollout flag', () => {
  it.each([undefined, null, '', '1', 'TRUE', 'false', 'true '])('stays off for %s', (value) => {
    expect(isV2RedesignEnabled(value)).toBe(false);
  });

  it('enables only for the exact true cookie value', () => {
    expect(isV2RedesignEnabled('true')).toBe(true);
  });
});

describe('currency controls', () => {
  it('has paired localized labels for both currency choices', () => {
    expect(dict.bn.currency_label).toBeTruthy();
    expect(dict.en.currency_label).toBeTruthy();
    expect(dict.bn.currency_bdt).toBeTruthy();
    expect(dict.en.currency_bdt).toBeTruthy();
    expect(dict.bn.currency_usd).toBeTruthy();
    expect(dict.en.currency_usd).toBeTruthy();
  });
});
