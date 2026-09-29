import { NextResponse } from 'next/server';
import { createUserServerClient } from '@/lib/server/user-client';
import {
  challengeAndVerify,
  enrollTotp,
  listTotpFactors,
  unenrollTotp,
} from '@/lib/auth/mfa';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  try {
    const sb = await createUserServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);
    const factors = await listTotpFactors(sb);
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    return json({ factors, aal: aal?.currentLevel ?? 'aal1', next: aal?.nextLevel ?? 'aal1' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'mfa_error' }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const sb = await createUserServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'enroll') {
      const enrolled = await enrollTotp(sb);
      return json({
        factorId: enrolled.factorId,
        qrCode: enrolled.qrCode,
        secret: enrolled.secret,
        uri: enrolled.uri,
      });
    }
    if (action === 'verify') {
      const factorId = String(body.factorId || '');
      const code = String(body.code || '');
      if (!factorId || !/^\d{6}$/.test(code)) return json({ error: 'invalid_code' }, 400);
      await challengeAndVerify(sb, factorId, code);
      await sb.auth.refreshSession();
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      return json({ ok: true, aal: aal?.currentLevel ?? 'aal2' });
    }
    if (action === 'challenge') {
      const code = String(body.code || '');
      const factors = await listTotpFactors(sb);
      const verified = factors.find((f) => f.status === 'verified');
      if (!verified) return json({ error: 'no_totp_factor' }, 400);
      await challengeAndVerify(sb, verified.id, code);
      await sb.auth.refreshSession();
      return json({ ok: true });
    }
    if (action === 'unenroll') {
      const factorId = String(body.factorId || '');
      if (!factorId) return json({ error: 'factorId required' }, 400);
      await unenrollTotp(sb, factorId);
      return json({ ok: true });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'mfa_error' }, 500);
  }
}
