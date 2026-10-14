import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import supabase, { authLink } from '../lib/supabase'
import { bindCacheToUser, settleUntaggedCache, wipeDeviceCache } from '../lib/deviceCache'
import { apiPost } from '../lib/api'
import Login from '../pages/Login'
import SetPassword from '../pages/SetPassword'

// Owner panels render only with a signed in session. This is a convenience
// gate; access is enforced by /api owner checks and database policies.
// The device copy of studio data is bound to the signed in account and wiped
// whenever there is no session (sign out, expiry) or the account changes.
// A copy saved before login existed is kept only if the server confirms the owner.
export default function RequireAuth() {
  const [auth, setAuth] = useState({ loading: true, session: null })
  // A password reset link signs in first, then asks for the new password.
  const [recovering, setRecovering] = useState(authLink.recovery)

  useEffect(() => {
    let active = true

    async function apply(session) {
      const userId = session?.user?.id
      if (!userId) {
        wipeDeviceCache()
        if (active) setAuth({ loading: false, session: null })
        return
      }
      if (bindCacheToUser(userId) === 'needs-check') {
        if (active) setAuth({ loading: true, session: null })
        let isOwner = false
        try { isOwner = (await apiPost('/api/owner-check', {})).ok } catch { isOwner = false }
        settleUntaggedCache(userId, isOwner)
      }
      if (active) setAuth({ loading: false, session })
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      apply(session)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (auth.loading) return <div style={{ minHeight: '100vh', background: '#0e0e0d' }} />
  if (!auth.session) return <Login linkError={authLink.linkError} />
  if (recovering) return <SetPassword email={auth.session.user?.email} onDone={() => setRecovering(false)} />
  return <Outlet />
}
