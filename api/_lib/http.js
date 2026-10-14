// Shared request helpers for /api functions.
// Files in api/_lib are not deployed as routes (leading underscore).

export function allowPost(req, res) {
  if (req.method === 'POST') return true
  res.setHeader('Allow', 'POST')
  res.status(405).json({ error: 'Method not allowed' })
  return false
}

export function getBody(req) {
  const b = req.body
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b
  if (typeof b === 'string' && b) {
    try { return JSON.parse(b) } catch { return null }
  }
  return {}
}

export function isStr(v, max) {
  return typeof v === 'string' && v.length <= max
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim()
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

// Supabase accepts legacy JWT keys and new sb_ keys in the apikey header.
// Only JWT style keys may also go in Authorization.
export function supabaseKeyHeaders(key) {
  const h = { apikey: key }
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`
  return h
}

export function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
}
