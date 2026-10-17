import supabase from './supabase'
import { reportSyncIssue, resolveLoadIssues } from './syncStatus'
import { crmToDB as toDB, crmFromDB as fromDB } from './tableMaps'
import { markFromDevice, mayWriteToDatabase, deviceCopy, cleanDeviceCopy } from './cachePrivacy'

const LS_KEY = 'macri_crm_clients'

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}

function lsWrite(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

// Falls back to the device copy only when the database fails or has no rows,
// and reports it so the app labels what is shown as device only.
// Resolves to { ok, source, rows, message }. ok is true only when the rows came from the
// database (zero rows included); otherwise rows are this device's copy and source is 'device'.
export async function loadClientsResult() {
  try {
    const { data, error } = await supabase.from('crm_clients_v1').select('*')
    if (!error) {
      if (data && data.length > 0) {
        resolveLoadIssues('crm_clients_v1')
        const rows = data.map(fromDB)
        // The database has these records: remove their health answers from the device copy.
        try {
          const { list, cleaned } = cleanDeviceCopy(lsRead(), rows)
          if (cleaned > 0) lsWrite(list)
        } catch { /* storage unavailable */ }
        return { ok: true, source: 'database', rows }
      }
      const local = lsRead()
      if (local.length) {
        const message = 'Database has no rows; showing clients saved on this device only.'
        reportSyncIssue({ kind: 'local-only', table: 'crm_clients_v1', message })
        return { ok: false, source: 'device', rows: markFromDevice(local), message }
      }
      return { ok: true, source: 'database', rows: [] }
    }
    reportSyncIssue({ kind: 'load', table: 'crm_clients_v1', message: error.message })
    return { ok: false, source: 'device', rows: markFromDevice(lsRead()), message: error.message }
  } catch (err) {
    reportSyncIssue({ kind: 'load', table: 'crm_clients_v1', message: err?.message })
    return { ok: false, source: 'device', rows: markFromDevice(lsRead()), message: err?.message || 'Could not reach the database' }
  }
}

export async function loadClients() {
  return (await loadClientsResult()).rows
}

// A record shown from the device copy (the database could not be read) is never written to the
// database: it may be older than what the database has. It stays on this device, reported as
// device only, so nothing newer is overwritten and nothing is lost.
export const DEVICE_COPY_NOT_SAVED =
  'Shown from this device because the database could not be read, so it was not written to the database (nothing newer there was overwritten). Reload when the connection is back and save again.'

export async function saveClient(client) {
  let result
  if (!mayWriteToDatabase(client)) {
    reportSyncIssue({ kind: 'save', table: 'crm_clients_v1', message: DEVICE_COPY_NOT_SAVED })
    writeDeviceCopy(client, false)
    return { ok: false, deviceCopy: true, error: new Error(DEVICE_COPY_NOT_SAVED) }
  }
  try {
    const mapped = toDB(client)
    const { error } = await supabase
      .from('crm_clients_v1')
      .upsert(mapped, { onConflict: 'id' })
    if (error) {
      console.error('[MACRI] saveClient error:', error.message, error)
      reportSyncIssue({ kind: 'save', table: 'crm_clients_v1', message: error.message })
      result = { ok: false, error }
    } else {
      result = { ok: true }
    }
  } catch (err) {
    console.error('[MACRI] saveClient caught:', err.message)
    reportSyncIssue({ kind: 'save', table: 'crm_clients_v1', message: err.message })
    result = { ok: false, error: err }
  }

  writeDeviceCopy(client, result.ok)
  return result
}

// Keeps the device copy of one client, without health answers (see cachePrivacy.js).
function writeDeviceCopy(client, savedToServer) {
  try {
    const arr = lsRead()
    const idx = arr.findIndex(c => c.id === client.id)
    const copy = deviceCopy(client, idx >= 0 ? arr[idx] : null, { savedToServer })
    if (idx >= 0) arr[idx] = copy
    else arr.push(copy)
    lsWrite(arr)
  } catch { /* storage unavailable */ }
}

export async function deleteClient(id) {
  lsWrite(lsRead().filter(c => c.id !== id))
  const { error } = await supabase.from('crm_clients_v1').delete().eq('id', id)
    .then(r => r, err => ({ error: err }))
  if (error) {
    console.error('[MACRI] deleteClient error:', error.message, error)
    reportSyncIssue({ kind: 'delete', table: 'crm_clients_v1', message: error.message })
    return { ok: false, error }
  }
  return { ok: true }
}

export async function seedFromLocalStorage() {
  const list = lsRead()
  if (!list.length) return 0

  const mapped = list.map(toDB)
  const { error } = await supabase.from('crm_clients_v1').upsert(mapped)
  if (error) {
    console.error('[MACRI] seedFromLocalStorage failed:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    })
    throw error
  }
  return list.length
}
// Puts a client row returned by a database function into the device copy, so a later
// whole client save from this device does not overwrite what the function changed.
export function cacheClientRow(row) {
  if (!row?.id) return null
  const client = fromDB(row)
  const list = lsRead()
  const idx = list.findIndex((c) => c.id === client.id)
  const merged = idx >= 0 ? { ...list[idx], ...client } : client
  // The row came from the database, so it is there: keep the device copy without health answers.
  const copy = deviceCopy(merged, idx >= 0 ? list[idx] : null, { savedToServer: true })
  if (idx >= 0) list[idx] = copy
  else list.push(copy)
  lsWrite(list)
  return merged
}
