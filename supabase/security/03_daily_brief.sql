-- MACRI | Lock down get_daily_brief.
-- Confirmed on live 2026-10-12: public.get_daily_brief(), no arguments, already SECURITY INVOKER,
-- reads sessions_v4 and macri_agent_queue (both covered by 02).
-- security invoker keeps it obeying row level security (returns data only for the owner);
-- the fixed search_path stops it from resolving tables through another schema.
-- Run after 02_owner_access.sql. TEST project first; live only with approval.

begin;

alter function public.get_daily_brief() security invoker;
alter function public.get_daily_brief() set search_path = public, pg_temp;
revoke all on function public.get_daily_brief() from public, anon;
grant execute on function public.get_daily_brief() to authenticated;

commit;
