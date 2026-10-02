-- Unique indexes for double-publish safety.
-- Do not apply until production confirm.
-- CREATE UNIQUE INDEX IF NOT EXISTS fails if duplicate rows already exist;
-- inspect and clean duplicates first:
--   select source_url, count(*) from public.articles
--     where source_url is not null and source_url <> '' group by 1 having count(*) > 1;
--   select canonical_url, count(*) from public.articles
--     where canonical_url is not null and canonical_url <> '' group by 1 having count(*) > 1;
--   select content_hash, count(*) from public.articles
--     where content_hash is not null and content_hash <> '' group by 1 having count(*) > 1;

create unique index if not exists articles_source_url_uidx
  on public.articles (source_url)
  where source_url is not null and source_url <> '';

create unique index if not exists articles_canonical_url_uidx
  on public.articles (canonical_url)
  where canonical_url is not null and canonical_url <> '';

create unique index if not exists articles_content_hash_uidx
  on public.articles (content_hash)
  where content_hash is not null and content_hash <> '';

alter table public.news_ingest_queue
  add column if not exists source_guid text;

create unique index if not exists news_ingest_queue_source_url_uidx
  on public.news_ingest_queue (source_url);

create unique index if not exists news_ingest_queue_source_guid_uidx
  on public.news_ingest_queue (source_guid)
  where source_guid is not null and source_guid <> '';
