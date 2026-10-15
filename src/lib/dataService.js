import supabase from './supabase'
import { reportSyncIssue, resolveLoadIssues } from './syncStatus'
import { MAPS } from './tableMaps'

function lsParseArray(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) return parsed.items
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function lsWriteArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr))
}

export function makeService(tableName, lsKey) {
  const { toDB, fromDB } = MAPS[tableName] || { toDB: (r) => r, fromDB: (r) => r }

  // Resolves to { ok, source, rows, message }; ok is true only for rows from the database.
  async function loadAllResult() {
    try {
      const { data, error } = await supabase.from(tableName).select('*')
      if (!error) {
        if (data && data.length > 0) {
          resolveLoadIssues(tableName)
          return { ok: true, source: 'database', rows: data.map(fromDB) }
        }
        const local = lsParseArray(lsKey)
        if (local.length) {
          const message = 'Database has no rows; showing records saved on this device only.'
          reportSyncIssue({ kind: 'local-only', table: tableName, message })
          return { ok: false, source: 'device', rows: local, message }
        }
        return { ok: true, source: 'database', rows: [] }
      }
      reportSyncIssue({ kind: 'load', table: tableName, message: error.message })
      return { ok: false, source: 'device', rows: lsParseArray(lsKey), message: error.message }
    } catch (err) {
      reportSyncIssue({ kind: 'load', table: tableName, message: err?.message })
      return { ok: false, source: 'device', rows: lsParseArray(lsKey), message: err?.message || 'Could not reach the database' }
    }
  }

  // Falls back to the device copy only when the database fails or has no rows,
  // and reports it so the app labels what is shown as device only.
  async function loadAll() {
    return (await loadAllResult()).rows
  }

  // Writes the device copy immediately, then resolves to { ok } from the database.
  // ok: false means the record exists on this device only.
  function saveRecord(record) {
    const list = lsParseArray(lsKey)
    const idx = list.findIndex((r) => r.id === record.id)
    if (idx >= 0) list[idx] = record
    else list.push(record)
    lsWriteArray(lsKey, list)

    return Promise.resolve()
      .then(() => supabase.from(tableName).upsert(toDB(record)))
      .then(({ error }) => {
        if (!error) return { ok: true }
        console.error(`[MACRI] ${tableName} saveRecord:`, error.message)
        reportSyncIssue({ kind: 'save', table: tableName, message: error.message })
        return { ok: false, error }
      }, (error) => {
        reportSyncIssue({ kind: 'save', table: tableName, message: error?.message })
        return { ok: false, error }
      })
  }

  function deleteRecord(id) {
    lsWriteArray(lsKey, lsParseArray(lsKey).filter((r) => r.id !== id))

    return Promise.resolve()
      .then(() => supabase.from(tableName).delete().eq('id', id))
      .then(({ error }) => {
        if (!error) return { ok: true }
        console.error(`[MACRI] ${tableName} deleteRecord:`, error.message)
        reportSyncIssue({ kind: 'delete', table: tableName, message: error.message })
        return { ok: false, error }
      }, (error) => {
        reportSyncIssue({ kind: 'delete', table: tableName, message: error?.message })
        return { ok: false, error }
      })
  }

  async function seedTable() {
    const list = lsParseArray(lsKey)
    if (!list.length) return 0
    const { error } = await supabase.from(tableName).upsert(list.map(toDB))
    if (error) console.error(`[MACRI] ${tableName} seedTable:`, error.message)
    return list.length
  }

  return { loadAll, loadAllResult, saveRecord, deleteRecord, seedTable }
}

export const sessionsService = makeService('sessions_v4', 'sessions_v4')
export const expensesService = makeService('macri_expenses', 'macri_expenses')
export const goalsService = makeService('macri_finance_goals', 'macri_finance_goals')
export const inventoryService = makeService('macri_inventory', 'macri_inventory')
export const cartService = makeService('macri_cart', 'macri_cart')
export const inksService = makeService('macri_colorlab_inks', 'macri_colorlab_inks')
export const palettesService = makeService('macri_colorlab_palettes', 'macri_colorlab_palettes')
export const brandsService = makeService('macri_colorlab_brands', 'macri_colorlab_brands')
export const draftsService = makeService('macri_content_drafts', 'macri_content_drafts')
export const hashtagsService = makeService('macri_content_hashtags', 'macri_content_hashtags')
export const sessionPrepService = makeService('macri_session_prep', 'macri_session_prep')
export const agentQueueService = makeService('macri_agent_queue', 'macri_agent_queue')
export const studioInventoryService = makeService('studio_inventory_v1', 'studio_inventory_v1')
export const studioCartService = makeService('studio_cart_v1', 'studio_cart_v1')
