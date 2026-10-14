// Owner check for /api functions.
// The browser sends the Supabase session token as Authorization: Bearer <token>.
// The token is verified with Supabase Auth, then the user id must equal OWNER_USER_ID.

import { supabaseUrl } from './http.js'

export async function verifyOwner(req) {
  const url   = supabaseUrl()
  const anon  = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  const owner = process.env.OWNER_USER_ID || ''
  if (!url || !anon || !owner) {
    return { ok: false, status: 500, error: 'Server auth is not configured' }
  }

  const header = req.headers.authorization || ''
  const match  = /^Bearer\s+(\S+)$/i.exec(header)
  if (!match) return { ok: false, status: 401, error: 'Sign in required' }

  let user
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${match[1]}` },
    })
    if (!r.ok) return { ok: false, status: 401, error: 'Session is invalid or expired' }
    user = await r.json()
  } catch {
    return { ok: false, status: 503, error: 'Could not verify session' }
  }

  if (!user?.id || user.id !== owner) {
    return { ok: false, status: 403, error: 'Not allowed' }
  }
  return { ok: true, user }
}

// Sends the error response and returns null when the caller is not the owner.
export async function requireOwner(req, res) {
  const result = await verifyOwner(req)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return null
  }
  return result.user
}
