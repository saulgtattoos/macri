import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadClientsResult } from '../lib/crmService'
import { agentQueueService, inventoryService } from '../lib/dataService'
import { loadSentReplyClientIds } from '../lib/replyService'
import { localDateISO, BUSINESS_TIME_ZONE } from '../lib/localDate'
import { awaitingResponse, scheduledCounts, lowSupplies, recentActivity, earnings, sessionDays } from '../lib/homeGlance'
import { ttsFetch } from '../lib/api'

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: 'Your body is a journal, and tattoos are the stories.',                  author: 'Johnny Depp' },
  { text: 'Art is not what you see, but what you make others see.',                author: 'Edgar Degas' },
  { text: 'Every artist dips his brush in his own soul.',                          author: 'Henry Ward Beecher' },
  { text: 'Creativity takes courage.',                                             author: 'Henri Matisse' },
  { text: 'The purpose of art is washing the dust of daily life off our souls.',   author: 'Pablo Picasso' },
  { text: 'Art enables us to find ourselves and lose ourselves at the same time.',  author: 'Thomas Merton' },
  { text: "To create one's own world takes courage.",                              author: "Georgia O'Keeffe" },
  { text: 'An artist is not paid for his labor but for his vision.',               author: 'James Whistler' },
  { text: 'Great art picks up where nature ends.',                                 author: 'Marc Chagall' },
  { text: 'The job of the artist is always to deepen the mystery.',                author: 'Francis Bacon' },
]

function getDailyIdx() {
  const d = new Date()
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  return n % QUOTES.length
}

function getRefreshIdx(current) {
  let idx
  do { idx = Math.floor(Math.random() * QUOTES.length) } while (idx === current)
  return idx
}

async function speakText(text) {
  try {
    const res = await ttsFetch({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    })
    if (!res.ok) return
    const blob  = await res.blob()
    const url   = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => URL.revokeObjectURL(url)
  } catch {}
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US')
}

// ─── Goals storage ────────────────────────────────────────────────────────────

const LS_GOALS = 'macri_goals'
function loadGoals() {
  try { return JSON.parse(localStorage.getItem(LS_GOALS)) || [] } catch { return [] }
}
function saveGoals(list) { localStorage.setItem(LS_GOALS, JSON.stringify(list)) }

// ─── Welcome helpers ──────────────────────────────────────────────────────────

const LS_WELCOME = 'macri_welcome_last_seen'

function todayISO() {
  return localDateISO()
}

const businessHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' })
}

function shortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', { timeZone: BUSINESS_TIME_ZONE, month: 'short', day: 'numeric' })
}

function getGreeting() {
  const h = businessHour()
  if (h < 12) return 'Good morning, Saul.'
  if (h < 17) return 'Good afternoon, Saul.'
  return 'Good evening, Saul.'
}

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return narrow
}

// ─── Micro icons ──────────────────────────────────────────────────────────────

function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M13 4A6 6 0 1 0 14 8" stroke="#7a786f" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 1.5V5h-3.5" stroke="#7a786f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronLeft({ color = '#7a786f' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronRight({ color = '#7a786f' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M3 3.5l.75 7.25A.5.5 0 0 0 4.24 11h5.52a.5.5 0 0 0 .49-.25L11 3.5M6 6v3M8 6v3" stroke="#7a786f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Shared card style ────────────────────────────────────────────────────────

const CARD = {
  background: 'linear-gradient(160deg, #1a1a17 0%, #161614 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderTop: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
  padding: '24px 28px',
}

const LABEL_MONO = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: '#7a786f',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

// ─── Your studio at a glance ──────────────────────────────────────────────────

const SHORTCUTS = [
  { label: 'Inquiry Assistant', path: '/inquiry' },
  { label: 'CRM',               path: '/crm' },
  { label: 'Project Wall',      path: '/projects' },
  { label: 'Finances',          path: '/finances' },
  { label: 'Session Prep',      path: '/session-prep' },
  { label: 'Agent Queue',       path: '/agents' },
]

// Loading while any source is still loading; otherwise unavailable.
function unavailableOr(...sources) {
  return sources.some(r => r.status === 'loading') ? 'loading' : 'unavailable'
}

// One overview tile: a number when the data is known, never a 0 standing in for missing data.
function Tile({ value, status, reason, quiet, label, sub, action, onClick }) {
  const known = status === 'ok' && typeof value === 'number'
  return (
    <button type="button" className="hb-tile" onClick={onClick}>
      {known
        ? <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, minWidth: '2ch', color: quiet ? '#7a786f' : '#e8e6df', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        : <span style={{ fontSize: 12, color: '#7a786f', minWidth: '2ch' }} title={reason || undefined}>{status === 'loading' ? '...' : 'Unavailable'}</span>}
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#7a786f' }}>{sub}</span>
      </span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e', whiteSpace: 'nowrap' }}>{action}</span>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const narrow   = useIsNarrow()

  // Each source loads on its own. 'unavailable' means the database could not supply it,
  // and the screen says so instead of showing 0 (spec section 2).
  const [clientsRes,   setClientsRes]   = useState({ status: 'loading', rows: [] })
  const [queueRes,     setQueueRes]     = useState({ status: 'loading', rows: [] })
  const [inventoryRes, setInventoryRes] = useState({ status: 'loading', rows: [] })
  const [sentRes,      setSentRes]      = useState({ status: 'loading', ids: new Set() })
  const [goals,        setGoals]        = useState(loadGoals)
  const [showAwaiting, setShowAwaiting] = useState(false)

  useEffect(() => {
    const settle = (set) => (r) => set({ ...r, status: r.ok ? 'ok' : 'unavailable' })
    loadClientsResult().then(settle(setClientsRes))
    agentQueueService.loadAllResult().then(settle(setQueueRes))
    inventoryService.loadAllResult().then(settle(setInventoryRes))
    loadSentReplyClientIds().then(settle(setSentRes))
  }, [])

  const clients = useMemo(() => clientsRes.rows || [], [clientsRes])

  // Welcome modal
  const [welcomeOpen,   setWelcomeOpen]   = useState(false)
  const [briefingShown, setBriefingShown] = useState(false)

  useEffect(() => {
    const todayStr = todayISO()
    const last = localStorage.getItem(LS_WELCOME)
    if (last !== todayStr) {
      localStorage.setItem(LS_WELCOME, todayStr)
      setWelcomeOpen(true)
    }
  }, [])

  // Quote
  const [quoteIdx,  setQuoteIdx]  = useState(getDailyIdx)
  const [readAloud, setReadAloud] = useState(false)

  // Business date (Los Angeles)
  const todayStr   = todayISO()
  const todayYear  = Number(todayStr.slice(0, 4))
  const todayMonth = Number(todayStr.slice(5, 7)) - 1
  const todayDay   = Number(todayStr.slice(8, 10))

  // Calendar
  const [calYear,     setCalYear]     = useState(todayYear)
  const [calMonth,    setCalMonth]    = useState(todayMonth)
  const [expandedDay, setExpandedDay] = useState(null)

  // Earnings
  const [period, setPeriod] = useState('month')

  // Goals modal
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [goalForm,    setGoalForm]    = useState({ name: '', targetAmount: '', category: 'Rent' })

  // Toast
  const [toast, setToast] = useState(null)

  function showToast(msg, color = '#7aab8f') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Derived: overview (null means unavailable) ──

  const clientsOk  = clientsRes.status === 'ok'
  const awaiting   = clientsOk && sentRes.status === 'ok' ? awaitingResponse(clients, sentRes.ids) : null
  const queueCount = queueRes.status === 'ok' ? queueRes.rows.filter(c => c.status === 'pending').length : null
  const scheduled  = clientsOk ? scheduledCounts(clients) : null
  const supplies   = inventoryRes.status === 'ok' ? lowSupplies(inventoryRes.rows) : null
  const recent     = useMemo(() => recentActivity(clients, 3), [clients])

  // ── Derived: calendar ──

  const sessionMap     = useMemo(() => sessionDays(clients), [clients])
  const isCurrentMonth = calYear === todayYear && calMonth === todayMonth
  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow       = new Date(calYear, calMonth, 1).getDay()
  const yearStr        = String(calYear).padStart(4, '0')
  const monthStr       = String(calMonth + 1).padStart(2, '0')
  const monthPrefix    = `${yearStr}-${monthStr}-`

  const calCells = []
  for (let i = 0; i < firstDow; i++) calCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d)

  const activeCount = Object.keys(sessionMap).filter(k => k.startsWith(monthPrefix)).length

  // ── Derived: earnings (client payment records, by session date) ──

  const earn             = useMemo(() => clientsOk ? earnings(clients, period, todayStr) : null, [clients, clientsOk, period, todayStr])
  const thisMonthRevenue = useMemo(() => clientsOk ? earnings(clients, 'month', todayStr).revenue : null, [clients, clientsOk, todayStr])

  // ── Handlers: quote ──

  function handleRefresh() {
    const idx = getRefreshIdx(quoteIdx)
    setQuoteIdx(idx)
    if (readAloud) speakText(QUOTES[idx].text)
  }

  function handleToggleReadAloud() {
    const next = !readAloud
    setReadAloud(next)
    if (next) speakText(QUOTES[quoteIdx].text)
  }

  // ── Handlers: calendar ──

  function handlePrevMonth() {
    setExpandedDay(null)
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function handleNextMonth() {
    if (isCurrentMonth) return
    setExpandedDay(null)
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function handleDayClick(key) {
    if (!sessionMap[key]) return
    setExpandedDay(prev => prev === key ? null : key)
  }

  // ── Handlers: goals ──

  function handleSaveGoal() {
    const name   = goalForm.name.trim()
    const target = parseFloat(goalForm.targetAmount)
    if (!name || !target || target <= 0) return
    const newGoal = {
      id: crypto.randomUUID(),
      name,
      targetAmount: target,
      category: goalForm.category,
      createdAt: new Date().toISOString(),
    }
    const updated = [...goals, newGoal]
    setGoals(updated)
    saveGoals(updated)
    setAddGoalOpen(false)
    setGoalForm({ name: '', targetAmount: '', category: 'Rent' })
  }

  function handleDeleteGoal(id) {
    if (!window.confirm('Delete this goal?')) return
    const updated = goals.filter(g => g.id !== id)
    setGoals(updated)
    saveGoals(updated)
  }

  // ── Shared field styles ──

  const FIELD = {
    width: '100%', background: '#1e1e1b', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', minHeight: 44,
  }

  const LABEL = {
    fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
    display: 'block', marginBottom: 6,
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const outerPad = narrow ? '28px 16px 100px' : '36px 32px 80px'

  return (
    <div style={{ padding: outerPad }}>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hb-section { animation: fadeUp 0.35s ease both; }
        .hb-section:nth-child(1) { animation-delay: 0.00s; }
        .hb-section:nth-child(2) { animation-delay: 0.05s; }
        .hb-section:nth-child(3) { animation-delay: 0.10s; }
        .hb-section:nth-child(4) { animation-delay: 0.15s; }
        .hb-section:nth-child(5) { animation-delay: 0.20s; }
        .hb-section:nth-child(6) { animation-delay: 0.25s; }
        .hb-day-btn:hover { opacity: 0.85; }
        .hb-period-btn:hover { opacity: 0.85; }
        .hb-nav-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px 10px; min-height: 44px; }
        .hb-nav-btn:hover { opacity: 0.7; }
        .hb-ghost-btn { background: transparent; border: 1px solid rgba(201,169,110,0.35); border-radius: 8px; padding: 7px 14px; min-height: 40px; font-family: var(--font-mono); font-size: 11px; color: #c9a96e; cursor: pointer; letter-spacing: 0.04em; transition: border-color 0.15s; }
        .hb-ghost-btn:hover { border-color: #c9a96e; }
        .hb-gold-btn { background: #c9a96e; border: none; border-radius: 9px; padding: 11px 24px; min-height: 44px; font-family: var(--font-body); font-size: 14px; font-weight: 600; color: #0e0e0d; cursor: pointer; transition: opacity 0.15s; }
        .hb-gold-btn:hover { opacity: 0.88; }
        .hb-shortcut { background: #161614; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 12px 16px; min-height: 48px; font-family: var(--font-body); font-size: 14px; color: #e8e6df; cursor: pointer; transition: border-color 0.15s; }
        .hb-shortcut:hover, .hb-shortcut:focus-visible { border-color: #c9a96e; outline: none; }
        .hb-shortcut-primary { color: #c9a96e; border-color: rgba(201,169,110,0.55); }
        .hb-link { background: none; border: none; padding: 6px 0; min-height: 32px; font-family: var(--font-mono); font-size: 11px; color: #c9a96e; cursor: pointer; letter-spacing: 0.04em; }
        .hb-link:hover { opacity: 0.8; }
        .hb-tile { display: flex; gap: 14px; align-items: center; width: 100%; text-align: left; background: #0e0e0d; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px 16px; min-height: 64px; color: #e8e6df; cursor: pointer; font-family: var(--font-body); transition: border-color 0.15s; }
        .hb-tile:hover, .hb-tile:focus-visible { border-color: rgba(201,169,110,0.5); outline: none; }
        .hb-row-btn { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; text-align: left; background: none; border: none; border-radius: 6px; padding: 7px 4px; min-height: 36px; color: #e8e6df; font-family: var(--font-body); font-size: 13px; cursor: pointer; }
        .hb-row-btn:hover { background: rgba(255,255,255,0.03); }
        .hb-muted-btn { background: transparent; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 11px 16px; min-height: 44px; font-family: var(--font-body); font-size: 14px; color: #7a786f; cursor: pointer; }
      `}</style>

      {/* ══ GREETING ══ */}
      <div className="hb-section" style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: narrow ? 28 : 34, color: '#e8e6df', fontWeight: 600, lineHeight: 1.15, margin: 0 }}>
          {getGreeting()}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', letterSpacing: '0.06em', marginTop: 6 }}>
          {longDate(todayStr)}
        </p>
      </div>

      {/* ══ SHORTCUTS ══ */}
      <nav className="hb-section" aria-label="Shortcuts" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {SHORTCUTS.map(({ label, path }, i) => (
          <button key={path} type="button" className={`hb-shortcut${i === 0 ? ' hb-shortcut-primary' : ''}`} onClick={() => navigate(path)}>
            {label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ══ YOUR STUDIO AT A GLANCE ══ */}
        <section className="hb-section" style={CARD} aria-label="Your studio at a glance">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={LABEL_MONO}>Your studio at a glance</p>
            <button type="button" className="hb-link" onClick={() => navigate('/projects')}>Full board</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Tile
              value={awaiting?.length}
              status={awaiting ? 'ok' : unavailableOr(clientsRes, sentRes)}
              reason={clientsRes.message || sentRes.message}
              label="Inquiries awaiting a response"
              sub="as recorded in MACRI"
              action={showAwaiting ? 'Hide' : 'Show'}
              onClick={() => setShowAwaiting(v => !v)}
            />
            <Tile
              value={queueCount}
              status={queueRes.status}
              reason={queueRes.message}
              label="Agent cards to review"
              sub="drafts waiting for your approval"
              action="Review"
              onClick={() => navigate('/agents')}
            />
            <Tile
              value={scheduled?.total}
              status={clientsRes.status}
              reason={clientsRes.message}
              label="Projects marked scheduled"
              sub={scheduled ? `${scheduled.consults} ${scheduled.consults === 1 ? 'consult' : 'consults'}, ${scheduled.tattoos} ${scheduled.tattoos === 1 ? 'tattoo' : 'tattoos'}` : 'consults and tattoos'}
              action="Project Wall"
              onClick={() => navigate('/projects')}
            />
            <Tile
              value={supplies?.low}
              status={inventoryRes.status}
              reason={inventoryRes.message}
              quiet={supplies?.low === 0}
              label="Supplies running low"
              sub={supplies?.missing ? `at or below your low stock level; ${supplies.missing} ${supplies.missing === 1 ? 'item is' : 'items are'} missing a count` : 'at or below your low stock level'}
              action="Supplies"
              onClick={() => navigate('/supplies')}
            />
          </div>

          {showAwaiting && awaiting && (
            <div style={{ marginTop: 12, background: '#0e0e0d', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {awaiting.length === 0 && <p style={{ fontSize: 13, color: '#7a786f', margin: '6px 0' }}>None recorded.</p>}
              {awaiting.slice(0, 8).map(c => (
                <button key={c.id} type="button" className="hb-row-btn" onClick={() => navigate('/crm', { state: { openClientId: c.id } })}>
                  <span>{c.name || 'Unnamed client'}</span>
                  <span style={{ color: '#7a786f', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Open</span>
                </button>
              ))}
              {awaiting.length > 8 && <p style={{ fontSize: 12, color: '#7a786f', margin: '6px 0 0' }}>{awaiting.length - 8} more in CRM.</p>}
              <button type="button" className="hb-link" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => navigate('/crm')}>Open CRM</button>
            </div>
          )}

          {/* Today */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 16, paddingTop: 12, fontSize: 13, color: '#7a786f' }}>
            <span>Collected today: <span style={{ color: '#7a786f' }} title="Session records have one date (the session date) and no date for when a payment was received.">Unavailable, payment dates are not recorded</span></span>
          </div>

          {/* Recent activity */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={LABEL_MONO}>Recent activity</p>
              <button type="button" className="hb-link" onClick={() => navigate('/crm')}>CRM</button>
            </div>
            {clientsRes.status === 'loading' && <p style={{ fontSize: 13, color: '#7a786f', margin: 0 }}>Loading...</p>}
            {clientsRes.status === 'unavailable' && <p style={{ fontSize: 13, color: '#7a786f', margin: 0 }} title={clientsRes.message}>Unavailable</p>}
            {clientsOk && recent.length === 0 && <p style={{ fontSize: 13, color: '#7a786f', margin: 0 }}>No activity recorded yet.</p>}
            {clientsOk && recent.map(e => (
              <button key={e.id} type="button" className="hb-row-btn" onClick={() => navigate('/crm', { state: { openClientId: e.clientId } })}>
                <span style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', flex: '0 0 48px', paddingTop: 1 }}>{shortDate(e.timestamp)}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{e.clientName} · {e.text}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ══ EARNINGS AND GOALS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'start' }}>

          <section className="hb-section" style={CARD} aria-label="Earnings">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <p style={LABEL_MONO}>Earnings</p>
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
                {[
                  { key: 'week',  label: 'Week' },
                  { key: 'month', label: 'Month' },
                  { key: 'ytd',   label: 'YTD' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className="hb-period-btn"
                    onClick={() => setPeriod(key)}
                    style={{
                      background: period === key ? '#c9a96e' : 'transparent', border: 'none', borderRadius: 6,
                      padding: '5px 12px', minHeight: 32, fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: period === key ? '#0e0e0d' : '#7a786f', cursor: 'pointer', letterSpacing: '0.04em',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[
                { label: 'Revenue',         value: earn && fmt(earn.revenue),       color: '#e8e6df', sub: null },
                { label: 'Tips',            value: earn && fmt(earn.tips),          color: '#c9a96e', sub: null },
                { label: 'Avg per Session', value: earn && (earn.avgPerSession === null ? null : fmt(earn.avgPerSession)), color: '#e8e6df', sub: earn && earn.avgPerSession === null ? 'No sessions in this period' : null },
                { label: 'Tax Aside',       value: earn && fmt(earn.taxAside),      color: '#c9a96e', sub: '28% estimate, not a confirmed tax policy' },
              ].map(({ label, value, color, sub }) => (
                <div key={label} style={{ background: '#0e0e0d', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', minWidth: 0 }}>
                  <p style={{ ...LABEL_MONO, marginBottom: 8 }}>{label}</p>
                  {value
                    ? <p style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color, fontWeight: 600, lineHeight: 1, margin: 0 }}>{value}</p>
                    : <p style={{ fontSize: 14, color: '#7a786f', margin: 0 }} title={clientsRes.message}>{clientsRes.status === 'loading' ? 'Loading...' : 'Unavailable'}</p>}
                  {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 6 }}>{sub}</p>}
                </div>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 14, lineHeight: 1.6 }}>
              {earn ? `${earn.start} to ${earn.end}. ` : ''}From client payment records: amount paid on each session, by session date. Deposits recorded in the deposit field are not included. Finance may differ.
            </p>
            <button type="button" className="hb-link" style={{ marginTop: 8 }} onClick={() => navigate('/finances')}>Open Finances</button>
          </section>

          <section className="hb-section" style={CARD} aria-label="Goals">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={LABEL_MONO}>Goals</p>
              <button className="hb-ghost-btn" onClick={() => setAddGoalOpen(true)}>Add Goal</button>
            </div>

            {goals.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', textAlign: 'center', padding: '20px 0' }}>
                No goals yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {goals.map(goal => {
                  const target = parseFloat(goal.targetAmount) || 0
                  const known  = thisMonthRevenue !== null
                  const pct    = known && target > 0 ? Math.min(thisMonthRevenue / target, 1) : 0
                  const pctInt = Math.round(pct * 100)
                  return (
                    <div key={goal.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#e8e6df', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {goal.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {goal.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: pct >= 1 ? '#7aab8f' : '#7a786f' }}>
                            {known ? `${pctInt}%` : 'Unavailable'}
                          </span>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            aria-label="Delete goal"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>

                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ height: '100%', width: `${pct * 100}%`, background: pct >= 1 ? '#7aab8f' : '#c9a96e', borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#e8e6df' }}>
                          {known ? fmt(thisMonthRevenue) : 'Unavailable'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f' }}>
                          {fmt(target)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 16 }}>
              Saved on this device. Progress uses this month's revenue above.
            </p>
          </section>
        </div>

        {/* ══ SESSION CALENDAR ══ */}
        <section className="hb-section" style={CARD} aria-label="Session days">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={LABEL_MONO}>Session Days</p>
            {clientsRes.status === 'unavailable' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#c9a96e' }} title={clientsRes.message}>Showing this device's copy</span>
            )}
          </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button className="hb-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
                <IconChevronLeft />
              </button>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#e8e6df' }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                className="hb-nav-btn"
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                aria-label="Next month"
                style={{ opacity: isCurrentMonth ? 0.25 : 1, cursor: isCurrentMonth ? 'default' : 'pointer' }}
              >
                <IconChevronRight />
              </button>
            </div>

            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                {DAY_LABELS.map(l => (
                  <div key={l} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#7a786f', letterSpacing: '0.06em' }}>
                    {l}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calCells.map((day, idx) => {
                  if (day === null) return <div key={`ph-${idx}`} style={{ height: 34 }} />
                  const key      = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`
                  const active   = !!sessionMap[key]
                  const isToday  = isCurrentMonth && day === todayDay
                  const expanded = expandedDay === key
                  return (
                    <button
                      key={key}
                      className="hb-day-btn"
                      onClick={() => handleDayClick(key)}
                      style={{
                        width: '100%', aspectRatio: '1 / 1', maxWidth: 34, borderRadius: '50%',
                        background: active ? '#c9a96e' : 'transparent',
                        color:  active ? '#0e0e0d' : '#7a786f',
                        border: isToday && !active ? '1px solid rgba(201,169,110,0.4)' : 'none',
                        cursor: active ? 'pointer' : 'default',
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        fontWeight: active ? 600 : 400,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                        outline: expanded ? '2px solid rgba(201,169,110,0.6)' : 'none',
                        outlineOffset: 2,
                        transition: 'background 0.15s',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {expandedDay && sessionMap[expandedDay] && (
              <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                {sessionMap[expandedDay].map((s, i, arr) => (
                  <div
                    key={s.id || i}
                    style={{
                      paddingTop: i === 0 ? 0 : 10,
                      paddingBottom: 10,
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e8e6df', marginBottom: 2 }}>
                      {s.clientName}
                    </p>
                    {s.tattooDescription && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginBottom: 2 }}>
                        {s.tattooDescription}
                      </p>
                    )}
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
                      Amount paid {fmt(s.amountPaid)}
                      {parseFloat(s.tip) > 0 ? ` + ${fmt(s.tip)} tip` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 14, letterSpacing: '0.06em' }}>
              {clientsOk
                ? `${activeCount} active ${activeCount === 1 ? 'day' : 'days'} this month`
                : clientsRes.status === 'loading' ? 'Loading...' : 'Active days unavailable'}
            </p>
        </section>

        {/* ══ DAILY QUOTE ══ */}
        <div className="hb-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 18 }}>
          <p style={{ margin: 0, minWidth: 0, flex: '1 1 320px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 15, color: '#e8e6df', lineHeight: 1.6 }}>{QUOTES[quoteIdx].text}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 10 }}>{QUOTES[quoteIdx].author}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleRefresh} aria-label="New quote" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, opacity: 0.7, display: 'flex', alignItems: 'center', minHeight: 44 }}>
              <IconRefresh />
            </button>
            <button
              onClick={handleToggleReadAloud}
              aria-label="Toggle read aloud"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}
            >
              <div style={{ width: 32, height: 18, borderRadius: 9, background: readAloud ? '#c9a96e' : 'rgba(255,255,255,0.08)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, width: 14, height: 14, borderRadius: 7, background: '#e8e6df', display: 'block', left: readAloud ? 16 : 2, transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', letterSpacing: '0.06em' }}>Read aloud</span>
            </button>
          </div>
        </div>

      </div>

      {/* ══ ADD GOAL MODAL ══ */}
      {addGoalOpen && (
        <div
          onClick={() => setAddGoalOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.78)',
            zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161614',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 28,
              width: '100%', maxWidth: 440,
            }}
          >
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df', marginBottom: 22 }}>
              Add Goal
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Goal Name</label>
              <input
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monthly Rent"
                style={FIELD}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Target Amount</label>
              <input
                type="number"
                value={goalForm.targetAmount}
                onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                placeholder="2000"
                style={FIELD}
              />
            </div>

            <div style={{ marginBottom: 26 }}>
              <label style={LABEL}>Category</label>
              <select
                value={goalForm.category}
                onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}
                style={{ ...FIELD, appearance: 'none' }}
              >
                {['Rent', 'Equipment', 'Tax Reserve', 'Savings', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="hb-muted-btn" onClick={() => setAddGoalOpen(false)}>Cancel</button>
              <button className="hb-gold-btn" onClick={handleSaveGoal}>Save Goal</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ WELCOME MODAL (unchanged logic) ══ */}
      {welcomeOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            background: '#161614',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: 32,
            width: '100%', maxWidth: 460,
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.12em' }}>
              MACRI
            </p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: '#e8e6df', textAlign: 'center', marginTop: 12 }}>
              {getGreeting()}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', textAlign: 'center', marginTop: 8 }}>
              Your studio is ready. What would you like to do?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setBriefingShown(true)}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#1e1e1b', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e8e6df', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Run my briefing
              </button>
              <button
                onClick={() => { speakText(QUOTES[quoteIdx].text); setWelcomeOpen(false) }}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#1e1e1b', border: '1px solid rgba(201,169,110,0.3)',
                  color: '#c9a96e', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Read me something inspiring
              </button>
              <button
                onClick={() => setWelcomeOpen(false)}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#c9a96e', border: 'none',
                  color: '#0e0e0d', fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Quick essentials only
              </button>
            </div>

            {briefingShown && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', textAlign: 'center', marginTop: 16 }}>
                Briefing agent arrives June 1.
              </p>
            )}

            <button
              onClick={() => setWelcomeOpen(false)}
              style={{
                display: 'block', width: '100%', marginTop: 14,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
                textAlign: 'center', minHeight: 44,
              }}
            >
              Enter Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          background: '#161614', border: `1px solid ${toast.color}`,
          borderRadius: 8, padding: '10px 20px',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: toast.color,
          zIndex: 800, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

    </div>
  )
}
