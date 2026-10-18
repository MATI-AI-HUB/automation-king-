-- Banglar Voice — platform hardening + SaaS foundations.
--   1. internal.get_decrypted_secret (Vault access without exposing key rows)
--   2. SECURITY DEFINER sweep: pin search_path, strip anon/PUBLIC EXECUTE
--   3. Multi-tenancy: organizations, organization_members, tenant_id, RLS
--   4. Native i18n columns + get_article_by_lang()
--   5. Social scheduler: atomic claim/complete RPCs + e-paper archive + APK bucket
--
-- Every step is idempotent and additive so it can be applied to the live
-- database with zero downtime. Existing permissive RLS policies are untouched;
-- tenant policies are added alongside them and can be tightened after backfill.

create schema if not exists maintenance;
create table if not exists maintenance.security_hardening_report (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  task text not null,
  item text not null,
  action text not null,
  detail text
);

-- ---------------------------------------------------------------------------
-- 1. Vault access
-- ---------------------------------------------------------------------------
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;
grant usage on schema internal to service_role;

-- Resolves ONLY the allow-listed secrets the scheduler/archiver need, so this
-- is not a general decrypt-by-name endpoint. Looks at the api_vault pointer
-- table first (production convention), then at a raw vault secret name.
-- Add a name to the allow-list in a reviewed migration before using it.
create or replace function internal.get_decrypted_secret(p_secret_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_secret_name is null
     or p_secret_name <> all (array[
       'CRON_SECRET',
       'SUPABASE_URL',
       'SOCIAL_FACEBOOK_PAGE_ID',
       'SOCIAL_FACEBOOK_PAGE_TOKEN',
       'GITHUB_DISPATCH_TOKEN'
     ]) then
    return null;
  end if;

  select ds.decrypted_secret
    into v_secret
    from public.api_vault v
    join vault.decrypted_secrets ds on ds.id = v.key_encrypted
   where v.service_name = p_secret_name
     and v.environment = 'prod'
     and v.is_active = true
   limit 1;

  if v_secret is null then
    select ds.decrypted_secret
      into v_secret
      from vault.decrypted_secrets ds
     where ds.name = p_secret_name
     limit 1;
  end if;

  return v_secret;
end;
$$;

revoke all on function internal.get_decrypted_secret(text) from public, anon, authenticated;
grant execute on function internal.get_decrypted_secret(text) to service_role;

-- PostgREST does not expose the internal schema; Edge Functions call this
-- service_role-only wrapper.
create or replace function public.get_decrypted_secret(p_secret_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select internal.get_decrypted_secret(p_secret_name);
$$;

revoke all on function public.get_decrypted_secret(text) from public, anon, authenticated;
grant execute on function public.get_decrypted_secret(text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER sweep
--    AUDIT ONLY. Existing functions (RPCs, triggers) are not altered or
--    revoked here: blanket search_path rewrites / grants can change behavior.
--    Findings are written to maintenance.security_hardening_report so
--    EXECUTE can be revoked per function after callers are confirmed.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  cfg text;
  current_path text;
  policy_text text;
  authenticated_had boolean;
  fixed int := 0;
  revoked int := 0;
  kept int := 0;
begin
  select coalesce(string_agg(coalesce(qual, '') || ' ' || coalesce(with_check, ''), ' '), '')
    into policy_text
    from pg_policies
   where schemaname in ('public', 'storage');

  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args, p.proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.prokind = 'f'
       and p.proname not in ('get_decrypted_secret')
  loop
    current_path := null;
    foreach cfg in array coalesce(r.proconfig, '{}'::text[]) loop
      if cfg like 'search_path=%' then
        current_path := substr(cfg, length('search_path=') + 1);
      end if;
    end loop;

    if current_path is null then
      fixed := fixed + 1;
      insert into maintenance.security_hardening_report (task, item, action, detail)
      values ('SWEEP', 'public.' || r.proname || '(' || r.args || ')', 'review search_path',
              'no search_path set; prefer search_path = '''' with schema-qualified names');
    end if;

    if has_function_privilege('anon', r.oid, 'EXECUTE') then
      if policy_text ~* ('(^|[^A-Za-z0-9_])' || r.proname || '\s*\(') then
        kept := kept + 1;
        insert into maintenance.security_hardening_report (task, item, action, detail)
        values ('SWEEP', 'public.' || r.proname || '(' || r.args || ')', 'anon execute kept',
                'referenced by an RLS policy');
      else
        revoked := revoked + 1;
        insert into maintenance.security_hardening_report (task, item, action, detail)
        values ('SWEEP', 'public.' || r.proname || '(' || r.args || ')', 'review anon execute',
                'anon/PUBLIC can execute; revoke per function once callers are confirmed');
      end if;
    end if;
  end loop;

  insert into maintenance.security_hardening_report (task, item, action, detail)
  values ('SWEEP', 'public security definer functions', 'audit summary',
          format('missing search_path=%s, anon-executable to review=%s, anon-executable kept for RLS=%s (no function was altered)',
                 fixed, revoked, kept));
end $$;

-- Tables with RLS enabled and zero policies are deny-by-default. Make that
-- explicit at the grant level too so a future `disable rls` cannot leak them.
do $$
declare
  r record;
  locked int := 0;
begin
  for r in
    select c.oid, c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity
       and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)
  loop
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
    locked := locked + 1;
    insert into maintenance.security_hardening_report (task, item, action, detail)
    values ('SWEEP', 'public.' || r.relname, 'locked', 'RLS enabled with no policy: service_role only');
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Multi-tenancy
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  plan_id text not null default 'free' check (plan_id in ('free', 'premium', 'team')),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

insert into public.organizations (id, name, slug, plan_id)
values ('00000000-0000-4000-8000-000000000001', 'Banglar Voice', 'banglar-voice', 'team')
on conflict (id) do nothing;

-- SECURITY DEFINER so policies on organization_members can call it without
-- recursing into their own RLS.
create or replace function public.get_user_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.org_id), '{}'::uuid[])
    from public.organization_members m
   where m.user_id = (select auth.uid());
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.org_id = p_org_id
       and m.user_id = (select auth.uid())
       and m.role = any (p_roles)
  );
$$;

revoke all on function public.get_user_org_ids() from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.get_user_org_ids() to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[]) to authenticated, service_role;

drop policy if exists "members read their organizations" on public.organizations;
create policy "members read their organizations"
  on public.organizations for select to authenticated
  using (id = any (public.get_user_org_ids()));

drop policy if exists "admins update their organization" on public.organizations;
create policy "admins update their organization"
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

drop policy if exists "members read org roster" on public.organization_members;
create policy "members read org roster"
  on public.organization_members for select to authenticated
  using (org_id = any (public.get_user_org_ids()));

drop policy if exists "admins manage org roster" on public.organization_members;
create policy "admins manage org roster"
  on public.organization_members for all to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin']))
  with check (public.has_org_role(org_id, array['owner', 'admin']));

revoke all on public.organizations, public.organization_members from anon;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organizations, public.organization_members to service_role;

-- tenant_id on newsroom/social tables. Nullable with a constant default: new
-- rows land in the initial "Banglar Voice" tenant and existing rows are
-- backfilled to it in batches (see below). news_sources / source_registry stay
-- shared across organizations, and user-level subscriptions are untouched.
-- Tenant policies are ADDITIVE (permissive policies are OR-ed), so existing
-- public/anon access to published content and current publishing paths keep
-- working until the old policies are deliberately tightened.
do $$
declare
  t text;
  default_org constant text := '00000000-0000-4000-8000-000000000001';
begin
  foreach t in array array[
    'articles', 'videos', 'epaper_editions', 'field_reports', 'live_sessions',
    'social_posts', 'social_content_calendar', 'breaking_ticker'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists tenant_id uuid references public.organizations(id) on delete restrict', t);
    execute format('alter table public.%I alter column tenant_id set default %L::uuid', t, default_org);
    execute format('create index if not exists %I on public.%I (tenant_id)', t || '_tenant_id_idx', t);

    execute format('drop policy if exists "tenant members read" on public.%I', t);
    execute format(
      'create policy "tenant members read" on public.%I for select to authenticated using (tenant_id = any (public.get_user_org_ids()))', t);

    execute format('drop policy if exists "tenant editors write" on public.%I', t);
    execute format(
      'create policy "tenant editors write" on public.%I for all to authenticated '
      'using (public.has_org_role(tenant_id, array[''owner'',''admin'',''editor''])) '
      'with check (public.has_org_role(tenant_id, array[''owner'',''admin'',''editor'']))', t);
  end loop;
end $$;

-- Batched backfill so a large table never holds a long lock.
create or replace function public.backfill_tenant_id(p_table text, p_batch integer default 5000)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_table not in (
    'articles', 'videos', 'epaper_editions', 'field_reports', 'live_sessions',
    'social_posts', 'social_content_calendar', 'breaking_ticker'
  ) or to_regclass('public.' || p_table) is null then
    raise exception 'table % is not tenant-scoped', p_table;
  end if;

  execute format(
    'with batch as (select ctid from public.%I where tenant_id is null limit %s for update skip locked) '
    'update public.%I t set tenant_id = %L::uuid from batch where t.ctid = batch.ctid',
    p_table, greatest(1, least(p_batch, 20000)), p_table, '00000000-0000-4000-8000-000000000001');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.backfill_tenant_id(text, integer) from public, anon, authenticated;
grant execute on function public.backfill_tenant_id(text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Native i18n
-- ---------------------------------------------------------------------------
alter table public.articles add column if not exists title_i18n jsonb not null default '{}'::jsonb;
alter table public.articles add column if not exists content_i18n jsonb not null default '{}'::jsonb;
alter table public.articles drop constraint if exists articles_i18n_objects;
alter table public.articles
  add constraint articles_i18n_objects
  check (jsonb_typeof(title_i18n) = 'object' and jsonb_typeof(content_i18n) = 'object') not valid;

create index if not exists articles_title_i18n_gin on public.articles using gin (title_i18n jsonb_path_ops);
create index if not exists articles_content_i18n_gin on public.articles using gin (content_i18n jsonb_path_ops);

-- SECURITY INVOKER: the existing anon policy (status = 'published') applies.
create or replace function public.get_article_by_lang(p_slug text, p_lang text default 'bn')
returns table (id uuid, slug text, lang text, title text, content text, published_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select case when p_lang ~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$' then lower(p_lang) else 'bn' end as lang
  )
  select a.id,
         a.slug,
         case
           when nullif(a.title_i18n ->> pr.lang, '') is not null then pr.lang
           when pr.lang = 'en' and nullif(a.title_en, '') is not null then 'en'
           else 'bn'
         end as lang,
         coalesce(
           nullif(a.title_i18n ->> pr.lang, ''),
           case when pr.lang = 'en' then nullif(a.title_en, '') end,
           nullif(a.title_i18n ->> 'bn', ''),
           a.title_bn
         ) as title,
         coalesce(
           nullif(a.content_i18n ->> pr.lang, ''),
           case when pr.lang = 'en' then nullif(a.content_en, '') end,
           nullif(a.content_i18n ->> 'bn', ''),
           a.content_bn
         ) as content,
         a.published_at
    from public.articles a
    cross join params pr
   where a.slug = p_slug
     and a.status = 'published'
   limit 1;
$$;
grant execute on function public.get_article_by_lang(text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5a. Social scheduler: Facebook 08:00–22:00 Asia/Dhaka, <= 25/rolling 24h,
--     randomized (but stable) 33–45 minute gap between posts.
-- ---------------------------------------------------------------------------
alter table public.social_posts add column if not exists claimed_at timestamptz;
create index if not exists social_posts_platform_claimed_idx
  on public.social_posts (platform, claimed_at desc);

create or replace function public.claim_next_social_post(
  p_platform text default 'facebook',
  p_cap integer default 25,
  p_min_gap_minutes integer default 33,
  p_max_gap_minutes integer default 45
)
returns table (
  post_id uuid,
  article_id uuid,
  slug text,
  title_bn text,
  excerpt_bn text,
  thumbnail_url text,
  featured_image text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_hour integer;
  v_cap integer := least(greatest(coalesce(p_cap, 25), 1), 25);
  v_min integer := greatest(coalesce(p_min_gap_minutes, 33), 1);
  v_max integer := greatest(coalesce(p_max_gap_minutes, 45), greatest(coalesce(p_min_gap_minutes, 33), 1));
  v_count integer;
  v_last_id uuid;
  v_last_at timestamptz;
  v_gap_minutes integer;
  v_article record;
  v_post_id uuid;
begin
  if p_platform not in ('facebook', 'instagram', 'x', 'linkedin', 'telegram', 'youtube') then
    raise exception 'unsupported platform %', p_platform;
  end if;

  v_hour := extract(hour from (now() at time zone 'Asia/Dhaka'))::integer;
  if v_hour < 8 or v_hour >= 22 then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('social_claim:' || p_platform));

  select count(*)
    into v_count
    from public.social_posts sp
   where sp.platform = p_platform
     and sp.status in ('pending', 'published')
     and coalesce(sp.claimed_at, sp.created_at) > now() - interval '24 hours';
  if v_count >= v_cap then
    return;
  end if;

  select sp.id, coalesce(sp.claimed_at, sp.created_at)
    into v_last_id, v_last_at
    from public.social_posts sp
   where sp.platform = p_platform
     and sp.status in ('pending', 'published', 'failed')
   order by coalesce(sp.claimed_at, sp.created_at) desc
   limit 1;

  if v_last_id is not null then
    -- Jitter derives from the previous post id, so repeated cron ticks agree
    -- on the same gap instead of re-rolling until one is short enough.
    v_gap_minutes := v_min + (abs(hashtext(v_last_id::text)) % (v_max - v_min + 1));
    if now() < v_last_at + make_interval(mins => v_gap_minutes) then
      return;
    end if;
  end if;

  select a.id, a.slug, a.title_bn, a.excerpt_bn, a.thumbnail_url, a.featured_image, sp.id as existing_id
    into v_article
    from public.articles a
    left join public.social_posts sp on sp.article_id = a.id and sp.platform = p_platform
   where a.status = 'published'
     and a.published_at > now() - interval '24 hours'
     and a.image_rights_verified is true
     and coalesce(nullif(a.featured_image, ''), nullif(a.thumbnail_url, '')) ~* '^https://'
     and (sp.id is null or (sp.status = 'failed' and sp.attempt_count < 3 and sp.updated_at < now() - interval '30 minutes'))
   order by a.published_at desc
   limit 1
   for update of a skip locked;

  if v_article.id is null then
    return;
  end if;

  if v_article.existing_id is null then
    insert into public.social_posts (article_id, platform, status, attempt_count, claimed_at)
    values (v_article.id, p_platform, 'pending', 1, now())
    on conflict (article_id, platform) do nothing
    returning id into v_post_id;
  else
    update public.social_posts
       set status = 'pending',
           attempt_count = attempt_count + 1,
           claimed_at = now(),
           error_message = null,
           updated_at = now()
     where id = v_article.existing_id
    returning id into v_post_id;
  end if;

  if v_post_id is null then
    return;
  end if;

  return query
    select v_post_id, v_article.id, v_article.slug, v_article.title_bn, v_article.excerpt_bn,
           v_article.thumbnail_url, v_article.featured_image;
end;
$$;

create or replace function public.complete_social_post(
  p_post_id uuid,
  p_status text,
  p_external_post_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('published', 'failed', 'skipped') then
    raise exception 'invalid status %', p_status;
  end if;

  update public.social_posts
     set status = p_status,
         external_post_id = case when p_status = 'published' then left(p_external_post_id, 200) else external_post_id end,
         error_message = case when p_status = 'published' then null else left(p_error, 500) end,
         posted_at = case when p_status = 'published' then now() else posted_at end,
         updated_at = now()
   where id = p_post_id
     and status = 'pending';
end;
$$;

revoke all on function public.claim_next_social_post(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.complete_social_post(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_next_social_post(text, integer, integer, integer) to service_role;
grant execute on function public.complete_social_post(uuid, text, text, text) to service_role;

-- Tick every 5 minutes inside the 08:00–22:00 Dhaka window (02:00–15:59 UTC).
-- The claim RPC enforces the real gap, cap and window.
select cron.unschedule('social-scheduler-facebook')
 where exists (select 1 from cron.job where jobname = 'social-scheduler-facebook');

select cron.schedule('social-scheduler-facebook', '*/5 2-15 * * *', $$
  select net.http_post(
    url := internal.get_decrypted_secret('SUPABASE_URL') || '/functions/v1/social-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(internal.get_decrypted_secret('CRON_SECRET'), '')
    ),
    body := '{"platform":"facebook"}'::jsonb,
    timeout_milliseconds := 30000
  )
  where internal.get_decrypted_secret('SUPABASE_URL') is not null;
$$);

-- ---------------------------------------------------------------------------
-- 5b. E-paper PDF archive + APK CDN buckets
-- ---------------------------------------------------------------------------
alter table public.epaper_editions add column if not exists archive_path text;
alter table public.epaper_editions add column if not exists archive_generated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('epaper-archives', 'epaper-archives', true, 52428800, array['application/pdf']),
  ('app-releases', 'app-releases', true, 209715200, array['application/vnd.android.package-archive', 'application/octet-stream'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are world-readable through the public CDN URL; only service_role
-- (RLS bypass) writes them, so no insert/update policies are created.
drop policy if exists "public read epaper archives" on storage.objects;
create policy "public read epaper archives"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('epaper-archives', 'app-releases'));

-- Daily archive render: ask the GitHub Actions worker (headless Chromium) to
-- print the day's edition to a vector PDF. Skipped silently until a
-- GITHUB_DISPATCH_TOKEN exists in the Vault.
select cron.unschedule('epaper-archive-daily')
 where exists (select 1 from cron.job where jobname = 'epaper-archive-daily');

select cron.schedule('epaper-archive-daily', '30 18 * * *', $$
  select net.http_post(
    url := 'https://api.github.com/repos/MATI-AI-HUB/automation-king-/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || internal.get_decrypted_secret('GITHUB_DISPATCH_TOKEN'),
      'User-Agent', 'banglar-voice-cron'
    ),
    body := '{"event_type":"epaper-archive"}'::jsonb,
    timeout_milliseconds := 30000
  )
  where internal.get_decrypted_secret('GITHUB_DISPATCH_TOKEN') is not null;
$$);
