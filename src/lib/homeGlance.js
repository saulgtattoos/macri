// Calculations behind Home "Your studio at a glance" (spec: Context/spec-home-studio-at-a-glance.md).
// Pure functions: no browser, database, or clock access. Dates are 'YYYY-MM-DD' strings in
// the studio's time zone, passed in by the caller.

import { addDaysISO, weekdayMondayFirst } from './localDate.js'

// Both stage naming schemes in use today; the full stage migration is a separate step.
export const FIRST_INQUIRY_STAGES = ['Inquiry', 'new_inquiry']
const ARCHIVED = new Set(['archived', 'Archive'])

const isDateISO = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())
const dateOf = (v) => v.trim().slice(0, 10)
const amount = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// Clients in the first inquiry stage with no response recorded in MACRI: no reply marked
// sent (sentClientIds) and the journey step "response sent" not ticked.
export function awaitingResponse(clients, sentClientIds = new Set()) {
  return (clients || []).filter((c) =>
    FIRST_INQUIRY_STAGES.includes(c.stage) &&
    !sentClientIds.has(c.id) &&
    !(Array.isArray(c.journeyChecklist) && c.journeyChecklist[1] === true))
}

// Project Wall stages Consult Scheduled and Tattoo Scheduled, archived clients excluded.
export function scheduledCounts(clients) {
  let consults = 0
  let tattoos = 0
  for (const c of clients || []) {
    if (ARCHIVED.has(c.stage)) continue
    if (c.projectStage === 'consultation_scheduled') consults++
    else if (c.projectStage === 'tattoo_scheduled') tattoos++
  }
  return { consults, tattoos, total: consults + tattoos }
}

// Items at or below their low stock level (same rule as Supply Sentry). Items missing a
// quantity or a level are counted separately instead of guessed.
export function lowSupplies(items) {
  let low = 0
  let missing = 0
  for (const it of items || []) {
    const q = parseFloat(it.quantity)
    const t = parseFloat(it.lowStockThreshold)
    if (!Number.isFinite(q) || !Number.isFinite(t)) { missing++; continue }
    if (q <= t) low++
  }
  return { low, missing }
}

// Newest activity entries across all clients. The stored text starts with its own date
// ("Oct 14, 2026 ..."), which is dropped because the date is shown separately.
export function recentActivity(clients, limit = 3) {
  const all = []
  for (const c of clients || []) {
    for (const e of c.activityLog || []) {
      if (!e?.timestamp || !e.text) continue
      all.push({
        id: e.id || `${c.id}-${e.timestamp}`,
        timestamp: e.timestamp,
        clientId: c.id,
        clientName: c.name || 'Unnamed client',
        text: String(e.text).replace(/^[A-Z][a-z]{2} \d{1,2}, \d{4} /, ''),
      })
    }
  }
  return all.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, limit)
}

// Week: Monday through today. Month: the 1st through today. YTD: January 1 through today.
// Future dated records are never included.
export function periodRange(period, todayISO) {
  if (period === 'week') return { start: addDaysISO(todayISO, -weekdayMondayFirst(todayISO)), end: todayISO }
  if (period === 'month') return { start: `${todayISO.slice(0, 7)}-01`, end: todayISO }
  return { start: `${todayISO.slice(0, 4)}-01-01`, end: todayISO }
}

// From client payment records (client.sessions), by session date. Revenue is "amount paid"
// on each session; the separate deposit field is not included; tips are separate.
// avgPerSession is null (unavailable) when there are no sessions in the period.
export function earnings(clients, period, todayISO) {
  const { start, end } = periodRange(period, todayISO)
  let revenue = 0
  let tips = 0
  let sessions = 0
  for (const c of clients || []) {
    for (const s of c.sessions || []) {
      if (!s || typeof s !== 'object' || !isDateISO(s.date)) continue
      const d = dateOf(s.date)
      if (d < start || d > end) continue
      sessions++
      revenue += amount(s.amountPaid)
      tips += amount(s.tip)
    }
  }
  return {
    start, end, sessions, revenue, tips,
    avgPerSession: sessions > 0 ? revenue / sessions : null,
    taxAside: Math.round(revenue * 28) / 100,  // 28% estimate, rounded to cents
  }
}

// Days with at least one session record, for the calendar.
export function sessionDays(clients) {
  const map = {}
  for (const c of clients || []) {
    for (const s of c.sessions || []) {
      if (!s || typeof s !== 'object' || !isDateISO(s.date)) continue
      const key = dateOf(s.date)
      ;(map[key] ||= []).push({ ...s, clientName: c.name || 'Unknown' })
    }
  }
  return map
}
