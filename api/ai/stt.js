// Owner only speech to text (ElevenLabs Scribe). Body: { audio: base64, mimeType }.

import { allowPost, getBody } from '../_lib/http.js'
import { requireOwner } from '../_lib/auth.js'
import { guardOutbound } from '../_lib/environment.js'
import { callStt, NotConfiguredError } from '../_lib/upstream.js'

const MIME_RE = /^audio\/(webm|mp4|ogg|wav|mpeg)(;.*)?$/
const MAX_AUDIO_BYTES = 3_000_000

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  if (!guardOutbound(res, 'ai/stt')) return
  if (!(await requireOwner(req, res))) return

  const body = getBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON' })
  const { audio, mimeType } = body
  if (typeof mimeType !== 'string' || !MIME_RE.test(mimeType)) return res.status(400).json({ error: 'Unsupported audio type' })
  if (typeof audio !== 'string' || !audio) return res.status(400).json({ error: 'audio is required' })

  const bytes = Buffer.from(audio, 'base64')
  if (bytes.length === 0) return res.status(400).json({ error: 'audio is empty' })
  if (bytes.length > MAX_AUDIO_BYTES) return res.status(413).json({ error: 'Recording too large' })

  try {
    const upstream = await callStt(bytes, mimeType.split(';')[0])
    if (!upstream.ok) return res.status(502).json({ error: `Transcription error ${upstream.status}` })
    const data = await upstream.json()
    return res.status(200).json({ text: typeof data.text === 'string' ? data.text : '' })
  } catch (err) {
    if (err instanceof NotConfiguredError) return res.status(500).json({ error: 'Transcription is not configured on the server' })
    return res.status(502).json({ error: 'Transcription failed' })
  }
}
