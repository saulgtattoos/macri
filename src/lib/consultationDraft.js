// Consultation form drafts in browser storage (client page and owner page).
// Health and comfort answers are never written to storage: they live in memory only.
// Drafts carry the time of the last change and expire after a period of inactivity.
// Pure helpers: the caller passes the storage object and the current time.

export const CLIENT_DRAFT_KEY = 'macri_consultation_client_draft'
export const OWNER_DRAFT_KEY = 'macri_consultation_draft'
// Marker (no client data) that this browser is used by the owner, so the client form treats
// it as a shared device. Kept when the owner's data is wiped on sign out.
export const OWNER_DEVICE_KEY = 'macri_owner_device'
export const CHANNEL_NAME = 'macri-consultation'

export const MEMORY_ONLY_FIELDS = [
  'allergies', 'skinConditions', 'medications', 'previousReactions', 'medicalClearance', 'comfortNotes',
]

export const SHARED_DEVICE_MAX_AGE_MS = 2 * 60 * 60 * 1000
export const OWN_DEVICE_MAX_AGE_MS = 2 * 60 * 60 * 1000

// A copy of the form without the memory only fields.
export function withoutMemoryOnly(form) {
  const out = { ...(form || {}) }
  for (const f of MEMORY_ONLY_FIELDS) delete out[f]
  return out
}

// Saves the form (memory only fields removed) with the time of this change.
export function writeDraft(storage, key, form, now = Date.now()) {
  try {
    storage.setItem(key, JSON.stringify({ v: 2, updatedAt: now, data: withoutMemoryOnly(form) }))
    return true
  } catch { return false }
}

// status: 'none' | 'expired' (removed) | 'legacy' (older format, left untouched, never shown) | 'valid'
export function readDraft(storage, key, { now = Date.now(), maxAgeMs } = {}) {
  let raw = null
  try { raw = storage.getItem(key) } catch { return { status: 'none' } }
  if (!raw) return { status: 'none' }
  let parsed
  try { parsed = JSON.parse(raw) } catch { return { status: 'legacy' } }
  if (!parsed || parsed.v !== 2 || typeof parsed.updatedAt !== 'number') {
    return parsed?.saved === true ? { status: 'saved' } : { status: 'legacy' }
  }
  if (maxAgeMs && now - parsed.updatedAt > maxAgeMs) {
    try { storage.removeItem(key) } catch { /* storage unavailable */ }
    return { status: 'expired' }
  }
  return { status: 'valid', updatedAt: parsed.updatedAt, data: withoutMemoryOnly(parsed.data) }
}

export function clearDraft(storage, key) {
  try { storage.removeItem(key) } catch { /* storage unavailable */ }
}

// Shared device: opened with Client Mode from the owner page, or a browser the owner signs in on.
export function isSharedDevice(storage, openerIsSameOrigin) {
  if (openerIsSameOrigin) return true
  try { return storage.getItem(OWNER_DEVICE_KEY) === '1' } catch { return false }
}

export function ageLabel(updatedAt, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - updatedAt) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.round(mins / 60)
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
}
