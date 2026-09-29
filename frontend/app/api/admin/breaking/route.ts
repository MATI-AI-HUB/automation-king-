import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/guard-route';
import { requireAdminDetailed } from '@/lib/server/require-admin';
import { createServiceRoleClient } from '@/lib/server/user-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const memFallback = { active: false, text: '', updated_at: new Date().toISOString() };

function rpcMissing(message: string | undefined): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('42883') ||
    (m.includes('function') && m.includes('not found'))
  );
}

export async function POST(req: Request) {
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);

  try {
    const { active, text } = await req.json();
    const nextText = typeof text === 'string' ? text : memFallback.text;
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('set_breaking_ticker', { p_text: nextText });

    if (error && !rpcMissing(error.message)) {
      throw error;
    }

    if (!error) {
      if (active === false) {
        await supabase.from('breaking_ticker').update({ is_active: false }).eq('id', 1);
      }
      const { data: row } = await supabase
        .from('breaking_ticker')
        .select('text_bn, is_active, updated_at')
        .eq('id', 1)
        .maybeSingle();
      return NextResponse.json(
        {
          active: row?.is_active ?? Boolean(data),
          text: row?.text_bn ?? nextText,
          updated_at: row?.updated_at ?? new Date().toISOString(),
          persisted: true,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    memFallback.active = Boolean(active);
    memFallback.text = nextText;
    memFallback.updated_at = new Date().toISOString();
    return NextResponse.json(
      { ...memFallback, persisted: false, warning: 'rpc_unavailable' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

export async function GET() {
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('breaking_ticker')
      .select('text_bn, is_active, updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) {
      return NextResponse.json(
        { active: data.is_active, text: data.text_bn, updated_at: data.updated_at, persisted: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
  } catch {
    /* fall through to memory */
  }
  return NextResponse.json(
    { ...memFallback, persisted: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
