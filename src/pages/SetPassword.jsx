import { useState } from 'react'
import supabase from '../lib/supabase'
import { checkNewPassword, MIN_PASSWORD_LENGTH } from '../lib/authLinks'

const FIELD = {
  width: '100%', background: '#1e1e1b', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: '12px 14px', color: '#e8e6df', minHeight: 48,
  fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
}

const LABEL = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
  display: 'block', marginBottom: 6, letterSpacing: '0.04em',
}

// Shown after a password reset link signs the owner in.
export default function SetPassword({ email, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    const problem = checkNewPassword(password, confirm)
    if (problem) { setError(problem); return }
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) {
      setError(err.message || 'Could not save the password. Check your connection and try again.')
      return
    }
    setSaved(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 380, background: '#161614', borderRadius: 12, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#c9a96e', letterSpacing: '0.08em' }}>
          MACRI
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', margin: '6px 0 28px' }}>
          Set a new password{email ? ` for ${email}` : ''}
        </p>

        {saved ? (
          <>
            <p role="status" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7aab8f', margin: 0 }}>
              Password updated. Use it the next time you sign in.
            </p>
            <button
              type="button" onClick={onDone}
              style={{
                width: '100%', minHeight: 48, marginTop: 22, border: 'none', borderRadius: 8,
                background: '#c9a96e', color: '#0e0e0d', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Continue to MACRI
            </button>
          </>
        ) : (
          <>
            {/* Lets password managers file the new password under the right account. */}
            <input type="email" autoComplete="username" value={email || ''} readOnly hidden />

            <label style={LABEL} htmlFor="new-password">New password</label>
            <input
              id="new-password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH}
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ ...FIELD, marginBottom: 16 }}
            />

            <label style={LABEL} htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password" type="password" autoComplete="new-password" required
              value={confirm} onChange={e => setConfirm(e.target.value)}
              style={FIELD}
            />

            {error && (
              <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#f09595', marginTop: 14 }}>
                {error}
              </p>
            )}

            <button
              type="submit" disabled={busy}
              style={{
                width: '100%', minHeight: 48, marginTop: 22, border: 'none', borderRadius: 8,
                background: busy ? '#1e1e1b' : '#c9a96e', color: busy ? '#7a786f' : '#0e0e0d',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
              }}
            >
              {busy ? 'Saving...' : 'Save password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
