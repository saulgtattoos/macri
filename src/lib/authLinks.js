// Reads the part of a Supabase email link that arrives after "#".
// A password reset link signs the owner in with type=recovery; an expired or
// used link arrives with an error instead of a session.
export function readAuthLinkHash(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  const code = params.get('error_code') || params.get('error')
  return {
    recovery: params.get('type') === 'recovery' && params.has('access_token'),
    linkError: code
      ? (code === 'otp_expired' ? 'That link has expired or was already used. Ask for a new one.' : 'That link did not work. Ask for a new one.')
      : '',
  }
}

export const MIN_PASSWORD_LENGTH = 12

// Returns an error message, or '' when the new password can be saved.
export function checkNewPassword(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password !== confirm) return 'The two passwords do not match.'
  return ''
}
