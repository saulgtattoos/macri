// Runs supabase/security/07_replies.sql on the real table structure in an in-memory Postgres
// set up like Supabase (roles, auth.uid from the JWT subject, owner rules from 02).
// Synthetic data only. No real project is touched.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

async function db() {
  const d = new PGlite()
  await d.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    insert into auth.users values ('${OWNER}', 'owner@example.test'), ('${OTHER}', 'other@example.test');
  `)
  await d.exec(read('supabase/test/01_structure.sql'))
  await d.exec('grant all on all tables in schema public to anon, authenticated, service_role;')
  await d.exec(read('supabase/security/02_owner_access.sql').replace('owner.email@REPLACE.ME', 'owner@example.test'))
  await d.exec(read('supabase/security/07_replies.sql'))
  await d.exec(read('supabase/security/08_reply_stage_compat.sql'))
  await d.exec(`insert into public.crm_clients_v1 (id, name, stage, project_stage, journey_checklist, activity_log) values
    ('c3', 'Crm Created', 'new_inquiry', 'new_inquiry', '[false,false]', '[]');
    insert into public.crm_clients_v1 (id, name, stage, journey_checklist, activity_log) values
    ('c1', 'Maria Synthetic', 'Inquiry', '[true,false,false,false,false,false]', '[{"id":"old","timestamp":"2026-01-01T00:00:00.000Z","text":"Earlier entry"}]'),
    ('c2', 'Maria Other', 'Inquiry', '[]', '[]')`)
  return d
}

async function as(d, role, sub, fn) {
  await d.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`)
  try { return await fn() } finally { await d.exec('reset role') }
}
const attempt = async (p) => { try { return { ok: true, value: await p } } catch (e) { return { ok: false, error: e.message } } }
const call = (d, sql, args) => as(d, 'authenticated', OWNER, async () => (await d.query(sql, args)).rows[0].r)
const opened = (d, id, client, channel = 'email', app = 'gmail') =>
  call(d, `select public.reply_record_opened($1, $2, $3, 'Subject', 'Body', $4) as r`, [id, client, channel, app])
const markSent = (d, id, client, via = 'saul_gmail', providerId = null, channel = via === 'saul_messages' || via === 'twilio' ? 'text' : 'email') =>
  call(d, `select public.reply_mark_sent($1, $2, $3, 'Subject', 'Body', $4, $5) as r`, [id, client, channel, via, providerId])
const undo = (d, id) => call(d, `select public.reply_undo_sent($1) as r`, [id])
const client = async (d, id) => (await d.query(`select stage, journey_checklist, activity_log from public.crm_clients_v1 where id = $1`, [id])).rows[0]
const project = async (d, id) => (await d.query(`select stage, project_stage from public.crm_clients_v1 where id = $1`, [id])).rows[0]
const reply = async (d, id) => (await d.query(`select * from public.macri_replies where id = $1`, [id])).rows[0]
const texts = (c) => c.activity_log.map((e) => e.text.replace(/^\w{3} \d{1,2}, \d{4} /, ''))

test('opening records the open only: no journey tick, no stage change, one log entry for repeated opens', async () => {
  const d = await db()
  await opened(d, 'r1-email', 'c1')
  await opened(d, 'r1-email', 'c1')
  const c = await client(d, 'c1'), r = await reply(d, 'r1-email')
  assert.equal(c.stage, 'Inquiry')
  assert.equal(c.journey_checklist[1], false)
  assert.deepEqual(texts(c), ['Email draft opened in Gmail.', 'Earlier entry'])
  assert.equal(r.status, 'opened')
  assert.ok(r.last_opened_at >= r.first_opened_at)
})

test('Mark as sent ticks the journey, moves Inquiry to Inquiry Response and logs once, all together', async () => {
  const d = await db()
  await opened(d, 'r1-text', 'c1', 'text', 'messages')
  const res = await markSent(d, 'r1-text', 'c1', 'saul_messages')
  assert.equal(res.result, 'sent')
  assert.equal(res.client.stage, 'Inquiry Response')
  const c = await client(d, 'c1'), r = await reply(d, 'r1-text')
  assert.equal(c.journey_checklist[1], true)
  assert.deepEqual(texts(c).slice(0, 2), ['Inquiry reply marked sent by Saul (text). Stage updated to Inquiry Response.', 'Text draft opened in Messages.'])
  assert.deepEqual([r.status, r.sent_via, r.journey_ticked, r.stage_before, r.stage_after], ['sent', 'saul_messages', true, 'Inquiry', 'Inquiry Response'])
})

test('duplicate confirmations are refused by the database (second tab, double click)', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  const before = await client(d, 'c1')
  const again = await markSent(d, 'r1-email', 'c1')
  assert.equal(again.result, 'already_sent')
  assert.deepEqual(await client(d, 'c1'), before)
})

test('provider acceptance after Saul confirmed keeps the provider id without a second journey update', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  const before = await client(d, 'c1')
  const res = await markSent(d, 'r1-email', 'c1', 'resend', 'resend-msg-123')
  assert.equal(res.result, 'provider_attached')
  const r = await reply(d, 'r1-email'), c = await client(d, 'c1')
  assert.deepEqual([r.sent_via, r.provider, r.provider_id], ['saul_gmail', 'resend', 'resend-msg-123'])
  assert.deepEqual(c.journey_checklist, before.journey_checklist)
  assert.equal(c.stage, before.stage)
  assert.equal(texts(c)[0], 'Reply also accepted by Resend (email). Id: resend-msg-123.')
  assert.equal(c.activity_log.length, before.activity_log.length + 1)
  const third = await markSent(d, 'r1-email', 'c1', 'resend', 'resend-msg-456')
  assert.equal(third.result, 'already_sent')
  assert.equal((await reply(d, 'r1-email')).provider_id, 'resend-msg-123')
})

test('Undo is refused once a provider accepted the reply', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  await markSent(d, 'r1-email', 'c1', 'resend', 'resend-msg-123')
  assert.equal((await undo(d, 'r1-email')).result, 'provider_accepted')
  assert.equal((await reply(d, 'r1-email')).status, 'sent')
  await markSent(d, 'r2-text', 'c2', 'twilio', 'SM123')
  assert.equal((await undo(d, 'r2-text')).result, 'provider_accepted')
})

test('Undo reverses only what the confirmation changed and keeps every log entry', async () => {
  const d = await db()
  await opened(d, 'r1-email', 'c1')
  await markSent(d, 'r1-email', 'c1')
  const mid = await client(d, 'c1')
  const res = await undo(d, 'r1-email')
  assert.equal(res.result, 'undone')
  const c = await client(d, 'c1'), r = await reply(d, 'r1-email')
  assert.equal(c.stage, 'Inquiry')
  assert.equal(c.journey_checklist[1], false)
  assert.equal(c.journey_checklist[0], true, 'other steps untouched')
  assert.deepEqual(c.activity_log.slice(1), mid.activity_log, 'earlier entries untouched')
  assert.equal(texts(c)[0], 'Sent confirmation undone by Saul. Stage returned to Inquiry.')
  assert.equal(r.status, 'opened')
  assert.ok(r.undone_at)
  assert.equal((await undo(d, 'r1-email')).result, 'not_sent')
  assert.equal((await markSent(d, 'r1-email', 'c1')).result, 'sent', 'can be confirmed again after undo')
})

test('Undo leaves the stage alone if it changed after the confirmation', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  await d.query(`update public.crm_clients_v1 set stage = 'Consultation' where id = 'c1'`)
  await undo(d, 'r1-email')
  const c = await client(d, 'c1')
  assert.equal(c.stage, 'Consultation')
  assert.match(texts(c)[0], /Stage left at Consultation because it changed after the confirmation\./)
})

test('Undo does not untick a step it did not tick, or one another sent reply relies on', async () => {
  const d = await db()
  await d.query(`update public.crm_clients_v1 set journey_checklist = '[false,true]' where id = 'c1'`)
  await markSent(d, 'r1-email', 'c1')
  assert.equal((await reply(d, 'r1-email')).journey_ticked, false)
  await undo(d, 'r1-email')
  assert.equal((await client(d, 'c1')).journey_checklist[1], true)

  await markSent(d, 'r2-email', 'c2')
  await markSent(d, 'r3-text', 'c2', 'saul_messages')
  await undo(d, 'r2-email')
  const c2 = await client(d, 'c2')
  assert.equal(c2.journey_checklist[1], true)
  assert.match(texts(c2)[0], /Response sent step kept because another reply is recorded as sent\./)
})

test('all or nothing: a refused call changes nothing', async () => {
  const d = await db()
  await opened(d, 'r1-email', 'c1')
  const before = await client(d, 'c1'), rBefore = await reply(d, 'r1-email')
  for (const bad of [
    () => markSent(d, 'r1-email', 'c2'),                               // reply belongs to another client
    () => markSent(d, 'r1-email', 'c1', 'saul_messages'),              // wrong channel for this reply
    () => markSent(d, 'r1-email', 'c1', 'resend', null),               // provider without id
    () => markSent(d, 'r9-email', 'missing'),                          // unknown client
  ]) {
    const a = await attempt(bad())
    assert.equal(a.ok, false)
  }
  assert.deepEqual(await client(d, 'c1'), before)
  assert.deepEqual(await reply(d, 'r1-email'), rBefore)
  assert.equal(await reply(d, 'r9-email'), undefined)
})

test('only the owner: other accounts and anon cannot read or change replies', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  const otherCall = await as(d, 'authenticated', OTHER, () => attempt(d.query(`select public.reply_undo_sent('r1-email')`)))
  assert.equal(otherCall.ok, false)
  assert.match(otherCall.error, /not_owner/)
  const otherRead = await as(d, 'authenticated', OTHER, () => d.query('select * from public.macri_replies'))
  assert.equal(otherRead.rows.length, 0)
  const anonCall = await as(d, 'anon', null, () => attempt(d.query(`select public.reply_mark_sent('x', 'c1', 'email', 's', 'b', 'saul_gmail')`)))
  assert.equal(anonCall.ok, false)
  assert.match(anonCall.error, /permission denied/)
  const anonRead = await as(d, 'anon', null, () => attempt(d.query('select * from public.macri_replies')))
  assert.equal(anonRead.ok, false)
  const ownerWrite = await as(d, 'authenticated', OWNER, () => attempt(d.query(`update public.macri_replies set status = 'drafted'`)))
  assert.equal(ownerWrite.ok, false, 'the app cannot bypass the rules with a direct write')
  assert.equal((await reply(d, 'r1-email')).status, 'sent')
})

test('07 runs twice; emergency lockdown pauses the functions; 93 rollback removes only reply objects', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  await d.exec(read('supabase/security/07_replies.sql'))
  assert.equal((await reply(d, 'r1-email')).status, 'sent')
  await d.exec(read('supabase/security/90_emergency_lockdown.sql'))
  const paused = await as(d, 'authenticated', OWNER, () => attempt(d.query(`select public.reply_undo_sent('r1-email')`)))
  assert.equal(paused.ok, false)
  await d.exec(read('supabase/security/02_owner_access.sql').replace('owner.email@REPLACE.ME', 'owner@example.test'))
  await d.exec(read('supabase/security/07_replies.sql'))
  assert.equal((await undo(d, 'r1-email')).result, 'undone')
  await d.exec(read('supabase/security/93_rollback_replies.sql'))
  assert.equal((await d.query(`select to_regclass('public.macri_replies') as t`)).rows[0].t, null)
  assert.equal((await d.query(`select count(*)::int as n from public.crm_clients_v1`)).rows[0].n, 3)
})

// 08_reply_stage_compat.sql: clients created in CRM use "new_inquiry".
test('08: Mark as sent moves a New Inquiry client to Awaiting Response in CRM and Project Wall', async () => {
  const d = await db()
  const res = await markSent(d, 'r3-email', 'c3')
  assert.equal(res.result, 'sent')
  assert.deepEqual(await project(d, 'c3'), { stage: 'awaiting_response', project_stage: 'awaiting_response' })
  assert.equal(texts(await client(d, 'c3'))[0], 'Inquiry reply marked sent by Saul (email). Stage updated to Awaiting Response.')
  const r = await reply(d, 'r3-email')
  assert.deepEqual([r.stage_before, r.stage_after, r.project_stage_before, r.project_stage_after], ['new_inquiry', 'awaiting_response', 'new_inquiry', 'awaiting_response'])
})

test('08: Undo restores both fields when unchanged', async () => {
  const d = await db()
  await markSent(d, 'r3-email', 'c3')
  await undo(d, 'r3-email')
  assert.deepEqual(await project(d, 'c3'), { stage: 'new_inquiry', project_stage: 'new_inquiry' })
  assert.equal(texts(await client(d, 'c3'))[0], 'Sent confirmation undone by Saul. Stage returned to New Inquiry.')
})

test('08: Undo leaves a field alone if it changed after the confirmation', async () => {
  const d = await db()
  await markSent(d, 'r3-email', 'c3')
  await d.query(`update public.crm_clients_v1 set project_stage = 'consultation_scheduled' where id = 'c3'`)
  await undo(d, 'r3-email')
  assert.deepEqual(await project(d, 'c3'), { stage: 'new_inquiry', project_stage: 'consultation_scheduled' })
  assert.match(texts(await client(d, 'c3'))[0], /Project Wall stage left at consultation_scheduled because it changed after the confirmation\./)
})

test('08: "Inquiry" clients behave exactly as before; other stages are not moved', async () => {
  const d = await db()
  await markSent(d, 'r1-email', 'c1')
  assert.equal((await project(d, 'c1')).stage, 'Inquiry Response')
  await d.query(`update public.crm_clients_v1 set stage = 'active_dialogue', project_stage = 'active_dialogue' where id = 'c3'`)
  await markSent(d, 'r3-email', 'c3')
  assert.deepEqual(await project(d, 'c3'), { stage: 'active_dialogue', project_stage: 'active_dialogue' })
})

test('08 rollback: rerunning 07 restores the previous behavior (New Inquiry not moved)', async () => {
  const d = await db()
  await d.exec(read('supabase/security/07_replies.sql'))
  await markSent(d, 'r3-email', 'c3')
  assert.deepEqual(await project(d, 'c3'), { stage: 'new_inquiry', project_stage: 'new_inquiry' })
})
