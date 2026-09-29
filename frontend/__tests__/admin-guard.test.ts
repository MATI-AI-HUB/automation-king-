import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();
const getAuthenticatorAssuranceLevel = vi.fn();
const cookiesGetAll = vi.fn(() => []);

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: cookiesGetAll,
    set: vi.fn(),
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser,
      mfa: { getAuthenticatorAssuranceLevel },
    },
    from: (...args: unknown[]) => from(...args),
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: vi.fn(),
    rpc: vi.fn(),
  }),
}));

describe('requireAdminDetailed', () => {
  beforeEach(() => {
    vi.resetModules();
    getUser.mockReset();
    maybeSingle.mockReset();
    eq.mockReset();
    select.mockReset();
    from.mockReset();
    getAuthenticatorAssuranceLevel.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    delete process.env.DESK_EDITOR_REQUIRE_AAL2;
    eq.mockReturnValue({ maybeSingle });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.DESK_EDITOR_REQUIRE_AAL2;
  });

  it('returns unauthorized when no user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { requireAdminDetailed } = await import('../lib/server/require-admin');
    const result = await requireAdminDetailed();
    expect(result).toEqual({ ok: false, status: 401, error: 'unauthorized' });
  });

  it('returns forbidden for reader role', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'r@x.com' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'reader' } });
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
    const { requireAdminDetailed } = await import('../lib/server/require-admin');
    const result = await requireAdminDetailed();
    expect(result).toEqual({ ok: false, status: 403, error: 'forbidden' });
  });

  it('requires aal2 for admin', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@x.com' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'admin' } });
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
    const { requireAdminDetailed } = await import('../lib/server/require-admin');
    const result = await requireAdminDetailed();
    expect(result).toEqual({ ok: false, status: 401, error: 'mfa_required' });
  });

  it('allows admin with aal2', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@x.com' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'admin' } });
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2' }, error: null });
    const { requireAdminDetailed } = await import('../lib/server/require-admin');
    const result = await requireAdminDetailed();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.role).toBe('admin');
      expect(result.user.aal).toBe('aal2');
    }
  });

  it('allows desk_editor at aal1 when flag is off', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'd@x.com' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'desk_editor' } });
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
    const { requireAdminDetailed } = await import('../lib/server/require-admin');
    const result = await requireAdminDetailed();
    expect(result.ok).toBe(true);
  });
});
