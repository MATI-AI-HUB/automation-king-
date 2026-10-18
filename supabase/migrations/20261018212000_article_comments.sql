begin;

create table public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null,
  constraint article_comments_pending_has_no_moderator
    check (status <> 'pending' or (moderated_at is null and moderated_by is null))
);

create index article_comments_article_status_created_idx
  on public.article_comments (article_id, status, created_at desc);

alter table public.article_comments enable row level security;

revoke all on table public.article_comments from anon, authenticated, public;
grant select on table public.article_comments to anon, authenticated;
grant insert (article_id, display_name, body) on table public.article_comments to anon, authenticated;
grant update (status, moderated_at, moderated_by) on table public.article_comments to authenticated;
grant delete on table public.article_comments to authenticated;

create policy article_comments_read_approved
  on public.article_comments
  for select
  to anon, authenticated
  using (status = 'approved');

create policy article_comments_editor_read_all
  on public.article_comments
  for select
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']));

create policy article_comments_insert_pending_for_published
  on public.article_comments
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and moderated_at is null
    and moderated_by is null
    and exists (
      select 1
      from public.articles as a
      where a.id = article_comments.article_id
        and a.status = 'published'
    )
  );

create policy article_comments_editor_moderate
  on public.article_comments
  for update
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']))
  with check (
    public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin'])
    and (status <> 'pending' or (moderated_at is null and moderated_by is null))
  );

create policy article_comments_editor_delete
  on public.article_comments
  for delete
  to authenticated
  using (public.current_app_role()::text = any (array['desk_editor', 'chief_editor', 'admin']));

comment on table public.article_comments is
  'Public article comments; submissions remain pending until an editorial role approves them.';

commit;
