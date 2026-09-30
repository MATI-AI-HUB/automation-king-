import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const withStaff = vi.fn();
const createServiceClient = vi.fn();

vi.mock('@/lib/server/staff-route', () => ({
  withStaff: (req: Request, handler: (user: unknown) => Promise<Response>) => withStaff(req, handler),
}));
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => createServiceClient(),
}));

describe('admin service-role routes', () => {
  beforeEach(() => {
    vi.resetModules();
    withStaff.mockReset();
    createServiceClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('approve returns 401 when staff auth fails', async () => {
    withStaff.mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 }),
    );
    const { POST } = await import('../app/api/admin/approve/route');
    const res = await POST(
      new Request('https://example.com/api/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ id: 'a1' }),
      }),
    );
    expect(res.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('pending returns 403 mfa_required for aal1 admin', async () => {
    withStaff.mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'mfa_required' }), { status: 403 }),
    );
    const { GET } = await import('../app/api/admin/pending/route');
    const res = await GET(new Request('https://example.com/api/admin/pending'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'mfa_required' });
  });

  it('breaking never uses in-memory state after auth', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const maybeSingle = vi.fn(async () => ({
      data: { text_bn: 'DB', is_active: true, updated_at: '2026-09-30T00:00:00.000Z' },
      error: null,
    }));
    createServiceClient.mockReturnValue({
      rpc,
      from: () => ({
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ eq: () => ({ maybeSingle }) }),
      }),
    });
    withStaff.mockImplementation(async (_req, handler) => handler({ id: 'u', role: 'admin', aal: 'aal2' }));
    const { POST } = await import('../app/api/admin/breaking/route');
    const res = await POST(
      new Request('https://example.com/api/admin/breaking', {
        method: 'POST',
        body: JSON.stringify({ active: true, text: 'DB' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('DB');
    expect(rpc).toHaveBeenCalled();
  });
});
