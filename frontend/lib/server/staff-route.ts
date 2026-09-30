import { NextResponse } from 'next/server';
import { requireStaffFromRequest } from './require-admin';
import type { StaffSession } from './staff-auth';

export async function withStaff(
  req: Request,
  handler: (user: StaffSession) => Promise<Response>,
): Promise<Response> {
  const result = await requireStaffFromRequest(req);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return handler(result.user);
}
