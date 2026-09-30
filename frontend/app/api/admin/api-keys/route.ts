import { NextResponse } from 'next/server';
import { withStaff } from '@/lib/server/staff-route';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withStaff(req, async () => {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('api_vault')
      .select('id, service_name, environment, is_active, last_tested, usage_percent, created_at, updated_at')
      .order('service_name');

    if (error) throw error;

    return NextResponse.json(
      { items: data ?? [] },
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

export async function POST(req: Request) {
  return withStaff(req, async () => {
  try {
    const body = await req.json();
    const { service_name, environment = 'prod', key_value } = body;

    if (!service_name || !key_value) {
      return NextResponse.json(
        { error: 'service_name and key_value required' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('create_api_key', {
      p_service_name: service_name,
      p_environment: environment,
      p_key_value: key_value,
    });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, secret_id: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
  });
}
