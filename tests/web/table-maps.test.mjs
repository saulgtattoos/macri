// Saves every screen's record shape (as built in the pages, after the field mapping) into the
// real table structure (supabase/test/01_structure.sql + 06_missing_columns.sql) in an
// in-memory Postgres. Catches fields the table does not have and values it refuses.

import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { MAPS, crmToDB, crmFromDB } from '../../src/lib/tableMaps.js'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const T = '2026-10-14T20:00:00.000Z'

async function liveLikeDb() {
  const db = new PGlite()
  await db.exec(read('supabase/test/01_structure.sql'))
  await db.exec(read('supabase/security/06_missing_columns.sql'))
  return db
}

async function columnsOf(db, table) {
  const r = await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`, [table])
  return new Set(r.rows.map((x) => x.column_name))
}

// Inserts like PostgREST: only the keys sent, each cast to its column type.
async function save(db, table, row) {
  const cols = Object.keys(row)
  const unknown = cols.filter((c) => !COLS[table].has(c))
  if (unknown.length) throw new Error(`${table} has no column(s): ${unknown.join(', ')}`)
  const list = cols.map((c) => `"${c}"`).join(', ')
  await db.query(`insert into public.${table} (${list}) select ${list} from json_populate_record(null::public.${table}, $1)`, [JSON.stringify(row)])
  await db.query(`delete from public.${table} where id::text = $1`, [String(row.id)])
}

let COLS = {}

// Record shapes copied from the pages that build them.
const CASES = [
  ['Finance: Add Expense', 'macri_expenses', { id: 'e1', date: '2026-10-14', category: 'Supplies', vendor: 'Synthetic Supply', description: 'TEST', amount: '1.00', paymentMethod: 'Cash', deductible: true, notes: '', createdAt: T }],
  ['Finance: Add Expense, blank amount', 'macri_expenses', { id: 'e2', date: '2026-10-14', category: 'Supplies', vendor: 'V', description: '', amount: '', paymentMethod: 'Card', deductible: true, notes: '', createdAt: T }],
  ['Finance: expense CSV import', 'macri_expenses', { id: 'e3', date: '2026-10-14', category: 'Other', vendor: 'V', description: 'd', amount: 12.5, paymentMethod: 'Other', deductible: false, notes: '', createdAt: T }],
  ['Finance: Set Goal', 'macri_finance_goals', { id: 'g1', month: '2026-10', targetAmount: '5000', notes: 'synthetic', createdAt: T }],
  ['Finance: Set Goal, blank target', 'macri_finance_goals', { id: 'g2', month: '2026-11', targetAmount: '', notes: '', createdAt: T }],
  ['Finance: session CSV import', 'sessions_v4', { id: 1792000000001, name: 'Synthetic Client', date: '2026-10-14', style: 'Watercolor', total: 250, tip: 0, payment: 'Cash' }],
  ['Supplies: inventory, blank numbers', 'macri_inventory', { id: 'i1', name: 'Synthetic Ink', category: 'Inks', brand: '', supplier: '', unitCost: '', quantity: '', lowStockThreshold: 2, unit: 'bottle', notes: '', createdAt: T }],
  ['Supplies: inventory, zero quantity', 'macri_inventory', { id: 'i2', name: 'Synthetic Ink', category: 'Inks', brand: '', supplier: '', unitCost: '0', quantity: 0, lowStockThreshold: 0, unit: 'bottle', notes: '', createdAt: T }],
  ['Supplies: cart, blank numbers', 'macri_cart', { id: 'c1', name: 'Synthetic', brand: '', quantityNeeded: '', estimatedCost: '', whereToBuy: '', inventoryItemId: null, status: 'to-order', purchasedAt: null, createdAt: T }],
  ['Supplies: cart from low stock', 'macri_cart', { id: 'c2', name: 'Synthetic', brand: 'B', quantityNeeded: 4, estimatedCost: 20, whereToBuy: 'S', inventoryItemId: 'i1', status: 'to-order' }],
  ['Color Lab: ink', 'macri_colorlab_inks', { id: 'k1', name: 'Synthetic', brand: '', colorHex: '#000000', colorFamily: 'Black', notes: '', inStock: true, lastUsed: null, createdAt: T }],
  ['Color Lab: palette', 'macri_colorlab_palettes', { id: 'p1', name: 'Synthetic', inkIds: ['k1'], notes: '', createdAt: T }],
  ['Color Lab: brand', 'macri_colorlab_brands', { id: 'b1', name: 'Synthetic', website: '', supplierContact: '', phone: '', orderUrl: '', notes: '', createdAt: T }],
  ['Content Studio: draft', 'macri_content_drafts', { id: 'd1', style: 'Watercolor', concept: 'c', meaning: 'm', clientTag: '', instagramCaption: 'i', facebookCaption: 'f', tiktokCaption: 't', hashtags: ['#tattoo'], createdAt: T }],
  ['Content Studio: hashtag', 'macri_content_hashtags', { id: 'h1', tag: '#tattoo', createdAt: T }],
  ['Session Prep: item', 'macri_session_prep', { id: 's1', text: 'Synthetic', checked: false, sortOrder: 0 }],
  ['Agent Queue: card', 'macri_agent_queue', { id: 'a1', agentName: 'Aftercare Guardian', agentType: 'aftercare_guardian', clientId: null, clientName: 'Synthetic', subject: 's', draftMessage: 'd', channel: 'SMS', status: 'pending', metadata: { dayNumber: 3 }, createdAt: T }],
]

test('every screen record saves into the live table structure', async () => {
  const db = await liveLikeDb()
  for (const t of [...new Set(CASES.map((c) => c[1])), 'crm_clients_v1']) COLS[t] = await columnsOf(db, t)
  for (const [name, table, record] of CASES) {
    await assert.doesNotReject(save(db, table, MAPS[table].toDB(record)), name)
  }
})

test('CRM: new client (manual and CSV import) saves, including instagram, notes and communications', async () => {
  const db = await liveLikeDb()
  COLS.crm_clients_v1 = await columnsOf(db, 'crm_clients_v1')
  const client = {
    id: 'cl1', name: 'Synthetic Client', email: 'synthetic@example.test', phone: '', instagram: '@synthetic',
    tattooIdea: '', style: '', placement: '', size: '', nextAction: '', stage: 'new_inquiry', projectStage: 'new_inquiry',
    status: null, depositStatus: '', depositReceived: false, journeyChecklist: [false], aftercareChecklist: [false],
    consultations: [], activityLog: [], communications: [{ id: 'm1', text: 'synthetic' }], sessions: [{ id: 'x', tip: '' }],
    consultationCount: 0, notes: 'synthetic note', source: 'CSV', createdAt: T, updatedAt: T,
  }
  const row = crmToDB(client)
  assert.equal(row.instagram, '@synthetic')
  assert.equal(row.notes, 'synthetic note')
  assert.deepEqual(row.communications, [{ id: 'm1', text: 'synthetic' }])
  await assert.doesNotReject(save(db, 'crm_clients_v1', row))
  assert.deepEqual(crmFromDB(row).communications, client.communications)
})

test('blank numbers become null, zero stays zero, and both read back for the form', () => {
  const inv = MAPS.macri_inventory
  assert.deepEqual([inv.toDB({ unitCost: '', quantity: '  ', lowStockThreshold: null }).unit_cost, inv.toDB({ quantity: '  ' }).quantity, inv.toDB({ lowStockThreshold: null }).low_stock_threshold], [null, null, null])
  const zero = inv.toDB({ unitCost: 0, quantity: '0', lowStockThreshold: 0 })
  assert.deepEqual([zero.unit_cost, zero.quantity, zero.low_stock_threshold], [0, '0', 0])
  assert.equal(MAPS.macri_expenses.toDB({ amount: '' }).amount, null)
  assert.equal(MAPS.macri_expenses.toDB({ amount: 0 }).amount, 0)
  assert.equal(MAPS.macri_finance_goals.toDB({ targetAmount: '' }).target_amount, null)
  assert.equal(MAPS.sessions_v4.toDB({ tip: '' }).tip, null)
  assert.equal(MAPS.sessions_v4.toDB({ tip: 0 }).tip, 0)
  assert.equal(MAPS.macri_cart.toDB({ estimatedCost: '' }).estimated_cost, null)
  assert.equal(inv.fromDB({ unit_cost: null, quantity: 0 }).unitCost, '')
  assert.equal(inv.fromDB({ unit_cost: null, quantity: 0 }).quantity, 0)
  assert.ok(!('unit_cost' in inv.toDB({ name: 'only a name' })), 'fields not sent stay unsent')
})

test('blank and zero numbers are stored as null and 0 in the database', async () => {
  const db = await liveLikeDb()
  const insert = async (table, record) => {
    const row = MAPS[table].toDB(record)
    const list = Object.keys(row).map((c) => `"${c}"`).join(', ')
    await db.query(`insert into public.${table} (${list}) select ${list} from json_populate_record(null::public.${table}, $1)`, [JSON.stringify(row)])
  }
  await insert('macri_inventory', { id: 'blank', name: 'n', unitCost: '', quantity: '' })
  await insert('macri_inventory', { id: 'zero', name: 'n', unitCost: 0, quantity: '0' })
  const r = await db.query(`select id, unit_cost::text as cost, quantity::text as qty from public.macri_inventory order by id`)
  assert.deepEqual(r.rows, [{ id: 'blank', cost: null, qty: null }, { id: 'zero', cost: '0', qty: '0' }])
})

test('expense payment method and draft client tag read back under the app names', () => {
  const e = MAPS.macri_expenses.fromDB({ id: 'e', vendor: 'V', payment_method: 'Zelle', amount: '5', created_at: T })
  assert.deepEqual([e.vendor, e.paymentMethod, e.amount, e.createdAt], ['V', 'Zelle', '5', T])
  assert.equal(MAPS.macri_content_drafts.fromDB({ client_tag: 'x' }).clientTag, 'x')
})
