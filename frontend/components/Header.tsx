'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './LanguageToggle';
import { BreakingMarquee } from './breaking-marquee';
import { WeatherWidget } from './weather-widget';
import { t, type Locale } from '@/lib/i18n';
import { formatBanglaCalendarDate } from '@/lib/bn-date';
import { TopBar } from './TopBar';

const NAV_KEYS = [
  { href: '/#latest', key: 'latest' as const },
  { href: '/category/politics', key: 'politics' as const },
  { href: '/category/economy', key: 'economy' as const },
  { href: '/category/international', key: 'international' as const },
  { href: '/epaper', key: 'epaper' as const },
  { href: '/search', key: 'search' as const },
  { href: '/download', key: 'app' as const },
];

function LiveBanglaClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  const bcp47 = locale === 'en' ? 'en-US' : 'bn-BD';
  const bengaliCalendarDate = formatBanglaCalendarDate(now, locale);
  const gregorianDate = new Intl.DateTimeFormat(bcp47, {
    timeZone: 'Asia/Dhaka',
    calendar: 'gregory',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const hijriDate = new Intl.DateTimeFormat(bcp47, {
    timeZone: 'Asia/Dhaka',
    calendar: 'islamic-umalqura',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  return (
    <time
      dateTime={now.toISOString()}
      className="max-w-full text-[10px] font-medium leading-tight text-white/90 sm:text-xs"
    >
      <span>{bengaliCalendarDate}</span>
      <span className="mx-1" aria-hidden="true">•</span>
      <span>{gregorianDate}</span>
      <span className="mx-1" aria-hidden="true">•</span>
      <span>{t(locale, 'hijri_calendar')}: {hijriDate}</span>
      <span className="mx-1" aria-hidden="true">•</span>
      {now.toLocaleTimeString(bcp47, { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

export function Header({ locale = 'bn' as Locale, redesignEnabled = false }: { locale?: Locale; redesignEnabled?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      menuRef.current?.focus();
    }
  }, [menuOpen]);

  const navLinks = NAV_KEYS.map((n) => ({ href: n.href, label: t(locale, n.key) }));

  if (redesignEnabled) return <RedesignedHeader locale={locale} navLinks={navLinks} />;

  return (
    <>
      <div className="bg-crimson text-white">
        <div className="mx-auto flex min-h-8 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <LiveBanglaClock locale={locale} />
            <WeatherWidget locale={locale} />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium sm:gap-4 sm:text-[11px]">
            <a href="/about" className="hidden hover:underline sm:inline">{t(locale, 'about')}</a>
            <a href="/contact" className="hidden hover:underline sm:inline">{t(locale, 'contact')}</a>
            <LanguageToggle locale={locale} />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/80 bg-paper/85 shadow-glass backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={t(locale, menuOpen ? 'menu_close' : 'menu_open')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-muted md:hidden dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>

            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2 md:gap-2.5"
              aria-label={`Banglar Voice 24NEWS — ${t(locale, 'home')}`}
            >
              <Image
                src="/banglar-voice-logo.png"
                alt="Banglar Voice — বাংলার ভয়েস"
                width={320}
                height={108}
                priority
                className="h-[52px] w-auto object-contain md:h-[68px] lg:h-[72px]"
              />
              <span
                aria-hidden="true"
                className="relative ml-2 inline-flex items-center rounded-md bg-gradient-to-br from-[#CC0000] to-[#8B0000] px-1.5 py-1 text-[10px] font-black uppercase leading-none tracking-widest text-white shadow-sm ring-1 ring-red-900/20 md:ml-2.5 md:px-2.5 md:py-1.5 md:text-sm"
              >
                24NEWS
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 text-sm font-semibold md:flex" aria-label={t(locale, 'nav_primary')}>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-ink/80 transition-colors hover:bg-muted hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/#live"
              className="hidden rounded-full border border-crimson/30 px-3 py-2 text-xs font-bold text-crimson hover:bg-crimson/5 sm:inline-flex dark:text-red-300"
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" aria-hidden="true" />
              {t(locale, 'live_tv')}
            </a>
            <a
              href="/#latest"
              className="hidden rounded-full bg-crimson px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-crimson-dark sm:inline-flex"
            >
              {t(locale, 'latest')}
            </a>
            <a href="/login" aria-label={t(locale, 'account')} title={t(locale, 'account')} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-muted dark:border-white/20 dark:text-white dark:hover:bg-white/10">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
            </a>
            <ThemeToggle locale={locale} />
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={t(locale, 'menu_close')}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            <nav
              id="mobile-menu"
              ref={menuRef}
              tabIndex={-1}
              className="relative z-50 max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-border bg-paper px-4 py-3 shadow-glass outline-none md:hidden dark:border-white/10 dark:bg-ink"
              aria-label={t(locale, 'nav_mobile')}
            >
              <ul className="space-y-1">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink/85 hover:bg-muted dark:text-white/85 dark:hover:bg-white/10"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li className="flex gap-3 pt-2 text-sm font-medium text-ink/70 dark:text-white/70">
                  <a href="/about" className="hover:underline">{t(locale, 'about')}</a>
                  <a href="/contact" className="hover:underline">{t(locale, 'contact')}</a>
                </li>
              </ul>
            </nav>
          </>
        )}

        <BreakingMarquee locale={locale} />
      </header>
    </>
  );
}

function RedesignedHeader({
  locale,
  navLinks,
}: {
  locale: Locale;
  navLinks: Array<{ href: string; label: string }>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const fontClass = locale === 'bn' ? 'font-serifbn leading-[1.7]' : 'leading-[1.7]';
  const navStyle = locale === 'en' ? { fontFamily: 'var(--font-inter), Inter, sans-serif' } : undefined;

  return (
    <>
      <TopBar locale={locale} />
      <header className="sticky top-0 z-50 border-b border-border/80 bg-paper/95 shadow-glass backdrop-blur-xl supports-[backdrop-filter]:bg-paper/85">
        <div className="mx-auto grid max-w-6xl grid-cols-[40px_1fr_auto] items-center gap-2 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:py-4">
          <div className="hidden md:block" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="v2-mobile-menu"
            aria-label={t(locale, menuOpen ? 'menu_close' : 'menu_open')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-muted md:hidden dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          <Link href="/" className="justify-self-center inline-flex items-center gap-2.5 rounded-xl px-1 py-0.5" aria-label={`Banglar Voice 24NEWS — ${t(locale, 'home')}`}>
            <svg width="44" height="44" viewBox="0 0 44 44" role="img" aria-label={locale === 'en' ? 'Banglar Voice mark' : 'বাংলার ভয়েস প্রতীক'}>
              <circle cx="22" cy="22" r="20" fill="#CC0000" />
              <path d="M11 22h4l3-8 5 16 3-8h7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-black tracking-tight text-ink dark:text-white sm:text-lg">
                {locale === 'en' ? 'Banglar Voice' : 'বাংলার ভয়েস'}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-crimson sm:text-[10px]">24NEWS</span>
            </span>
          </Link>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <Link href="/#live" className="hidden rounded-full border border-crimson/30 px-3 py-2 text-xs font-bold text-crimson hover:bg-crimson/5 sm:inline-flex dark:text-red-300">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" aria-hidden="true" />
              {t(locale, 'live_tv')}
            </Link>
            <ThemeToggle locale={locale} />
            <Link href="/login" aria-label={t(locale, 'account')} title={t(locale, 'account')} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-muted dark:border-white/20 dark:text-white dark:hover:bg-white/10">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>
            </Link>
          </div>
        </div>

        <nav style={navStyle} className={`mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-border/50 px-3 py-1.5 text-xs font-semibold text-ink/85 sm:justify-center sm:text-sm dark:text-white/85 ${fontClass}`} aria-label={t(locale, 'nav_primary')}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="shrink-0 rounded-full px-3 py-1.5 transition-colors hover:bg-muted hover:text-crimson dark:hover:bg-white/10">
              {link.label}
            </Link>
          ))}
        </nav>

        {menuOpen && (
          <>
            <button type="button" aria-label={t(locale, 'menu_close')} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" />
            <nav id="v2-mobile-menu" style={navStyle} className={`relative z-50 max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-border bg-paper px-4 py-3 shadow-glass outline-none md:hidden dark:border-white/10 dark:bg-ink ${fontClass}`} aria-label={t(locale, 'nav_mobile')}>
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink/85 hover:bg-muted dark:text-white/85 dark:hover:bg-white/10">{link.label}</Link>
                  </li>
                ))}
                <li className="flex gap-3 pt-2 text-sm font-medium text-ink/70 dark:text-white/70">
                  <Link href="/about" onClick={() => setMenuOpen(false)} className="hover:underline">{t(locale, 'about')}</Link>
                  <Link href="/contact" onClick={() => setMenuOpen(false)} className="hover:underline">{t(locale, 'contact')}</Link>
                </li>
              </ul>
            </nav>
          </>
        )}
        <BreakingMarquee locale={locale} />
      </header>
    </>
  );
}
