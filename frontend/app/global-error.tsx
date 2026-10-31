"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
    if (!match) return;
    try {
      const value = decodeURIComponent(match[1]);
      if (isLocale(value)) setLocale(value);
    } catch {
      setLocale(DEFAULT_LOCALE);
    }
  }, []);

  return (
    <html lang={locale}>
      <body>
        <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: 0 }} aria-hidden="true">!</p>
            <h1>{t(locale, 'error_title')}</h1>
            <p>{t(locale, 'error_body')}</p>
            <button type="button" onClick={() => window.location.assign('/')} style={{ padding: '0.7rem 1.2rem', borderRadius: '999px', border: 0, background: '#CC0000', color: '#fff', cursor: 'pointer' }}>
              {t(locale, 'back_home')}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
