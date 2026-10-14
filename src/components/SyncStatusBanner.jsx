import { useEffect, useState } from 'react'
import { clearSyncIssues, subscribeSyncIssues } from '../lib/syncStatus'

function describe(issue) {
  if (issue.kind === 'save') return `${issue.label}: not saved to the database. Saved on this device only.`
  if (issue.kind === 'delete') return `${issue.label}: delete did not reach the database. Removed on this device only.`
  if (issue.kind === 'load') return `${issue.label}: could not load from the database. Showing the copy saved on this device.`
  return `${issue.label}: showing records saved on this device only, not in the database.`
}

// Persistent warning whenever data is device only. Stays until dismissed.
export default function SyncStatusBanner() {
  const [issues, setIssues] = useState([])

  useEffect(() => subscribeSyncIssues(setIssues), [])

  if (issues.length === 0) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 'env(safe-area-inset-top, 0px)', left: 0, right: 0, zIndex: 2000,
        background: '#2a1717', borderBottom: '1px solid rgba(240,149,149,0.45)',
        padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f09595', letterSpacing: '0.06em', margin: '0 0 4px' }}>
          DEVICE ONLY DATA
        </p>
        {issues.slice(0, 4).map(i => (
          <p key={i.key} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#e8e6df', margin: '2px 0', lineHeight: 1.4 }}>
            {describe(i)}
          </p>
        ))}
        {issues.length > 4 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', margin: '4px 0 0' }}>
            {issues.length - 4} more
          </p>
        )}
      </div>
      <button
        onClick={clearSyncIssues}
        style={{
          minHeight: 44, padding: '0 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e6df',
          fontFamily: 'var(--font-mono)', fontSize: 11,
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
