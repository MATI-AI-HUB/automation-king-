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

export const ARTICLE_FEED_RELATIONS = [
  'public_articles_feed',
  'published_articles_safe',
  'articles',
] as const;

export type ArticleFeedSource = (typeof ARTICLE_FEED_RELATIONS)[number];

function isUnavailableRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = (error.code || '').toUpperCase();
  const message = (error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42501' ||
    code === 'PGRST205' ||
    code === 'PGRST116' ||
    code === 'PGRST301' ||
    code === '401' ||
    code === '403' ||
    code === '406' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache') ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('not accept') ||
    message.includes('jwt')
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
): Promise<{
  data: T | T[] | null;
  error: { message?: string; code?: string } | null;
  source: ArticleFeedSource;
}> {
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

  let lastError: { message?: string; code?: string } | null = null;
  let lastSource: ArticleFeedSource = ARTICLE_FEED_RELATIONS[0];

  for (const table of ARTICLE_FEED_RELATIONS) {
    const result = await apply(table);
    lastSource = table;
    if (!result.error) {
      return { data: result.data as T | T[] | null, error: null, source: table };
    }
    lastError = result.error;
    if (!isUnavailableRelation(result.error)) {
      return { data: null, error: result.error, source: table };
    }
  }

  return { data: null, error: lastError, source: lastSource };
}
