import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { evaluateStaffAccess, type StaffSession } from './staff-auth';

export type AuthUser = StaffSession;

type CookieStore = {
  getAll: () => { name: string; value: string }[];
};

function cookieClient(cookieStore: CookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
}

function bearerClient(token: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}

async function sessionFromClient(
  sb: ReturnType<typeof createServerClient>,
  jwt?: string,
): Promise<StaffSession | { error: 'unauthenticated' | 'forbidden' | 'mfa_required'; status: 401 | 403 }> {
  const { data: { user } } = jwt
    ? await sb.auth.getUser(jwt)
    : await sb.auth.getUser();
  if (!user) {
    return { error: 'unauthenticated', status: 401 };
  }
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  let aal = 'aal1';
  const { data: aalData } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel) aal = aalData.currentLevel;
  const result = evaluateStaffAccess({
    userId: user.id,
    email: user.email,
    role: profile?.role ?? null,
    aal,
  });
  if (!result.ok) return { error: result.error, status: result.status };
  return result.user;
}

export async function requireStaffFromRequest(req?: Request): Promise<
  | { ok: true; user: StaffSession }
  | { ok: false; status: 401 | 403; error: 'unauthenticated' | 'forbidden' | 'mfa_required' }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, status: 401, error: 'unauthenticated' };
  }
  const cookieStore = await cookies();
  const cookieResult = await sessionFromClient(cookieClient(cookieStore));
  if ('id' in cookieResult) return { ok: true, user: cookieResult };
  const authHeader = req?.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const bearerResult = await sessionFromClient(bearerClient(token), token);
    if ('id' in bearerResult) return { ok: true, user: bearerResult };
    return { ok: false, status: bearerResult.status, error: bearerResult.error };
  }
  return { ok: false, status: cookieResult.status, error: cookieResult.error };
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const result = await requireStaffFromRequest();
  return result.ok ? result.user : null;
}

export function staffAuthResponse(result: { ok: false; status: 401 | 403; error: string }) {
  return { error: result.error, status: result.status };
}

export { requireStaffFromRequest as requireStaff };
