import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeArticleCommentInput } from '../../../lib/article-comments';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Public Supabase configuration is missing');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function resolvePublishedPublicArticleId(reference: string) {
  const supabase = publicSupabase();
  const column = UUID_RE.test(reference) ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('articles')
    .select('id')
    .eq(column, reference)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new Error('Could not verify article visibility');
  return typeof data?.id === 'string' ? data.id : null;
}

export async function GET(request: NextRequest) {
  const articleReference = request.nextUrl.searchParams.get('slug')?.trim()
    || request.nextUrl.searchParams.get('articleId')?.trim()
    || '';
  if (!articleReference || articleReference.length > 200) return badRequest('invalid_article_reference');

  try {
    const articleId = await resolvePublishedPublicArticleId(articleReference);
    if (!articleId) return badRequest('article_not_found', 404);

    const supabase = publicSupabase();
    const { data, error } = await supabase
      .from('article_comments')
      .select('id, display_name, body, created_at')
      .eq('article_id', articleId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(
      { ok: true, comments: data || [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'comments_temporarily_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 10_000) return badRequest('payload_too_large', 413);
    input = JSON.parse(rawBody);
  } catch {
    return badRequest('invalid_json');
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) return badRequest('invalid_payload');
  const payload = input as Record<string, unknown>;

  // Quietly accept honeypot submissions without storing or publishing them.
  if (typeof payload.website === 'string' && payload.website.trim()) {
    return NextResponse.json({ ok: true, status: 'pending' }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }

  const articleReference = typeof payload.slug === 'string'
    ? payload.slug.trim()
    : typeof payload.articleId === 'string' ? payload.articleId.trim() : '';
  if (!articleReference || articleReference.length > 200) return badRequest('invalid_article_reference');

  const normalized = normalizeArticleCommentInput({
    displayName: payload.displayName,
    body: payload.body,
  });
  if (!normalized) return badRequest('invalid_comment');

  const ip = request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  try {
    // Dynamic import means Redis misconfiguration can only disable comments,
    // not prevent the public article page or newsroom routes from loading.
    const { default: limiter } = await import('../../../lib/article-comment-rate-limit');
    const rate = await limiter.limit(ip);
    if (!rate.success) {
      return badRequest('rate_limited', 429);
    }

    const articleId = await resolvePublishedPublicArticleId(articleReference);
    if (!articleId) return badRequest('article_not_found', 404);

    // Uses only the publishable/anon key. RLS is the authority for insert and
    // enforces pending-only comments; no service-role or Vault secret is exposed.
    const supabase = publicSupabase();
    const { error } = await supabase.from('article_comments').insert({
      article_id: articleId,
      display_name: normalized.displayName,
      body: normalized.body,
    });

    if (error) throw error;

    return NextResponse.json(
      { ok: true, status: 'pending' },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Public Supabase configuration is missing') {
      return badRequest('comments_temporarily_unavailable', 503);
    }
    return NextResponse.json(
      { ok: false, error: 'comments_temporarily_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
