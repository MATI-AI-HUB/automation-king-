import { NextResponse } from 'next/server';
import { requireStaffFromRequest } from '@/lib/server/require-admin';
import { listPipelineRuns } from '@/lib/control/db-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireStaffFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  const admin = auth.user;
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const runs = await listPipelineRuns(limit);
    return NextResponse.json({ runs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
