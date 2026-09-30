import { describe, expect, it } from 'vitest';
import { evaluateStaffAccess, roleRequiresAal2 } from '../lib/server/staff-auth';

describe('evaluateStaffAccess', () => {
  it('rejects missing session', () => {
    expect(evaluateStaffAccess({ userId: null, role: 'admin', aal: 'aal2' })).toEqual({
      ok: false,
      status: 401,
      error: 'unauthenticated',
    });
  });

  it('rejects non-editorial roles', () => {
    expect(evaluateStaffAccess({ userId: 'u1', role: 'staff_reporter', aal: 'aal2' })).toEqual({
      ok: false,
      status: 403,
      error: 'forbidden',
    });
  });

  it('requires aal2 for admin and chief_editor', () => {
    expect(evaluateStaffAccess({ userId: 'u1', email: 'a@x', role: 'admin', aal: 'aal1' })).toEqual({
      ok: false,
      status: 403,
      error: 'mfa_required',
    });
    const ok = evaluateStaffAccess({ userId: 'u1', email: 'a@x', role: 'chief_editor', aal: 'aal2' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.user.role).toBe('chief_editor');
  });

  it('does not require aal2 for desk_editor unless flagged', () => {
    const off = evaluateStaffAccess({
      userId: 'u1',
      role: 'desk_editor',
      aal: 'aal1',
      deskEditorRequireAal2: false,
    });
    expect(off.ok).toBe(true);
    const on = evaluateStaffAccess({
      userId: 'u1',
      role: 'desk_editor',
      aal: 'aal1',
      deskEditorRequireAal2: true,
    });
    expect(on).toEqual({ ok: false, status: 403, error: 'mfa_required' });
  });
});

describe('roleRequiresAal2', () => {
  it('is true for admin/chief_editor and optional for desk_editor', () => {
    expect(roleRequiresAal2('admin', false)).toBe(true);
    expect(roleRequiresAal2('chief_editor', false)).toBe(true);
    expect(roleRequiresAal2('desk_editor', false)).toBe(false);
    expect(roleRequiresAal2('desk_editor', true)).toBe(true);
  });
});
