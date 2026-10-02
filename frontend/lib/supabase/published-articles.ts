import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const PUBLISHED_ARTICLE_COLUMNS =
  'id, title_bn, content_bn, excerpt_bn, category, category_key, thumbnail_url, featured_image, status, published_at, source_name, source_url, image_credit, canonical_url';

const NARROW_FEED_COLUMNS = 'id, title_bn, category, published_at';

export function createPublicSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars not configured');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublishedArticlesFeed(
  supabase: SupabaseClient = createPublicSupabase(),
) {
  const primary = await supabase
    .from('articles')
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!primary.error) return primary.data || [];

  const viewFull = await supabase
    .from('public_articles_feed')
    .select(PUBLISHED_ARTICLE_COLUMNS);

  if (!viewFull.error) return viewFull.data || [];

  const viewNarrow = await supabase
    .from('public_articles_feed')
    .select(NARROW_FEED_COLUMNS);

  if (viewNarrow.error) throw viewNarrow.error;
  return viewNarrow.data || [];
}

export async function fetchPublishedArticleById(
  id: string,
  supabase: SupabaseClient = createPublicSupabase(),
) {
  const primary = await supabase
    .from('articles')
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!primary.error) return primary.data;

  const viewFull = await supabase
    .from('public_articles_feed')
    .select(PUBLISHED_ARTICLE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!viewFull.error) return viewFull.data;

  const viewNarrow = await supabase
    .from('public_articles_feed')
    .select(NARROW_FEED_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (viewNarrow.error) throw viewNarrow.error;
  return viewNarrow.data;
}
