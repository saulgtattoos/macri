import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readAuthLinkHash, checkNewPassword } from '../../src/lib/authLinks.js'

test('a password reset link is recognized', () => {
  const r = readAuthLinkHash('#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery')
  assert.deepEqual(r, { recovery: true, linkError: '' })
})

test('a sign in link or a plain address is not a reset', () => {
  assert.equal(readAuthLinkHash('#access_token=abc&type=magiclink').recovery, false)
  assert.equal(readAuthLinkHash('').recovery, false)
  assert.equal(readAuthLinkHash(undefined).recovery, false)
})

test('type=recovery without a token does not open the reset screen', () => {
  assert.equal(readAuthLinkHash('#type=recovery').recovery, false)
})

test('an expired link explains itself', () => {
  const r = readAuthLinkHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
  assert.equal(r.recovery, false)
  assert.match(r.linkError, /expired/)
})

test('other link errors still show a message', () => {
  assert.match(readAuthLinkHash('#error=server_error').linkError, /did not work/)
})

test('new password rules', () => {
  assert.match(checkNewPassword('short', 'short'), /12/)
  assert.match(checkNewPassword('long enough pass', 'long enough pasz'), /match/)
  assert.equal(checkNewPassword('long enough pass', 'long enough pass'), '')
})
