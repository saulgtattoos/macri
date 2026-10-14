-- Copy of the live get_daily_brief() (read 2026-10-12) for the TEST project.
-- Run after the test structure (01_structure.sql) and before supabase/security/03_daily_brief.sql.
CREATE OR REPLACE FUNCTION public.get_daily_brief()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
  today_str text := to_char((current_timestamp at time zone 'America/Los_Angeles')::date, 'MM/DD/YYYY');
  session_count integer;
  projected_revenue numeric;
  pending_intake integer;
begin

  select count(*), coalesce(sum(total), 0)
  into session_count, projected_revenue
  from sessions_v4
  where date = today_str;

  select count(*)
  into pending_intake
  from macri_agent_queue
  where status not in ('approved', 'sent', 'dismissed')
  or status is null;

  return json_build_object(
    'date', (current_timestamp at time zone 'America/Los_Angeles')::date,
    'greeting', 'Good morning, Saul',
    'overview', json_build_object(
      'appointments_count', session_count,
      'projected_revenue', projected_revenue,
      'pending_intake_forms', pending_intake
    )
  );

end;
$function$;
