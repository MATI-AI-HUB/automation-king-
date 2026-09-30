type QueryLike = {
  select: (columns: string) => QueryLike;
  eq: (column: string, value: unknown) => QueryLike;
  not: (column: string, op: string, value: unknown) => QueryLike;
  lte: (column: string, value: unknown) => QueryLike;
  order: (column: string, opts?: { ascending: boolean }) => QueryLike;
  limit: (n: number) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
};

type ClientLike = {
  from: (table: string) => QueryLike;
};

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST116' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

export async function selectPublishedArticles<T = Record<string, unknown>>(
  client: ClientLike,
  columns: string,
  opts: {
    id?: string;
    requirePublishedAt?: boolean;
    notFuture?: boolean;
    orderBy?: string;
    limit?: number;
    single?: boolean;
  } = {},
): Promise<{ data: T | T[] | null; error: { message?: string; code?: string } | null; source: 'view' | 'table' }> {
  const apply = (table: string) => {
    let q = client.from(table).select(columns);
    if (opts.id) q = q.eq('id', opts.id);
    if (table === 'articles') q = q.eq('status', 'published');
    if (opts.requirePublishedAt) q = q.not('published_at', 'is', null);
    if (opts.notFuture) q = q.lte('published_at', new Date().toISOString());
    if (opts.orderBy) q = q.order(opts.orderBy, { ascending: false });
    if (opts.single) return q.maybeSingle();
    return q.limit(opts.limit ?? 50);
  };

  const viewResult = await apply('published_articles_safe');
  if (!viewResult.error) {
    return { data: viewResult.data as T | T[] | null, error: null, source: 'view' };
  }
  if (!isMissingRelation(viewResult.error)) {
    return { data: null, error: viewResult.error, source: 'view' };
  }
  const tableResult = await apply('articles');
  return {
    data: tableResult.data as T | T[] | null,
    error: tableResult.error,
    source: 'table',
  };
}
