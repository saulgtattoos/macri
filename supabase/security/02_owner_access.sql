-- MACRI | Owner only database access (row level security).
-- Before running:
--   1. Saul's owner account exists in this project (Authentication > Users).
--   2. In the insert below, put that account's email in place of the placeholder
--      (the only line containing it).
--   3. 00_inspect_readonly.sql results reviewed (other tables, existing policies, n8n key).
-- Effect: only the owner account can read or write these tables through the API.
-- The service role key (server functions, n8n if it uses that key) is not affected.
-- Every existing policy on these tables is dropped first, because permissive policies
-- are OR'ed and any leftover "allow all" policy would keep the table open.
-- Safe to run more than once. TEST project first; live only with approval in chat.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade
);
revoke all on table private.app_owner from public, anon, authenticated;

insert into private.app_owner (user_id)
select id from auth.users where lower(email) = lower('owner.email@REPLACE.ME')
on conflict do nothing;

do $$
begin
  if (select count(*) from private.app_owner) <> 1 then
    raise exception 'Expected exactly one owner row. Check the owner email in this script and Authentication > Users.';
  end if;
end $$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.app_owner where user_id = (select auth.uid()))
$$;
revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

do $$
declare
  t   text;
  pol record;
  tables text[] := array[
    'crm_clients_v1', 'sessions_v4',
    'macri_agent_queue', 'macri_cart', 'macri_colorlab_brands', 'macri_colorlab_inks',
    'macri_colorlab_palettes', 'macri_content_drafts', 'macri_content_hashtags',
    'macri_expenses', 'macri_finance_goals', 'macri_inventory', 'macri_session_prep',
    'studio_cart_v1', 'studio_inventory_v1'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise exception 'Table public.% does not exist in this project', t;
    end if;

    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated '
      'using ((select private.is_owner())) with check ((select private.is_owner()))', t);
    execute format('revoke all on table public.%I from anon', t);
    -- Explicit, because 05_resume_lockdown.sql removes the default grants.
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- Sequences behind these tables (if any) must be usable for owner inserts.
grant usage, select on all sequences in schema public to authenticated;

commit;
