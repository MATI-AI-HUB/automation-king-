import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return withStaff(req, async () => {
    try {
      const { id, note } = await req.json();
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const supabase = createServiceClient();
      const now = new Date().toISOString();
      const full = {
        status: 'published',
        workflow_status: 'published',
        published_at: now,
        updated_at: now,
      };
      let { data, error } = await supabase
        .from('articles')
        .update(full)
        .eq('id', id)
        .select('id, status, published_at')
        .maybeSingle();

      if (error) {
        const fallback = await supabase
          .from('articles')
          .update({ status: 'published', published_at: now, updated_at: now })
          .eq('id', id)
          .select('id, status, published_at')
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }
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
  });
}
