import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArticleCard, type Article } from '../components/hero-bento';

const base: Article = {
  id: 'story-1',
  title: 'শিরোনাম বাংলায়',
  category: 'জাতীয়',
  language_fallback: true,
};

describe('honest localized article fallback', () => {
  it('labels Bengali source content shown in the English interface', () => {
    const html = renderToStaticMarkup(<ArticleCard article={base} href="/article/story-1" locale="en" />);
    expect(html).toContain('English translation unavailable — showing the Bengali original');
    expect(html).toContain('শিরোনাম বাংলায়');
  });

  it('does not show an English translation warning for a translated article', () => {
    const html = renderToStaticMarkup(<ArticleCard article={{ ...base, language_fallback: false, title: 'English title' }} href="/article/story-1" locale="en" />);
    expect(html).not.toContain('English translation unavailable');
    expect(html).toContain('English title');
  });

  it('does not show the fallback warning in the Bengali interface', () => {
    const html = renderToStaticMarkup(<ArticleCard article={base} href="/article/story-1" locale="bn" />);
    expect(html).not.toContain('English translation unavailable');
  });
});
