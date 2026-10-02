-- Public-safe article views for anon/authenticated reads.
-- Do not apply until production confirm. Idempotent.
-- Anon cannot SELECT many articles columns (401 on select *);
-- these views expose only published, non-sensitive fields.

create or replace view public.public_articles_feed as
select
  id,
  title_bn,
  excerpt_bn,
  content_bn,
  category,
  category_key,
  thumbnail_url,
  featured_image,
  status,
  published_at,
  source_name,
  source_url,
  image_credit,
  image_alt_bn,
  image_is_representational,
  is_fallback,
  canonical_url,
  origin
from public.articles
where status = 'published';

create or replace view public.public_article_detail as
select
  id,
  title_bn,
  title_en,
  content_bn,
  content_en,
  excerpt_bn,
  category,
  category_key,
  thumbnail_url,
  featured_image,
  status,
  published_at,
  created_at,
  source_name,
  source_url,
  image_credit,
  image_alt_bn,
  image_is_representational,
  is_fallback,
  canonical_url,
  origin
from public.articles
where status = 'published';

grant select on public.public_articles_feed to anon, authenticated;
grant select on public.public_article_detail to anon, authenticated;
grant select on public.public_articles_feed to service_role;
grant select on public.public_article_detail to service_role;

create or replace function public.news_pipeline_last_success()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(completed_at, created_at)
  from public.news_pipeline_runs
  where status in ('success', 'partial')
    and (coalesce(published, 0) > 0 or status = 'success')
  order by created_at desc
  limit 1;
$$;

revoke all on function public.news_pipeline_last_success() from public;
grant execute on function public.news_pipeline_last_success() to anon, authenticated, service_role;
