import { test } from 'vitest'
import assert from 'node:assert/strict'
import { matchClient } from '../../src/lib/clientMatch.js'

const CLIENTS = [
  { id: 'a', name: 'Maria Lopez', email: 'maria.lopez@example.test', phone: '(916) 555-0101' },
  { id: 'b', name: 'Maria Chen', email: 'mchen@example.test', phone: '916 555 0102' },
  { id: 'c', name: 'Jordan Reyes', email: 'JORDAN@example.test', phone: '' },
  { id: 'd', name: 'Jordan Reyes', email: 'jordan.r@example.test', phone: '' },
  { id: 'e', name: 'Sam Shared', email: 'shared@example.test', phone: '' },
  { id: 'f', name: 'Sam Shared Two', email: 'shared@example.test', phone: '' },
]

test('first name alone never selects an existing client', () => {
  const r = matchClient(CLIENTS, { name: 'Maria Garcia' })
  assert.equal(r.decision, 'choose')
  assert.deepEqual(r.candidates.map((c) => c.client.id).sort(), ['a', 'b'])
  assert.ok(r.candidates.every((c) => c.reasons.join() === 'first name'))
})

test('one unambiguous email match selects that client (case and spaces ignored)', () => {
  const r = matchClient(CLIENTS, { name: 'Maria', email: '  Maria.Lopez@Example.test ' })
  assert.equal(r.decision, 'existing')
  assert.equal(r.client.id, 'a')
})

test('email match plus a different client with the same first name is not a conflict', () => {
  const r = matchClient(CLIENTS, { name: 'Maria Lopez', email: 'maria.lopez@example.test' })
  assert.equal(r.decision, 'existing')
  assert.equal(r.client.id, 'a')
})

test('email points to one client but phone points to another: stop and choose', () => {
  const r = matchClient(CLIENTS, { name: 'Maria Lopez', email: 'maria.lopez@example.test', phone: '9165550102' })
  assert.equal(r.decision, 'choose')
  assert.deepEqual(r.candidates.map((c) => c.client.id).sort(), ['a', 'b'])
})

test('email points to one client but the full name matches a different client: stop and choose', () => {
  const r = matchClient(CLIENTS, { name: 'Jordan Reyes', email: 'jordan@example.test' })
  assert.equal(r.decision, 'choose')
  assert.deepEqual(r.candidates.map((c) => c.client.id).sort(), ['c', 'd'])
})

test('the same email on two clients: stop and choose', () => {
  const r = matchClient(CLIENTS, { name: 'Sam', email: 'shared@example.test' })
  assert.equal(r.decision, 'choose')
})

test('phone or full name without email never auto selects', () => {
  assert.equal(matchClient(CLIENTS, { name: 'Someone', phone: '916-555-0101' }).decision, 'choose')
  assert.equal(matchClient(CLIENTS, { name: 'Maria Chen' }).decision, 'choose')
})

test('no match at all creates a new client', () => {
  assert.equal(matchClient(CLIENTS, { name: 'Avery New', email: 'avery@example.test' }).decision, 'new')
  assert.equal(matchClient(CLIENTS, {}).decision, 'new')
  assert.equal(matchClient([], { name: 'Maria' }).decision, 'new')
})
