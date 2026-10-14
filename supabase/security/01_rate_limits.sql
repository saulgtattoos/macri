-- MACRI | Counters for public paid request limits (used by /api/aftercare).
-- Callable only with the service role key (server side). Safe to run more than once.
-- Run in the TEST project first. Live project only with Saul's approval in chat.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;

create table if not exists private.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, window_start)
);
revoke all on table private.rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count  integer;
begin
  if p_bucket is null or length(p_bucket) > 200 or p_window_seconds < 1 or p_limit < 0 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits as r (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

commit;
