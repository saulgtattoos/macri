import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

class MemoryStorage {
  constructor() { this.m = new Map() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
}

let n = 0
async function freshModule() {
  return import(`../../src/lib/syncStatus.js?fresh=${++n}`)
}

beforeEach(() => { globalThis.localStorage = new MemoryStorage() })

test('a device only save warning survives a reload', async () => {
  const a = await freshModule()
  a.reportSyncIssue({ kind: 'save', table: 'macri_session_prep', message: 'denied' })
  const b = await freshModule()
  let seen = []
  b.subscribeSyncIssues(list => { seen = list })
  assert.equal(seen.length, 1)
  assert.equal(seen[0].label, 'Session prep')
})

test('dismiss clears the stored warning', async () => {
  const a = await freshModule()
  a.reportSyncIssue({ kind: 'save', table: 'crm_clients_v1', message: 'denied' })
  a.clearSyncIssues()
  assert.equal(localStorage.getItem('macri_sync_issues'), null)
})

test('sign out wipe also removes the stored warning', async () => {
  const a = await freshModule()
  const { wipeDeviceCache } = await import('../../src/lib/deviceCache.js')
  a.reportSyncIssue({ kind: 'save', table: 'crm_clients_v1', message: 'denied' })
  wipeDeviceCache()
  let seen = null
  a.subscribeSyncIssues(list => { seen = list })
  assert.equal(localStorage.getItem('macri_sync_issues'), null)
  assert.deepEqual(seen, [])
})

test('a successful database load clears stale load warnings but keeps unsynced saves', async () => {
  const a = await freshModule()
  a.reportSyncIssue({ kind: 'local-only', table: 'macri_cart', message: 'x' })
  a.reportSyncIssue({ kind: 'load', table: 'macri_session_prep', message: 'x' })
  a.reportSyncIssue({ kind: 'save', table: 'macri_session_prep', message: 'x' })
  a.resolveLoadIssues('macri_session_prep')
  a.resolveLoadIssues('macri_cart')
  let seen = []
  a.subscribeSyncIssues(list => { seen = list })
  assert.deepEqual(seen.map(i => i.key), ['save:macri_session_prep'])
})
