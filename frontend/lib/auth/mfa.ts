export type MfaFactor = {
  id: string;
  status: string;
  factor_type?: string;
};

export function pickTotpFactor(factors: MfaFactor[] | null | undefined): MfaFactor | null {
  if (!factors?.length) return null;
  return (
    factors.find((f) => f.factor_type === 'totp' && f.status === 'verified') ||
    factors.find((f) => f.factor_type === 'totp') ||
    null
  );
}

export function needsMfaChallenge(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = (error.code || '').toLowerCase();
  const message = (error.message || '').toLowerCase();
  return (
    code.includes('mfa') ||
    message.includes('mfa') ||
    message.includes('aal2') ||
    message.includes('authenticator assurance')
  );
}
