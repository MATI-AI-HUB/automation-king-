import { NextResponse } from 'next/server';
import { requireStaffFromRequest } from '@/lib/server/require-admin';
import { deleteSecret } from '@/lib/control/vault-service';
import { logAction } from '@/lib/control/audit-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  const admin = auth.user;
  try {
    const { id } = await params;
    const result = await deleteSecret(id);
    await logAction({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'secret.delete',
      target: result.deleted,
    });
    return NextResponse.json(
      { ok: true, deleted: result.deleted },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
