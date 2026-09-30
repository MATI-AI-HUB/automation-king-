import { NextResponse } from 'next/server';
import { requireStaffFromRequest } from '@/lib/server/require-admin';
import { listUsers } from '@/lib/control/user-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireStaffFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  const admin = auth.user;
  try {
    const users = await listUsers();
    return NextResponse.json({ items: users }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
