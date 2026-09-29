import { describe, expect, it, vi } from 'vitest';
import { fetchPublishedArticles } from '../lib/supabase/published-articles';

function chain(result: { data: unknown; error: { message: string } | null }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order, eq: vi.fn().mockReturnValue({ order }) });
  const not = vi.fn().mockReturnValue({ lte });
  const eq = vi.fn().mockReturnValue({ not, order, limit, maybeSingle: vi.fn() });
  const select = vi.fn().mockReturnValue({ eq, not });
  return { from: vi.fn().mockReturnValue({ select }), limit, select, eq };
}

describe('fetchPublishedArticles', () => {
  it('uses published_articles_safe when present', async () => {
    const c = chain({ data: [{ id: '1' }], error: null });
    const result = await fetchPublishedArticles(c as never, { columns: 'id', limit: 1 });
    expect(result.source).toBe('view');
    expect(c.from).toHaveBeenCalledWith('published_articles_safe');
  });

  it('falls back to articles when the view is missing', async () => {
    const from = vi.fn();
    const viewLimit = vi.fn().mockResolvedValue({ data: null, error: { message: 'relation does not exist' } });
    const tableLimit = vi.fn().mockResolvedValue({ data: [{ id: '2' }], error: null });
    const viewOrder = vi.fn().mockReturnValue({ limit: viewLimit });
    const tableOrder = vi.fn().mockReturnValue({ limit: tableLimit });
    const viewLte = vi.fn().mockReturnValue({ order: viewOrder });
    const tableLte = vi.fn().mockReturnValue({ order: tableOrder });
    const viewNot = vi.fn().mockReturnValue({ lte: viewLte });
    const tableNot = vi.fn().mockReturnValue({ lte: tableLte });
    const viewEq = vi.fn().mockReturnValue({ not: viewNot });
    const tableEq = vi.fn().mockReturnValue({ not: tableNot });
    from
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: viewEq, not: viewNot }) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: tableEq, not: tableNot }) });
    const result = await fetchPublishedArticles({ from } as never);
    expect(result.source).toBe('table');
    expect(result.data?.[0]).toEqual({ id: '2' });
    expect(from).toHaveBeenNthCalledWith(1, 'published_articles_safe');
    expect(from).toHaveBeenNthCalledWith(2, 'articles');
  });
});
