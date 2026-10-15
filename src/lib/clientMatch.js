// Which CRM client a reply belongs to. Never picks an existing client by first name alone.
//   existing: exactly one client has this email and nothing points to a different client
//   new:      no client matches by email, phone or name
//   choose:   anything else; Saul picks a candidate or a new client
// Pure function: no browser or database access.

const normEmail = (v) => String(v || '').trim().toLowerCase()
const normName = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
const firstName = (v) => normName(v).split(' ')[0] || ''
const phoneKey = (v) => {
  const d = String(v || '').replace(/\D/g, '')
  return d.length >= 7 ? d.slice(-10) : ''
}

export function matchClient(clients, inquiry = {}) {
  const email = normEmail(inquiry.email)
  const name = normName(inquiry.name)
  const first = firstName(inquiry.name)
  const phone = phoneKey(inquiry.phone)

  const reasons = new Map() // client id -> Set of reasons
  const add = (c, why) => {
    if (!reasons.has(c.id)) reasons.set(c.id, new Set())
    reasons.get(c.id).add(why)
  }
  for (const c of clients || []) {
    if (!c?.id) continue
    if (email && normEmail(c.email) === email) add(c, 'email')
    if (phone && phoneKey(c.phone) === phone) add(c, 'phone')
    if (name && normName(c.name) === name) add(c, 'full name')
    else if (first && firstName(c.name) === first) add(c, 'first name')
  }

  const byId = new Map((clients || []).map((c) => [c.id, c]))
  const candidates = [...reasons.entries()].map(([id, why]) => ({ client: byId.get(id), reasons: [...why] }))
  const has = (cand, why) => cand.reasons.includes(why)
  const emailMatches = candidates.filter((cand) => has(cand, 'email'))

  if (emailMatches.length === 1) {
    const match = emailMatches[0]
    // A different client with the same phone or the same full name is a conflict. A different
    // client who only shares the first name is not.
    const conflict = candidates.some((cand) => cand !== match && (has(cand, 'phone') || has(cand, 'full name')))
    if (!conflict) return { decision: 'existing', client: match.client, candidates }
  }
  if (candidates.length === 0) return { decision: 'new', candidates }
  return { decision: 'choose', candidates }
}
