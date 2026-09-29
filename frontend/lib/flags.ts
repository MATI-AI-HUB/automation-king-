export const PRODUCTION_SUPABASE_REF = 'rcffuqkofvuezgbjcixj';
export const STAGING_SUPABASE_REF = 'fqqdpngmftoddffvdukn';

export const DESK_EDITOR_REQUIRE_AAL2 =
  process.env.DESK_EDITOR_REQUIRE_AAL2 === 'true';

export const AAL2_ROLES = new Set(['admin', 'chief_editor']);

export function supabaseRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

export function isProductionSupabaseUrl(url: string | undefined): boolean {
  return supabaseRefFromUrl(url) === PRODUCTION_SUPABASE_REF;
}

export function assertNotProductionRef(url: string | undefined, context: string): void {
  if (isProductionSupabaseUrl(url)) {
    throw new Error(`${context} refused: production Supabase ref is not allowed`);
  }
}

export const LIFECYCLE_QUEUE_STATUSES = [
  'pending',
  'submitted',
  'approved',
  'draft',
] as const;

export const REVIEW_STATUS_QUEUE = 'auto_unverified';

export const ARTICLE_STATUS_PUBLISHED = 'published';
export const ARTICLE_STATUS_RETRACTED = 'retracted';
export const ARTICLE_STATUS_ARCHIVED = 'archived';
