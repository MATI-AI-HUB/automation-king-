import { NextResponse } from 'next/server';
import { requireAdminDetailed, type AuthUser, type GuardFailure } from './require-admin';

export function jsonError(result: GuardFailure) {
  return NextResponse.json(
    { error: result.error },
    { status: result.status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function withAdminGuard(
  handler: (user: AuthUser, req: Request) => Promise<Response>,
  req: Request,
): Promise<Response> {
  const result = await requireAdminDetailed();
  if (!result.ok) return jsonError(result);
  return handler(result.user, req);
}
