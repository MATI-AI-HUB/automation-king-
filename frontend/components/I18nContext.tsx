'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n';

export type Currency = 'BDT' | 'USD';

type I18nContextValue = {
  locale: Locale;
  currency: Currency;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function I18nProvider({
  initialLocale,
  initialCurrency = 'BDT',
  children,
}: {
  initialLocale: Locale;
  initialCurrency?: Currency;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!isLocale(nextLocale)) return;
    writeCookie(LOCALE_COOKIE, nextLocale);
    document.documentElement.lang = nextLocale;
    setLocaleState(nextLocale);
    router.refresh();
  }, [router]);

  const setCurrency = useCallback((nextCurrency: Currency) => {
    if (nextCurrency !== 'BDT' && nextCurrency !== 'USD') return;
    writeCookie('bv_currency', nextCurrency);
    setCurrencyState(nextCurrency);
  }, []);

  const value = useMemo(() => ({ locale, currency, setLocale, setCurrency }), [locale, currency, setLocale, setCurrency]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Returns null outside the app provider so isolated legacy widgets can keep their prop fallback. */
export function useI18nContext() {
  return useContext(I18nContext);
}
