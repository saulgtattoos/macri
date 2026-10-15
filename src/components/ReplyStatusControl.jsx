import { useState } from 'react'
import { markReplySent, undoReplySent, sentLabel, canUndo } from '../lib/replyService'

const BTN = {
  minHeight: 36, borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.02em',
}
const GREEN = { ...BTN, background: 'rgba(122,171,143,0.12)', border: '1px solid rgba(122,171,143,0.4)', color: '#7aab8f' }
const QUIET = { ...BTN, background: 'var(--surface2)', border: '1px solid transparent', color: 'var(--muted)' }

// Mark as sent / Undo for one reply draft tied to one client. All rules are enforced in the
// database (supabase/security/07_replies.sql); this only asks once and shows the result.
// via: 'saul_gmail' for email, 'saul_messages' for text.
export default function ReplyStatusControl({ id, clientId, channel, subject, body, reply, onChange }) {
  const [confirming, setConfirming] = useState(null) // 'send' | 'undo'
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(kind) {
    setBusy(true)
    setMessage('')
    const res = kind === 'send'
      ? await markReplySent({ id, clientId, channel, subject, body, via: channel === 'email' ? 'saul_gmail' : 'saul_messages' })
      : await undoReplySent(id)
    setBusy(false)
    setConfirming(null)
    if (!res.ok) { setMessage('Not saved. Nothing changed. Check your connection and try again.'); return }
    if (res.result === 'already_sent') setMessage('Already marked sent.')
    if (res.result === 'provider_accepted') setMessage('This reply was accepted by the email or text service, so it cannot be undone.')
    if (res.result === 'not_sent') setMessage('This reply is not marked sent.')
    onChange?.(res)
  }

  const sent = reply?.status === 'sent'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {sent && (
          <span role="status" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7aab8f' }}>
            {sentLabel(reply)}
          </span>
        )}
        {!sent && !confirming && (
          <button type="button" style={GREEN} disabled={busy} onClick={() => setConfirming('send')}>
            Mark as sent
          </button>
        )}
        {sent && canUndo(reply) && !confirming && (
          <button type="button" style={QUIET} disabled={busy} onClick={() => setConfirming('undo')}>
            Undo
          </button>
        )}
        {confirming && (
          <>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)' }}>
              {confirming === 'send' ? 'Mark this reply as sent?' : 'Undo the sent confirmation for this reply?'}
            </span>
            <button type="button" style={GREEN} disabled={busy} onClick={() => run(confirming)}>
              {busy ? 'Saving...' : 'Yes'}
            </button>
            <button type="button" style={QUIET} disabled={busy} onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </>
        )}
      </div>
      {message && (
        <span role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: message.startsWith('Not saved') ? '#f09595' : 'var(--muted)' }}>
          {message}
        </span>
      )}
    </div>
  )
}
