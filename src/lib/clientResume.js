// Messages between the owner Consultation page and the Client Mode window it opened.
// Resume: nothing is written to shared storage or broadcast; only that one window is told to
// resume, once, within a minute. Other client tabs in the browser stay restricted.
// Every message is checked for both the sending window and the site it came from.

export const RESUME_TTL_MS = 60 * 1000
export const MSG_CLIENT_READY = 'CLIENT_MODE_READY'
export const MSG_RESUME = 'RESUME_CLIENT_DRAFT'
// The owner page (re)loaded: a waiting Client Mode window it opened sends its answers again, so a
// reload loses neither the window (for the "saved" notice) nor the answers kept in memory only.
export const MSG_OWNER_PAGE_READY = 'OWNER_PAGE_READY'
export const MSG_ANSWERS_RESENT = 'CLIENT_FORM_DATA_RESENT'

// Owner side: at most one pending resume, tied to one window.
export function createResumeHandoff({ now = () => Date.now() } = {}) {
  let pending = null   // { win, at }
  return {
    // win: the Client Mode window, or null when the browser blocked it.
    // alreadyOpen: the window was open before this press (its page is loaded and listening).
    // Returns 'blocked' (nothing authorized), 'send' (post MSG_RESUME to win now),
    // or 'pending' (wait for the new window's ready message).
    request(win, { alreadyOpen = false } = {}) {
      pending = null
      if (!win || win.closed) return 'blocked'
      if (alreadyOpen) return 'send'
      pending = { win, at: now() }
      return 'pending'
    },
    // A ready message: true when MSG_RESUME should be sent back to event.source. Honored once,
    // only from the window the request was made for, on this site, within RESUME_TTL_MS.
    onReady(event, ownOrigin) {
      if (!pending || !event?.source || event.source !== pending.win || event.origin !== ownOrigin) return false
      const fresh = now() - pending.at < RESUME_TTL_MS
      pending = null
      return fresh
    },
  }
}

// Client side: a message counts only when it comes from the owner page that opened this
// window, on the same site.
export function isFromOpener(event, win) {
  return !!win.opener && event.source === win.opener && event.origin === win.location.origin
}

// Owner side: a message from a Client Mode window this page opened, on this site. That is the
// current one, or one opened before this page was reloaded (its opener is still this tab).
export function isFromOwnClientWindow(event, ownWin, currentClientWin) {
  if (!event?.source || event.origin !== ownWin.location.origin || event.source === ownWin) return false
  if (event.source === currentClientWin) return true
  try { return event.source.opener === ownWin } catch { return false }
}

// Owner side: only the answers the client form may fill (never artist only fields), as an object.
export function pickClientAnswers(payload, allowedKeys) {
  const out = {}
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return out
  for (const k of allowedKeys) if (Object.hasOwn(payload, k)) out[k] = payload[k]
  return out
}

const isBlank = v => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)
const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Owner side: merges answers sent from Client Mode into the owner's form without losing the
// owner's information.
// - Only allowedKeys are read (owner only fields are never in it).
// - A blank or untouched answer (equal to the form's default) never replaces a filled value.
// - ownerManagedKeys (pricing, deposit, dates) only fill a field the owner left empty.
export function mergeClientAnswers(current, payload, { allowedKeys, defaults = {}, ownerManagedKeys = [] }) {
  const answers = pickClientAnswers(payload, allowedKeys)
  const next = { ...current }
  for (const [k, v] of Object.entries(answers)) {
    const ownerEmpty = isBlank(current[k]) || sameValue(current[k], defaults[k])
    if (isBlank(v) || sameValue(v, defaults[k])) {
      if (ownerEmpty) next[k] = v
      continue
    }
    if (ownerManagedKeys.includes(k) && !ownerEmpty) continue
    next[k] = v
  }
  return next
}

// Owner side: answers sent again after a reload belong to the consultation on screen only when
// the owner form has no name yet or the same client name.
export function sameConsultation(current, payload) {
  const ownerName = typeof current?.name === 'string' ? current.name.trim().toLowerCase() : ''
  const sentName = typeof payload?.name === 'string' ? payload.name.trim().toLowerCase() : ''
  return !ownerName || ownerName === sentName
}

// Client side: where a waiting Client Mode window may send its answers again after the owner page
// reloaded. Only to the owner page on this site that opened it, and only while it waits for that
// owner; anything else (no opener, another site, not waiting, another message) gets nothing.
export function answersResendTarget(message, { waiting, win }) {
  if (message?.type !== MSG_OWNER_PAGE_READY || !waiting) return null
  try { return win.opener && win.opener.location.origin === win.location.origin ? win.opener : null } catch { return null }
}
