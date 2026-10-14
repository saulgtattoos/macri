// Runs the exact TEST project setup sequence (structure from live, lockdown, daily brief,
// rate limits, owner access, daily brief lockdown, synthetic seed) in PGlite configured like
// a fresh Supabase project (default grants to anon/authenticated), then checks access.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const file = p => readFileSync(new URL(`../../supabase/${p}`, import.meta.url), 'utf8')
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const LISTED = [
  'crm_clients_v1', 'sessions_v4', 'macri_agent_queue', 'macri_cart', 'macri_colorlab_brands',
  'macri_colorlab_inks', 'macri_colorlab_palettes', 'macri_content_drafts', 'macri_content_hashtags',
  'macri_expenses', 'macri_finance_goals', 'macri_inventory', 'macri_session_prep',
  'studio_cart_v1', 'studio_inventory_v1',
]
const UNLISTED = ['consultations', 'consultation_references']

async function freshSupabaseLike() {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    insert into auth.users values ('${OWNER}', 'test.owner@example.test'), ('${OTHER}', 'test.other@example.test');
  `)
  return db
}

async function as(db, role, sub, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`)
  try { return await fn() } finally { await db.exec('reset role') }
}
async function attempt(p) { try { return { ok: true, r: await p } } catch (e) { return { ok: false, e: e.message } } }

async function setup() {
  const db = await freshSupabaseLike()
  await db.exec(file('test/01_structure.sql'))
  await db.exec(file('security/05_resume_lockdown.sql'))
  await db.exec(file('test/02_get_daily_brief.sql'))
  await db.exec(file('security/01_rate_limits.sql'))
  await db.exec(file('security/02_owner_access.sql').replace('owner.email@REPLACE.ME', 'test.owner@example.test'))
  await db.exec(file('security/03_daily_brief.sql'))
  await db.exec(file('test/03_seed_synthetic.sql'))
  return db
}

test('test project setup runs in order and is repeatable', async () => {
  const db = await setup()
  await db.exec(file('test/03_seed_synthetic.sql'))
  const n = await db.query('select count(*)::int as n from public.crm_clients_v1')
  assert.equal(n.rows[0].n, 3)
})

test('test project: owner reads every listed table and the daily brief shows today', async () => {
  const db = await setup()
  for (const t of LISTED) {
    const r = await as(db, 'authenticated', OWNER, () => db.query(`select * from public.${t}`))
    assert.ok(r.rows.length > 0, `owner sees rows in ${t}`)
  }
  const brief = await as(db, 'authenticated', OWNER, () => db.query('select public.get_daily_brief() as b'))
  assert.equal(brief.rows[0].b.overview.appointments_count, 1)
  assert.equal(Number(brief.rows[0].b.overview.projected_revenue), 500)
  assert.equal(brief.rows[0].b.overview.pending_intake_forms, 1)
})

test('test project: anon and non owner get nothing; unlisted tables stay locked even for owner', async () => {
  const db = await setup()
  for (const t of [...LISTED, ...UNLISTED]) {
    assert.equal((await as(db, 'anon', null, () => attempt(db.query(`select * from public.${t}`)))).ok, false, `anon ${t}`)
  }
  for (const t of LISTED) {
    const r = await as(db, 'authenticated', OTHER, () => db.query(`select * from public.${t}`))
    assert.equal(r.rows.length, 0, `other ${t}`)
  }
  for (const t of UNLISTED) {
    assert.equal((await as(db, 'authenticated', OWNER, () => attempt(db.query(`select * from public.${t}`)))).ok, false, `owner ${t}`)
  }
  assert.equal((await as(db, 'anon', null, () => attempt(db.query('select public.get_daily_brief()')))).ok, false)
  const other = await as(db, 'authenticated', OTHER, () => db.query('select public.get_daily_brief() as b'))
  assert.equal(other.rows[0].b.overview.appointments_count, 0)
})

test('test project: owner can create, edit and delete in listed tables, including uuid tables', async () => {
  const db = await setup()
  await as(db, 'authenticated', OWNER, async () => {
    await db.query(`insert into public.crm_clients_v1 (id, name) values ('test-client-9', 'Test Client Nine')`)
    await db.query(`update public.crm_clients_v1 set stage = 'Inquiry' where id = 'test-client-9'`)
    await db.query(`delete from public.crm_clients_v1 where id = 'test-client-9'`)
    await db.query(`insert into public.studio_inventory_v1 (item_name, category) values ('Synthetic towels', 'Supplies')`)
  })
})
