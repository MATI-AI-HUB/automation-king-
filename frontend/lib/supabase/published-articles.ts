import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Public, read-only access to the published article corpus.
 *
 * Access model (see supabase/migrations/2026101200000[45]*_*.sql):
 *   • The anon role is granted SELECT on the two public views
 *     `public_articles_feed` and `public_article_detail`; direct base-table
 *     access to `public.articles` is intentionally restricted (RLS + revokes).
 *   • Reads therefore target the views — never the base table — so a public
 *     request can only ever observe already-published, public columns.
 *
 * Server-only module: it is imported exclusively by server routes / server
 * components (`lib/api.ts`, `/api/public/*`, `/rss.xml`, `/epaper`). The service
 * role key, when used as a server fallback below, is never bundled into client
 * code because `SUPABASE_SERVICE_ROLE_KEY` is not a `NEXT_PUBLIC_*` variable.
 */

export const PUBLISHED_ARTICLE_COLUMNS =
  'id, slug, title_bn, title_en, content_bn, content_en, excerpt_bn, thumbnail_url, featured_image, category, category_key, status, published_at, source_name, source_url, image_credit, image_alt_bn, image_is_representational, is_fallback, canonical_url, origin, created_at';

/** Anon-readable published-feed view (security_invoker). */
export const PUBLIC_ARTICLE_FEED_VIEW = 'public_articles_feed';
/** Anon-readable single-article view (security_invoker). */
export const PUBLIC_ARTICLE_DETAIL_VIEW = 'public_article_detail';

/** Shape of a PostgREST error — only non-sensitive fields are ever logged. */
type PostgrestErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

/** Build a log-safe, secret-free summary of a PostgREST error. */
function safeError(error: PostgrestErrorLike): string {
  if (!error) return 'unknown error';
  return [error.message, error.code, error.details, error.hint]
    .filter((part): part is string => Boolean(part))
    .join(' | ');
}

/**
 * Browser-safe public client for the anon-readable views.
 * Throws when unconfigured so callers can surface a 503 instead of silently
 * returning an empty feed (see __tests__/feed-route.test.ts).
 */
export function createPublicSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase public client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-side client used for the article detail path. Unlike the public
 * browser client it also accepts the canonical server env names (`SUPABASE_URL`
 * / `SUPABASE_SERVICE_ROLE_KEY`), mirroring `/api/health`. This is what makes
 * `/article/[slug]` resilient when the `NEXT_PUBLIC_*` vars are missing from the
 * serverless runtime — the previous code reused a module-level client that was
 * `null` in that case, short-circuiting every lookup to "not found" (HTTP 404)
 * without ever issuing a database query. The service-role fallback only ever
 * reads published rows through the public view and selects public columns.
 */
function createArticleReadClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase article read client is not configured. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublishedArticlesFeed(supabase?: SupabaseClient | number, limit = 30): Promise<any[]> {
  let client: SupabaseClient;
  let take = limit;
  if (supabase === undefined) {
    client = createPublicSupabase();
  } else if (typeof supabase === 'number') {
    take = supabase;
    client = createPublicSupabase();
  } else {
    client = supabase as SupabaseClient;
  }
  const { data, error } = await client
    .from(PUBLIC_ARTICLE_FEED_VIEW)
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(take);
  if (error) {
    console.error('[published-articles] feed query failed:', safeError(error));
    return [];
  }
  return (data || []) as any[];
}

export async function fetchPublishedArticleById(id: string, supabase?: SupabaseClient){
  const client = supabase || createArticleReadClient();
  // `.limit(1)` (instead of `.single()`) keeps the lookup tolerant of unexpected
  // duplicate rows and avoids PostgREST's PGRST116 exploding into a 404.
  const { data, error } = await client
    .from(PUBLIC_ARTICLE_DETAIL_VIEW)
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('id', id)
    .eq('status', 'published')
    .limit(1);
  if (error) {
    console.error('[published-articles] article-by-id query failed:', safeError(error));
    return null;
  }
  const rows = (data || []) as any[];
  return rows[0] || null;
}

export async function fetchPublishedArticleBySlug(slug: string, supabase?: SupabaseClient){
  const client = supabase || createArticleReadClient();
  const { data, error } = await client
    .from(PUBLIC_ARTICLE_DETAIL_VIEW)
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .limit(1);
  if (error) {
    console.error('[published-articles] article-by-slug query failed:', safeError(error));
    return null;
  }
  const rows = (data || []) as any[];
  return rows[0] || null;
}

export async function fetchPublishedArticles(supabase?: SupabaseClient, limit=30){
  return fetchPublishedArticlesFeed(supabase, limit);
}
