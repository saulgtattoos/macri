import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import { subscribeSyncIssues } from '../lib/syncStatus'

export default function Settings() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [unsynced, setUnsynced] = useState(0)

  useEffect(() => subscribeSyncIssues(list => setUnsynced(list.filter(i => i.kind === 'save' || i.kind === 'delete').length)), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
  }, [])

  async function handleSignOut() {
    setBusy(true)
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: '36px 24px 100px', maxWidth: 560 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
        Settings
      </p>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, color: '#e8e6df', fontWeight: 600, margin: '0 0 28px' }}>
        Account
      </h1>
      <div style={{ background: '#161614', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginBottom: 6 }}>Signed in as</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#e8e6df', margin: '0 0 20px' }}>{email || '...'}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: unsynced ? '#f09595' : '#7a786f', margin: '0 0 16px', lineHeight: 1.5 }}>
          {unsynced
            ? 'Some changes are saved on this device only and did not reach the database. Signing out removes the device copy, so those changes will be lost.'
            : 'Signing out removes the studio data stored on this device. Everything saved to the database stays.'}
        </p>
        <button
          onClick={handleSignOut} disabled={busy}
          style={{
            minHeight: 48, padding: '0 22px', borderRadius: 8, cursor: busy ? 'default' : 'pointer',
            background: 'transparent', border: '1px solid rgba(240,149,149,0.5)', color: '#f09595',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
          }}
        >
          {busy ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
