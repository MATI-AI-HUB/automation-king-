import type { SupabaseClient } from '@supabase/supabase-js';

export type MfaFactor = {
  id: string;
  status: string;
  friendly_name?: string;
};

export type EnrollResult = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

export async function listTotpFactors(client: SupabaseClient): Promise<MfaFactor[]> {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).map((f) => ({
    id: f.id,
    status: f.status,
    friendly_name: f.friendly_name ?? undefined,
  }));
}

export async function enrollTotp(client: SupabaseClient): Promise<EnrollResult> {
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'BanglarVoice',
  });
  if (error || !data) throw error ?? new Error('enroll_failed');
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function challengeAndVerify(
  client: SupabaseClient,
  factorId: string,
  code: string,
): Promise<void> {
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
    factorId,
  });
  if (challengeError || !challenge) throw challengeError ?? new Error('challenge_failed');
  const { error: verifyError } = await client.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

export async function unenrollTotp(client: SupabaseClient, factorId: string): Promise<void> {
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function currentAal(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data?.currentLevel) return 'aal1';
  return data.currentLevel;
}

export async function challengeExistingSession(
  client: SupabaseClient,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const factors = await listTotpFactors(client);
  const verified = factors.find((f) => f.status === 'verified');
  if (!verified) return { ok: false, error: 'no_totp_factor' };
  try {
    await challengeAndVerify(client, verified.id, code);
    await client.auth.refreshSession();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify_failed' };
  }
}
