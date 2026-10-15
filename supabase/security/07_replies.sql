-- MACRI | Reply sent status (spec: Context/spec-replies-sent-status-and-glance.md, Part 1).
-- One row per reply draft and channel. The app may only READ this table; every change goes
-- through the three functions below, which check the owner, lock the client and reply rows,
-- and update the reply, the journey "response sent" step, the stage and the activity log in
-- one transaction (all or nothing). Duplicate confirmations are refused here, so the rule
-- holds across tabs and devices.
-- Requires 02_owner_access.sql (private.is_owner). Safe to run more than once.
-- Run in the TEST project first. Live only with Saul's approval.

begin;

create table if not exists public.macri_replies (
  id                   text primary key,              -- draft id plus channel, set by the app
  client_id            text not null references public.crm_clients_v1(id) on delete cascade,
  channel              text not null check (channel in ('email', 'text')),
  subject              text,
  body                 text,
  status               text not null default 'drafted' check (status in ('drafted', 'opened', 'sent')),
  opened_in            text check (opened_in in ('gmail', 'messages')),
  first_opened_at      timestamptz,
  last_opened_at       timestamptz,
  sent_at              timestamptz,
  sent_via             text check (sent_via in ('saul_gmail', 'saul_messages', 'resend', 'twilio')),
  provider             text check (provider in ('resend', 'twilio')),
  provider_id          text,
  provider_accepted_at timestamptz,
  journey_ticked       boolean,   -- what the sent confirmation changed, so Undo reverses only that
  stage_before         text,
  stage_after          text,
  undone_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint macri_replies_sent_complete check (status <> 'sent' or (sent_at is not null and sent_via is not null)),
  constraint macri_replies_provider_complete check ((provider is null) = (provider_id is null))
);
create index if not exists macri_replies_client_idx on public.macri_replies (client_id);

alter table public.macri_replies enable row level security;
drop policy if exists owner_read on public.macri_replies;
create policy owner_read on public.macri_replies for select to authenticated using ((select private.is_owner()));
revoke all on table public.macri_replies from public, anon, authenticated;
grant select on table public.macri_replies to authenticated;

-- Activity entry in the app's shape, newest first, dated in Saul's time zone.
create or replace function private.reply_activity(p_text text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'timestamp', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'text', to_char(now() at time zone 'America/Los_Angeles', 'Mon FMDD, YYYY') || ' ' || p_text)
$$;
revoke all on function private.reply_activity(text) from public, anon, authenticated;

-- Journey checklist with at least two steps (index 1 is "response sent").
create or replace function private.reply_journey(p jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare j jsonb := case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end;
begin
  while jsonb_array_length(j) < 2 loop j := j || 'false'::jsonb; end loop;
  return j;
end $$;
revoke all on function private.reply_journey(jsonb) from public, anon, authenticated;

-- Locks the client, creates the reply row if needed, locks it. Raises on any mismatch.
create or replace function private.reply_lock(p_id text, p_client_id text, p_channel text, p_subject text, p_body text)
returns public.macri_replies language plpgsql set search_path = '' as $$
declare r public.macri_replies;
begin
  if not (select private.is_owner()) then raise exception 'not_owner' using errcode = '42501'; end if;
  if p_id is null or length(p_id) not between 1 and 200 then raise exception 'invalid_reply_id'; end if;
  perform 1 from public.crm_clients_v1 where id = p_client_id for update;
  if not found then raise exception 'client_not_found'; end if;
  insert into public.macri_replies (id, client_id, channel, subject, body)
  values (p_id, p_client_id, p_channel, p_subject, p_body)
  on conflict (id) do nothing;
  select * into r from public.macri_replies where id = p_id for update;
  if r.client_id <> p_client_id then raise exception 'reply_belongs_to_another_client'; end if;
  if r.channel <> p_channel then raise exception 'reply_channel_mismatch'; end if;
  return r;
end $$;
revoke all on function private.reply_lock(text, text, text, text, text) from public, anon, authenticated;

create or replace function private.reply_result(p_result text, p_id text, p_client_id text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'result', p_result,
    'reply', (select to_jsonb(r) from public.macri_replies r where r.id = p_id),
    'client', (select to_jsonb(c) from public.crm_clients_v1 c where c.id = p_client_id))
$$;
revoke all on function private.reply_result(text, text, text) from public, anon, authenticated;

-- Opening a draft in Gmail or Messages. Never marks sent, never changes the journey or stage.
-- Logs only the first open of a draft; later opens update last_opened_at.
create or replace function public.reply_record_opened(
  p_id text, p_client_id text, p_channel text, p_subject text, p_body text, p_app text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.macri_replies;
begin
  if p_app not in ('gmail', 'messages') or (p_app = 'gmail') <> (p_channel = 'email') then
    raise exception 'invalid_app_for_channel';
  end if;
  r := private.reply_lock(p_id, p_client_id, p_channel, p_subject, p_body);
  update public.macri_replies set
    status = case when status = 'sent' then status else 'opened' end,
    subject = case when status = 'sent' then subject else p_subject end,
    body = case when status = 'sent' then body else p_body end,
    opened_in = p_app,
    first_opened_at = coalesce(first_opened_at, now()),
    last_opened_at = now(),
    updated_at = now()
  where id = p_id;
  if r.first_opened_at is null and r.status <> 'sent' then
    update public.crm_clients_v1 set
      activity_log = jsonb_build_array(private.reply_activity(
        case when p_app = 'gmail' then 'Email draft opened in Gmail.' else 'Text draft opened in Messages.' end))
        || coalesce(activity_log, '[]'::jsonb),
      updated_at = now()
    where id = p_client_id;
  end if;
  return private.reply_result('opened', p_id, p_client_id);
end $$;

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
  new_stage := case when c.stage = 'Inquiry' then 'Inquiry Response' else c.stage end;
  note := case when is_provider
    then format('Inquiry reply accepted by %s (%s). Id: %s.', initcap(p_via), p_channel, p_provider_id)
    else format('Inquiry reply marked sent by Saul (%s).', p_channel) end
    || case when new_stage is distinct from c.stage then ' Stage updated to Inquiry Response.' else '' end;

  update public.macri_replies set
    status = 'sent', sent_at = now(), sent_via = p_via,
    provider = case when is_provider then p_via end,
    provider_id = case when is_provider then p_provider_id end,
    provider_accepted_at = case when is_provider then now() end,
    subject = p_subject, body = p_body,
    journey_ticked = ticked,
    stage_before = case when new_stage is distinct from c.stage then c.stage end,
    stage_after = case when new_stage is distinct from c.stage then new_stage end,
    undone_at = null, updated_at = now()
  where id = p_id;
  update public.crm_clients_v1 set
    journey_checklist = j,
    stage = new_stage,
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
    note := note || format(' Stage returned to %s.', r.stage_before);
  end if;

  update public.macri_replies set
    status = case when first_opened_at is not null then 'opened' else 'drafted' end,
    sent_at = null, sent_via = null, journey_ticked = null, stage_before = null, stage_after = null,
    undone_at = now(), updated_at = now()
  where id = p_id;
  update public.crm_clients_v1 set
    journey_checklist = j,
    stage = case when restore_stage then r.stage_before else stage end,
    activity_log = jsonb_build_array(private.reply_activity(note)) || coalesce(activity_log, '[]'::jsonb),
    updated_at = now()
  where id = cid;
  return private.reply_result('undone', p_id, cid);
end $$;

revoke all on function public.reply_record_opened(text, text, text, text, text, text) from public, anon;
revoke all on function public.reply_mark_sent(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.reply_undo_sent(text) from public, anon;
grant execute on function public.reply_record_opened(text, text, text, text, text, text) to authenticated;
grant execute on function public.reply_mark_sent(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.reply_undo_sent(text) to authenticated;

commit;

notify pgrst, 'reload schema';

-- Check (read only): expect the table with row level security on and 3 functions.
select 'table' as kind, relname as name, relrowsecurity::text as rls from pg_class where oid = 'public.macri_replies'::regclass
union all
select 'function', proname, null from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('reply_record_opened', 'reply_mark_sent', 'reply_undo_sent')
order by 1, 2;
