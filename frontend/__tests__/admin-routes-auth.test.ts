import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdminDetailed = vi.fn();
const from = vi.fn();
const rpc = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const maybeSingle = vi.fn();
const inFn = vi.fn();
const order = vi.fn();
const limit = vi.fn();

vi.mock('@/lib/server/require-admin', () => ({
  requireAdminDetailed: (...args: unknown[]) => requireAdminDetailed(...args),
}));

vi.mock('@/lib/server/user-client', () => ({
  createServiceRoleClient: () => ({ from, rpc }),
}));

vi.mock('@/lib/server/guard-route', async () => {
  const { NextResponse } = await import('next/server');
  return {
    jsonError: (result: { error: string; status: number }) =>
      NextResponse.json({ error: result.error }, { status: result.status }),
  };
});

describe('admin service-role routes require session', () => {
  beforeEach(() => {
    vi.resetModules();
    requireAdminDetailed.mockReset();
    from.mockReset();
    rpc.mockReset();
    update.mockReset();
    eq.mockReset();
    select.mockReset();
    maybeSingle.mockReset();
    inFn.mockReset();
    order.mockReset();
    limit.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('approve returns 401 without session', async () => {
    requireAdminDetailed.mockResolvedValue({ ok: false, status: 401, error: 'unauthorized' });
    const { POST } = await import('../app/api/admin/approve/route');
    const res = await POST(new Request('https://x/api/admin/approve', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('reject returns 403 for non-editor', async () => {
    requireAdminDetailed.mockResolvedValue({ ok: false, status: 403, error: 'forbidden' });
    const { POST } = await import('../app/api/admin/reject/route');
    const res = await POST(new Request('https://x/api/admin/reject', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(403);
  });

  it('pending returns mfa_required for admin without aal2', async () => {
    requireAdminDetailed.mockResolvedValue({ ok: false, status: 401, error: 'mfa_required' });
    const { GET } = await import('../app/api/admin/pending/route');
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'mfa_required' });
  });

  it('breaking POST persists via RPC when authorized', async () => {
    requireAdminDetailed.mockResolvedValue({
      ok: true,
      user: { id: 'u1', email: 'a@x.com', role: 'admin', aal: 'aal2' },
    });
    rpc.mockResolvedValue({ data: true, error: null });
    maybeSingle.mockResolvedValue({
      data: { text_bn: 'জরুরি', is_active: true, updated_at: '2026-09-29T00:00:00.000Z' },
      error: null,
    });
    eq.mockReturnValue({ maybeSingle, eq });
    select.mockReturnValue({ eq });
    update.mockReturnValue({ eq });
    from.mockReturnValue({ update, select });
    const { POST } = await import('../app/api/admin/breaking/route');
    const res = await POST(
      new Request('https://x/api/admin/breaking', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: true, text: 'জরুরি' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persisted).toBe(true);
    expect(rpc).toHaveBeenCalledWith('set_breaking_ticker', { p_text: 'জরুরি' });
  });
});
