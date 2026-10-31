import { describe, expect, it } from 'vitest';
import { dict, t } from '../lib/i18n';

describe('EN/BN interface translation coverage', () => {
  it('keeps the locale dictionaries in exact key parity with non-empty strings', () => {
    const bnKeys = Object.keys(dict.bn).sort();
    const enKeys = Object.keys(dict.en).sort();
    expect(enKeys).toEqual(bnKeys);
    for (const key of bnKeys as Array<keyof typeof dict.bn>) {
      expect(dict.bn[key].trim(), `Bengali key ${key}`).not.toBe('');
      expect(dict.en[key].trim(), `English key ${key}`).not.toBe('');
    }
  });

  it('returns the requested locale rather than silently substituting Bengali copy', () => {
    expect(t('en', 'home_empty_state')).toBe(dict.en.home_empty_state);
    expect(t('bn', 'home_empty_state')).toBe(dict.bn.home_empty_state);
  });
});
