import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/guard-route';
import { requireAdminDetailed } from '@/lib/server/require-admin';
import { createServiceRoleClient } from '@/lib/server/user-client';
import { LIFECYCLE_QUEUE_STATUSES, REVIEW_STATUS_QUEUE } from '@/lib/flags';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const BASE_COLS = 'id, title_bn, content_bn, category_key, source_name, source_url, thumbnail_url, ai_confidence, created_at, status';

function missingColumn(message: string | undefined): boolean {
  const m = (message || '').toLowerCase();
  return m.includes('does not exist') || m.includes('42703') || m.includes('schema cache');
}

export async function GET() {
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);

  try {
    const supabase = createServiceRoleClient();
    let rows: Record<string, unknown>[] | null = null;

    const extended = await supabase
      .from('articles')
      .select(`${BASE_COLS}, review_status, editorial_status`)
      .in('status', [...LIFECYCLE_QUEUE_STATUSES])
      .order('created_at', { ascending: false })
      .limit(50);

    if (extended.error && missingColumn(extended.error.message)) {
      const fallback = await supabase
        .from('articles')
        .select(BASE_COLS)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallback.error) throw fallback.error;
      rows = fallback.data as Record<string, unknown>[] | null;
    } else if (extended.error) {
      throw extended.error;
    } else {
      rows = extended.data as Record<string, unknown>[] | null;
    }

    const queued = (rows || []).filter((a) => {
      const review = String(a.review_status || a.editorial_status || '');
      if (!review) return true;
      return review === REVIEW_STATUS_QUEUE || review === 'pending_review' || review === 'auto_unverified';
    });

    const items = queued.map((a) => ({
      id: a.id,
      slug: a.id,
      title_bn: a.title_bn,
      summary: String(a.content_bn || '').slice(0, 200),
      category: a.category_key || 'national',
      reporter_name: a.source_name || 'AI Pipeline',
      source_url: a.source_url,
      thumbnail_url: a.thumbnail_url,
      ai_score: Math.round((Number(a.ai_confidence ?? 0.7)) * 100),
      submitted_at: a.created_at,
      status: a.status,
      review_status: a.review_status || a.editorial_status || REVIEW_STATUS_QUEUE,
    }));

    return NextResponse.json(
      { items, total: items.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e), items: [] },
      { status: 500 },
    );
  }
}
