import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withStaff(req, async () =>
    NextResponse.json({
      reporters: [
        { id: 'r1', name: 'রফিকুল ইসলাম', email: 'rafiq@bv.com', reports_count: 142, last_active: new Date(Date.now() - 300000).toISOString(), status: 'active' },
        { id: 'r2', name: 'সালমা বেগম', email: 'salma@bv.com', reports_count: 89, last_active: new Date(Date.now() - 1800000).toISOString(), status: 'active' },
        { id: 'r3', name: 'করিম আহমেদ', email: 'karim@bv.com', reports_count: 67, last_active: new Date(Date.now() - 7200000).toISOString(), status: 'idle' },
      ],
    }, { headers: { 'Cache-Control': 'no-store' } }),
  );
}
