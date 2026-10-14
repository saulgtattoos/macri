import { useState } from 'react'
import supabase from '../lib/supabase'

const FIELD = {
  width: '100%', background: '#1e1e1b', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: '12px 14px', color: '#e8e6df', minHeight: 48,
  fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
}

const LABEL = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
  display: 'block', marginBottom: 6, letterSpacing: '0.04em',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setError(err.status === 400 ? 'Email or password is incorrect.' : 'Could not sign in. Check your connection and try again.')
      setBusy(false)
    }
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
          Owner sign in
        </p>

        <label style={LABEL} htmlFor="login-email">Email</label>
        <input
          id="login-email" type="email" autoComplete="username" required
          value={email} onChange={e => setEmail(e.target.value)}
          style={{ ...FIELD, marginBottom: 16 }}
        />

        <label style={LABEL} htmlFor="login-password">Password</label>
        <input
          id="login-password" type="password" autoComplete="current-password" required
          value={password} onChange={e => setPassword(e.target.value)}
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
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
