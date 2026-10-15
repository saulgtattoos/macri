-- MACRI | Reply sent status, stage compatibility (spec: Context/spec-home-studio-at-a-glance.md, section 4).
-- Mark as sent now also moves clients created in CRM: stage "new_inquiry" becomes
-- "awaiting_response", and Project Wall's project_stage "new_inquiry" becomes "awaiting_response".
-- "Inquiry" still becomes "Inquiry Response". The reply record keeps what changed in both fields,
-- so Undo restores each one only if it still has the value the confirmation set.
-- Everything else in 07_replies.sql is unchanged. Requires 07. Safe to run more than once.
-- Rollback: run 07_replies.sql again (restores the previous functions; the two added columns stay, unused).
-- Run in the TEST project first. Live only with Saul's approval.

begin;

alter table public.macri_replies
  add column if not exists project_stage_before text,
  add column if not exists project_stage_after text;

-- Saul's confirmation (saul_gmail, saul_messages) or a provider acceptance (resend, twilio).
-- One confirmation per reply. A provider acceptance after Saul's confirmation is kept
-- (provider and message id) without touching the journey or stage again.
create or replace function public.reply_mark_sent(
  p_id text, p_client_id text, p_channel text, p_subject text, p_body text, p_via text, p_provider_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.macri_replies;
  c public.crm_clients_v1;
  is_provider boolean := p_via in ('resend', 'twilio');
  j jsonb;
  ticked boolean := false;
  new_stage text;
  new_project_stage text;
  note text;
begin
  if p_via not in ('saul_gmail', 'saul_messages', 'resend', 'twilio') then raise exception 'invalid_via'; end if;
  if (p_via in ('saul_gmail', 'resend')) <> (p_channel = 'email') then raise exception 'invalid_via_for_channel'; end if;
  if is_provider and coalesce(length(p_provider_id), 0) not between 1 and 200 then raise exception 'provider_id_required'; end if;
  r := private.reply_lock(p_id, p_client_id, p_channel, p_subject, p_body);

  if r.status = 'sent' then
    if is_provider and r.provider_id is null then
      update public.macri_replies set provider = p_via, provider_id = p_provider_id,
        provider_accepted_at = now(), updated_at = now() where id = p_id;
      update public.crm_clients_v1 set
        activity_log = jsonb_build_array(private.reply_activity(format('Reply also accepted by %s (%s). Id: %s.',
          initcap(p_via), p_channel, p_provider_id))) || coalesce(activity_log, '[]'::jsonb),
        updated_at = now()
      where id = p_client_id;
      return private.reply_result('provider_attached', p_id, p_client_id);
    end if;
    return private.reply_result('already_sent', p_id, p_client_id);
  end if;

  select * into c from public.crm_clients_v1 where id = p_client_id;
  j := private.reply_journey(c.journey_checklist);
  if (j -> 1) is distinct from 'true'::jsonb then
    j := jsonb_set(j, '{1}', 'true'::jsonb);
    ticked := true;
  end if;
  -- Both stage naming schemes in use: Inquiry Assistant ("Inquiry") and CRM / Project Wall ("new_inquiry").
  new_stage := case c.stage when 'Inquiry' then 'Inquiry Response' when 'new_inquiry' then 'awaiting_response' else c.stage end;
  new_project_stage := case when c.project_stage = 'new_inquiry' then 'awaiting_response' else c.project_stage end;
  note := case when is_provider
    then format('Inquiry reply accepted by %s (%s). Id: %s.', initcap(p_via), p_channel, p_provider_id)
    else format('Inquiry reply marked sent by Saul (%s).', p_channel) end
    || case when new_stage is distinct from c.stage
         then format(' Stage updated to %s.', case new_stage when 'awaiting_response' then 'Awaiting Response' else new_stage end)
         else '' end;

  update public.macri_replies set
    status = 'sent', sent_at = now(), sent_via = p_via,
    provider = case when is_provider then p_via end,
    provider_id = case when is_provider then p_provider_id end,
    provider_accepted_at = case when is_provider then now() end,
    subject = p_subject, body = p_body,
    journey_ticked = ticked,
    stage_before = case when new_stage is distinct from c.stage then c.stage end,
    stage_after = case when new_stage is distinct from c.stage then new_stage end,
    project_stage_before = case when new_project_stage is distinct from c.project_stage then c.project_stage end,
    project_stage_after = case when new_project_stage is distinct from c.project_stage then new_project_stage end,
    undone_at = null, updated_at = now()
  where id = p_id;
  update public.crm_clients_v1 set
    journey_checklist = j,
    stage = new_stage,
    project_stage = new_project_stage,
    activity_log = jsonb_build_array(private.reply_activity(note)) || coalesce(activity_log, '[]'::jsonb),
    updated_at = now()
  where id = p_client_id;
  return private.reply_result('sent', p_id, p_client_id);
end $$;

-- Reverses one of Saul's confirmations and only what it changed. Refused once a provider
-- accepted the reply (it really went out). Adds an activity entry; never edits other entries.
create or replace function public.reply_undo_sent(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cid text;
  r public.macri_replies;
  c public.crm_clients_v1;
  j jsonb;
  note text := 'Sent confirmation undone by Saul.';
  restore_stage boolean;
  restore_project boolean;
  keep_tick boolean;
begin
  if not (select private.is_owner()) then raise exception 'not_owner' using errcode = '42501'; end if;
  select client_id into cid from public.macri_replies where id = p_id;
  if cid is null then raise exception 'reply_not_found'; end if;
  select * into c from public.crm_clients_v1 where id = cid for update;
  select * into r from public.macri_replies where id = p_id for update;
  if r.status <> 'sent' then return private.reply_result('not_sent', p_id, cid); end if;
  if r.provider_id is not null then return private.reply_result('provider_accepted', p_id, cid); end if;

  j := private.reply_journey(c.journey_checklist);
  keep_tick := exists (select 1 from public.macri_replies o where o.client_id = cid and o.id <> p_id and o.status = 'sent');
  if r.journey_ticked and not keep_tick then
    j := jsonb_set(j, '{1}', 'false'::jsonb);
  elsif r.journey_ticked then
    note := note || ' Response sent step kept because another reply is recorded as sent.';
  end if;
  restore_stage := r.stage_after is not null and c.stage is not distinct from r.stage_after;
  if r.stage_after is not null and not restore_stage then
    note := note || format(' Stage left at %s because it changed after the confirmation.', coalesce(c.stage, 'none'));
  elsif restore_stage then
    note := note || format(' Stage returned to %s.', case r.stage_before when 'new_inquiry' then 'New Inquiry' else r.stage_before end);
  end if;
  restore_project := r.project_stage_after is not null and c.project_stage is not distinct from r.project_stage_after;
  if r.project_stage_after is not null and not restore_project then
    note := note || format(' Project Wall stage left at %s because it changed after the confirmation.', coalesce(c.project_stage, 'none'));
  end if;

  update public.macri_replies set
    status = case when first_opened_at is not null then 'opened' else 'drafted' end,
    sent_at = null, sent_via = null, journey_ticked = null, stage_before = null, stage_after = null,
    project_stage_before = null, project_stage_after = null,
    undone_at = now(), updated_at = now()
  where id = p_id;
  update public.crm_clients_v1 set
    journey_checklist = j,
    stage = case when restore_stage then r.stage_before else stage end,
    project_stage = case when restore_project then r.project_stage_before else project_stage end,
    activity_log = jsonb_build_array(private.reply_activity(note)) || coalesce(activity_log, '[]'::jsonb),
    updated_at = now()
  where id = cid;
  return private.reply_result('undone', p_id, cid);
end $$;

grant execute on function public.reply_mark_sent(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.reply_undo_sent(text) to authenticated;
revoke all on function public.reply_mark_sent(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.reply_undo_sent(text) from public, anon;

commit;

notify pgrst, 'reload schema';

-- Check (read only): expect 2 rows (the added columns).
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'macri_replies'
  and column_name in ('project_stage_before', 'project_stage_after')
order by 1;
