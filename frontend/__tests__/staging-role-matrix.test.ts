import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PRODUCTION_REF = 'rcffuqkofvuezgbjcixj';

const ROLES = [
  'anon',
  'reader',
  'citizen_reporter',
  'staff_reporter',
  'desk_editor',
  'chief_editor',
  'admin',
] as const;

type Role = (typeof ROLES)[number];

function stagingUrl(): string {
  return (process.env.STAGING_SUPABASE_URL || '').trim();
}

function abortIfProduction(): void {
  const url = stagingUrl();
  if (!url) throw new Error('STAGING_SUPABASE_URL missing');
  if (url.includes(PRODUCTION_REF)) {
    throw new Error('Refusing to run staging matrix against production ref');
  }
}

const configured = Boolean(
  process.env.STAGING_SUPABASE_URL && process.env.STAGING_SUPABASE_ANON_KEY,
);

describe.skipIf(!configured)('staging role matrix', () => {
  beforeEach(() => {
    abortIfProduction();
  });

  afterEach(() => {
    expect(stagingUrl().includes(PRODUCTION_REF)).toBe(false);
  });

  it('refuses the production project ref', () => {
    expect(stagingUrl()).not.toContain(PRODUCTION_REF);
  });

  it.each(ROLES)('placeholder matrix row for %s (secrets confirmed later)', (role: Role) => {
    expect(ROLES).toContain(role);
  });
});

describe('staging matrix guard', () => {
  it('aborts when URL contains the production ref', () => {
    const previous = process.env.STAGING_SUPABASE_URL;
    process.env.STAGING_SUPABASE_URL = `https://${PRODUCTION_REF}.supabase.co`;
    expect(() => abortIfProduction()).toThrow(/production ref/);
    if (previous === undefined) delete process.env.STAGING_SUPABASE_URL;
    else process.env.STAGING_SUPABASE_URL = previous;
  });
});
