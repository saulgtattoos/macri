import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const InquiryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const CRMIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const ProjectsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
)

const NAV_ITEMS = [
  { label: 'Home',     path: '/',         icon: <HomeIcon />,     end: true },
  { label: 'Inquiry',  path: '/inquiry',  icon: <InquiryIcon /> },
  { label: 'CRM',      path: '/crm',      icon: <CRMIcon /> },
  { label: 'Projects', path: '/projects', icon: <ProjectsIcon /> },
]

const MORE_ITEMS = [
  { label: 'Consultation',   path: '/consultation' },
  { label: 'Session Prep',   path: '/session-prep' },
  { label: 'Finances',       path: '/finances' },
  { label: 'Supplies',       path: '/supplies' },
  { label: 'Color Lab',      path: '/colorlab' },
  { label: 'Content Studio', path: '/contentstudio' },
  { label: 'Agent Queue',    path: '/agents' },
  { label: 'Dev Queue',      path: '/dev-queue' },
  { label: 'Settings',       path: '/settings' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  function handleMoreItem(path) {
    setMoreOpen(false)
    navigate(path)
  }

  return (
    <>
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: 'rgba(0,0,0,0.5)',
            touchAction: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: moreOpen ? 0 : '-100%',
          left: 0,
          right: 0,
          zIndex: 101,
          background: 'var(--surface)',
          borderTop: '1px solid var(--surface2)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          overflowY: 'auto',
          transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            padding: '16px 0 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: '36px',
            height: '4px',
            background: 'var(--muted)',
            borderRadius: '2px',
          }} />
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            color: 'var(--muted)',
            letterSpacing: '0.04em',
          }}>
            tap to close
          </span>
        </div>

        <div style={{ padding: '8px 0 32px' }}>
          {MORE_ITEMS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => handleMoreItem(path)}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 28px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'var(--text)',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bottom-nav-bar">
        {NAV_ITEMS.map(({ label, path, icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              flex: 1,
              textDecoration: 'none',
              color: isActive ? 'var(--gold)' : 'var(--muted)',
              paddingBottom: '2px',
              position: 'relative',
              transition: 'color 0.15s',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: '2px',
                    background: 'var(--gold)',
                    borderRadius: '0 0 2px 2px',
                  }} />
                )}
                {icon}
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '9px',
                  letterSpacing: '0.04em',
                }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen(v => !v)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: moreOpen ? 'var(--gold)' : 'var(--muted)',
            cursor: 'pointer',
            paddingBottom: '2px',
            transition: 'color 0.15s',
          }}
        >
          <MoreIcon />
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '9px',
            letterSpacing: '0.04em',
          }}>
            More
          </span>
        </button>
      </div>
    </>
  )
}