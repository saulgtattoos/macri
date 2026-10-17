import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mergeClientAnswers, sameConsultation } from '../../src/lib/clientResume.js'
import { OWNER_ONLY_FIELDS, OWNER_MANAGED_FIELDS } from '../../src/constants/consultationFields.js'

// Defaults shared by the owner page and the client form (both pages use these values).
const DEFAULTS = {
  name: '', phone: '', email: '', socialPlatform: 'Instagram', socialHandle: '', referralSource: '',
  firstTimeClient: null, concept: '', referenceImages: [], isCoverUp: false, placement: '', size: '',
  style: [], musicGenre: [], playlist: '', comfortNotes: '',
  pricingType: '', estimatedTotal: '', estimatedHours: '', sessionEstimateNotes: '',
  depositAmount: '', depositStatus: '', consultationDate: '', appointmentDate: '',
  clientTier: 'Deposit Required', artistNotes: '', tattooCount: '', sittingEndurance: '',
  projectRating: '', strategyNotes: '', postSessionDebrief: '', technicalDifficulty: '', executionPlan: '',
}
const OPTS = {
  allowedKeys: Object.keys(DEFAULTS).filter(k => !OWNER_ONLY_FIELDS.includes(k)),
  defaults: DEFAULTS,
  ownerManagedKeys: OWNER_MANAGED_FIELDS,
}

// What the owner entered before the client pressed Ready to Finalize (synthetic).
const OWNER = {
  ...DEFAULTS,
  name: 'Synthetic Owner Entry', socialPlatform: 'TikTok', placement: 'Forearm', isCoverUp: true,
  artistNotes: 'Synthetic artist note', clientTier: 'Trusted Client',
  projectRating: 'A', strategyNotes: 'Synthetic strategy', postSessionDebrief: 'Synthetic debrief',
  technicalDifficulty: 'High', executionPlan: 'Synthetic plan',
  pricingType: 'Hourly', estimatedTotal: '750', depositAmount: '$100', depositStatus: 'Pending',
  appointmentDate: '2026-11-01',
}

// The client form sends every field: untouched defaults, blanks, and its own choices.
const CLIENT_SENDS = {
  ...DEFAULTS,
  name: 'Synthetic Client', email: 'synthetic@example.com', musicGenre: ['Lo-Fi'], playlist: 'Sample Mix',
  placement: '', concept: 'Synthetic koi', clientTier: 'No Deposit Required', artistNotes: '',
  depositStatus: 'Paid', estimatedTotal: '', consultationDate: '2026-10-20',
  projectRating: 'F', executionPlan: '',
}

test('Ready to Finalize never changes artist notes, deposit tier or the Artist Vault', () => {
  const merged = mergeClientAnswers(OWNER, CLIENT_SENDS, OPTS)
  for (const k of OWNER_ONLY_FIELDS) assert.deepEqual(merged[k], OWNER[k], k)
})

test('blank or untouched client answers never replace what the owner filled in', () => {
  const merged = mergeClientAnswers(OWNER, CLIENT_SENDS, OPTS)
  assert.equal(merged.placement, 'Forearm')          // client sent blank
  assert.equal(merged.socialPlatform, 'TikTok')      // client left the default
  assert.equal(merged.isCoverUp, true)               // client left the default
})

test('pricing, deposit and dates only fill gaps', () => {
  const merged = mergeClientAnswers(OWNER, CLIENT_SENDS, OPTS)
  assert.equal(merged.depositStatus, 'Pending')      // owner value kept over the client's "Paid"
  assert.equal(merged.estimatedTotal, '750')         // owner value kept over a blank
  assert.equal(merged.pricingType, 'Hourly')
  assert.equal(merged.appointmentDate, '2026-11-01')
  assert.equal(merged.consultationDate, '2026-10-20') // owner left it empty: filled
})

test("the client's real answers still arrive", () => {
  const merged = mergeClientAnswers(OWNER, CLIENT_SENDS, OPTS)
  assert.equal(merged.name, 'Synthetic Client')
  assert.equal(merged.email, 'synthetic@example.com')
  assert.equal(merged.concept, 'Synthetic koi')
  assert.deepEqual(merged.musicGenre, ['Lo-Fi'])
  assert.equal(merged.playlist, 'Sample Mix')
})

test('a fresh owner form takes everything the client may send, nothing owner only', () => {
  const merged = mergeClientAnswers(DEFAULTS, CLIENT_SENDS, OPTS)
  assert.equal(merged.depositStatus, 'Paid')
  assert.equal(merged.clientTier, 'Deposit Required')
  assert.equal(merged.projectRating, '')
  assert.equal(merged.name, 'Synthetic Client')
})

test('a malformed message changes nothing', () => {
  for (const bad of [null, 'text', ['name'], 42]) assert.deepEqual(mergeClientAnswers(OWNER, bad, OPTS), OWNER)
})

test('after an owner page reload, answers sent again only fill gaps', () => {
  // The reload kept the owner draft but lost the health answers (memory only); the owner had also
  // corrected the client's name spelling and the concept.
  const afterReload = { ...OWNER, name: 'Synthetic Client', concept: 'Synthetic koi, corrected', allergies: '' }
  const resent = { ...CLIENT_SENDS, concept: 'Synthetic koi', allergies: 'Synthetic allergy' }
  const allKeys = OPTS.allowedKeys.concat('allergies')
  const merged = mergeClientAnswers(afterReload, resent, { ...OPTS, allowedKeys: allKeys, ownerManagedKeys: allKeys })
  assert.equal(merged.allergies, 'Synthetic allergy')          // memory only answer restored
  assert.equal(merged.concept, 'Synthetic koi, corrected')     // owner edit kept
  for (const k of OWNER_ONLY_FIELDS) assert.deepEqual(merged[k], OWNER[k], k)
})

test('answers sent again belong to the consultation on screen only', () => {
  assert.equal(sameConsultation({ name: '' }, { name: 'Synthetic Client' }), true)
  assert.equal(sameConsultation({ name: 'Synthetic Client ' }, { name: 'synthetic client' }), true)
  assert.equal(sameConsultation({ name: 'Another Synthetic' }, { name: 'Synthetic Client' }), false)
  assert.equal(sameConsultation({ name: 'Another Synthetic' }, null), false)
})
