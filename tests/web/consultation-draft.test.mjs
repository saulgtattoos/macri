import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLIENT_DRAFT_KEY, OWNER_DEVICE_KEY, MEMORY_ONLY_FIELDS, OWN_DEVICE_MAX_AGE_MS, SHARED_DEVICE_MAX_AGE_MS,
  writeDraft, readDraft, clearDraft, isSharedDevice, withoutMemoryOnly,
} from '../../src/lib/consultationDraft.js'

class Mem {
  constructor() { this.m = new Map() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
}

const FORM = {
  name: 'Synthetic Client', phone: '9165550100', style: 'Watercolor',
  allergies: 'synthetic allergy', skinConditions: 'synthetic', medications: 'synthetic', previousReactions: 'synthetic',
  medicalClearance: true, comfortNotes: 'synthetic comfort note',
}

test('health and comfort answers are never written to storage', () => {
  const s = new Mem()
  writeDraft(s, CLIENT_DRAFT_KEY, FORM, 1000)
  const raw = s.getItem(CLIENT_DRAFT_KEY)
  for (const f of MEMORY_ONLY_FIELDS) assert.ok(!raw.includes(`"${f}"`), `${f} stored`)
  assert.ok(!raw.includes('synthetic allergy') && !raw.includes('synthetic comfort note'))
  assert.ok(raw.includes('Synthetic Client'))
})

test('a draft is readable before its expiry and removed after it', () => {
  const s = new Mem()
  writeDraft(s, CLIENT_DRAFT_KEY, FORM, 0)
  const ok = readDraft(s, CLIENT_DRAFT_KEY, { now: OWN_DEVICE_MAX_AGE_MS - 1, maxAgeMs: OWN_DEVICE_MAX_AGE_MS })
  assert.equal(ok.status, 'valid')
  assert.equal(ok.data.name, 'Synthetic Client')
  assert.equal(ok.data.allergies, undefined)
  const late = readDraft(s, CLIENT_DRAFT_KEY, { now: OWN_DEVICE_MAX_AGE_MS + 1, maxAgeMs: OWN_DEVICE_MAX_AGE_MS })
  assert.equal(late.status, 'expired')
  assert.equal(s.getItem(CLIENT_DRAFT_KEY), null)
})

test('inactivity is measured from the last change', () => {
  const s = new Mem()
  writeDraft(s, CLIENT_DRAFT_KEY, FORM, 0)
  writeDraft(s, CLIENT_DRAFT_KEY, FORM, SHARED_DEVICE_MAX_AGE_MS)   // changed later
  assert.equal(readDraft(s, CLIENT_DRAFT_KEY, { now: SHARED_DEVICE_MAX_AGE_MS + 1000, maxAgeMs: SHARED_DEVICE_MAX_AGE_MS }).status, 'valid')
})

test('an older format draft is never shown and never deleted by reading', () => {
  const s = new Mem()
  s.setItem(CLIENT_DRAFT_KEY, JSON.stringify(FORM))   // today's format: no version, no time, health included
  const r = readDraft(s, CLIENT_DRAFT_KEY, { now: 10 ** 13, maxAgeMs: OWN_DEVICE_MAX_AGE_MS })
  assert.deepEqual(r, { status: 'legacy' })
  assert.equal(s.getItem(CLIENT_DRAFT_KEY), JSON.stringify(FORM))
  s.setItem(CLIENT_DRAFT_KEY, JSON.stringify({ saved: true }))
  assert.equal(readDraft(s, CLIENT_DRAFT_KEY).status, 'saved')
})

test('clear removes the draft; data stored by an older version is stripped on read', () => {
  const s = new Mem()
  s.setItem(CLIENT_DRAFT_KEY, JSON.stringify({ v: 2, updatedAt: 5, data: FORM }))
  assert.equal(readDraft(s, CLIENT_DRAFT_KEY, { now: 6 }).data.comfortNotes, undefined)
  clearDraft(s, CLIENT_DRAFT_KEY)
  assert.equal(readDraft(s, CLIENT_DRAFT_KEY).status, 'none')
  assert.deepEqual(Object.keys(withoutMemoryOnly(FORM)).sort(), ['name', 'phone', 'style'])
})

test('shared device: opened by Client Mode or a browser the owner uses', () => {
  const s = new Mem()
  assert.equal(isSharedDevice(s, false), false)
  assert.equal(isSharedDevice(s, true), true)
  s.setItem(OWNER_DEVICE_KEY, '1')
  assert.equal(isSharedDevice(s, false), true)
})
