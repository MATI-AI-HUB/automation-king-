import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLocaleFromCookie, LOCALE_COOKIE, t } from '@/lib/i18n';

/** 404 page — Banglar Voice. */
export default async function NotFound() {
  const locale = getLocaleFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="mb-4 text-[64px] leading-none font-bold tracking-tight text-[#CC0000]">404</div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#0F0F0F]">{t(locale, 'not_found_title')}</h1>
        <p className="mb-6 text-sm leading-relaxed text-black/60">{t(locale, 'not_found_body')}</p>
        <Link
          href="/"
          className="inline-block rounded-full bg-[#0F0F0F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0F0F0F]/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
        >
          {t(locale, 'back_home')}
        </Link>
      </div>
    </main>
  );
}
