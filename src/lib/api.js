// Calls to MACRI's own /api functions. Owner endpoints need the signed in
// session token; paid service keys live only on the server.
import supabase from './supabase'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiPost(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  })
}

// Same request and response shape as Anthropic's Messages API.
export function claudeFetch(body) {
  return apiPost('/api/ai/claude', body)
}

// Body: { text, model_id?, voice_settings? }. Responds with audio bytes.
export function ttsFetch(body) {
  return apiPost('/api/ai/tts', body)
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Responds with { text }.
export async function sttFetch(blob) {
  return apiPost('/api/ai/stt', { audio: await blobToBase64(blob), mimeType: blob.type || 'audio/webm' })
}
