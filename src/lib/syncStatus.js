// Tracks database problems so the app never presents a device only save as a
// database save. Services report here; SyncStatusBanner shows the result.

const TABLE_LABELS = {
  crm_clients_v1: 'Clients',
  sessions_v4: 'Finance sessions',
  macri_expenses: 'Expenses',
  macri_finance_goals: 'Finance goals',
  macri_inventory: 'Inventory',
  macri_cart: 'Cart',
  macri_colorlab_inks: 'Color Lab inks',
  macri_colorlab_palettes: 'Color Lab palettes',
  macri_colorlab_brands: 'Color Lab brands',
  macri_content_drafts: 'Content drafts',
  macri_content_hashtags: 'Content hashtags',
  macri_session_prep: 'Session prep',
  macri_agent_queue: 'Agent queue',
  studio_inventory_v1: 'Studio inventory',
  studio_cart_v1: 'Studio cart',
}

export function tableLabel(table) {
  return TABLE_LABELS[table] || table
}

// Kept on the device so the warning survives reloads and navigation. The key starts with
// macri_, so deviceCache wipes it with the rest of the device copy at sign out.
const ISSUES_KEY = 'macri_sync_issues'

function readStored() {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(ISSUES_KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

function store(list) {
  try {
    if (list.length) globalThis.localStorage?.setItem(ISSUES_KEY, JSON.stringify(list))
    else globalThis.localStorage?.removeItem(ISSUES_KEY)
  } catch { /* storage unavailable: the in memory list still drives the banner */ }
}

const listeners = new Set()
let issues = readStored()

// kind: 'save' | 'delete' | 'load' | 'local-only'
export function reportSyncIssue({ kind, table, message }) {
  const key = `${kind}:${table}`
  const issue = { key, kind, table, label: tableLabel(table), message: String(message || ''), at: Date.now() }
  issues = [issue, ...issues.filter(i => i.key !== key)]
  store(issues)
  listeners.forEach(fn => fn(issues))
}

// A table loaded from the database again: its "load failed" and "showing device copy"
// warnings are stale. Unsynced saves and deletes stay listed (that data is still device only).
export function resolveLoadIssues(table) {
  const next = issues.filter(i => !(i.table === table && (i.kind === 'load' || i.kind === 'local-only')))
  if (next.length === issues.length) return
  issues = next
  store(issues)
  listeners.forEach(fn => fn(issues))
}

export function clearSyncIssues() {
  issues = []
  store(issues)
  listeners.forEach(fn => fn(issues))
}

export function subscribeSyncIssues(fn) {
  // Pick up a wipe done elsewhere (sign out, account change) before reporting.
  if (issues.length && readStored().length === 0) issues = []
  listeners.add(fn)
  fn(issues)
  return () => listeners.delete(fn)
}

// Message for screens that confirm a save. Device only saves are labeled as such.
export function savedMessage(result, what) {
  return result?.ok ? `${what} saved` : `${what} saved on this device only. Not saved to the database.`
}

export async function allOk(promises) {
  const results = await Promise.all(promises)
  return { ok: results.every(r => r?.ok) }
}
