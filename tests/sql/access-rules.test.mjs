// Runs supabase/security/*.sql against an in-memory Postgres (PGlite) set up like Supabase:
// anon, authenticated and service_role roles, auth.users, auth.uid() from the JWT subject,
// default grants to the API roles, and a leftover "allow all" policy. No real project is touched.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const SQL_DIR = new URL('../../supabase/security/', import.meta.url)
const sqlFile = name => readFileSync(new URL(name, SQL_DIR), 'utf8')

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const OWNER_EMAIL = 'owner@example.test'
const TABLES = [
  'crm_clients_v1', 'sessions_v4',
  'macri_agent_queue', 'macri_cart', 'macri_colorlab_brands', 'macri_colorlab_inks',
  'macri_colorlab_palettes', 'macri_content_drafts', 'macri_content_hashtags',
  'macri_expenses', 'macri_finance_goals', 'macri_inventory', 'macri_session_prep',
  'studio_cart_v1', 'studio_inventory_v1',
]

async function supabaseLikeDb() {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    insert into auth.users values ('${OWNER}', '${OWNER_EMAIL}'), ('${OTHER}', 'other@example.test');
  `)
  for (const t of TABLES) {
    await db.exec(`create table public.${t} (id text primary key, note text);
                   insert into public.${t} values ('synthetic-1', 'synthetic row');`)
  }
  await db.exec(`
    grant all on all tables in schema public to anon, authenticated, service_role;
    alter table public.crm_clients_v1 enable row level security;
    create policy "allow all" on public.crm_clients_v1 for all using (true) with check (true);
    create function public.get_daily_brief() returns json language sql security definer as
      $$ select json_build_object('clients', (select count(*) from public.crm_clients_v1)) $$;
    grant execute on function public.get_daily_brief() to anon, authenticated;
  `)
  return db
}

async function addExtraObjects(db) {
  await db.exec(`
    create table public.unlisted_table (id serial primary key, note text);
    insert into public.unlisted_table (note) values ('synthetic');
    create view public.clients_view as select * from public.crm_clients_v1;
    create function public.leak_clients() returns bigint language sql security definer as
      $$ select count(*) from public.crm_clients_v1 $$;
    grant all on all tables in schema public to anon, authenticated, service_role;
    grant all on all sequences in schema public to anon, authenticated;
    grant execute on function public.leak_clients() to anon, authenticated;
  `)
}

async function applyAll(db) {
  await db.exec(sqlFile('01_rate_limits.sql'))
  await db.exec(sqlFile('02_owner_access.sql').replace('owner.email@REPLACE.ME', OWNER_EMAIL))
  await db.exec(sqlFile('03_daily_brief.sql'))
}

// Runs fn as an API role, like PostgREST does, then resets.
async function as(db, role, sub, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`)
  try { return await fn() } finally { await db.exec('reset role') }
}

async function attempt(promise) {
  try { return { ok: true, result: await promise } } catch (err) { return { ok: false, error: err.message } }
}

test('before the rules: anon can read everything (baseline the rules must change)', async () => {
  const db = await supabaseLikeDb()
  const r = await as(db, 'anon', null, () => db.query('select * from public.crm_clients_v1'))
  assert.equal(r.rows.length, 1)
})

test('anon: no table access, no daily brief, no rate limit function', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  for (const t of TABLES) {
    const read = await as(db, 'anon', null, () => attempt(db.query(`select * from public.${t}`)))
    assert.equal(read.ok, false, `anon read ${t}`)
    assert.match(read.error, /permission denied/)
    const write = await as(db, 'anon', null, () => attempt(db.query(`insert into public.${t} values ('x', 'x')`)))
    assert.equal(write.ok, false, `anon write ${t}`)
  }
  assert.equal((await as(db, 'anon', null, () => attempt(db.query('select public.get_daily_brief()')))).ok, false)
  assert.equal((await as(db, 'anon', null, () => attempt(db.query(`select public.consume_rate_limit('b', 60, 5)`)))).ok, false)
})

test('signed in non owner: sees nothing and cannot write (leftover allow all policy removed)', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  for (const t of TABLES) {
    const read = await as(db, 'authenticated', OTHER, () => db.query(`select * from public.${t}`))
    assert.equal(read.rows.length, 0, `other read ${t}`)
    const write = await as(db, 'authenticated', OTHER, () => attempt(db.query(`insert into public.${t} values ('x', 'x')`)))
    assert.equal(write.ok, false, `other write ${t}`)
    assert.match(write.error, /row-level security/)
    const upd = await as(db, 'authenticated', OTHER, () => db.query(`update public.${t} set note = 'hacked'`))
    assert.equal(upd.affectedRows, 0, `other update ${t}`)
  }
  const brief = await as(db, 'authenticated', OTHER, () => db.query('select public.get_daily_brief() as b'))
  assert.equal(brief.rows[0].b.clients, 0)
  const policies = await db.query(`select policyname from pg_policies where tablename = 'crm_clients_v1'`)
  assert.deepEqual(policies.rows.map(r => r.policyname), ['owner_all'])
})

test('owner: full read and write on every table, daily brief works', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  for (const t of TABLES) {
    const read = await as(db, 'authenticated', OWNER, () => db.query(`select * from public.${t}`))
    assert.equal(read.rows.length, 1, `owner read ${t}`)
    await as(db, 'authenticated', OWNER, async () => {
      await db.query(`insert into public.${t} values ('synthetic-2', 'new')`)
      await db.query(`update public.${t} set note = 'edited' where id = 'synthetic-2'`)
      await db.query(`delete from public.${t} where id = 'synthetic-2'`)
    })
  }
  const brief = await as(db, 'authenticated', OWNER, () => db.query('select public.get_daily_brief() as b'))
  assert.equal(brief.rows[0].b.clients, 1)
})

test('owner table and helper are not readable by API users', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  const r = await as(db, 'authenticated', OWNER, () => attempt(db.query('select * from private.app_owner')))
  assert.equal(r.ok, false)
  const lim = await as(db, 'authenticated', OWNER, () => attempt(db.query('select * from private.rate_limits')))
  assert.equal(lim.ok, false)
})

test('rate limit: only the service role can count; limit enforced per bucket', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  assert.equal((await as(db, 'authenticated', OWNER, () => attempt(db.query(`select public.consume_rate_limit('b', 60, 2)`)))).ok, false)
  const results = []
  for (let i = 0; i < 3; i++) {
    const r = await as(db, 'service_role', null, () => db.query(`select public.consume_rate_limit('aftercare:test', 3600, 2) as ok`))
    results.push(r.rows[0].ok)
  }
  assert.deepEqual(results, [true, true, false])
  const other = await as(db, 'service_role', null, () => db.query(`select public.consume_rate_limit('aftercare:other', 3600, 2) as ok`))
  assert.equal(other.rows[0].ok, true)
})

test('owner script is safe to run twice', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  await applyAll(db)
  const read = await as(db, 'authenticated', OWNER, () => db.query('select * from public.crm_clients_v1'))
  assert.equal(read.rows.length, 1)
})

test('owner script with an unknown email changes nothing (whole script rolls back)', async () => {
  const db = await supabaseLikeDb()
  await db.exec(sqlFile('01_rate_limits.sql'))
  const r = await attempt(db.exec(sqlFile('02_owner_access.sql').replace('owner.email@REPLACE.ME', 'nobody@example.test')))
  assert.equal(r.ok, false)
  assert.match(r.error, /exactly one owner/)
  await db.exec('rollback').catch(() => {})
  const policies = await db.query(`select policyname from pg_policies where tablename = 'crm_clients_v1'`)
  assert.deepEqual(policies.rows.map(p => p.policyname), ['allow all'])
  const rls = await db.query(`select relrowsecurity from pg_class where relname = 'sessions_v4'`)
  assert.equal(rls.rows[0].relrowsecurity, false)
})

test('emergency lockdown keeps everything restricted, owner included; rerunning 02 restores owner', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  await db.exec(sqlFile('90_emergency_lockdown.sql'))
  for (const t of TABLES) {
    const owner = await as(db, 'authenticated', OWNER, () => db.query(`select * from public.${t}`))
    assert.equal(owner.rows.length, 0, `owner after lockdown ${t}`)
    const anon = await as(db, 'anon', null, () => attempt(db.query(`select * from public.${t}`)))
    assert.equal(anon.ok, false)
    const rls = await db.query(`select relrowsecurity from pg_class where relname = '${t}'`)
    assert.equal(rls.rows[0].relrowsecurity, true)
  }
  const svc = await as(db, 'service_role', null, () => db.query('select * from public.crm_clients_v1'))
  assert.equal(svc.rows.length, 1)
  await db.exec(sqlFile('02_owner_access.sql').replace('owner.email@REPLACE.ME', OWNER_EMAIL))
  const back = await as(db, 'authenticated', OWNER, () => db.query('select * from public.crm_clients_v1'))
  assert.equal(back.rows.length, 1)
})

test('resume lockdown: anon and any signed in user lose all access, incl. views, extra tables, definer functions', async () => {
  const db = await supabaseLikeDb()
  await addExtraObjects(db)
  const before = await as(db, 'anon', null, () => db.query('select * from public.clients_view'))
  assert.equal(before.rows.length, 1)
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  for (const role of [['anon', null], ['authenticated', OWNER], ['authenticated', OTHER]]) {
    for (const obj of [...TABLES, 'unlisted_table', 'clients_view']) {
      const r = await as(db, role[0], role[1], () => attempt(db.query(`select * from public.${obj}`)))
      assert.equal(r.ok, false, `${role.join(':')} read ${obj}`)
    }
    for (const fn of ['public.leak_clients()', 'public.get_daily_brief()']) {
      const r = await as(db, role[0], role[1], () => attempt(db.query(`select ${fn}`)))
      assert.equal(r.ok, false, `${role.join(':')} call ${fn}`)
    }
  }
  const svc = await as(db, 'service_role', null, () => db.query('select * from public.crm_clients_v1'))
  assert.equal(svc.rows.length, 1)
  const grants = await db.query(`select 1 from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated')`)
  assert.equal(grants.rows.length, 0)
})

test('resume lockdown keeps a snapshot of the previous settings (policies, grants, definer flags)', async () => {
  const db = await supabaseLikeDb()
  await addExtraObjects(db)
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  const snap = await db.query(`select kind, object, detail from private.lockdown_snapshot`)
  const has = (kind, object) => snap.rows.some(r => r.kind === kind && r.object === object)
  assert.ok(has('policy', 'crm_clients_v1'))
  assert.ok(has('table_privileges', 'clients_view'))
  assert.ok(has('rls', 'sessions_v4'))
  const fn = snap.rows.find(r => r.kind === 'function' && r.object === 'leak_clients()')
  assert.equal(fn.detail.security_definer, true)
  assert.equal(fn.detail.anon_execute, true)
  const policies = await db.query(`select policyname from pg_policies where tablename = 'crm_clients_v1'`)
  assert.deepEqual(policies.rows.map(r => r.policyname), ['allow all'])
})

test('after lockdown, 01 + 02 + 03 restore owner access only; unlisted objects stay locked', async () => {
  const db = await supabaseLikeDb()
  await addExtraObjects(db)
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  await applyAll(db)
  for (const t of TABLES) {
    const owner = await as(db, 'authenticated', OWNER, () => db.query(`select * from public.${t}`))
    assert.equal(owner.rows.length, 1, `owner read ${t}`)
    await as(db, 'authenticated', OWNER, () => db.query(`insert into public.${t} values ('synthetic-2', 'new')`))
    const other = await as(db, 'authenticated', OTHER, () => db.query(`select * from public.${t}`))
    assert.equal(other.rows.length, 0, `other read ${t}`)
  }
  const brief = await as(db, 'authenticated', OWNER, () => db.query('select public.get_daily_brief() as b'))
  assert.equal(brief.rows[0].b.clients, 2)
  for (const obj of ['unlisted_table', 'clients_view']) {
    const r = await as(db, 'authenticated', OWNER, () => attempt(db.query(`select * from public.${obj}`)))
    assert.equal(r.ok, false, `owner read unlisted ${obj} stays locked until reviewed`)
  }
  const leak = await as(db, 'anon', null, () => attempt(db.query('select public.leak_clients()')))
  assert.equal(leak.ok, false)
})

test('lockdown is safe to run twice', async () => {
  const db = await supabaseLikeDb()
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  const r = await as(db, 'anon', null, () => attempt(db.query('select * from public.crm_clients_v1')))
  assert.equal(r.ok, false)
})

test('rate limit rollback removes only the counter function and table', async () => {
  const db = await supabaseLikeDb()
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  await db.exec(sqlFile('01_rate_limits.sql'))
  await db.exec(sqlFile('91_rollback_rate_limits.sql'))
  const fn = await db.query(`select 1 from pg_proc where proname = 'consume_rate_limit'`)
  assert.equal(fn.rows.length, 0)
  const tbl = await db.query(`select to_regclass('private.rate_limits') as t`)
  assert.equal(tbl.rows[0].t, null)
  const clients = await as(db, 'anon', null, () => attempt(db.query('select * from public.crm_clients_v1')))
  assert.equal(clients.ok, false, 'still locked after rollback')
  const svc = await as(db, 'service_role', null, () => db.query('select count(*)::int n from public.crm_clients_v1'))
  assert.equal(svc.rows[0].n, 1, 'client data untouched')
})

test('preparation state (lockdown + rate limits, no owner access yet) keeps everything locked', async () => {
  const db = await supabaseLikeDb()
  await db.exec(sqlFile('05_resume_lockdown.sql'))
  await db.exec(sqlFile('01_rate_limits.sql'))
  await db.exec(`insert into auth.users values ('33333333-3333-4333-8333-333333333333', 'live.owner@example.test')`)
  for (const role of [['anon', null], ['authenticated', OWNER], ['authenticated', '33333333-3333-4333-8333-333333333333']]) {
    for (const t of TABLES) {
      const r = await as(db, role[0], role[1], () => attempt(db.query(`select * from public.${t}`)))
      assert.equal(r.ok, false, `${role.join(':')} ${t}`)
    }
    const rl = await as(db, role[0], role[1], () => attempt(db.query(`select public.consume_rate_limit('x', 60, 1)`)))
    assert.equal(rl.ok, false, `${role.join(':')} rate limit`)
  }
  const grants = await db.query(`select 1 from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated')`)
  assert.equal(grants.rows.length, 0)
})

// 06_missing_columns.sql adds nullable text columns only: access and data must not change.
const NEW_COLUMNS = {
  macri_expenses: ['vendor', 'payment_method'],
  macri_finance_goals: ['notes'],
  macri_content_drafts: ['style', 'concept', 'meaning', 'client_tag'],
}

test('06 missing columns: keeps rows, policies and grants; runs twice; owner can use new columns, others cannot', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  const policiesBefore = (await db.query(`select tablename, policyname, cmd, roles::text from pg_policies order by 1, 2`)).rows
  const grantsBefore = (await db.query(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' order by 1, 2, 3`)).rows
  await db.exec(sqlFile('06_missing_columns.sql'))
  await db.exec(sqlFile('06_missing_columns.sql'))
  assert.deepEqual((await db.query(`select tablename, policyname, cmd, roles::text from pg_policies order by 1, 2`)).rows, policiesBefore)
  assert.deepEqual((await db.query(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' order by 1, 2, 3`)).rows, grantsBefore)
  for (const [t, cols] of Object.entries(NEW_COLUMNS)) {
    const existing = await db.query(`select id, note from public.${t}`)
    assert.deepEqual(existing.rows, [{ id: 'synthetic-1', note: 'synthetic row' }], `${t} row unchanged`)
    const info = await db.query(`select column_name, is_nullable, data_type from information_schema.columns where table_name = '${t}' and column_name = any($1)`, [cols])
    assert.equal(info.rows.length, cols.length, `${t} columns added`)
    for (const c of info.rows) assert.deepEqual([c.is_nullable, c.data_type], ['YES', 'text'])
    const setList = cols.map(c => `${c} = 'v'`).join(', ')
    const own = await as(db, 'authenticated', OWNER, () => attempt(db.query(`update public.${t} set ${setList} where id = 'synthetic-1'`)))
    assert.equal(own.ok, true, `owner writes new columns on ${t}`)
    const other = await as(db, 'authenticated', OTHER, () => db.query(`update public.${t} set ${setList}`))
    assert.equal(other.affectedRows, 0, `other cannot write ${t}`)
    const anon = await as(db, 'anon', null, () => attempt(db.query(`select ${cols.join(', ')} from public.${t}`)))
    assert.equal(anon.ok, false, `anon cannot read new columns on ${t}`)
  }
})

test('92 rollback removes only the added columns and keeps row level security on', async () => {
  const db = await supabaseLikeDb()
  await applyAll(db)
  await db.exec(sqlFile('06_missing_columns.sql'))
  await db.exec(sqlFile('92_rollback_missing_columns.sql'))
  for (const [t, cols] of Object.entries(NEW_COLUMNS)) {
    const left = await db.query(`select column_name from information_schema.columns where table_name = '${t}' and column_name = any($1)`, [cols])
    assert.equal(left.rows.length, 0)
    assert.equal((await db.query(`select id, note from public.${t}`)).rows.length, 1)
    assert.equal((await db.query(`select relrowsecurity from pg_class where relname = '${t}'`)).rows[0].relrowsecurity, true)
  }
})
