import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

function getAdmin() {
  return createAdminClient();
}

export async function POST(req: Request) {
  try {
    const { id, note } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
