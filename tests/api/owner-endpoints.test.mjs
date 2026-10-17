import { test, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import {
  setTestEnv, mockReq, mockRes, stubFetch, json, ownerHeaders, paidCalls, OTHER_TOKEN,
} from './helpers.mjs'

import claude from '../../api/ai/claude.js'
import tts from '../../api/ai/tts.js'
import stt from '../../api/ai/stt.js'
import sendSms from '../../api/send-sms.js'
import sendEmail from '../../api/send-email.js'
import concierge from '../../api/concierge.js'
import aftercareLink from '../../api/aftercare-link.js'
import ownerCheck from '../../api/owner-check.js'

const OWNER_ENDPOINTS = { claude, tts, stt, sendSms, sendEmail, concierge, aftercareLink, ownerCheck }

beforeEach(() => setTestEnv())

for (const [name, handler] of Object.entries(OWNER_ENDPOINTS)) {
  test(`${name}: no token is 401 and nothing paid is called`, async () => {
    const calls = stubFetch()
    const res = mockRes()
    await handler(mockReq({ body: { to: '+15555550123', body: 'hi', subject: 's', text: 'x' } }), res)
    assert.equal(res.statusCode, 401)
    assert.equal(paidCalls(calls).length, 0)
  })

  test(`${name}: invalid token is 401`, async () => {
    const calls = stubFetch()
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer forged' }, body: {} }), res)
    assert.equal(res.statusCode, 401)
    assert.equal(paidCalls(calls).length, 0)
  })

  test(`${name}: signed in non owner is 403`, async () => {
    const calls = stubFetch()
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: `Bearer ${OTHER_TOKEN}` }, body: {} }), res)
    assert.equal(res.statusCode, 403)
    assert.equal(paidCalls(calls).length, 0)
  })

  test(`${name}: missing OWNER_USER_ID fails closed with 500`, async () => {
    setTestEnv({ OWNER_USER_ID: undefined })
    const calls = stubFetch()
    const res = mockRes()
    await handler(mockReq({ headers: ownerHeaders(), body: {} }), res)
    assert.equal(res.statusCode, 500)
    assert.equal(paidCalls(calls).length, 0)
  })

  test(`${name}: GET is 405`, async () => {
    stubFetch()
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: ownerHeaders() }), res)
    assert.equal(res.statusCode, 405)
  })
}

test('claude: owner request is forwarded with the server key and allowed fields only', async () => {
  const calls = stubFetch([[u => u.includes('anthropic.com'), () => json({ content: [{ text: 'ok' }] })]])
  const res = mockRes()
  await claude(mockReq({
    headers: ownerHeaders(),
    body: { model: 'claude-sonnet-4-6', max_tokens: 100, system: 's', messages: [{ role: 'user', content: 'hi' }], extra: 'drop me' },
  }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { content: [{ text: 'ok' }] })
  const call = paidCalls(calls)[0]
  assert.equal(call.opts.headers['x-api-key'], 'test-anthropic')
  assert.deepEqual(Object.keys(JSON.parse(call.opts.body)).sort(), ['max_tokens', 'messages', 'model', 'system'])
})

test('claude: rejects unknown model and oversized max_tokens', async () => {
  const calls = stubFetch()
  for (const body of [
    { model: 'claude-opus-anything', max_tokens: 10, messages: [{ role: 'user', content: 'x' }] },
    { max_tokens: 50000, messages: [{ role: 'user', content: 'x' }] },
    { max_tokens: 10, messages: [] },
  ]) {
    const res = mockRes()
    await claude(mockReq({ headers: ownerHeaders(), body }), res)
    assert.equal(res.statusCode, 400)
  }
  assert.equal(paidCalls(calls).length, 0)
})

test('claude: missing ANTHROPIC_API_KEY returns 500 without calling out', async () => {
  setTestEnv({ ANTHROPIC_API_KEY: undefined })
  const calls = stubFetch()
  const res = mockRes()
  await claude(mockReq({ headers: ownerHeaders(), body: { max_tokens: 10, messages: [{ role: 'user', content: 'x' }] } }), res)
  assert.equal(res.statusCode, 500)
  assert.equal(paidCalls(calls).length, 0)
})

test('tts: always uses the fixed voice id and returns audio', async () => {
  const calls = stubFetch([[u => u.includes('elevenlabs.io/v1/text-to-speech'), () =>
    new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } })]])
  const res = mockRes()
  await tts(mockReq({ headers: ownerHeaders(), body: { text: 'hello', voice_settings: { stability: 0.5, similarity_boost: 0.75 } } }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'audio/mpeg')
  assert.ok(paidCalls(calls)[0].url.endsWith('/21m00Tcm4TlvDq8ikWAM'))
  assert.equal(JSON.parse(paidCalls(calls)[0].opts.body).model_id, 'eleven_multilingual_v2')
})

test('tts: the retired eleven_monolingual_v1 model is refused before any paid call', async () => {
  const calls = stubFetch([])
  const res = mockRes()
  await tts(mockReq({ headers: ownerHeaders(), body: { text: 'hi', model_id: 'eleven_monolingual_v1' } }), res)
  assert.equal(res.statusCode, 400)
  assert.equal(paidCalls(calls).length, 0)
})

test('tts: rejects overlong text and bad settings', async () => {
  const calls = stubFetch()
  for (const body of [{ text: 'x'.repeat(1501) }, { text: 'hi', voice_settings: { stability: 5 } }, { text: 'hi', model_id: 'other' }]) {
    const res = mockRes()
    await tts(mockReq({ headers: ownerHeaders(), body }), res)
    assert.equal(res.statusCode, 400)
  }
  assert.equal(paidCalls(calls).length, 0)
})

test('stt: forwards audio and returns text; rejects bad type and size', async () => {
  const calls = stubFetch([[u => u.includes('speech-to-text'), () => json({ text: 'needles ready' })]])
  let res = mockRes()
  await stt(mockReq({ headers: ownerHeaders(), body: { audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/webm;codecs=opus' } }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { text: 'needles ready' })
  assert.equal(paidCalls(calls).length, 1)

  res = mockRes()
  await stt(mockReq({ headers: ownerHeaders(), body: { audio: 'abc', mimeType: 'video/mp4' } }), res)
  assert.equal(res.statusCode, 400)

  res = mockRes()
  await stt(mockReq({ headers: ownerHeaders(), body: { audio: Buffer.alloc(3_000_001).toString('base64'), mimeType: 'audio/webm' } }), res)
  assert.equal(res.statusCode, 413)
  assert.equal(paidCalls(calls).length, 1)
})

test('send-sms: owner with invalid number is 400 and nothing is sent', async () => {
  const calls = stubFetch()
  const res = mockRes()
  await sendSms(mockReq({ headers: ownerHeaders(), body: { to: '12', body: 'hello' } }), res)
  assert.equal(res.statusCode, 400)
  assert.equal(paidCalls(calls).length, 0)
})

test('send-sms: owner with valid input reaches Twilio (stubbed)', async () => {
  const calls = stubFetch([[u => u.includes('twilio.com'), () => json({ sid: 'SMtest' }, 201)]])
  const res = mockRes()
  await sendSms(mockReq({ headers: ownerHeaders(), body: { to: '(555) 555 0123', body: 'hello' } }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(paidCalls(calls).length, 1)
})

test('send-email: owner with bad recipient is 400', async () => {
  const calls = stubFetch()
  for (const to of ['not-an-email', 'a@b.co, c@d.co', 'x'.repeat(260) + '@a.co']) {
    const res = mockRes()
    await sendEmail(mockReq({ headers: ownerHeaders(), body: { to, subject: 'Hi', body: 'Body' } }), res)
    assert.equal(res.statusCode, 400)
  }
  assert.equal(paidCalls(calls).length, 0)
})

test('send-email: success returns the Resend id (accepted, not delivered); failure returns no success', async () => {
  const ok = stubFetch([[u => u.includes('resend.com'), () => json({ id: 're_test_123' })]])
  const res = mockRes()
  await sendEmail(mockReq({ headers: ownerHeaders(), body: { to: 'synthetic@example.test', subject: 'Hi', body: 'Body' } }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true, id: 're_test_123' })
  assert.equal(paidCalls(ok).length, 1)

  stubFetch([[u => u.includes('resend.com'), () => json({ name: 'validation_error', message: 'Invalid from address' }, 422)]])
  const bad = mockRes()
  await sendEmail(mockReq({ headers: ownerHeaders(), body: { to: 'synthetic@example.test', subject: 'Hi', body: 'Body' } }), bad)
  assert.equal(bad.statusCode, 500)
  assert.equal(bad.body.success, undefined)
})

test('concierge: forwards allowed fields with the shared secret header', async () => {
  const calls = stubFetch([[u => u.includes('n8n.test'), () => json({ message: 'queued' })]])
  const res = mockRes()
  await concierge(mockReq({ headers: ownerHeaders(), body: { clientId: 'c1', clientName: 'Test Client', injected: 'x' } }), res)
  assert.equal(res.statusCode, 200)
  const call = paidCalls(calls)[0]
  assert.equal(call.opts.headers['X-MACRI-Secret'], 'test-concierge-secret')
  assert.equal(JSON.parse(call.opts.body).injected, undefined)
})

test('concierge: missing secret fails closed', async () => {
  setTestEnv({ CONCIERGE_SECRET: undefined })
  const calls = stubFetch()
  const res = mockRes()
  await concierge(mockReq({ headers: ownerHeaders(), body: { clientId: 'c1' } }), res)
  assert.equal(res.statusCode, 500)
  assert.equal(paidCalls(calls).length, 0)
})

test('aftercare-link: owner gets a signed path; bad input is 400', async () => {
  stubFetch()
  let res = mockRes()
  await aftercareLink(mockReq({ headers: ownerHeaders(), body: { sessionId: 's-123', name: 'Ana', style: 'Watercolor', placement: 'forearm', date: '2026-10-01', film: true } }), res)
  assert.equal(res.statusCode, 200)
  assert.match(res.body.path, /^\/care\/s-123\?name=Ana&style=Watercolor&placement=forearm&date=2026-10-01&film=true&exp=\d+&sig=[\w-]+$/)

  res = mockRes()
  await aftercareLink(mockReq({ headers: ownerHeaders(), body: { sessionId: '../etc', date: '2026-10-01' } }), res)
  assert.equal(res.statusCode, 400)
})

test('owner-check: owner gets 200', async () => {
  stubFetch()
  const res = mockRes()
  await ownerCheck(mockReq({ headers: ownerHeaders() }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { owner: true })
})
