// Owner only: confirms the signed in account is the owner. Used once per device to decide
// whether a device copy saved before login existed may be kept (owner) or must be wiped.

import { allowPost } from './_lib/http.js'
import { requireOwner } from './_lib/auth.js'

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!(await requireOwner(req, res))) return
  return res.status(200).json({ owner: true })
}
