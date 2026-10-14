// Verifies owner only access on the Supabase TEST project (synthetic data only).
// Usage: npm run check:access   (reads .env.test.local only)
// Refuses to run unless VITE_SUPABASE_TEST_PROJECT=true. Makes no paid API calls.
//
// .env.test.local needs:
//   VITE_SUPABASE_TEST_PROJECT=true, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD,
//   optional TEST_OTHER_EMAIL, TEST_OTHER_PASSWORD (a second, non owner test user),
//   optional CHECK_API_BASE (for example http://127.0.0.1:3001 while npm run dev:api:test runs)

import { createClient } from '@supabase/supabase-js'

const env = process.env
if (env.VITE_SUPABASE_TEST_PROJECT !== 'true' || !env.VITE_SUPABASE_URL) {
  console.error('Refusing to run: .env.test.local must set VITE_SUPABASE_TEST_PROJECT=true and the TEST project URL.')
  process.exit(2)
}

const TABLES = [
  'crm_clients_v1', 'sessions_v4',
  'macri_agent_queue', 'macri_cart', 'macri_colorlab_brands', 'macri_colorlab_inks',
  'macri_colorlab_palettes', 'macri_content_drafts', 'macri_content_hashtags',
  'macri_expenses', 'macri_finance_goals', 'macri_inventory', 'macri_session_prep',
  'studio_cart_v1', 'studio_inventory_v1',
]

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, opts)
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts)

const results = []
const check = (name, pass, detail = '') => results.push({ name, pass, detail })

async function signedIn(email, password) {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, opts)
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign in failed for test user: ${error.message}`)
  return { client: c, token: data.session.access_token }
}

const rowCounts = {}
for (const t of TABLES) {
  const { count, error } = await service.from(t).select('*', { count: 'exact', head: true })
  rowCounts[t] = error ? null : count
  check(`service role can count ${t}`, !error, error?.message || `${count} rows`)
}

for (const t of TABLES) {
  const { data, error } = await anon.from(t).select('*').limit(1)
  check(`anon cannot read ${t}`, !!error || data.length === 0, error ? error.code : `${data.length} rows`)
  if (!error && data.length === 0 && !rowCounts[t]) check(`anon read ${t} is conclusive`, false, 'table has no synthetic rows; seed it')
  const ins = await anon.from(t).insert({})
  check(`anon cannot insert into ${t}`, !!ins.error, ins.error?.code || 'insert succeeded')
}
{
  const { error } = await anon.rpc('get_daily_brief')
  check('anon cannot run get_daily_brief', !!error, error?.code || 'allowed')
  const rl = await anon.rpc('consume_rate_limit', { p_bucket: 'check', p_window_seconds: 60, p_limit: 1 })
  check('anon cannot run consume_rate_limit', !!rl.error, rl.error?.code || 'allowed')
}

let ownerToken = null
try {
  const owner = await signedIn(env.TEST_OWNER_EMAIL, env.TEST_OWNER_PASSWORD)
  ownerToken = owner.token
  for (const t of TABLES) {
    const { data, error } = await owner.client.from(t).select('*').limit(1)
    check(`owner can read ${t}`, !error && (rowCounts[t] ? data.length > 0 : true), error?.message || `${data.length} rows`)
  }
  const brief = await owner.client.rpc('get_daily_brief')
  check('owner can run get_daily_brief', !brief.error, brief.error?.message || 'ok')
  const rl = await owner.client.rpc('consume_rate_limit', { p_bucket: 'check', p_window_seconds: 60, p_limit: 1 })
  check('owner cannot run consume_rate_limit (service role only)', !!rl.error, rl.error?.code || 'allowed')
} catch (err) {
  check('owner sign in', false, err.message)
}

let otherToken = null
if (env.TEST_OTHER_EMAIL) {
  try {
    const other = await signedIn(env.TEST_OTHER_EMAIL, env.TEST_OTHER_PASSWORD)
    otherToken = other.token
    for (const t of TABLES) {
      const { data, error } = await other.client.from(t).select('*').limit(1)
      check(`non owner sees no rows in ${t}`, !!error || data.length === 0, error?.code || `${data.length} rows`)
      // Valid uuid so the request reaches the access rule (42501) instead of failing on id format.
      const ins = await other.client.from(t).insert({ id: crypto.randomUUID() })
      check(`non owner cannot insert into ${t} (blocked by access rule)`, ins.error?.code === '42501', ins.error?.code || 'insert succeeded')
    }
  } catch (err) {
    check('non owner sign in', false, err.message)
  }
}

{
  const bucket = `check-access:${Date.now()}`
  const seen = []
  for (let i = 0; i < 3; i++) {
    const { data, error } = await service.rpc('consume_rate_limit', { p_bucket: bucket, p_window_seconds: 60, p_limit: 2 })
    seen.push(error ? 'error' : data)
  }
  check('rate limit allows 2 then blocks', JSON.stringify(seen) === '[true,true,false]', JSON.stringify(seen))
}

if (env.CHECK_API_BASE) {
  const base = env.CHECK_API_BASE.replace(/\/$/, '')
  const post = (path, token, body = {}) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const linkBody = { sessionId: 'check-1', name: 'Test', style: 'Watercolor', placement: 'forearm', date: '2026-10-01' }
  check('api: no token is 401', (await post('/api/aftercare-link', null, linkBody)).status === 401)
  if (otherToken) check('api: non owner is 403', (await post('/api/aftercare-link', otherToken, linkBody)).status === 403)
  if (ownerToken) {
    const r = await post('/api/aftercare-link', ownerToken, linkBody)
    check('api: owner gets a signed aftercare link', r.status === 200, String(r.status))
  }
}

let failed = 0
for (const r of results) {
  if (!r.pass) failed++
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`)
}
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
