// Owner only: creates a signed aftercare link path for a session.

import { allowPost, getBody } from './_lib/http.js'
import { requireOwner } from './_lib/auth.js'
import { linkPath, linkSecret, normalizeLinkInput, signLink } from './_lib/aftercare.js'

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!(await requireOwner(req, res))) return

  const secret = linkSecret()
  if (!secret) return res.status(500).json({ error: 'Aftercare links are not configured on the server' })

  const fields = normalizeLinkInput(getBody(req))
  if (!fields) return res.status(400).json({ error: 'A valid sessionId and date (YYYY-MM-DD) are required' })

  return res.status(200).json({ path: linkPath(fields, signLink(fields, secret)), exp: fields.exp })
}
