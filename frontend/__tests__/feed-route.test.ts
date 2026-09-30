import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from }),
}));

describe('GET /api/public/feed.json', () => {
  beforeEach(() => {
    vi.resetModules();
    from.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const payload = {
      data: [
        {
          id: '1',
          title_bn: 'শিরোনাম',
          excerpt_bn: 'সারাংশ',
          content_bn: 'বিস্তারিত',
          category_key: 'national',
          category: 'জাতীয়',
          published_at: '2026-09-29T00:00:00.000Z',
          source_name: 'বিবিসি বাংলা',
          source_url: 'https://www.bbc.com/bengali/a',
          thumbnail_url: '',
          origin: 'aggregated',
          image_credit: 'Wikimedia',
        },
      ],
      error: null,
    };
    const chain: Record<string, unknown> = {};
    const next = () => chain;
    chain.select = vi.fn(next);
    chain.eq = vi.fn(next);
    chain.not = vi.fn(next);
    chain.lte = vi.fn(next);
    chain.order = vi.fn(next);
    chain.limit = vi.fn(async () => payload);
    chain.maybeSingle = vi.fn(async () => payload);
    from.mockImplementation(() => chain);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('maps source_name and image_credit onto feed items', async () => {
    const { GET } = await import('../app/api/public/feed.json/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].source_name).toBe('বিবিসি বাংলা');
    expect(body.items[0].image_credit).toBe('Wikimedia');
    expect(body.items[0].authors[0].name).toBe('বিবিসি বাংলা');
    expect(from).toHaveBeenCalledWith('public_articles_feed');
  });

  it('returns 503 when supabase is unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { GET } = await import('../app/api/public/feed.json/route');
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('feed_unavailable');
  });
});
