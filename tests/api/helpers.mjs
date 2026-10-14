// Test helpers: fake req/res and a fetch stub that records calls.
// Every network call in these tests goes through the stub; nothing reaches a real service.

export const OWNER_ID = '11111111-1111-4111-8111-111111111111'
export const OTHER_ID = '22222222-2222-4222-8222-222222222222'
export const OWNER_TOKEN = 'owner-token'
export const OTHER_TOKEN = 'other-token'

export function setTestEnv(extra = {}) {
  const env = {
    SUPABASE_URL: 'https://test-project.supabase.local',
    SUPABASE_ANON_KEY: 'sb_publishable_test',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
    OWNER_USER_ID: OWNER_ID,
    ANTHROPIC_API_KEY: 'test-anthropic',
    ELEVENLABS_API_KEY: 'test-elevenlabs',
    AFTERCARE_LINK_SECRET: 'test-link-secret',
    CONCIERGE_WEBHOOK_URL: 'https://n8n.test.local/webhook/concierge',
    CONCIERGE_SECRET: 'test-concierge-secret',
    TWILIO_ACCOUNT_SID: 'ACtest',
    TWILIO_AUTH_TOKEN: 'test-twilio',
    TWILIO_PHONE_NUMBER: '+15555550100',
    RESEND_API_KEY: 're_test',
    ...extra,
  }
  for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) delete process.env[k]
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

export function mockReq({ method = 'POST', headers = {}, body = {}, ip = '203.0.113.7' } = {}) {
  return { method, headers: { 'x-forwarded-for': ip, ...headers }, body, socket: { remoteAddress: ip } }
}

export function ownerHeaders() {
  return { authorization: `Bearer ${OWNER_TOKEN}` }
}

export function mockRes() {
  const res = {
    statusCode: 200, headers: {}, body: undefined, sent: false,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; this.sent = true; return this },
    send(b) { this.body = b; this.sent = true; return this },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
  }
  return res
}

// routes: array of [predicate(url, opts), responder(url, opts) => Response]
export function stubFetch(routes = []) {
  const calls = []
  const authRoute = [
    (url) => url.endsWith('/auth/v1/user'),
    (url, opts) => {
      const auth = opts.headers.Authorization
      if (auth === `Bearer ${OWNER_TOKEN}`) return json({ id: OWNER_ID })
      if (auth === `Bearer ${OTHER_TOKEN}`) return json({ id: OTHER_ID })
      return json({ message: 'invalid' }, 401)
    },
  ]
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), opts })
    for (const [match, respond] of [...routes, authRoute]) {
      if (match(String(url), opts)) return respond(String(url), opts)
    }
    throw new Error(`Unexpected fetch in test: ${url}`)
  }
  return calls
}

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

export function paidCalls(calls) {
  return calls.filter(c => /anthropic\.com|elevenlabs\.io|twilio\.com|resend\.com|n8n\.test/.test(c.url))
}
