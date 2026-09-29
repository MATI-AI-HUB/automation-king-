'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { challengeExistingSession, enrollTotp, listTotpFactors } from '@/lib/auth/mfa';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrollQr, setEnrollQr] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectedFrom') || '/';

  const finish = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });

    if (signError) {
      setError(signError.message);
      setLoading(false);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      setStep('mfa');
      setLoading(false);
      return;
    }

    finish();
    setLoading(false);
  };

  const handleChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const result = await challengeExistingSession(supabase, code);
    if (!result.ok) {
      setError(result.error || 'mfa_failed');
      setLoading(false);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2' && aal?.nextLevel === 'aal2') {
      const retry = await challengeExistingSession(supabase, code);
      if (!retry.ok) {
        setError(retry.error || 'mfa_retry_failed');
        setLoading(false);
        return;
      }
    }
    finish();
    setLoading(false);
  };

  const handleEnroll = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const factors = await listTotpFactors(supabase);
      if (factors.length === 0) {
        const enrolled = await enrollTotp(supabase);
        setEnrollQr(enrolled.qrCode);
        setStep('mfa');
      } else {
        setStep('mfa');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'enroll_failed');
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-6">লগইন করুন</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {step === 'password' ? (
          <form onSubmit={handleLogin} className="space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'লোড হচ্ছে...' : 'লগইন'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleChallenge} className="space-y-4">
            <p className="text-sm text-neutral-600">অথেন্টিকেটর অ্যাপ থেকে ৬ সংখ্যার কোড দিন।</p>
            {enrollQr && (
              <div className="overflow-hidden rounded border border-neutral-200 p-2" dangerouslySetInnerHTML={{ __html: enrollQr }} />
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
            </button>
            <button
              type="button"
              onClick={handleEnroll}
              className="w-full text-sm text-blue-600"
            >
              নতুন TOTP এনরোল
            </button>
          </form>
        )}
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
