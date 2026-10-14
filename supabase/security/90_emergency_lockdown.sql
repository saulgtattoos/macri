-- MACRI | Emergency rollback that keeps data restricted.
-- Use if owner access misbehaves after rollout (for example a policy error).
-- Row level security stays ON; all API policies on these tables are removed, so nobody
-- can read or write them through the API (owner included) until 02_owner_access.sql is
-- run again. The service role key keeps working. The app shows its device only banner.
-- This never disables row level security. Disabling it needs Saul's explicit approval.

begin;

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
    continue when to_regclass(format('public.%I', t)) is null;
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end $$;

commit;
