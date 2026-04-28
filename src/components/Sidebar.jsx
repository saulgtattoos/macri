import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home',               path: '/' },
  { label: 'Inquiry Assistant',  path: '/inquiry' },
  { label: 'CRM',                path: '/crm' },
  { label: 'Project Wall',       path: '/projects' },
  { label: 'Consultation',       path: '/consultation' },
  { label: 'Session Prep',       path: '/session-prep' },
  { label: 'Finances',           path: '/finances' },
  { label: 'Dev Queue',          path: '/dev-queue' },
  { label: 'Settings',           path: '/settings' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" style={{
      width: '220px',
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--surface2)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      <div style={{
        padding: '0 20px 28px',
        borderBottom: '1px solid var(--surface2)',
        marginBottom: '12px',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--gold)',
          display: 'block',
          marginBottom: '5px',
        }}>
          MACRI
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--muted)',
          letterSpacing: '0.04em',
          lineHeight: 1.5,
          display: 'block',
        }}>
          Managing. Artist. Clients. Revenue. Intelligently.
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 20px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--gold)' : 'var(--muted)',
              background: isActive ? 'var(--surface2)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
              letterSpacing: '0.01em',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
