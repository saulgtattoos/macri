-- MACRI | Read only inspection. Changes nothing; safe on the live project.
-- Run each numbered block separately in Supabase Dashboard > SQL Editor and share the results.
-- No client records are read; block 7 returns a count only.
-- If 05_resume_lockdown.sql has been run, blocks 1 to 3 show the locked state and
-- block 0 shows the settings as they were just before the lockdown.

-- 0. Settings saved just before the resume lockdown (only exists after 05_resume_lockdown.sql)
select kind, object, detail
from private.lockdown_snapshot
order by kind, object;

-- 1. Row level security status for every table and view in public
select c.relname as name,
       case c.relkind when 'r' then 'table' when 'p' then 'partitioned table'
                      when 'v' then 'view' when 'm' then 'materialized view' end as kind,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
order by 1;

-- 2. Existing policies (permissive policies are OR'ed together)
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by 1, 2;

-- 3. Table privileges held by the API roles (checked before row level security)
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by 1, 2
order by 1, 2;

-- 4. get_daily_brief: signature, security definer flag, settings, definition, and who may run it
select p.oid::regprocedure as signature,
       p.prosecdef as security_definer,
       p.proconfig as settings,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_daily_brief';

select r.rolname, has_function_privilege(r.rolname, p.oid, 'execute') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
where n.nspname = 'public' and p.proname = 'get_daily_brief';

-- 5. Every public function that bypasses row level security (security definer), and whether anon can run it
select p.oid::regprocedure as signature,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1;

-- 6. Storage buckets and whether they are public
select id, public from storage.buckets order by id;

-- 7. Number of auth users (count only)
select count(*) as auth_users from auth.users;

-- 8. Table structure for the TEST project (structure only, no data).
--    Returns one cell of CREATE TABLE statements to run in the test project.
select string_agg(ddl, E'\n\n' order by relname) as test_schema_sql
from (
  select cl.relname,
         format(E'create table if not exists public.%I (\n%s%s\n);',
           cl.relname,
           string_agg(
             format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
               case when a.attnotnull then ' not null' else '' end,
               coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')),
             E',\n' order by a.attnum),
           coalesce((select E',\n  ' || string_agg(pg_get_constraintdef(con.oid), E',\n  ')
                     from pg_constraint con
                     where con.conrelid = cl.oid and con.contype in ('p', 'u')), '')
         ) as ddl
  from pg_class cl
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute a on a.attrelid = cl.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = cl.oid and d.adnum = a.attnum
  where n.nspname = 'public' and cl.relkind = 'r'
  group by cl.oid, cl.relname
) t;

-- 9. Lock check: every API grant that anon or a signed in user still holds in public.
--    During live preparation this must return ONLY functions that are safe to call
--    (get_daily_brief as invoker fails without table access). No tables, views or sequences.
select 'table/view/sequence' as kind, table_name as name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
union all
select 'function', p.oid::regprocedure::text, r.rolname, 'EXECUTE'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('anon'), ('authenticated')) as r(rolname)
where n.nspname = 'public' and has_function_privilege(r.rolname, p.oid, 'execute')
order by 1, 2, 3;
