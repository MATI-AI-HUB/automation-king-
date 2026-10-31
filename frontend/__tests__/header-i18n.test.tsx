import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Header } from '../components/Header';

describe('v2 header locale and rollout shell', () => {
  it('keeps the legacy header when the rollout flag is off', () => {
    const html = renderToStaticMarkup(<Header locale="en" />);
    expect(html).toContain('Banglar Voice 24NEWS — Home');
    expect(html).not.toContain('aria-label="Display currency"');
  });

  it('renders the centered inline vector mark, accessible USD/BDT preference and English navigation when enabled', () => {
    const html = renderToStaticMarkup(<Header locale="en" redesignEnabled />);
    expect(html).toContain('<svg');
    expect(html).toContain('Banglar Voice');
    expect(html).toContain('aria-label="Display currency"');
    expect(html).toContain('Choose Bangladeshi taka (BDT)');
    expect(html).toContain('Choose US dollar (USD)');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('Live TV');
  });

  it('keeps Bengali category navigation readable with an explicit 1.7 line-height', () => {
    const html = renderToStaticMarkup(<Header locale="bn" redesignEnabled />);
    expect(html).toContain('font-serifbn leading-[1.7]');
    expect(html).toContain('রাজনীতি');
    expect(html).toContain('লাইভ টিভি');
  });
});
