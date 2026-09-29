import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/guard-route';
import { requireAdminDetailed } from '@/lib/server/require-admin';
import { createServiceRoleClient } from '@/lib/server/user-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// PATCH /api/admin/api-keys/:id — update active/usage/rotate
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);
  try {
    const body = await req.json();
    const { is_active, usage_percent, key_value, environment = 'prod' } = body;

    const supabase = createServiceRoleClient();

    // If key_value provided → rotate via wrapper
    if (key_value) {
      const { data: row } = await supabase
        .from('api_vault')
        .select('service_name')
        .eq('id', id)
        .maybeSingle();

      if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

      const { error } = await supabase.rpc('create_api_key', {
        p_service_name: row.service_name,
        p_environment: environment,
        p_key_value: key_value,
      });
      if (error) throw error;

      return NextResponse.json(
        { ok: true, rotated: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Otherwise patch metadata
    const patch: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') patch.is_active = is_active;
    if (typeof usage_percent === 'number') patch.usage_percent = usage_percent;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, noop: true });
    }

    const { error } = await supabase
      .from('api_vault')
      .update(patch)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/api-keys/:id — remove key
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireAdminDetailed();
  if (!guard.ok) return jsonError(guard);
  try {
    const supabase = createServiceRoleClient();

    const { data: row } = await supabase
      .from('api_vault')
      .select('service_name, environment')
      .eq('id', id)
      .maybeSingle();

    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const { error } = await supabase.rpc('delete_api_key', {
      p_service_name: row.service_name,
      p_environment: row.environment,
    });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, deleted: row.service_name },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
