// Owner only relay to the n8n Concierge webhook.
// The webhook URL and a shared secret header stay on the server.

import { allowPost, getBody, isStr } from './_lib/http.js'
import { requireOwner } from './_lib/auth.js'

const FIELDS = ['clientId', 'clientName', 'tattooIdea', 'style', 'placement', 'size', 'agentIntakeSummary']

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!(await requireOwner(req, res))) return

  const url = process.env.CONCIERGE_WEBHOOK_URL
  const secret = process.env.CONCIERGE_SECRET
  if (!url || !secret) return res.status(500).json({ message: 'Concierge is not configured on the server' })

  const body = getBody(req)
  if (!body) return res.status(400).json({ message: 'Invalid JSON' })
  const payload = {}
  for (const f of FIELDS) {
    const v = body[f] ?? ''
    if (!isStr(String(v), 10_000)) return res.status(400).json({ message: `${f} is too long` })
    payload[f] = String(v)
  }
  if (!payload.clientId) return res.status(400).json({ message: 'clientId is required' })

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MACRI-Secret': secret },
      body: JSON.stringify(payload),
    })
    const data = await upstream.json().catch(() => ({}))
    return res.status(upstream.ok ? 200 : 502).json(upstream.ok ? data : { message: data?.message ?? `Webhook error ${upstream.status}` })
  } catch {
    return res.status(502).json({ message: 'Concierge request failed' })
  }
}
