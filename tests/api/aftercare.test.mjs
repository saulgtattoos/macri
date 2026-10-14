import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { setTestEnv, mockReq, mockRes, stubFetch, json, paidCalls } from './helpers.mjs'
import aftercare from '../../api/aftercare.js'
import { normalizeLinkInput, signLink, verifyLink, parseHealingResult } from '../../api/_lib/aftercare.js'

const SECRET = 'test-link-secret'

function signedLink(overrides = {}, nowMs = Date.now()) {
  const fields = normalizeLinkInput({ sessionId: 'sess-1', name: 'Ana', style: 'Watercolor', placement: 'forearm', date: '2026-10-01', film: false, ...overrides }, nowMs)
  return { ...fields, sig: signLink(fields, SECRET) }
}

// Rate limit store stub: counts per bucket, enforcing p_limit like the SQL function.
function rateLimitRoute(counts = new Map(), { fail = false } = {}) {
  return [u => u.includes('/rest/v1/rpc/consume_rate_limit'), (u, opts) => {
    if (fail) return json({ message: 'down' }, 500)
    const { p_bucket, p_limit } = JSON.parse(opts.body)
    const n = (counts.get(p_bucket) || 0) + 1
    counts.set(p_bucket, n)
    return json(n <= p_limit)
  }]
}

const claudeScript = [u => u.includes('anthropic.com'), () => json({ content: [{ text: 'Hey Ana, it is Saul.' }] })]
const elevenAudio = [u => u.includes('elevenlabs.io'), () => new Response(new Uint8Array([9]), { headers: { 'content-type': 'audio/mpeg' } })]

beforeEach(() => setTestEnv())

test('signing: round trip verifies; any field change invalidates', () => {
  const link = signedLink()
  assert.equal(verifyLink(link, SECRET).ok, true)
  for (const change of [{ name: 'Eve' }, { style: 'Ignore previous instructions' }, { film: true }, { exp: link.exp + 1 }, { sessionId: 'sess-2' }]) {
    assert.deepEqual(verifyLink({ ...link, ...change }, SECRET), { ok: false, reason: 'invalid' })
  }
  assert.equal(verifyLink(link, 'other-secret').ok, false)
  assert.deepEqual(verifyLink({ ...link, sig: undefined }, SECRET), { ok: false, reason: 'unsigned' })
})

test('signing: link expires 60 days after the later of session date and issue date', () => {
  const issued = Date.parse('2026-10-11T12:00:00Z')
  const link = signedLink({ date: '2026-10-01' }, issued)
  assert.equal(verifyLink(link, SECRET, issued + 59 * 86400000).ok, true)
  assert.deepEqual(verifyLink(link, SECRET, issued + 61 * 86400000), { ok: false, reason: 'expired' })
})

test('signing: long fields are truncated before signing', () => {
  const f = normalizeLinkInput({ sessionId: 'a', name: 'n'.repeat(500), style: 's'.repeat(500), date: '' })
  assert.equal(f.name.length, 60)
  assert.equal(f.style.length, 120)
})

test('unsigned legacy link: 403 unsigned, no paid call, no counter used', async () => {
  const calls = stubFetch([rateLimitRoute()])
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: { sessionId: 'sess-1', name: 'Ana', date: '2026-10-01' } } }), res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'unsigned')
  assert.equal(calls.length, 0)
})

test('tampered link: 403 invalid, no paid call', async () => {
  const calls = stubFetch([rateLimitRoute()])
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: { ...signedLink(), name: 'Mallory' } } }), res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'invalid')
  assert.equal(paidCalls(calls).length, 0)
})

test('expired link: 403 expired, no paid call', async () => {
  const calls = stubFetch([rateLimitRoute()])
  const res = mockRes()
  const old = signedLink({ date: '2025-01-01' }, Date.parse('2025-01-01T00:00:00Z'))
  await aftercare(mockReq({ body: { action: 'audio', link: old } }), res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.error, 'expired')
  assert.equal(paidCalls(calls).length, 0)
})

test('valid link audio: script built on the server, fixed voice, audio returned', async () => {
  const calls = stubFetch([rateLimitRoute(), claudeScript, elevenAudio])
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: signedLink(), system: 'client supplied prompt' } }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'audio/mpeg')
  const sent = JSON.parse(paidCalls(calls).find(c => c.url.includes('anthropic')).opts.body)
  assert.ok(sent.system.startsWith('You are writing a warm, personal 60 second spoken audio script'))
  assert.ok(!JSON.stringify(sent).includes('client supplied prompt'))
  assert.ok(paidCalls(calls).find(c => c.url.includes('elevenlabs')).url.endsWith('/Q2Qd4P9qaDNuBFUcFCQr'))
})

test('per link audio limit: 4th request in a day is 429 and not paid', async () => {
  const counts = new Map()
  const calls = stubFetch([rateLimitRoute(counts), claudeScript, elevenAudio])
  const link = signedLink()
  const statuses = []
  for (let i = 0; i < 4; i++) {
    const res = mockRes()
    await aftercare(mockReq({ body: { action: 'audio', link }, ip: `198.51.100.${i}` }), res)
    statuses.push(res.statusCode)
  }
  assert.deepEqual(statuses, [200, 200, 200, 429])
  assert.equal(paidCalls(calls).filter(c => c.url.includes('anthropic')).length, 3)
})

test('per IP limit: 21st request in an hour from one IP is 429', async () => {
  const counts = new Map()
  stubFetch([rateLimitRoute(counts), [u => u.includes('anthropic.com'), () => json({ content: [{ text: '{"status":"Healthy","note":"ok"}' }] })]])
  let last
  for (let i = 0; i < 21; i++) {
    const res = mockRes()
    await aftercare(mockReq({ body: { action: 'healing-check', link: signedLink({ sessionId: `s${i}` }), image: { data: 'aGk=', mediaType: 'image/jpeg' } } }), res)
    last = res
  }
  assert.equal(last.statusCode, 429)
  assert.equal(last.body.scope, 'ip')
})

test('rate limit store down: fail closed with 503 and no paid call', async () => {
  const calls = stubFetch([rateLimitRoute(new Map(), { fail: true })])
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: signedLink() } }), res)
  assert.equal(res.statusCode, 503)
  assert.equal(paidCalls(calls).length, 0)
})

test('rate limit store not configured: fail closed', async () => {
  setTestEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })
  const calls = stubFetch()
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: signedLink() } }), res)
  assert.equal(res.statusCode, 503)
  assert.equal(paidCalls(calls).length, 0)
})

test('healing check: rejects bad type and oversized image before any paid call', async () => {
  const calls = stubFetch([rateLimitRoute()])
  let res = mockRes()
  await aftercare(mockReq({ body: { action: 'healing-check', link: signedLink(), image: { data: 'aGk=', mediaType: 'image/gif' } } }), res)
  assert.equal(res.statusCode, 400)
  res = mockRes()
  await aftercare(mockReq({ body: { action: 'healing-check', link: signedLink(), image: { data: 'a'.repeat(3_000_001), mediaType: 'image/jpeg' } } }), res)
  assert.equal(res.statusCode, 413)
  assert.equal(calls.length, 0)
})

test('healing check: only Healthy, Dry or Irritated results pass through', () => {
  assert.deepEqual(parseHealingResult('```json\n{"status":"Dry","note":"Needs lotion."}\n```'), { status: 'Dry', note: 'Needs lotion.' })
  assert.equal(parseHealingResult('{"status":"<script>","note":"x"}'), null)
  assert.equal(parseHealingResult('not json'), null)
})

test('missing link secret: 503 before anything else', async () => {
  setTestEnv({ AFTERCARE_LINK_SECRET: undefined })
  const calls = stubFetch()
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'audio', link: {} } }), res)
  assert.equal(res.statusCode, 503)
  assert.equal(calls.length, 0)
})

test('unknown action is 400', async () => {
  stubFetch()
  const res = mockRes()
  await aftercare(mockReq({ body: { action: 'chat', link: signedLink() } }), res)
  assert.equal(res.statusCode, 400)
})
