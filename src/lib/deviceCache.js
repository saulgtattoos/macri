// The device copy of studio data (localStorage) belongs to one signed in account.
// It is wiped when the session ends (sign out or expiry) or a different account signs in,
// so cached client data never appears to anyone but the account that loaded it.

const OWNER_TAG = 'macri_cache_owner'
const EXTRA_KEYS = ['sessions_v4', 'studio_inventory_v1', 'studio_cart_v1']
// Kept through a wipe: only the marker that this browser is used by the owner (no client data),
// so the public client form keeps treating it as a shared device. The client form draft is
// wiped with everything else when the app detects sign out, session end, or another account.
const KEEP = new Set(['macri_owner_device'])

function store() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function cacheKeys() {
  const ls = store()
  if (!ls) return []
  const keys = []
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i)
    if (k && !KEEP.has(k) && (k.startsWith('macri_') || EXTRA_KEYS.includes(k))) keys.push(k)
  }
  return keys
}

export function wipeDeviceCache() {
  const ls = store()
  if (!ls) return
  for (const k of cacheKeys()) ls.removeItem(k)
}

// Call with the signed in user's id before any owner screen loads data.
// Returns 'ok', or 'needs-check' when the device holds an untagged copy from before
// login existed: the caller keeps it only if the server confirms this user is the owner.
export function bindCacheToUser(userId) {
  const ls = store()
  if (!ls || !userId) return 'ok'
  ls.setItem('macri_owner_device', '1')
  const owner = ls.getItem(OWNER_TAG)
  if (owner === userId) return 'ok'
  if (owner === null && cacheKeys().length > 0) return 'needs-check'
  wipeDeviceCache()
  ls.setItem(OWNER_TAG, userId)
  return 'ok'
}

// Resolves a 'needs-check': keep the untagged copy for the confirmed owner, otherwise wipe it.
export function settleUntaggedCache(userId, isOwner) {
  const ls = store()
  if (!ls || !userId) return
  if (!isOwner) wipeDeviceCache()
  ls.setItem(OWNER_TAG, userId)
  ls.setItem('macri_owner_device', '1')
}
