'use client';

import { useEffect } from 'react';
import { useClientLocale } from '@/lib/use-client-locale';
import { t } from '@/lib/i18n';

/**
 * ErrorBoundary (route-level) — Banglar Voice.
 * Next.js App Router automatically wraps route segments in this boundary.
 * Any uncaught render/data error in a page or component falls back to this
 * branded screen instead of a white page. The user can retry; the error is
 * reported to the console (and could be forwarded to an error tracker).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useClientLocale();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Banglar Voice route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#CC0000]/10 text-[22px]">
          ⚠️
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#0F0F0F]">
          {t(locale, 'error_title')}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-black/60">
          {t(locale, 'error_body')}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#CC0000] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#CC0000]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CC0000] focus-visible:ring-offset-2"
        >
          {t(locale, 'error_retry')}
        </button>
      </div>
    </main>
  );
}
