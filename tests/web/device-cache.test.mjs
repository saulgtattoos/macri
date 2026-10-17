import { test, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import { bindCacheToUser, settleUntaggedCache, wipeDeviceCache } from '../../src/lib/deviceCache.js'

class MemoryStorage {
  constructor() { this.m = new Map() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
}

const CLIENT_DATA = { macri_crm_clients: '[{"name":"Synthetic Client"}]', sessions_v4: '[]', studio_cart_v1: '[]', macri_inquiry_draft: '{}' }

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
  for (const [k, v] of Object.entries(CLIENT_DATA)) localStorage.setItem(k, v)
  localStorage.setItem('macri_consultation_client_draft', '{"client":"own draft"}')
  localStorage.setItem('sb-test-auth-token', 'kept for supabase to manage')
  localStorage.setItem('unrelated', 'x')
})

test('a signed in owner marks the browser as an owner device', () => {
  localStorage.setItem('macri_cache_owner', 'owner')
  bindCacheToUser('owner')
  assert.equal(localStorage.getItem('macri_owner_device'), '1')
})

test('untagged copy from before login needs a server owner check', () => {
  assert.equal(bindCacheToUser('owner'), 'needs-check')
  assert.equal(localStorage.getItem('macri_crm_clients'), CLIENT_DATA.macri_crm_clients)
})

test('confirmed owner keeps the untagged copy', () => {
  bindCacheToUser('owner')
  settleUntaggedCache('owner', true)
  assert.equal(localStorage.getItem('macri_crm_clients'), CLIENT_DATA.macri_crm_clients)
  assert.equal(localStorage.getItem('macri_cache_owner'), 'owner')
  assert.equal(bindCacheToUser('owner'), 'ok')
})

test('non owner (or failed check) never sees the untagged copy', () => {
  bindCacheToUser('intruder')
  settleUntaggedCache('intruder', false)
  assert.equal(localStorage.getItem('macri_crm_clients'), null)
  assert.equal(localStorage.getItem('macri_cache_owner'), 'intruder')
})

test('empty device: first sign in tags without a check', () => {
  wipeDeviceCache()
  assert.equal(bindCacheToUser('owner'), 'ok')
  assert.equal(localStorage.getItem('macri_cache_owner'), 'owner')
})

test('same account keeps its device copy across reloads', () => {
  wipeDeviceCache()
  bindCacheToUser('owner')
  localStorage.setItem('macri_crm_clients', '[1]')
  bindCacheToUser('owner')
  assert.equal(localStorage.getItem('macri_crm_clients'), '[1]')
})

test('a different account never sees the previous account cache', () => {
  wipeDeviceCache()
  bindCacheToUser('owner')
  localStorage.setItem('macri_crm_clients', '[1]')
  localStorage.setItem('sessions_v4', '[2]')
  bindCacheToUser('someone-else')
  assert.equal(localStorage.getItem('macri_crm_clients'), null)
  assert.equal(localStorage.getItem('sessions_v4'), null)
  assert.equal(localStorage.getItem('macri_cache_owner'), 'someone-else')
})

test('sign out or expiry wipes studio data and the client form draft, keeps the owner device marker', () => {
  settleUntaggedCache('owner', true)
  localStorage.setItem('macri_crm_clients', '[1]')
  wipeDeviceCache()
  for (const k of Object.keys(CLIENT_DATA)) assert.equal(localStorage.getItem(k), null, k)
  assert.equal(localStorage.getItem('macri_cache_owner'), null)
  assert.equal(localStorage.getItem('macri_consultation_client_draft'), null)
  assert.equal(localStorage.getItem('macri_owner_device'), '1')
  assert.equal(localStorage.getItem('sb-test-auth-token'), 'kept for supabase to manage')
  assert.equal(localStorage.getItem('unrelated'), 'x')
})
