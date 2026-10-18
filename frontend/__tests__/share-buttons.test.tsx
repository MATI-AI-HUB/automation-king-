import { describe, expect, it } from 'vitest';
import { buildShareUrl } from '../components/share-buttons';

const articleUrl = 'https://www.banglarvoice24news.com/article/খবর-2026';
const title = 'বাংলা খবর: “বিশেষ” & আপডেট?';

describe('server-rendered article share destinations', () => {
  it('builds a valid Facebook destination with the canonical URL', () => {
    const destination = new URL(buildShareUrl('facebook', articleUrl, title));
    expect(destination.origin).toBe('https://www.facebook.com');
    expect(destination.searchParams.get('u')).toBe(articleUrl);
  });

  it('encodes Unicode titles and canonical URLs for X and Telegram', () => {
    const x = new URL(buildShareUrl('x', articleUrl, title));
    expect(x.searchParams.get('url')).toBe(articleUrl);
    expect(x.searchParams.get('text')).toBe(title);

    const telegram = new URL(buildShareUrl('telegram', articleUrl, title));
    expect(telegram.searchParams.get('url')).toBe(articleUrl);
    expect(telegram.searchParams.get('text')).toBe(title);
  });

  it('includes both title and URL in WhatsApp share text', () => {
    const destination = new URL(buildShareUrl('whatsapp', articleUrl, title));
    expect(destination.origin).toBe('https://wa.me');
    expect(destination.searchParams.get('text')).toBe(`${title} ${articleUrl}`);
  });

  it('does not invent a destination for unknown platforms', () => {
    expect(buildShareUrl('unknown', articleUrl, title)).toBe('');
  });
});
