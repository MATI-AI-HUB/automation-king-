import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';
import { readBreakingTicker, writeBreakingTicker } from '@/lib/breaking-ticker';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return withStaff(req, async () => {
    try {
      const { active, text } = await req.json();
      const supabase = createServiceClient();
      const current = await readBreakingTicker(supabase);
      const state = await writeBreakingTicker(supabase, {
        active: Boolean(active),
        text: typeof text === 'string' ? text : current.text,
      });
      return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
  });
}

export async function GET(req: Request) {
  return withStaff(req, async () => {
    const supabase = createServiceClient();
    const state = await readBreakingTicker(supabase);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  });
}
