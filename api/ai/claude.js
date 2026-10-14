// Owner only proxy to Anthropic Messages. Response JSON matches Anthropic's shape.

import { allowPost, getBody, isStr } from '../_lib/http.js'
import { requireOwner } from '../_lib/auth.js'
import { callAnthropic, CLAUDE_MODELS, DEFAULT_CLAUDE_MODEL, MAX_CLAUDE_TOKENS, NotConfiguredError } from '../_lib/upstream.js'

const MAX_BODY_CHARS = 4_000_000

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!(await requireOwner(req, res))) return

  const body = getBody(req)
  if (!body) return res.status(400).json({ error: { message: 'Invalid JSON' } })

  const model = body.model ?? DEFAULT_CLAUDE_MODEL
  const maxTokens = body.max_tokens
  const { system, messages } = body

  if (!CLAUDE_MODELS.has(model)) return res.status(400).json({ error: { message: 'Model not allowed' } })
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_CLAUDE_TOKENS) {
    return res.status(400).json({ error: { message: `max_tokens must be 1 to ${MAX_CLAUDE_TOKENS}` } })
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return res.status(400).json({ error: { message: 'messages must be a non empty array' } })
  }
  if (system !== undefined && !isStr(system, 40_000)) {
    return res.status(400).json({ error: { message: 'system must be a string' } })
  }
  const payload = { model, max_tokens: maxTokens, messages }
  if (system) payload.system = system
  if (JSON.stringify(payload).length > MAX_BODY_CHARS) {
    return res.status(413).json({ error: { message: 'Request too large' } })
  }

  try {
    const upstream = await callAnthropic(payload)
    const data = await upstream.json().catch(() => ({ error: { message: 'Bad upstream response' } }))
    return res.status(upstream.status).json(data)
  } catch (err) {
    if (err instanceof NotConfiguredError) return res.status(500).json({ error: { message: 'AI is not configured on the server' } })
    return res.status(502).json({ error: { message: 'AI request failed' } })
  }
}
