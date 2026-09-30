import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withStaff(req, async () => {
  const { id } = await params;
  try {
    const supabase = createServiceClient();

    const { data: row } = await supabase
      .from('api_vault')
      .select('service_name, key_encrypted, environment, is_active')
      .eq('id', id)
      .maybeSingle();

    if (!row || !row.key_encrypted) {
      return NextResponse.json({ error: 'not found or no secret' }, { status: 404 });
    }

    const { data: plain, error: decryptErr } = await supabase.rpc('decrypt_vault_secret', {
      p_secret_id: row.key_encrypted,
    });

    if (decryptErr || !plain) {
      return NextResponse.json({ error: 'decrypt failed' }, { status: 500 });
    }

    // Test based on service_name pattern
    let testResult: { ok: boolean; status: number; message: string } = {
      ok: false,
      status: 0,
      message: 'no test handler for this service',
    };

    if (row.service_name.includes('GROQ')) {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${plain}` },
      });
      testResult = {
        ok: r.ok,
        status: r.status,
        message: r.ok ? 'Groq API reachable' : `Groq returned ${r.status}`,
      };
    } else if (row.service_name.includes('OPENAI')) {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${plain}` },
      });
      testResult = {
        ok: r.ok,
        status: r.status,
        message: r.ok ? 'OpenAI API reachable' : `OpenAI returned ${r.status}`,
      };
    } else if (row.service_name.includes('PEXELS')) {
      const r = await fetch('https://api.pexels.com/v1/search?query=news&per_page=1', {
        headers: { Authorization: plain },
      });
      testResult = {
        ok: r.ok,
        status: r.status,
        message: r.ok ? 'Pexels API reachable' : `Pexels returned ${r.status}`,
      };
    }

    // Update last_tested + is_active based on result
    await supabase
      .from('api_vault')
      .update({
        last_tested: new Date().toISOString(),
        is_active: testResult.ok ? true : row.is_active,
      })
      .eq('id', id);

    return NextResponse.json(testResult, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
  });
}
