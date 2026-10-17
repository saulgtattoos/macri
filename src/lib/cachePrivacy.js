// Rules for the device copy of client records (localStorage macri_crm_clients).
// Health and comfort answers belong in the database only. The device copy keeps them only for
// consultations that exist on this device alone (never reached the database), so nothing that
// exists only here is lost. Records shown from the device copy are never written to the
// database, so an older device copy cannot overwrite newer database data.
// Pure functions: no storage or network access here.

import { MEMORY_ONLY_FIELDS } from './consultationDraft.js'

// Marks a record that was shown from the device copy because the database could not be read.
export const FROM_DEVICE = '_fromDevice'
// Marks a consultation whose health answers were removed from the device copy (kept in the database).
export const HEALTH_ON_SERVER = 'healthOnServer'

function hasHealth(consultation) {
  return MEMORY_ONLY_FIELDS.some(f => consultation?.[f] !== undefined && consultation[f] !== '' && consultation[f] !== null)
}

export function withoutHealth(consultation) {
  const out = { ...consultation }
  for (const f of MEMORY_ONLY_FIELDS) delete out[f]
  out[HEALTH_ON_SERVER] = true
  return out
}

export function markFromDevice(rows) {
  return (rows || []).map(r => ({ ...r, [FROM_DEVICE]: true }))
}

// A record may be written to the database only if it was not shown from the device copy.
export function mayWriteToDatabase(client) {
  return !client?.[FROM_DEVICE]
}

// The copy of `client` to keep on the device after a save attempt.
// savedToServer: the database accepted this whole record, so every consultation in it is there.
// Otherwise health is kept only for consultations already on the device with health answers that
// were never confirmed in the database (device only data, kept until Saul decides).
export function deviceCopy(client, previousCopy, { savedToServer }) {
  const { [FROM_DEVICE]: _ignored, ...rest } = client || {}
  const previous = new Map((previousCopy?.consultations || []).map(c => [c.id, c]))
  const consultations = (rest.consultations || []).map(c => {
    if (savedToServer) return hasHealth(c) ? withoutHealth(c) : c
    const before = previous.get(c.id)
    const deviceOnlyHealth = before && hasHealth(before) && !before[HEALTH_ON_SERVER]
    if (deviceOnlyHealth) {
      const kept = { ...c }
      for (const f of MEMORY_ONLY_FIELDS) if (before[f] !== undefined && kept[f] === undefined) kept[f] = before[f]
      return kept
    }
    return hasHealth(c) ? withoutHealth(c) : c
  })
  return rest.consultations === undefined ? rest : { ...rest, consultations }
}

// After a successful database load: remove health answers from device copies of consultations
// that the database confirms it has (same client id and consultation id). Device only
// consultations are left untouched and counted.
export function cleanDeviceCopy(cachedList, databaseRows) {
  const inDatabase = new Map((databaseRows || []).map(r => [r.id, new Set((r.consultations || []).map(c => c.id))]))
  let cleaned = 0
  let deviceOnlyKept = 0
  const list = (cachedList || []).map(client => {
    if (!Array.isArray(client?.consultations)) return client
    const known = inDatabase.get(client.id)
    let changed = false
    const consultations = client.consultations.map(c => {
      if (!hasHealth(c)) return c
      if (known && known.has(c.id)) { cleaned++; changed = true; return withoutHealth(c) }
      deviceOnlyKept++
      return c
    })
    return changed ? { ...client, consultations } : client
  })
  return { list, cleaned, deviceOnlyKept }
}
