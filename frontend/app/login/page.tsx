'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { needsMfaChallenge, pickTotpFactor } from '@/lib/auth/mfa';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectedFrom') || '/';

  const finish = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const startChallenge = async () => {
    const supabase = createClient();
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const factor = pickTotpFactor(data?.totp || data?.all);
    if (!factor) throw new Error('mfa_required');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError || !challenge) throw challengeError || new Error('mfa_required');
    setFactorId(factor.id);
    setChallengeId(challenge.id);
    setNeedsChallenge(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    try {
      if (needsChallenge) {
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId,
          code: otp,
        });
        if (verifyError) throw verifyError;
        await supabase.auth.refreshSession();
        finish();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (needsMfaChallenge(signInError)) {
          await startChallenge();
          return;
        }
        throw signInError;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        await startChallenge();
        return;
      }
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-6">লগইন করুন</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          {!needsChallenge ? (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700">ইমেইল</label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700">MFA কোড</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'লোড হচ্ছে...' : needsChallenge ? 'যাচাই করুন' : 'লগইন'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          অ্যাক্সেস নেই? <a href="/register" className="text-blue-600 hover:underline">রেজিস্ট্রেশন করুন</a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-50">
          <p className="text-sm text-neutral-500">লোড হচ্ছে…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
