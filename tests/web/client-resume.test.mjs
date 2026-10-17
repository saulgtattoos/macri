import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  createResumeHandoff, isFromOpener, isFromOwnClientWindow, pickClientAnswers, RESUME_TTL_MS,
} from '../../src/lib/clientResume.js'

const ORIGIN = 'https://macri.example'
const win = (extra = {}) => ({ closed: false, ...extra })
const ready = (source, origin = ORIGIN) => ({ source, origin })

function clock(start = 1000) {
  let t = start
  return { now: () => t, advance: ms => { t += ms } }
}

test('blocked window: nothing is authorized, and no later ready message is answered', () => {
  const c = clock()
  const h = createResumeHandoff(c)
  assert.equal(h.request(null), 'blocked')
  const other = win()
  assert.equal(h.onReady(ready(other), ORIGIN), false)
  // A window that opened but closed at once counts as blocked too.
  assert.equal(h.request(win({ closed: true })), 'blocked')
  assert.equal(h.onReady(ready(other), ORIGIN), false)
})

test('a blocked press cancels an earlier pending request', () => {
  const h = createResumeHandoff(clock())
  const first = win()
  assert.equal(h.request(first), 'pending')
  assert.equal(h.request(null), 'blocked')
  assert.equal(h.onReady(ready(first), ORIGIN), false)
})

test('the new window resumes exactly once', () => {
  const h = createResumeHandoff(clock())
  const popup = win()
  assert.equal(h.request(popup), 'pending')
  assert.equal(h.onReady(ready(popup), ORIGIN), true)
  assert.equal(h.onReady(ready(popup), ORIGIN), false)   // reload of the same window
})

test('an already open client tab never receives the resume', () => {
  const h = createResumeHandoff(clock())
  const existingTab = win()
  const popup = win()
  assert.equal(h.request(popup), 'pending')
  assert.equal(h.onReady(ready(existingTab), ORIGIN), false)
  assert.equal(h.onReady(ready(popup), ORIGIN), true)     // the intended window still can
  assert.equal(h.onReady(ready(existingTab), ORIGIN), false)
})

test('a ready message from another site is ignored', () => {
  const h = createResumeHandoff(clock())
  const popup = win()
  h.request(popup)
  assert.equal(h.onReady(ready(popup, 'https://evil.example'), ORIGIN), false)
  assert.equal(h.onReady({ source: null, origin: ORIGIN }, ORIGIN), false)
})

test('the permission expires after 60 seconds and is not reusable', () => {
  const c = clock()
  const h = createResumeHandoff(c)
  const popup = win()
  h.request(popup)
  c.advance(RESUME_TTL_MS - 1)
  assert.equal(h.onReady(ready(popup), ORIGIN), true)

  const late = win()
  h.request(late)
  c.advance(RESUME_TTL_MS)
  assert.equal(h.onReady(ready(late), ORIGIN), false)
  assert.equal(h.onReady(ready(late), ORIGIN), false)
})

test('an already open Client Mode window is resumed directly, with nothing left pending', () => {
  const h = createResumeHandoff(clock())
  const open = win()
  assert.equal(h.request(open, { alreadyOpen: true }), 'send')
  assert.equal(h.onReady(ready(open), ORIGIN), false)
})

test('client side: only the opener on the same site counts', () => {
  const owner = {}
  const self = { opener: owner, location: { origin: ORIGIN } }
  assert.equal(isFromOpener({ source: owner, origin: ORIGIN }, self), true)
  assert.equal(isFromOpener({ source: {}, origin: ORIGIN }, self), false)            // another tab
  assert.equal(isFromOpener({ source: owner, origin: 'https://evil.example' }, self), false)
  const typedIn = { opener: null, location: { origin: ORIGIN } }                    // tab opened by hand
  assert.equal(isFromOpener({ source: owner, origin: ORIGIN }, typedIn), false)
  assert.equal(isFromOpener({ source: null, origin: ORIGIN }, typedIn), false)
})

test('owner side: answers count only from a Client Mode window this page opened', () => {
  const owner = { location: { origin: ORIGIN } }
  const current = { opener: owner }
  const openedBeforeReload = { opener: owner }      // still points at this tab after a reload
  const strangerTab = { opener: null }
  const fromAnotherTab = { opener: {} }
  assert.equal(isFromOwnClientWindow({ source: current, origin: ORIGIN }, owner, current), true)
  assert.equal(isFromOwnClientWindow({ source: openedBeforeReload, origin: ORIGIN }, owner, null), true)
  assert.equal(isFromOwnClientWindow({ source: strangerTab, origin: ORIGIN }, owner, current), false)
  assert.equal(isFromOwnClientWindow({ source: fromAnotherTab, origin: ORIGIN }, owner, current), false)
  assert.equal(isFromOwnClientWindow({ source: current, origin: 'https://evil.example' }, owner, current), false)
  assert.equal(isFromOwnClientWindow({ source: owner, origin: ORIGIN }, owner, current), false)   // posted to itself
  assert.equal(isFromOwnClientWindow({ source: null, origin: ORIGIN }, owner, current), false)
  const crossSite = { get opener() { throw new Error('blocked') } }
  assert.equal(isFromOwnClientWindow({ source: crossSite, origin: ORIGIN }, owner, current), false)
})

test('owner side: only client form fields are taken from sent answers', () => {
  const allowed = ['name', 'musicGenre', 'playlist']
  assert.deepEqual(
    pickClientAnswers({ name: 'Synthetic', musicGenre: ['Lo-Fi'], projectRating: 'A', strategyNotes: 'x' }, allowed),
    { name: 'Synthetic', musicGenre: ['Lo-Fi'] })
  assert.deepEqual(pickClientAnswers(null, allowed), {})
  assert.deepEqual(pickClientAnswers('text', allowed), {})
  assert.deepEqual(pickClientAnswers(['name'], allowed), {})
  assert.deepEqual(pickClientAnswers(JSON.parse('{"__proto__": {"x": 1}, "name": "S"}'), allowed), { name: 'S' })
})

test('client side: reset and saved instructions follow the same opener rule', () => {
  const owner = {}
  const self = { opener: owner, location: { origin: ORIGIN } }
  for (const type of ['RESET_WIZARD', 'CONSULTATION_SAVED']) {
    assert.equal(isFromOpener({ source: owner, origin: ORIGIN, data: { type } }, self), true)
    assert.equal(isFromOpener({ source: self, origin: ORIGIN, data: { type } }, self), false)   // posted by itself
  }
})
