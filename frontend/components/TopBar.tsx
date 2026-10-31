'use client';

import { useEffect, useState } from 'react';
import { formatBanglaCalendarDate } from '@/lib/bn-date';
import { t, type Locale } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';
import { WeatherWidget } from './weather-widget';
import { useI18nContext, type Currency } from './I18nContext';

export function TopBar({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);
  const context = useI18nContext();
  const currency = context?.currency ?? 'BDT';

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  let dateContent: React.ReactNode = null;
  if (now) {
    const languageTag = locale === 'en' ? 'en-US' : 'bn-BD';
    const banglaDate = formatBanglaCalendarDate(now, locale);
    const gregorianDate = new Intl.DateTimeFormat(languageTag, {
      timeZone: 'Asia/Dhaka', calendar: 'gregory', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
    const clock = new Intl.DateTimeFormat(languageTag, {
      timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit',
    }).format(now);
    dateContent = (
      <time dateTime={now.toISOString()} className="text-[10px] font-medium leading-[1.7] text-white/90 sm:text-xs">
        <span>{banglaDate}</span><span className="mx-1" aria-hidden="true">·</span>
        <span>{gregorianDate}</span><span className="mx-1" aria-hidden="true">·</span>
        <span>{clock}</span>
      </time>
    );
  }

  const selectCurrency = (next: Currency) => context?.setCurrency(next);

  return (
    <div className="bg-crimson text-white">
      <div className="mx-auto flex min-h-9 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {dateContent}
          <WeatherWidget locale={locale} />
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-semibold sm:gap-4 sm:text-xs">
          <fieldset className="flex items-center gap-1" aria-label={t(locale, 'currency_label')}>
            <legend className="sr-only">{t(locale, 'currency_label')}</legend>
            {(['BDT', 'USD'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={currency === item}
                aria-label={t(locale, item === 'USD' ? 'currency_usd' : 'currency_bdt')}
                onClick={() => selectCurrency(item)}
                className={`rounded px-1.5 py-0.5 transition-colors ${currency === item ? 'bg-white text-crimson' : 'text-white/80 hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </fieldset>
          <LanguageToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
