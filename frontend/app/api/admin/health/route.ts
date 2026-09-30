import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withStaff(req, async () => {
    let backendUp = false;
    if (API_BASE) {
      try {
        const r = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
        backendUp = r.ok;
      } catch {}
    }
    return NextResponse.json({
      web: 'up',
      backend: backendUp ? 'up' : 'down',
      backend_url: API_BASE || 'not-configured',
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
