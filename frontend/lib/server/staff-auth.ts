export const EDITORIAL_ROLES = ['admin', 'chief_editor', 'desk_editor'] as const;
export type EditorialRole = (typeof EDITORIAL_ROLES)[number];

export type StaffAal = 'aal1' | 'aal2';

export type StaffSession = {
  id: string;
  email: string;
  role: string;
  aal: StaffAal;
};

export type StaffAuthFailure = {
  ok: false;
  status: 401 | 403;
  error: 'unauthenticated' | 'forbidden' | 'mfa_required';
};

export type StaffAuthSuccess = { ok: true; user: StaffSession };
export type StaffAuthResult = StaffAuthSuccess | StaffAuthFailure;

export function isEditorialRole(role: string | null | undefined): role is EditorialRole {
  return !!role && (EDITORIAL_ROLES as readonly string[]).includes(role);
}

export function roleRequiresAal2(
  role: string,
  deskEditorRequireAal2 = process.env.DESK_EDITOR_REQUIRE_AAL2 === 'true',
): boolean {
  if (role === 'admin' || role === 'chief_editor') return true;
  if (role === 'desk_editor') return deskEditorRequireAal2;
  return false;
}

export function normalizeAal(value: string | null | undefined): StaffAal {
  return value === 'aal2' ? 'aal2' : 'aal1';
}

export function evaluateStaffAccess(input: {
  userId: string | null | undefined;
  email?: string | null;
  role: string | null | undefined;
  aal: string | null | undefined;
  deskEditorRequireAal2?: boolean;
}): StaffAuthResult {
  if (!input.userId) {
    return { ok: false, status: 401, error: 'unauthenticated' };
  }
  if (!isEditorialRole(input.role)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  const aal = normalizeAal(input.aal);
  if (roleRequiresAal2(input.role, input.deskEditorRequireAal2) && aal !== 'aal2') {
    return { ok: false, status: 403, error: 'mfa_required' };
  }
  return {
    ok: true,
    user: {
      id: input.userId,
      email: input.email || '',
      role: input.role,
      aal,
    },
  };
}
