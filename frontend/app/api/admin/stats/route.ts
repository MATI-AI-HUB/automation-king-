import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withStaff(req, async () =>
    NextResponse.json({
      today_published: 24,
      pending_count: 8,
      reporter_count: 3,
      ai_cost_usd: 12.34,
      ai_tokens: 145200,
      breaking_active: false,
      last_publish: new Date(Date.now() - 1800000).toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } }),
  );
}
