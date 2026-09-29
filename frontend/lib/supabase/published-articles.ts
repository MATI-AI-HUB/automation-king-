import type { SupabaseClient } from '@supabase/supabase-js';

const SAFE_VIEW = 'published_articles_safe';
const TABLE = 'articles';

export type PublishedQueryOpts = {
  columns?: string;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  id?: string;
};

function missingRelation(message: string | undefined): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('schema cache') ||
    m.includes('42p01')
  );
}

export async function fetchPublishedArticles<T = Record<string, unknown>>(
  client: SupabaseClient,
  opts: PublishedQueryOpts = {},
): Promise<{ data: T[] | null; error: { message: string } | null; source: 'view' | 'table' }> {
  const columns = opts.columns ?? '*';
  const orderBy = opts.orderBy ?? 'published_at';
  const ascending = opts.ascending ?? false;
  const limit = opts.limit ?? 50;

  const run = async (relation: string) => {
    let q = client.from(relation).select(columns);
    if (relation === TABLE) {
      q = q.eq('status', 'published');
    }
    q = q.not('published_at', 'is', null).lte('published_at', new Date().toISOString());
    if (opts.id) q = q.eq('id', opts.id);
    return q.order(orderBy, { ascending }).limit(limit);
  };

  const viewResult = await run(SAFE_VIEW);
  if (!viewResult.error) {
    return { data: (viewResult.data as T[] | null) ?? [], error: null, source: 'view' };
  }
  if (!missingRelation(viewResult.error.message)) {
    return { data: null, error: viewResult.error, source: 'view' };
  }

  const tableResult = await run(TABLE);
  if (tableResult.error) {
    return { data: null, error: tableResult.error, source: 'table' };
  }
  return { data: (tableResult.data as T[] | null) ?? [], error: null, source: 'table' };
}
