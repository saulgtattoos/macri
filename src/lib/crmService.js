import supabase from './supabase'
import { reportSyncIssue, resolveLoadIssues } from './syncStatus'
import { crmToDB as toDB, crmFromDB as fromDB } from './tableMaps'

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
export async function loadClients() {
  try {
    const { data, error } = await supabase.from('crm_clients_v1').select('*')
    if (!error) {
      if (data && data.length > 0) {
        resolveLoadIssues('crm_clients_v1')
        return data.map(fromDB)
      }
      const local = lsRead()
      if (local.length) reportSyncIssue({ kind: 'local-only', table: 'crm_clients_v1', message: 'Database has no rows; showing clients saved on this device only.' })
      return local
    }
    reportSyncIssue({ kind: 'load', table: 'crm_clients_v1', message: error.message })
  } catch (err) {
    reportSyncIssue({ kind: 'load', table: 'crm_clients_v1', message: err?.message })
  }
  return lsRead()
}

// Resolves to { ok }. ok: false means the client was saved on this device only.
export async function saveClient(client) {
  let result
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

  try {
    const arr = JSON.parse(localStorage.getItem('macri_crm_clients') || '[]')
    const idx = arr.findIndex(c => c.id === client.id)
    if (idx >= 0) arr[idx] = client
    else arr.push(client)
    localStorage.setItem('macri_crm_clients', JSON.stringify(arr))
  } catch {}

  return result
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