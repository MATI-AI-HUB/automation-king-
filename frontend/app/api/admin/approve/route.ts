import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/guard-route';
import { requireAdminDetailed } from '@/lib/server/require-admin';
import { createServiceRoleClient } from '@/lib/server/user-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);

  try {
    const { id, note } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select('id, status, published_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json(
      { ok: true, id: data.id, status: data.status, published_at: data.published_at, note: note || '' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
