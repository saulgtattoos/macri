-- MACRI | Undo 01_rate_limits.sql (rate limit counters for /api/aftercare).
-- Removes only the rate limit function and its counter table. Touches no client data,
-- no other tables and no access rules. With it removed, /api/aftercare refuses paid
-- requests (fails closed) until 01 is applied again.

begin;

drop function if exists public.consume_rate_limit(text, integer, integer);
drop table if exists private.rate_limits;

commit;
