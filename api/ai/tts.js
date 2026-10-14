// Owner only text to speech with Saul's fixed ElevenLabs voice. Returns audio bytes.

import { allowPost, getBody, isStr } from '../_lib/http.js'
import { requireOwner } from '../_lib/auth.js'
import { callTts, sendAudio, TTS_MODELS, NotConfiguredError } from '../_lib/upstream.js'

function validSettings(v) {
  if (v === undefined) return true
  if (!v || typeof v !== 'object') return false
  return Object.entries(v).every(([k, n]) =>
    ['stability', 'similarity_boost'].includes(k) && typeof n === 'number' && n >= 0 && n <= 1)
}

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!(await requireOwner(req, res))) return

  const body = getBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON' })
  const { text, voice_settings } = body
  const model_id = body.model_id ?? 'eleven_monolingual_v1'

  if (!isStr(text, 1500) || !text.trim()) return res.status(400).json({ error: 'text is required (max 1500 characters)' })
  if (!TTS_MODELS.has(model_id)) return res.status(400).json({ error: 'Model not allowed' })
  if (!validSettings(voice_settings)) return res.status(400).json({ error: 'Invalid voice_settings' })

  try {
    const upstream = await callTts({ text, model_id, voice_settings })
    if (!upstream.ok) return res.status(502).json({ error: `Voice service error ${upstream.status}` })
    return sendAudio(res, upstream)
  } catch (err) {
    if (err instanceof NotConfiguredError) return res.status(500).json({ error: 'Voice is not configured on the server' })
    return res.status(502).json({ error: 'Voice request failed' })
  }
}
