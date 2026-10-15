-- MACRI | Undo 07_replies.sql.
-- WARNING: drops the reply sent records (who was marked sent, when, provider ids). Export
-- public.macri_replies first. Client rows, their journey steps, stages and activity log
-- entries written by these functions stay as they are. Row level security stays on elsewhere.
-- After this, the app's Mark as sent and Undo buttons fail (shown as not saved) until 07 is reapplied.

begin;

drop function if exists public.reply_record_opened(text, text, text, text, text, text);
drop function if exists public.reply_mark_sent(text, text, text, text, text, text, text);
drop function if exists public.reply_undo_sent(text);
drop function if exists private.reply_result(text, text, text);
drop function if exists private.reply_lock(text, text, text, text, text);
drop function if exists private.reply_journey(jsonb);
drop function if exists private.reply_activity(text);
drop table if exists public.macri_replies;

commit;

notify pgrst, 'reload schema';
