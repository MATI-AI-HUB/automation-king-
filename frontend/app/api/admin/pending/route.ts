import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const QUEUE_STATUSES = ['pending', 'submitted', 'approved'];
const FULL_COLUMNS =
  'id, title_bn, content_bn, category_key, source_name, source_url, thumbnail_url, ai_confidence, created_at, status, workflow_status, review_status, editorial_status';
const BASE_COLUMNS =
  'id, title_bn, content_bn, category_key, source_name, source_url, thumbnail_url, ai_confidence, created_at, status';

type QueueRow = {
  id: string;
  title_bn: string;
  content_bn: string | null;
  category_key: string | null;
  source_name: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  ai_confidence: number | null;
  created_at: string;
  status: string;
  workflow_status?: string | null;
  review_status?: string | null;
  editorial_status?: string | null;
};

export async function GET(req: Request) {
  return withStaff(req, async () => {
    try {
      const supabase = createServiceClient();
      let { data, error } = await supabase
        .from('articles')
        .select(FULL_COLUMNS)
        .in('status', QUEUE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        const fallback = await supabase
          .from('articles')
          .select(BASE_COLUMNS)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50);
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      const items = ((data || []) as QueueRow[]).map((a) => ({
        id: a.id,
        slug: a.id,
        title_bn: a.title_bn,
        summary: (a.content_bn || '').slice(0, 200),
        category: a.category_key || 'national',
        reporter_name: a.source_name || 'AI Pipeline',
        source_url: a.source_url,
        thumbnail_url: a.thumbnail_url,
        ai_score: Math.round((a.ai_confidence ?? 0.7) * 100),
        submitted_at: a.created_at,
        status: a.status,
        workflow_status: a.workflow_status || a.status,
        review_status: a.review_status || a.editorial_status || 'auto_unverified',
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
  });
}
