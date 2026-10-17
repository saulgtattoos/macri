import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  answersResendTarget, isFromOwnClientWindow, mergeClientAnswers, sameConsultation, MSG_OWNER_PAGE_READY,
} from '../../src/lib/clientResume.js'
import { OWNER_ONLY_FIELDS } from '../../src/constants/consultationFields.js'
import { MEMORY_ONLY_FIELDS, writeDraft, OWNER_DRAFT_KEY, CLIENT_DRAFT_KEY } from '../../src/lib/consultationDraft.js'

const ORIGIN = 'https://macri.example'
const ready = { type: MSG_OWNER_PAGE_READY }

test('client: answers go only to the same site owner page that opened the window, while waiting', () => {
  const owner = { location: { origin: ORIGIN } }
  const popup = { opener: owner, location: { origin: ORIGIN } }
  assert.equal(answersResendTarget(ready, { waiting: true, win: popup }), owner)
  assert.equal(answersResendTarget(ready, { waiting: false, win: popup }), null)                // not waiting
  assert.equal(answersResendTarget({ type: 'OTHER' }, { waiting: true, win: popup }), null)    // other message
  assert.equal(answersResendTarget(null, { waiting: true, win: popup }), null)
  const typedIn = { opener: null, location: { origin: ORIGIN } }                              // tab opened by hand
  assert.equal(answersResendTarget(ready, { waiting: true, win: typedIn }), null)
  const elsewhere = { opener: { location: { origin: 'https://other.example' } }, location: { origin: ORIGIN } }
  assert.equal(answersResendTarget(ready, { waiting: true, win: elsewhere }), null)          // opener left the site
  const crossSite = { opener: { get location() { throw new Error('blocked') } }, location: { origin: ORIGIN } }
  assert.equal(answersResendTarget(ready, { waiting: true, win: crossSite }), null)
})

test('owner: a matching client name never authorizes answers from a window it did not open', () => {
  const owner = { location: { origin: ORIGIN } }
  const strangerTab = { opener: null }
  const payload = { name: 'Synthetic Client', allergies: 'Synthetic allergy' }
  assert.equal(sameConsultation({ name: 'Synthetic Client' }, payload), true)                // names match...
  assert.equal(isFromOwnClientWindow({ source: strangerTab, origin: ORIGIN }, owner, null), false) // ...still refused
  assert.equal(isFromOwnClientWindow({ source: { opener: owner }, origin: 'https://evil.example' }, owner, null), false)
})

test('owner: resent answers for a different client are ignored', () => {
  assert.equal(sameConsultation({ name: 'Synthetic Client' }, { name: 'Another Synthetic' }), false)
})

test('nothing is invented: missing answers stay empty, and clearance is never set by the client', () => {
  const owner = { name: 'Synthetic Client', allergies: '', medicalClearance: '' }
  const allowed = ['name', 'allergies']
  const merged = mergeClientAnswers(owner, { name: 'Synthetic Client', medicalClearance: 'No Issues' }, {
    allowedKeys: allowed, defaults: { name: '', allergies: '', medicalClearance: '' }, ownerManagedKeys: allowed,
  })
  assert.equal(merged.allergies, '')
  assert.equal(merged.medicalClearance, '')
  assert.ok(OWNER_ONLY_FIELDS.includes('medicalClearance'))
})

test('health and comfort answers never reach browser storage on either page', () => {
  for (const f of ['allergies', 'skinConditions', 'medications', 'previousReactions', 'medicalClearance', 'comfortNotes']) {
    assert.ok(MEMORY_ONLY_FIELDS.includes(f), f)
  }
  const store = new Map()
  const storage = { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null, removeItem: k => store.delete(k) }
  const form = { name: 'Synthetic', allergies: 'Synthetic allergy', comfortNotes: 'Synthetic comfort', medicalClearance: 'Needs Clearance' }
  for (const key of [OWNER_DRAFT_KEY, CLIENT_DRAFT_KEY]) {
    writeDraft(storage, key, form, 1)
    assert.ok(!/Synthetic allergy|Synthetic comfort|Needs Clearance/.test(store.get(key)), key)
  }
})

test('no consultation code logs form data to the console', () => {
  for (const f of ['src/pages/Consultation.jsx', 'src/pages/ConsultationClient.jsx', 'src/lib/clientResume.js', 'src/lib/consultationDraft.js']) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')
    const logs = src.match(/console\.\w+\([^)]*\)/g) || []
    for (const l of logs) assert.ok(!/formData|payload|allerg|medic|health|comfort/i.test(l), `${f}: ${l}`)
  }
})

test('save asks first when a reloaded consultation has no health answers', async () => {
  const { healthAnswersMissing } = await import('../../src/lib/consultationDraft.js')
  assert.equal(healthAnswersMissing({ name: 'Synthetic', allergies: '' }, true), true)          // reloaded, none: ask
  assert.equal(healthAnswersMissing({ name: 'Synthetic', allergies: '  ' }, true), true)        // blanks do not count
  assert.equal(healthAnswersMissing({ name: 'Synthetic', medications: 'Synthetic' }, true), false)
  assert.equal(healthAnswersMissing({ name: 'Synthetic' }, false), false)                       // not reloaded: normal form
  assert.equal(healthAnswersMissing(null, true), true)
  const page = readFileSync(new URL('../../src/pages/Consultation.jsx', import.meta.url), 'utf8')
  assert.ok(page.includes('if (healthAnswersMissing(formData, reloadedConsultation) && !healthReviewed)'), 'save must check first')
})
