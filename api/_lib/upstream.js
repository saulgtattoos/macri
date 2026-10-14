// Calls to paid services. Keys come only from server env (never VITE_).

export const CLAUDE_MODELS = new Set(['claude-sonnet-4-20250514', 'claude-sonnet-4-6'])
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514'
export const MAX_CLAUDE_TOKENS = 2000

export const VOICE_ID = 'Q2Qd4P9qaDNuBFUcFCQr'
export const TTS_MODELS = new Set(['eleven_multilingual_v2', 'eleven_turbo_v2'])
export const STT_MODEL = 'scribe_v2'

export class NotConfiguredError extends Error {}

function key(name) {
  const v = process.env[name]
  if (!v) throw new NotConfiguredError(`${name} is not set`)
  return v
}

export function callAnthropic(payload) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  })
}

export function callTts({ text, model_id, voice_settings }) {
  const body = { text, model_id }
  if (voice_settings) body.voice_settings = voice_settings
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': key('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function callStt(bytes, mimeType) {
  const ext = mimeType.startsWith('audio/mp4') ? 'mp4' : 'webm'
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: mimeType }), `recording.${ext}`)
  form.append('model_id', STT_MODEL)
  return fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key('ELEVENLABS_API_KEY') },
    body: form,
  })
}

export async function sendAudio(res, upstream) {
  const buf = Buffer.from(await upstream.arrayBuffer())
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(buf)
}
