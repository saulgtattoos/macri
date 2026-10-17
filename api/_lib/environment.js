// Real outbound actions (email, texts, Concierge, paid AI) run only in the production deployment:
// VERCEL=1 (set by Vercel on every deployment) and VERCEL_ENV exactly 'production'.
// Preview, development, a missing VERCEL_ENV or any other value is blocked before any outside call.
// A local run (no Vercel variables at all) may opt in with MACRI_LOCAL_OUTBOUND=allow; the opt in is
// ignored whenever VERCEL or VERCEL_ENV is present, so it can never switch a Preview on.
// The local runner (scripts/dev-api.mjs) clears VERCEL and VERCEL_ENV, so a local env file that
// claims production cannot enable anything either.

export const OUTBOUND_BLOCKED_MESSAGE = 'Email, texts, Concierge and AI are turned off outside production.'

export class OutboundBlockedError extends Error {}

export function outboundAllowed(env = process.env) {
  if (env.VERCEL === '1' && env.VERCEL_ENV === 'production') return true
  return !env.VERCEL && !env.VERCEL_ENV && env.MACRI_LOCAL_OUTBOUND === 'allow'
}

// Safe label for logs: never echoes an unexpected value.
export function environmentLabel(env = process.env) {
  const v = env.VERCEL_ENV
  if (!v) return env.VERCEL ? 'missing' : 'local'
  return ['production', 'preview', 'development'].includes(v) ? v : 'unrecognized'
}

// Used inside the paid service helpers, so a route that forgets the guard still cannot call out.
export function assertOutboundAllowed() {
  if (!outboundAllowed()) throw new OutboundBlockedError(OUTBOUND_BLOCKED_MESSAGE)
}

// Error bodies match each route's existing shape so the app shows the message.
const BODIES = {
  text: () => ({ error: OUTBOUND_BLOCKED_MESSAGE, code: 'outbound_disabled' }),
  nested: () => ({ error: { message: OUTBOUND_BLOCKED_MESSAGE }, code: 'outbound_disabled' }),
  message: () => ({ message: OUTBOUND_BLOCKED_MESSAGE, code: 'outbound_disabled' }),
  public: () => ({ error: 'unavailable' }),
}

// Call first in a route, before sign in checks or any other network call.
// Logs only the route name and environment label: never the request body or keys.
export function guardOutbound(res, route, shape = 'text') {
  if (outboundAllowed()) return true
  console.warn(`[outbound] blocked ${route} (${environmentLabel()})`)
  res.setHeader('Cache-Control', 'no-store')
  res.status(503).json(BODIES[shape]())
  return false
}
