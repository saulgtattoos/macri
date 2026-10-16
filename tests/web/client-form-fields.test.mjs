import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { OWNER_ONLY_FIELDS, OWNER_MANAGED_FIELDS } from '../../src/constants/consultationFields.js'

// The public client form must not let a client edit the artist's fields (deposit, pricing,
// dates, tier, notes, Artist Vault). Those stay in the owner wizard only.
const clientPage = readFileSync(new URL('../../src/pages/ConsultationClient.jsx', import.meta.url), 'utf8')
const ownerPage = readFileSync(new URL('../../src/pages/Consultation.jsx', import.meta.url), 'utf8')

test('the client form has no control that edits an artist controlled field', () => {
  for (const f of [...OWNER_ONLY_FIELDS, ...OWNER_MANAGED_FIELDS]) {
    assert.ok(!clientPage.includes(`set('${f}'`), `client form edits ${f}`)
  }
})

test('the owner wizard still edits pricing, deposit, dates, tier and medical clearance', () => {
  for (const f of ['pricingType', 'estimatedTotal', 'depositAmount', 'depositStatus', 'appointmentDate', 'clientTier', 'medicalClearance']) {
    assert.ok(ownerPage.includes(`set('${f}'`), `owner wizard lost ${f}`)
  }
})
