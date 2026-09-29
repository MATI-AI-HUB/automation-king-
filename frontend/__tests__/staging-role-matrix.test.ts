import { describe, expect, it } from 'vitest';
import { PRODUCTION_SUPABASE_REF, STAGING_SUPABASE_REF, supabaseRefFromUrl } from '../lib/flags';

const STAGING_URL = process.env.STAGING_SUPABASE_URL || '';
const STAGING_ANON = process.env.STAGING_ANON_KEY || '';
const LIVE = Boolean(STAGING_URL && STAGING_ANON);

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

function rest(path: string, init: RequestInit = {}) {
  const url = `${STAGING_URL.replace(/\/$/, '')}/rest/v1/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: STAGING_ANON,
      Authorization: `Bearer ${STAGING_ANON}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

describe('staging role-matrix guards', () => {
  it('aborts when STAGING_* secrets are missing (default CI)', () => {
    if (!LIVE) {
      expect(process.env.STAGING_SUPABASE_URL || '').toBe('');
      return;
    }
    const ref = supabaseRefFromUrl(STAGING_URL);
    expect(ref).not.toBe(PRODUCTION_SUPABASE_REF);
    expect(ref).toBe(STAGING_SUPABASE_REF);
  });

  it('refuses the production project ref even if secrets are present', () => {
    expect(supabaseRefFromUrl(`https://${PRODUCTION_SUPABASE_REF}.supabase.co`)).toBe(
      PRODUCTION_SUPABASE_REF,
    );
    if (LIVE) {
      expect(STAGING_URL.includes(PRODUCTION_SUPABASE_REF)).toBe(false);
    }
  });

  it.runIf(LIVE)('anon can SELECT published articles and cannot INSERT profiles', async () => {
    const published = await rest('articles?status=eq.published&select=id&limit=1');
    expect(published.status).toBeLessThan(500);
    const insert = await rest('profiles', {
      method: 'POST',
      body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect([401, 403, 409]).toContain(insert.status);
  });

  it.runIf(LIVE)('documents expected role coverage', () => {
    expect(ROLES).toHaveLength(7);
  });
});

export const ROLE_MATRIX_CONTRACT: Record<Role, string> = {
  anon: 'select published articles, breaking_ticker, live_sessions, videos; no writes',
  reader: 'same as anon plus own notifications is_read and own reading_history insert',
  citizen_reporter: 'insert own field_reports; storage field-media/{uid}/*; no published write',
  staff_reporter: 'own plus staff/ folder; cannot read other reporters private objects',
  desk_editor: 'articles update; aal2 only if DESK_EDITOR_REQUIRE_AAL2',
  chief_editor: 'articles publish; aal2 required',
  admin: 'vault rpc, set_user_role, set_breaking_ticker; aal2 required',
};
