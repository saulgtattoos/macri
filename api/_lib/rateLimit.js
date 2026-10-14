// Abuse limits for public paid requests.
// Counters live in Supabase (public.consume_rate_limit, callable only by the
// service role). If the store is unreachable or not configured, requests are
// refused: paid calls fail closed.

import { createHmac } from 'node:crypto'
import { supabaseKeyHeaders, supabaseUrl } from './http.js'

export class RateLimitUnavailable extends Error {}

export async function consume(bucket, windowSeconds, limit) {
  const url = supabaseUrl()
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !service) throw new RateLimitUnavailable('rate limit store not configured')

  let r
  try {
    r = await fetch(`${url}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      headers: { ...supabaseKeyHeaders(service), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_bucket: bucket, p_window_seconds: windowSeconds, p_limit: limit }),
    })
  } catch {
    throw new RateLimitUnavailable('rate limit store unreachable')
  }
  if (!r.ok) throw new RateLimitUnavailable(`rate limit store error ${r.status}`)
  return (await r.json()) === true
}

// Runs every rule in order. Returns the first rule name that is over its limit, or null.
export async function consumeAll(rules) {
  for (const rule of rules) {
    const allowed = await consume(rule.bucket, rule.windowSeconds, rule.limit)
    if (!allowed) return rule.name
  }
  return null
}

// Raw IPs are never stored; buckets use a keyed hash.
export function hashIp(ip, secret) {
  return createHmac('sha256', secret).update(`ip:${ip}`).digest('base64url').slice(0, 22)
}
