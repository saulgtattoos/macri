import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FROM_DEVICE, HEALTH_ON_SERVER, markFromDevice, mayWriteToDatabase, deviceCopy, cleanDeviceCopy,
} from '../../src/lib/cachePrivacy.js'

const HEALTH = {
  allergies: 'Synthetic allergy', skinConditions: 'Synthetic', medications: 'Synthetic',
  previousReactions: 'Synthetic', medicalClearance: 'Needs Clearance', comfortNotes: 'Synthetic comfort',
}
const consult = (id, extra = {}) => ({ id, date: '2026-10-16', concept: 'Synthetic koi', ...extra })
const client = (id, consultations, extra = {}) => ({ id, name: 'Synthetic Client', consultations, ...extra })
const noHealth = c => Object.keys(HEALTH).every(k => !(k in c))
const src = f => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')

test('a save the database accepted keeps no health or comfort answers on the device', () => {
  const copy = deviceCopy(client('crm_1', [consult('c1', HEALTH)]), null, { savedToServer: true })
  assert.ok(noHealth(copy.consultations[0]))
  assert.equal(copy.consultations[0][HEALTH_ON_SERVER], true)
  assert.equal(copy.consultations[0].concept, 'Synthetic koi')       // everything else kept
  assert.equal(copy.name, 'Synthetic Client')
  assert.ok(!JSON.stringify(copy).includes('Synthetic allergy'))
})

test('a failed save never puts new health answers on the device (they stay in memory only)', () => {
  const copy = deviceCopy(client('crm_1', [consult('c_new', HEALTH)]), null, { savedToServer: false })
  assert.ok(noHealth(copy.consultations[0]))
})

test('device only health answers are never removed, even by a later save', () => {
  const before = client('crm_1', [consult('c_old', HEALTH)])                      // never reached the database
  const later = client('crm_1', [consult('c_new', HEALTH), consult('c_old')], { phone: '9165550100' })
  const failed = deviceCopy(later, before, { savedToServer: false })
  const old = failed.consultations.find(c => c.id === 'c_old')
  assert.equal(old.allergies, 'Synthetic allergy')                                // kept
  assert.ok(noHealth(failed.consultations.find(c => c.id === 'c_new')))           // new one memory only
})

test('cleanup removes health only where the database confirms the consultation', () => {
  const cached = [
    client('crm_1', [consult('c1', HEALTH), consult('c2', HEALTH)]),
    client('crm_device_only', [consult('c9', HEALTH)]),
    client('crm_plain', [consult('c5')]),
  ]
  const database = [client('crm_1', [consult('c1')]), client('crm_plain', [consult('c5')])]
  const { list, cleaned, deviceOnlyKept } = cleanDeviceCopy(cached, database)
  assert.equal(cleaned, 1)
  assert.equal(deviceOnlyKept, 2)
  assert.ok(noHealth(list[0].consultations[0]))                                   // confirmed: cleaned
  assert.equal(list[0].consultations[1].allergies, 'Synthetic allergy')           // c2 not in database: kept
  assert.equal(list[1].consultations[0].allergies, 'Synthetic allergy')           // device only client: kept
  assert.equal(list[2], cached[2])                                                // untouched record unchanged
  assert.equal(list.length, cached.length)                                        // no record deleted
})

test('cleanup with an empty or failed database load changes nothing', () => {
  const cached = [client('crm_1', [consult('c1', HEALTH)])]
  assert.equal(cleanDeviceCopy(cached, []).cleaned, 0)
  assert.equal(cleanDeviceCopy(cached, []).list[0].consultations[0].allergies, 'Synthetic allergy')
})

test('a record shown from the device copy can never be written to the database', () => {
  const [stale] = markFromDevice([client('crm_1', [consult('c1')])])
  assert.equal(stale[FROM_DEVICE], true)
  assert.equal(mayWriteToDatabase(stale), false)
  assert.equal(mayWriteToDatabase({ ...stale, name: 'Edited' }), false)            // edits keep the mark
  assert.equal(mayWriteToDatabase(client('crm_1', [])), true)                     // loaded from the database
  assert.ok(!(FROM_DEVICE in deviceCopy(stale, null, { savedToServer: false })))  // mark not stored
})

test('saveClient checks the device mark before any database write', () => {
  const s = src('src/lib/crmService.js')
  const save = s.slice(s.indexOf('export async function saveClient'))
  assert.ok(save.indexOf('mayWriteToDatabase(client)') < save.indexOf(".from('crm_clients_v1')"), 'guard first')
  assert.ok(s.includes('rows: markFromDevice(lsRead())') && s.includes('rows: markFromDevice(local)'), 'fallback rows marked')
  assert.ok(!/localStorage\.setItem\('macri_crm_clients', JSON\.stringify\(arr\)\)/.test(s), 'no raw device copy write')
})

test('a failed consultation save keeps the form, drafts and client window', () => {
  const page = src('src/pages/Consultation.jsx')
  const doSave = page.slice(page.indexOf('async function doSave'))
  const failBranch = doSave.indexOf('if (!saveResult.ok) {')
  assert.ok(failBranch > 0 && failBranch < doSave.indexOf('localStorage.removeItem(DRAFT_KEY)'))
  assert.ok(failBranch < doSave.indexOf("type: 'CONSULTATION_SAVED'"))
  assert.ok(failBranch < doSave.indexOf('setFormData(defaultForm)'))
})

test('normal records without health pass through unchanged', () => {
  const plain = client('crm_2', [consult('c1')], { phone: '9165550100', stage: 'consultation_completed' })
  const copy = deviceCopy(plain, null, { savedToServer: true })
  assert.deepEqual(copy, plain)
  const noConsultations = { id: 'crm_3', name: 'Synthetic' }
  assert.deepEqual(deviceCopy(noConsultations, null, { savedToServer: true }), noConsultations)
})
