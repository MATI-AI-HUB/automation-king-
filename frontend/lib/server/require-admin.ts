import { AAL2_ROLES, DESK_EDITOR_REQUIRE_AAL2 } from '../flags';
import { createUserServerClient } from './user-client';

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor'];

export type AuthUser = { id: string; email: string; role: string; aal: string };

export type GuardFailure = {
  ok: false;
  status: 401 | 403 | 503;
  error: 'unauthorized' | 'forbidden' | 'mfa_required' | 'auth_unconfigured' | 'auth_unavailable';
};

export type GuardOk = { ok: true; user: AuthUser };
export type GuardResult = GuardOk | GuardFailure;

function aalRequiredFor(role: string): boolean {
  if (AAL2_ROLES.has(role)) return true;
  if (role === 'desk_editor') return DESK_EDITOR_REQUIRE_AAL2;
  return false;
}

export async function requireAdminDetailed(): Promise<GuardResult> {
  try {
    const sb = await createUserServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false, status: 401, error: 'unauthorized' };

    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return { ok: false, status: 403, error: 'forbidden' };
    }

    let aal = 'aal1';
    const mfa = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!mfa.error && mfa.data?.currentLevel) {
      aal = mfa.data.currentLevel;
    }

    if (aalRequiredFor(profile.role) && aal !== 'aal2') {
      return { ok: false, status: 401, error: 'mfa_required' };
    }

    return {
      ok: true,
      user: { id: user.id, email: user.email || '', role: profile.role, aal },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'supabase_unconfigured') {
      return { ok: false, status: 503, error: 'auth_unconfigured' };
    }
    return { ok: false, status: 503, error: 'auth_unavailable' };
  }
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const result = await requireAdminDetailed();
  return result.ok ? result.user : null;
}

export function guardResponse(result: GuardFailure) {
  return { error: result.error, status: result.status };
}
