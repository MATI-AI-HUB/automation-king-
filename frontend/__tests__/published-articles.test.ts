import { describe, expect, it, vi } from 'vitest';
import { selectPublishedArticles } from '../lib/supabase/published-articles';

function chain(result: { data: unknown; error: { message?: string; code?: string } | null }) {
  const self: Record<string, unknown> = {};
  const next = () => self;
  self.select = vi.fn(next);
  self.eq = vi.fn(next);
  self.not = vi.fn(next);
  self.lte = vi.fn(next);
  self.order = vi.fn(next);
  self.limit = vi.fn(async () => result);
  self.maybeSingle = vi.fn(async () => result);
  return self;
}

describe('selectPublishedArticles', () => {
  it('uses public_articles_feed when the canonical view exists', async () => {
    const feed = chain({ data: [{ id: '1' }], error: null });
    const safe = chain({ data: [{ id: '2' }], error: null });
    const table = chain({ data: [{ id: '3' }], error: null });
    const from = vi.fn((name: string) => {
      if (name === 'public_articles_feed') return feed;
      if (name === 'published_articles_safe') return safe;
      return table;
    });
    const result = await selectPublishedArticles({ from }, '*', { limit: 10, orderBy: 'published_at' });
    expect(result.source).toBe('public_articles_feed');
    expect(result.data).toEqual([{ id: '1' }]);
    expect(from).toHaveBeenCalledWith('public_articles_feed');
    expect(from).not.toHaveBeenCalledWith('articles');
  });

  it('falls back to published_articles_safe then articles', async () => {
    const missing = { code: 'PGRST205', message: 'could not find the table' };
    const denied = { code: '42501', message: 'permission denied for table articles' };
    const feed = chain({ data: null, error: missing });
    const safe = chain({ data: null, error: missing });
    const table = chain({ data: [{ id: '9', status: 'published' }], error: null });
    const from = vi.fn((name: string) => {
      if (name === 'public_articles_feed') return feed;
      if (name === 'published_articles_safe') return safe;
      return table;
    });
    const result = await selectPublishedArticles({ from }, '*', {
      requirePublishedAt: true,
      notFuture: true,
      orderBy: 'published_at',
      limit: 50,
    });
    expect(result.source).toBe('articles');
    expect(result.data).toEqual([{ id: '9', status: 'published' }]);
    expect(table.eq).toHaveBeenCalledWith('status', 'published');
    expect(from.mock.calls.map((c) => c[0])).toEqual([
      'public_articles_feed',
      'published_articles_safe',
      'articles',
    ]);
    void denied;
  });
});
