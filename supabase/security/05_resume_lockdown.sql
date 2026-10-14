-- MACRI | Lockdown to run IMMEDIATELY after resuming a paused project.
-- Purpose: no unrestricted access while we inspect and prepare. Run before anything else.
-- 1. Saves a snapshot of the current access settings (table privileges, function privileges,
--    row level security flags, policies) into private.lockdown_snapshot, so the read only
--    inspection can still see what the project looked like before.
-- 2. Removes every table, view and sequence privilege in public from anon and authenticated
--    (the roles used by the publishable key and by any signed in user).
-- 3. Removes execute on every SECURITY DEFINER function in public from public, anon, authenticated
--    (those functions bypass row level security).
-- 4. Turns row level security on for every table in public. Existing policies are left in place
--    for inspection; they grant nothing while the privileges above are removed.
-- Not affected: the service role key (server side, n8n if it uses that key) and the dashboard.
-- Reads no client records. One transaction: it applies completely or not at all.
-- Owner access comes back later only through 01, 02 and 03.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;

create table if not exists private.lockdown_snapshot (
  taken_at timestamptz not null default now(),
  kind     text        not null,
  object   text        not null,
  detail   jsonb       not null
);
revoke all on table private.lockdown_snapshot from public, anon, authenticated;

insert into private.lockdown_snapshot (kind, object, detail)
select 'table_privileges', table_name,
       jsonb_build_object('grantee', grantee, 'privileges', jsonb_agg(privilege_type order by privilege_type))
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
group by table_name, grantee;

insert into private.lockdown_snapshot (kind, object, detail)
select 'rls', c.relname,
       jsonb_build_object('kind', c.relkind, 'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f');

insert into private.lockdown_snapshot (kind, object, detail)
select 'policy', tablename,
       jsonb_build_object('policy', policyname, 'permissive', permissive, 'roles', roles,
                          'cmd', cmd, 'using', qual, 'with_check', with_check)
from pg_policies
where schemaname = 'public';

insert into private.lockdown_snapshot (kind, object, detail)
select 'function', p.oid::regprocedure::text,
       jsonb_build_object(
         'security_definer', p.prosecdef,
         'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
         'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute'))
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

do $$
declare
  f record;
  t record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;

  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- Tables, views and sequences created later by the dashboard user start without API access.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

commit;

-- Check (read only): should return no rows.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
