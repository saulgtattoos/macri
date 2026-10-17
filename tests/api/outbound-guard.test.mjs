// Production only guard for email, texts, Concierge and paid AI (api/_lib/environment.js).
// Outside production every protected route must refuse before any network call: no sign in check,
// no rate limit counter, no paid service. Production behavior must stay as it was.
import { test, beforeEach, afterEach, vi } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTestEnv, mockReq, mockRes, stubFetch, json, ownerHeaders, paidCalls } from './helpers.mjs'
import { outboundAllowed, environmentLabel, OUTBOUND_BLOCKED_MESSAGE, OutboundBlockedError } from '../../api/_lib/environment.js'
import { callAnthropic, callTts, callStt } from '../../api/_lib/upstream.js'
import { normalizeLinkInput, signLink } from '../../api/_lib/aftercare.js'

import claude from '../../api/ai/claude.js'
import tts from '../../api/ai/tts.js'
import stt from '../../api/ai/stt.js'
import sendSms from '../../api/send-sms.js'
import sendEmail from '../../api/send-email.js'
import concierge from '../../api/concierge.js'
import aftercare from '../../api/aftercare.js'

// Fictional data only. The health text must never appear in a log line.
const HEALTH = 'Synthetic allergy to latex'

function signedLink() {
  const fields = normalizeLinkInput({ sessionId: 'sess-guard', name: 'Test Nova', style: 'Watercolor', placement: 'forearm', date: '2026-10-01' })
  return { ...fields, sig: signLink(fields, 'test-link-secret') }
}

const ok = (body) => () => json(body)
const audio = () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'audio/mpeg' } })
const rateLimit = [u => u.includes('/rest/v1/rpc/consume_rate_limit'), () => json(true)]

// Each protected route: a valid owner (or signed link) request, the providers it reaches in
// production, and the status it returns there.
const ROUTES = {
  'send-email': {
    handler: sendEmail,
    req: () => mockReq({ headers: ownerHeaders(), body: { to: 'test.nova@example.com', subject: 'Hello', body: `Notes: ${HEALTH}` } }),
    providers: [[u => u.includes('resend.com'), ok({ id: 'email_test_1' })]],
    productionStatus: 200,
  },
  'send-sms': {
    handler: sendSms,
    req: () => mockReq({ headers: ownerHeaders(), body: { to: '+15555550123', body: `Notes: ${HEALTH}` } }),
    providers: [[u => u.includes('twilio.com'), ok({ sid: 'SM_test_1' })]],
    productionStatus: 200,
  },
  concierge: {
    handler: concierge,
    req: () => mockReq({ headers: ownerHeaders(), body: { clientId: 'crm_test_1', clientName: 'Test Nova', agentIntakeSummary: HEALTH } }),
    providers: [[u => u.includes('n8n.test'), ok({ received: true })]],
    productionStatus: 200,
  },
  'ai/claude': {
    handler: claude,
    req: () => mockReq({ headers: ownerHeaders(), body: { max_tokens: 50, messages: [{ role: 'user', content: HEALTH }] } }),
    providers: [[u => u.includes('anthropic.com'), ok({ content: [{ text: 'ok' }] })]],
    productionStatus: 200,
  },
  'ai/tts': {
    handler: tts,
    req: () => mockReq({ headers: ownerHeaders(), body: { text: HEALTH } }),
    providers: [[u => u.includes('elevenlabs.io'), audio]],
    productionStatus: 200,
  },
  'ai/stt': {
    handler: stt,
    req: () => mockReq({ headers: ownerHeaders(), body: { audio: Buffer.from('fake audio').toString('base64'), mimeType: 'audio/webm' } }),
    providers: [[u => u.includes('elevenlabs.io'), ok({ text: 'hello' })]],
    productionStatus: 200,
  },
  aftercare: {
    handler: aftercare,
    req: () => mockReq({ body: { action: 'audio', link: signedLink() } }),
    providers: [rateLimit, [u => u.includes('anthropic.com'), ok({ content: [{ text: 'Hey Test Nova' }] })], [u => u.includes('elevenlabs.io'), audio]],
    productionStatus: 200,
  },
}

// VERCEL_ENV values that must block, with VERCEL=1 (a real Vercel deployment).
const BLOCKED_ON_VERCEL = ['preview', 'development', undefined, '', 'Production', 'PRODUCTION', 'prod', ' production', 'production ', 'staging', 'true']

let warn
beforeEach(() => { setTestEnv(); warn = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => warn.mockRestore())

function logText() {
  return warn.mock.calls.map(args => args.join(' ')).join('\n')
}

for (const [name, r] of Object.entries(ROUTES)) {
  test(`${name}: production behaves as before and reaches its provider`, async () => {
    const calls = stubFetch(r.providers)
    const res = mockRes()
    await r.handler(r.req(), res)
    assert.equal(res.statusCode, r.productionStatus)
    assert.ok(paidCalls(calls).length >= 1, 'provider called in production')
    assert.equal(warn.mock.calls.length, 0)
  })

  for (const value of BLOCKED_ON_VERCEL) {
    test(`${name}: VERCEL_ENV=${JSON.stringify(value)} is refused with 503 and no network call at all`, async () => {
      setTestEnv({ VERCEL_ENV: value })
      const calls = stubFetch(r.providers)
      const res = mockRes()
      await r.handler(r.req(), res)
      assert.equal(res.statusCode, 503)
      assert.equal(calls.length, 0, 'no sign in check, no counter, no provider')
      assert.equal(res.headers['cache-control'], 'no-store')
      const log = logText()
      assert.match(log, new RegExp(`^\\[outbound\\] blocked ${name} \\(`))
      for (const secret of [HEALTH, 'Test Nova', 'test-anthropic', 'test-elevenlabs', 're_test', 'test-twilio', 'test-concierge-secret', 'owner-token']) {
        assert.ok(!log.includes(secret), `log must not contain ${secret}`)
      }
      if (value && !['preview', 'development'].includes(value)) assert.ok(!log.includes(value.trim() || 'x'), 'unexpected value not echoed')
    })
  }

  test(`${name}: local run is blocked unless MACRI_LOCAL_OUTBOUND=allow`, async () => {
    setTestEnv({ VERCEL: undefined, VERCEL_ENV: undefined })
    let calls = stubFetch(r.providers)
    let res = mockRes()
    await r.handler(r.req(), res)
    assert.equal(res.statusCode, 503)
    assert.equal(calls.length, 0)

    setTestEnv({ VERCEL: undefined, VERCEL_ENV: undefined, MACRI_LOCAL_OUTBOUND: 'allow' })
    calls = stubFetch(r.providers)
    res = mockRes()
    await r.handler(r.req(), res)
    assert.equal(res.statusCode, r.productionStatus)
    assert.ok(paidCalls(calls).length >= 1)
  })

  test(`${name}: the local opt in never works on a Vercel deployment`, async () => {
    for (const env of [
      { VERCEL: '1', VERCEL_ENV: 'preview', MACRI_LOCAL_OUTBOUND: 'allow' },
      { VERCEL: '1', VERCEL_ENV: undefined, MACRI_LOCAL_OUTBOUND: 'allow' },
      { VERCEL: undefined, VERCEL_ENV: 'development', MACRI_LOCAL_OUTBOUND: 'allow' },
      { VERCEL: undefined, VERCEL_ENV: 'production' },
      { VERCEL: undefined, VERCEL_ENV: 'production', MACRI_LOCAL_OUTBOUND: 'allow' },
    ]) {
      setTestEnv(env)
      const calls = stubFetch(r.providers)
      const res = mockRes()
      await r.handler(r.req(), res)
      assert.equal(res.statusCode, 503, JSON.stringify(env))
      assert.equal(calls.length, 0)
    }
  })
}

test('blocked responses keep each route\'s error shape so the app can show the message', async () => {
  setTestEnv({ VERCEL_ENV: 'preview' })
  stubFetch()
  const shapes = {}
  for (const [name, r] of Object.entries(ROUTES)) {
    const res = mockRes()
    await r.handler(r.req(), res)
    shapes[name] = res.body
  }
  assert.deepEqual(shapes['send-email'], { error: OUTBOUND_BLOCKED_MESSAGE, code: 'outbound_disabled' })
  assert.deepEqual(shapes['ai/claude'], { error: { message: OUTBOUND_BLOCKED_MESSAGE }, code: 'outbound_disabled' })
  assert.deepEqual(shapes.concierge, { message: OUTBOUND_BLOCKED_MESSAGE, code: 'outbound_disabled' })
  assert.deepEqual(shapes.aftercare, { error: 'unavailable' })
})

test('guard rules: only exact production, or an explicit local opt in, allows outbound actions', () => {
  assert.equal(outboundAllowed({ VERCEL: '1', VERCEL_ENV: 'production' }), true)
  // A local file claiming production is not a Vercel deployment.
  assert.equal(outboundAllowed({ VERCEL_ENV: 'production' }), false)
  assert.equal(outboundAllowed({ VERCEL_ENV: 'production', MACRI_LOCAL_OUTBOUND: 'allow' }), false)
  for (const v of ['true', 'yes', '0', '']) assert.equal(outboundAllowed({ VERCEL: v, VERCEL_ENV: 'production' }), false, v)
  assert.equal(outboundAllowed({}), false)
  assert.equal(outboundAllowed({ MACRI_LOCAL_OUTBOUND: 'allow' }), true)
  for (const v of ['yes', 'true', '1', 'ALLOW', ' allow', '']) assert.equal(outboundAllowed({ MACRI_LOCAL_OUTBOUND: v }), false, v)
  for (const v of BLOCKED_ON_VERCEL) assert.equal(outboundAllowed({ VERCEL: '1', VERCEL_ENV: v, MACRI_LOCAL_OUTBOUND: 'allow' }), false, String(v))
  assert.equal(environmentLabel({ VERCEL: '1', VERCEL_ENV: 'preview' }), 'preview')
  assert.equal(environmentLabel({ VERCEL: '1' }), 'missing')
  assert.equal(environmentLabel({}), 'local')
  assert.equal(environmentLabel({ VERCEL: '1', VERCEL_ENV: 'sk-something-odd' }), 'unrecognized')
})

test('paid service helpers refuse outside production even if a route skipped the guard', async () => {
  setTestEnv({ VERCEL_ENV: 'preview' })
  const calls = stubFetch()
  assert.throws(() => callAnthropic({ model: 'x', max_tokens: 1, messages: [] }), OutboundBlockedError)
  assert.throws(() => callTts({ voice_id: 'v', text: 't', model_id: 'm' }), OutboundBlockedError)
  assert.throws(() => callStt(Buffer.from('a'), 'audio/webm'), OutboundBlockedError)
  assert.equal(calls.length, 0)
})

test('the local API runner clears VERCEL and VERCEL_ENV before loading any route', () => {
  const src = readFileSync(new URL('../../scripts/dev-api.mjs', import.meta.url), 'utf8')
  const clearAt = src.indexOf("for (const k of ['VERCEL', 'VERCEL_ENV'])")
  assert.ok(clearAt > 0 && src.slice(clearAt, clearAt + 200).includes('delete process.env[k]'))
  assert.ok(clearAt < src.indexOf('http.createServer'))
})

// Future routes (agents, n8n relays) cannot skip the guard: any route that reaches an outside
// service must call guardOutbound before its sign in check and before the outside call.
test('every route that reaches an outside service calls the guard first', () => {
  const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api')
  const files = []
  const walk = dir => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f)
      if (statSync(p).isDirectory()) { if (f !== '_lib') walk(p) } else if (f.endsWith('.js')) files.push(p)
    }
  }
  walk(apiDir)
  const OUTBOUND = /from 'resend'|new Resend\(|twilio\.com|CONCIERGE_WEBHOOK_URL|callAnthropic\(|callTts\(|callStt\(|\bfetch\(/
  const guarded = []
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    if (!OUTBOUND.test(src)) continue
    const rel = path.relative(apiDir, file)
    const body = src.slice(src.indexOf('export default'))
    const guardAt = body.indexOf('guardOutbound(res')
    assert.ok(guardAt > 0, `${rel} must call guardOutbound`)
    const authAt = body.indexOf('requireOwner(')
    if (authAt > 0) assert.ok(guardAt < authAt, `${rel}: guard before sign in check`)
    const outAt = body.search(OUTBOUND)
    assert.ok(outAt < 0 || guardAt < outAt, `${rel}: guard before the outside call`)
    guarded.push(rel)
  }
  assert.deepEqual(guarded.sort(), ['aftercare.js', 'ai/claude.js', 'ai/stt.js', 'ai/tts.js', 'concierge.js', 'send-email.js', 'send-sms.js'])
})
