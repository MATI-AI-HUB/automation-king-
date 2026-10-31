import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VideoHub, type VideoItem } from '../components/video-hub';

const video: VideoItem = {
  id: 'video-1',
  title_bn: 'বাংলা শিরোনাম',
  title_en: 'English headline',
  youtube_id: 'abc123',
  is_live: true,
};

describe('VideoHub locale rendering', () => {
  it('renders English title and localized accessible controls in English', () => {
    const html = renderToStaticMarkup(<VideoHub locale="en" videos={[video]} />);
    expect(html).toContain('Video &amp; Podcasts');
    expect(html).toContain('English headline');
    expect(html).toContain('aria-label="English headline — Play video"');
    expect(html).toContain('>Live<');
    expect(html).not.toContain('বাংলা শিরোনাম');
  });

  it('renders Bengali title and localized accessible controls in Bengali', () => {
    const html = renderToStaticMarkup(<VideoHub locale="bn" videos={[video]} />);
    expect(html).toContain('ভিডিও ও পডকাস্ট');
    expect(html).toContain('বাংলা শিরোনাম');
    expect(html).toContain('aria-label="বাংলা শিরোনাম — ভিডিও চালান"');
    expect(html).toContain('লাইভ');
  });

  it('keeps a Bengali content-title fallback accessible when an English title is missing', () => {
    const html = renderToStaticMarkup(
      <VideoHub locale="en" videos={[{ ...video, title_en: undefined }]} />,
    );
    expect(html).toContain('বাংলা শিরোনাম');
    expect(html).toContain('aria-label="বাংলা শিরোনাম — Play video"');
  });

  it('shows a localized empty state when no published videos are available', () => {
    const english = renderToStaticMarkup(<VideoHub locale="en" videos={[]} />);
    const bengali = renderToStaticMarkup(<VideoHub locale="bn" videos={[]} />);
    expect(english).toContain('No videos are available right now.');
    expect(bengali).toContain('এই মুহূর্তে কোনো ভিডিও উপলভ্য নেই।');
  });
});
