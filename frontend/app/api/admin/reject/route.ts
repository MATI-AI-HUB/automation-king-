import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return withStaff(req, async () => {
    try {
      const { id, reason } = await req.json();
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const supabase = createServiceClient();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('articles')
        .update({
          status: 'retracted',
          workflow_status: 'retracted',
          updated_at: now,
        })
        .eq('id', id)
        .select('id, status')
        .maybeSingle();

      if (error) {
        const message = (error.message || '').toLowerCase();
        if (message.includes('retracted') || error.code === '23514') {
          const fallback = await supabase
            .from('articles')
            .update({ status: 'archived', updated_at: now })
            .eq('id', id)
            .select('id, status')
            .maybeSingle();
          if (fallback.error) throw fallback.error;
          if (!fallback.data) return NextResponse.json({ error: 'not found' }, { status: 404 });
          return NextResponse.json(
            { ok: true, id: fallback.data.id, status: fallback.data.status, reason: reason || '' },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
        throw error;
      }
      if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

      return NextResponse.json(
        { ok: true, id: data.id, status: data.status, reason: reason || '' },
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
