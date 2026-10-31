'use client';

import { type FormEvent } from 'react';
import { DEFAULT_LOCALE, isLocale, t, type Locale } from '@/lib/i18n';
import { useI18nContext } from './I18nContext';

export function LanguageToggle({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const context = useI18nContext();
  const current = context?.locale ?? locale;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selected = formData.get('locale');
    if (context && typeof selected === 'string' && isLocale(selected)) {
      event.preventDefault();
      context.setLocale(selected);
    }
  }

  return (
    <form
      action="/api/set-locale"
      method="POST"
      onSubmit={handleSubmit}
      className="flex items-center gap-1 text-[11px] font-semibold"
      aria-label={t(locale, 'language')}
    >
      <button
        type="submit"
        name="locale"
        value="bn"
        className={`rounded px-1.5 py-0.5 transition-colors ${current === 'bn' ? 'bg-white text-crimson' : 'text-white/80 hover:text-white'}`}
        aria-label={t(locale, 'language_bengali')}
        aria-pressed={current === 'bn'}
      >
        বাংলা
      </button>
      <span className="text-white/40" aria-hidden="true">|</span>
      <button
        type="submit"
        name="locale"
        value="en"
        className={`rounded px-1.5 py-0.5 transition-colors ${current === 'en' ? 'bg-white text-crimson' : 'text-white/80 hover:text-white'}`}
        aria-label={t(locale, 'language_english')}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
    </form>
  );
}
