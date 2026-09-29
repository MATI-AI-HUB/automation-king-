-- Draft only. Do not copy into supabase/migrations/ until CONFIRM: production.
-- Intent: revoke leftover client grants; keep service_role.

-- revoke insert, update, delete on public.profiles from authenticated;
-- grant select, update on public.profiles to authenticated;
-- revoke delete on public.articles from authenticated;
-- revoke delete on public.reading_history from authenticated;
-- grant update (is_read) on public.notifications to authenticated;
