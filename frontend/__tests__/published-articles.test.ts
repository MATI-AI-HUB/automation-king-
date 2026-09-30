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
  it('uses published_articles_safe when the view exists', async () => {
    const view = chain({ data: [{ id: '1' }], error: null });
    const table = chain({ data: [{ id: '2' }], error: null });
    const from = vi.fn((name: string) => (name === 'published_articles_safe' ? view : table));
    const result = await selectPublishedArticles({ from }, '*', { limit: 10, orderBy: 'published_at' });
    expect(result.source).toBe('view');
    expect(result.data).toEqual([{ id: '1' }]);
    expect(from).toHaveBeenCalledWith('published_articles_safe');
    expect(from).not.toHaveBeenCalledWith('articles');
  });

  it('falls back to articles when the view is missing', async () => {
    const view = chain({ data: null, error: { code: 'PGRST205', message: 'could not find the table' } });
    const table = chain({ data: [{ id: '9', status: 'published' }], error: null });
    const from = vi.fn((name: string) => (name === 'published_articles_safe' ? view : table));
    const result = await selectPublishedArticles({ from }, '*', {
      requirePublishedAt: true,
      notFuture: true,
      orderBy: 'published_at',
      limit: 50,
    });
    expect(result.source).toBe('table');
    expect(result.data).toEqual([{ id: '9', status: 'published' }]);
    expect(table.eq).toHaveBeenCalledWith('status', 'published');
  });
});
