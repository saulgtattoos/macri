import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awaitingResponse, scheduledCounts, lowSupplies, recentActivity, periodRange, earnings, sessionDays } from '../../src/lib/homeGlance.js'
import { localDateISO, addDaysISO, weekdayMondayFirst } from '../../src/lib/localDate.js'

test('business dates use Los Angeles time, not UTC or the device zone', () => {
  // 2026-10-15 03:00 UTC is still Oct 14 in California (8 PM PDT).
  assert.equal(localDateISO(new Date('2026-10-15T03:00:00Z')), '2026-10-14')
  assert.equal(localDateISO(new Date('2026-10-15T08:00:00Z')), '2026-10-15')
  // Winter (PST, UTC-8).
  assert.equal(localDateISO(new Date('2027-01-01T07:30:00Z')), '2026-12-31')
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28')
  assert.equal(weekdayMondayFirst('2026-10-12'), 0) // Monday
  assert.equal(weekdayMondayFirst('2026-10-18'), 6) // Sunday
})

test('inquiries awaiting a response: both stage names, archived excluded, responses recorded', () => {
  const clients = [
    { id: 'a', stage: 'new_inquiry', journeyChecklist: [false, false] },
    { id: 'b', stage: 'Inquiry' },
    { id: 'c', stage: 'new_inquiry', journeyChecklist: [false, true] },  // response step ticked
    { id: 'd', stage: 'new_inquiry' },                                   // reply marked sent
    { id: 'e', stage: 'archived' },
    { id: 'f', stage: 'awaiting_response' },
    { id: 'g', stage: 'Inquiry Response' },
  ]
  assert.deepEqual(awaitingResponse(clients, new Set(['d'])).map((c) => c.id), ['a', 'b'])
})

test('projects marked scheduled: consult and tattoo scheduled, archived excluded', () => {
  const r = scheduledCounts([
    { projectStage: 'consultation_scheduled', stage: 'consultation_scheduled' },
    { projectStage: 'tattoo_scheduled', stage: 'tattoo_scheduled' },
    { projectStage: 'tattoo_scheduled', stage: 'tattoo_scheduled' },
    { projectStage: 'tattoo_scheduled', stage: 'archived' },
    { projectStage: 'in_progress', stage: 'in_progress' },
  ])
  assert.deepEqual(r, { consults: 1, tattoos: 2, total: 3 })
})

test('supplies running low: at or below level, blanks counted as missing, zero stays zero', () => {
  assert.deepEqual(lowSupplies([
    { quantity: 2, lowStockThreshold: 2 },
    { quantity: 0, lowStockThreshold: 1 },
    { quantity: '5', lowStockThreshold: '2' },
    { quantity: '', lowStockThreshold: 2 },
    { quantity: 3, lowStockThreshold: null },
  ]), { low: 2, missing: 2 })
})

test('recent activity: newest first across clients, stored date prefix removed', () => {
  const r = recentActivity([
    { id: 'c1', name: 'A', activityLog: [{ id: 1, timestamp: '2026-10-12T10:00:00Z', text: 'Oct 12, 2026 Added from Inquiry Assistant.' }] },
    { id: 'c2', name: 'B', activityLog: [
      { id: 2, timestamp: '2026-10-14T10:00:00Z', text: 'Oct 14, 2026 Inquiry reply marked sent by Saul (email).' },
      { id: 3, timestamp: '2026-10-13T10:00:00Z', text: 'Consultation logged' },
    ] },
  ], 2)
  assert.deepEqual(r.map((e) => [e.clientName, e.text]), [['B', 'Inquiry reply marked sent by Saul (email).'], ['B', 'Consultation logged']])
})

test('periods end today: week from Monday, month to date, YTD from January 1', () => {
  assert.deepEqual(periodRange('week', '2026-10-14'), { start: '2026-10-12', end: '2026-10-14' })
  assert.deepEqual(periodRange('week', '2026-10-12'), { start: '2026-10-12', end: '2026-10-12' })
  assert.deepEqual(periodRange('week', '2026-10-18'), { start: '2026-10-12', end: '2026-10-18' })
  assert.deepEqual(periodRange('month', '2026-10-14'), { start: '2026-10-01', end: '2026-10-14' })
  assert.deepEqual(periodRange('ytd', '2026-10-14'), { start: '2026-01-01', end: '2026-10-14' })
})

test('earnings: amount paid by session date, tips separate, deposits and future records excluded', () => {
  const clients = [{ name: 'A', sessions: [
    { date: '2026-10-13', amountPaid: '500', tip: '50', deposit: '100' },
    { date: '2026-10-01', amountPaid: 250, tip: '' },
    { date: '2026-10-20', amountPaid: 900 },          // future: excluded
    { date: '2025-12-31', amountPaid: 400 },          // last year
    { date: '10/14/2026', amountPaid: 999 },          // unreadable date: excluded
    { date: '2026-10-14', amountPaid: '', tip: 0 },   // counted as a session with $0 paid
  ] }]
  const month = earnings(clients, 'month', '2026-10-14')
  assert.deepEqual([month.sessions, month.revenue, month.tips], [3, 750, 50])
  assert.equal(month.avgPerSession, 250)
  assert.equal(month.taxAside, 210)
  const week = earnings(clients, 'week', '2026-10-14')
  assert.deepEqual([week.sessions, week.revenue], [2, 500])
  assert.equal(earnings(clients, 'ytd', '2026-10-14').revenue, 750)
  assert.equal(earnings([], 'month', '2026-10-14').avgPerSession, null)
})

test('calendar days come from session dates only', () => {
  const m = sessionDays([{ name: 'A', sessions: [{ date: '2026-10-06' }, { date: '2026-10-06T10:00' }, { date: 'bad' }, null] }])
  assert.deepEqual(Object.keys(m), ['2026-10-06'])
  assert.equal(m['2026-10-06'].length, 2)
})
