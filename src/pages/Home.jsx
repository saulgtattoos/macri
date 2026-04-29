import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES } from '../constants/stages'

// ─── Storage ──────────────────────────────────────────────────────────────────

const LS_CLIENTS = 'macri_crm_clients'
const LS_GOALS   = 'macri_goals'
const LS_WELCOME = 'macri_welcome_last_seen'

function loadClients() {
  try { return JSON.parse(localStorage.getItem(LS_CLIENTS)) || [] } catch { return [] }
}
function loadGoals() {
  try { return JSON.parse(localStorage.getItem(LS_GOALS)) || [] } catch { return [] }
}
function saveGoals(list) {
  localStorage.setItem(LS_GOALS, JSON.stringify(list))
}
function saveClients(list) {
  localStorage.setItem(LS_CLIENTS, JSON.stringify(list))
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: 'Your body is a journal, and tattoos are the stories.',              author: 'Johnny Depp' },
  { text: 'Art is not what you see, but what you make others see.',            author: 'Edgar Degas' },
  { text: 'Every artist dips his brush in his own soul.',                      author: 'Henry Ward Beecher' },
  { text: 'Creativity takes courage.',                                         author: 'Henri Matisse' },
  { text: 'The purpose of art is washing the dust of daily life off our souls.', author: 'Pablo Picasso' },
  { text: 'Art enables us to find ourselves and lose ourselves at the same time.', author: 'Thomas Merton' },
  { text: "To create one's own world takes courage.",                          author: "Georgia O'Keeffe" },
  { text: 'An artist is not paid for his labor but for his vision.',           author: 'James Whistler' },
  { text: 'Great art picks up where nature ends.',                             author: 'Marc Chagall' },
  { text: 'The job of the artist is always to deepen the mystery.',            author: 'Francis Bacon' },
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
    const key = import.meta.env.VITE_ELEVENLABS_KEY
    const voiceId = 'Q2Qd4P9qaDNuBFUcFCQr'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
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

function buildSessionMap(clients) {
  const map = {}
  for (const c of clients) {
    for (const s of (c.sessions || [])) {
      const key = (s.date || '').trim().slice(0, 10)
      if (key.length < 10) continue
      if (!map[key]) map[key] = []
      map[key].push({ ...s, clientName: c.name || 'Unknown' })
    }
  }
  return map
}

// ─── Earnings helpers ─────────────────────────────────────────────────────────

function parseSessionDate(str) {
  if (!str) return null
  const p = str.trim().split('-')
  if (p.length < 3) return null
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
}

function getDateRange(period) {
  const now = new Date()
  if (period === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const start = new Date(now); start.setDate(now.getDate() - diff); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  }
}

function filterSessions(clients, period) {
  const { start, end } = getDateRange(period)
  const result = []
  for (const c of clients) {
    for (const s of (c.sessions || [])) {
      const d = parseSessionDate(s.date)
      if (d && d >= start && d <= end) result.push(s)
    }
  }
  return result
}

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US')
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = STAGES.filter(s => s !== 'Archive')

const STAGE_COLORS = {
  'Inquiry':          '#7a786f',
  'Inquiry Response': '#c9a96e',
  'Consultation':     '#c9a96e',
  'Design Phase':     '#7a786f',
  'Approval':         '#7aab8f',
  'Scheduled':        '#7aab8f',
  'Completed':        '#7aab8f',
}

// ─── Shared card style ────────────────────────────────────────────────────────

const CARD = {
  background: '#161614',
  border: '1px solid #2a2a27',
  borderRadius: 12,
  padding: '20px 24px',
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

// ─── Session log helpers ──────────────────────────────────────────────────────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LOG_FORM_INIT = {
  date: '', tattooDescription: '', placement: '', isTouchUp: false,
  deposit: '', depositRefund: false, tattooPrice: '', amountPaid: '',
  tip: '', paymentMethod: 'Cash', giftCardCode: '', discountCode: '',
  originalPrice: '', discountApplied: false, notes: '',
}

// ─── Welcome helpers ──────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning, Saul.'
  if (h < 17) return 'Good afternoon, Saul.'
  return 'Good evening, Saul.'
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const narrow   = useIsNarrow()

  const [clients, setClients]         = useState(loadClients)
  const [goals,   setGoals]           = useState(loadGoals)

  // Quote
  const [quoteIdx,  setQuoteIdx]  = useState(getDailyIdx)
  const [readAloud, setReadAloud] = useState(false)

  // Calendar
  const today    = new Date()
  const [calYear,     setCalYear]     = useState(today.getFullYear())
  const [calMonth,    setCalMonth]    = useState(today.getMonth())
  const [expandedDay, setExpandedDay] = useState(null)

  // Earnings
  const [period, setPeriod] = useState('month')

  // Goals modal
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [goalForm,    setGoalForm]    = useState({ name: '', targetAmount: '', category: 'Rent' })

  // Log Session modal
  const [logOpen,           setLogOpen]           = useState(false)
  const [logStep,           setLogStep]           = useState(1)
  const [logSelectedClient, setLogSelectedClient] = useState(null)
  const [logSearch,         setLogSearch]         = useState('')
  const [logForm,           setLogForm]           = useState(LOG_FORM_INIT)

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

  // ── Derived: calendar ──

  const sessionMap     = useMemo(() => buildSessionMap(clients), [clients])
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth()
  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow       = new Date(calYear, calMonth, 1).getDay()
  const yearStr        = String(calYear).padStart(4, '0')
  const monthStr       = String(calMonth + 1).padStart(2, '0')
  const monthPrefix    = `${yearStr}-${monthStr}-`

  const calCells = []
  for (let i = 0; i < firstDow; i++) calCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d)

  const activeCount = Object.keys(sessionMap).filter(k => k.startsWith(monthPrefix)).length

  // ── Derived: pipeline ──

  const stageCounts = useMemo(() => {
    const counts = {}
    for (const s of PIPELINE_STAGES) counts[s] = 0
    for (const c of clients) {
      if (c.stage && counts[c.stage] !== undefined) counts[c.stage]++
    }
    return counts
  }, [clients])

  const bottleneckStage = PIPELINE_STAGES.find(s => stageCounts[s] >= 3) || null

  // ── Derived: earnings ──

  const periodSessions = useMemo(() => filterSessions(clients, period), [clients, period])
  const revenue        = periodSessions.reduce((s, x) => s + (parseFloat(x.amountPaid) || 0), 0)
  const tips           = periodSessions.reduce((s, x) => s + (parseFloat(x.tip) || 0), 0)
  const avgPerSession  = periodSessions.length > 0 ? revenue / periodSessions.length : 0
  const taxAside       = revenue * 0.28

  // ── Derived: goals progress ──

  const thisMonthRevenue = useMemo(() => {
    return filterSessions(clients, 'month')
      .reduce((s, x) => s + (parseFloat(x.amountPaid) || 0), 0)
  }, [clients])

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

  // ── Handlers: log session ──

  function handleOpenLogSession() {
    setLogForm({ ...LOG_FORM_INIT, date: todayISO() })
    setLogStep(1)
    setLogSelectedClient(null)
    setLogSearch('')
    setLogOpen(true)
  }

  function handleLogSave() {
    if (!logSelectedClient) return
    const session = {
      id: crypto.randomUUID(),
      ...logForm,
      deposit:       parseFloat(logForm.deposit)       || 0,
      tattooPrice:   parseFloat(logForm.tattooPrice)   || 0,
      amountPaid:    parseFloat(logForm.amountPaid)    || 0,
      tip:           parseFloat(logForm.tip)           || 0,
      originalPrice: parseFloat(logForm.originalPrice) || 0,
    }
    const updated = clients.map(c =>
      c.id === logSelectedClient.id
        ? { ...c, sessions: [...(c.sessions || []), session] }
        : c
    )
    saveClients(updated)
    setClients(updated)
    setLogOpen(false)
  }

  // ── Derived: log session client list ──

  const activeClients   = clients.filter(c => c.stage !== 'Archive')
  const filteredClients = logSearch.trim()
    ? activeClients.filter(c => (c.name || '').toLowerCase().includes(logSearch.toLowerCase()))
    : activeClients

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: narrow ? '24px 16px 80px' : '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══ HEADER ROW ══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df' }}>Home Base</span>
        <button
          onClick={handleOpenLogSession}
          style={{
            background: '#c9a96e', color: '#0e0e0d', border: 'none',
            borderRadius: 8, padding: '10px 20px', minHeight: 44,
            fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Log Session
        </button>
      </div>

      {/* ══ SECTION 1: Daily Quote ══ */}
      <div style={CARD}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleRefresh}
            aria-label="New quote"
            style={{
              position: 'absolute', top: 0, right: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#7a786f', padding: 4, display: 'flex', alignItems: 'center',
            }}
          >
            <IconRefresh />
          </button>

          <p style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 18,
            color: '#e8e6df',
            fontStyle: 'italic',
            textAlign: 'center',
            lineHeight: 1.55,
            paddingRight: 28,
          }}>
            {QUOTES[quoteIdx].text}
          </p>

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#7a786f',
            textAlign: 'center',
            marginTop: 10,
          }}>
            {QUOTES[quoteIdx].author}
          </p>
        </div>
      </div>

      {/* Read aloud toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -8, paddingLeft: 4 }}>
        <button
          onClick={handleToggleReadAloud}
          aria-label="Toggle read aloud"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 0', minHeight: 44, display: 'flex', alignItems: 'center',
          }}
        >
          <div style={{
            width: 36, height: 20, borderRadius: 10,
            background: readAloud ? '#c9a96e' : '#2a2a27',
            position: 'relative', flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8,
              background: '#e8e6df', display: 'block',
              left: readAloud ? 18 : 2,
              transition: 'left 0.2s',
            }} />
          </div>
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
          Read quote aloud
        </span>
      </div>

      {/* ══ SECTION 2: Active Session Days ══ */}
      <div style={CARD}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e', marginBottom: 4 }}>
          Active Session Days
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginBottom: 16 }}>
          tap an active day to view sessions
        </p>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#7a786f', padding: '8px 12px', minHeight: 44,
              display: 'flex', alignItems: 'center',
            }}
          >
            <IconChevronLeft />
          </button>

          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#e8e6df' }}>
            {MONTH_NAMES[calMonth]} {calYear}
          </span>

          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            aria-label="Next month"
            style={{
              background: 'none', border: 'none',
              cursor: isCurrentMonth ? 'default' : 'pointer',
              padding: '8px 12px', minHeight: 44,
              display: 'flex', alignItems: 'center',
            }}
          >
            <IconChevronRight color={isCurrentMonth ? '#3a3a37' : '#7a786f'} />
          </button>
        </div>

        {/* Calendar grid — max width keeps circles compact on desktop */}
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {/* Day-of-week labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAY_LABELS.map(l => (
              <div key={l} style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: '#7a786f',
                paddingBottom: 4,
              }}>
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calCells.map((day, idx) => {
              if (day === null) return <div key={`ph-${idx}`} style={{ height: 36 }} />
              const key      = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`
              const active   = !!sessionMap[key]
              const isToday  = isCurrentMonth && day === today.getDate()
              const expanded = expandedDay === key
              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(key)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: active ? '#c9a96e' : '#1e1e1b',
                    color: active ? '#0e0e0d' : '#7a786f',
                    border: isToday ? '2px solid #c9a96e' : 'none',
                    cursor: active ? 'pointer' : 'default',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto',
                    outline: expanded ? '2px solid #c9a96e' : 'none',
                    outlineOffset: 2,
                    transition: 'background 0.15s',
                    boxSizing: 'border-box',
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Expanded day sessions */}
        {expandedDay && sessionMap[expandedDay] && (
          <div style={{ marginTop: 16, borderTop: '1px solid #2a2a27', paddingTop: 12 }}>
            {sessionMap[expandedDay].map((s, i, arr) => (
              <div
                key={s.id || i}
                style={{
                  paddingTop: i === 0 ? 0 : 10,
                  paddingBottom: 10,
                  borderBottom: i < arr.length - 1 ? '1px solid #2a2a27' : 'none',
                }}
              >
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e8e6df', marginBottom: 2 }}>
                  {s.clientName}
                </p>
                {s.tattooDescription && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', marginBottom: 2 }}>
                    {s.tattooDescription}
                  </p>
                )}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f' }}>
                  Paid {fmt(s.amountPaid)}
                  {parseFloat(s.tip) > 0 ? ` + ${fmt(s.tip)} tip` : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginTop: 14 }}>
          {activeCount} active {activeCount === 1 ? 'day' : 'days'} this month
        </p>
      </div>

      {/* ══ SECTION 3: Studio Pipeline ══ */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e' }}>
            Studio Pipeline
          </span>
          <button
            onClick={() => navigate('/crm')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
              padding: '8px 4px', minHeight: 44,
            }}
          >
            Full Board
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 8,
        }}>
          {PIPELINE_STAGES.map(stage => (
            <div key={stage} style={{
              background: '#1e1e1b',
              border: '1px solid #2a2a27',
              borderRadius: 8,
              padding: '12px 8px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STAGE_COLORS[stage] || '#7a786f',
                margin: '0 auto 8px',
              }} />
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: '#e8e6df', lineHeight: 1 }}>
                {stageCounts[stage]}
              </p>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f',
                textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.05em',
                lineHeight: 1.3,
              }}>
                {stage}
              </p>
            </div>
          ))}
        </div>

        {bottleneckStage && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f09595', marginTop: 14 }}>
            {bottleneckStage} is getting full. Check your schedule.
          </p>
        )}
      </div>

      {/* ══ SECTION 4: Earnings and Metrics ══ */}
      <div style={CARD}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e', marginBottom: 16 }}>
          Earnings and Metrics
        </p>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'week',  label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'ytd',   label: 'YTD' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                background: period === key ? '#c9a96e' : '#1e1e1b',
                border: '1px solid #2a2a27',
                borderRadius: 8,
                padding: '6px 14px',
                minHeight: 44,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: period === key ? '#0e0e0d' : '#7a786f',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 2x2 metric tiles — max width keeps tiles compact on desktop */}
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'Revenue',         value: fmt(revenue),        color: '#e8e6df', sub: null },
            { label: 'Tips',            value: fmt(tips),           color: '#c9a96e', sub: null },
            { label: 'Avg per Session', value: fmt(avgPerSession),  color: '#e8e6df', sub: null },
            { label: 'Tax Aside',       value: fmt(taxAside),       color: '#c9a96e', sub: '28% rule' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{
              background: '#1e1e1b',
              border: '1px solid #2a2a27',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginBottom: 6 }}>
                {label}
              </p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 28, color, lineHeight: 1 }}>
                {value}
              </p>
              {sub && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 4 }}>
                  {sub}
                </p>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* ══ SECTION 5: Goal Progress Bars ══ */}
      <div style={{ ...CARD, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e' }}>
            Goals
          </span>
          <button
            onClick={() => setAddGoalOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid #c9a96e',
              borderRadius: 8,
              padding: '6px 12px',
              minHeight: 44,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#c9a96e',
              cursor: 'pointer',
            }}
          >
            Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f',
            textAlign: 'center', padding: '16px 0',
          }}>
            No goals yet. Tap Add Goal to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {goals.map(goal => {
              const target = parseFloat(goal.targetAmount) || 0
              const pct    = target > 0 ? Math.min(thisMonthRevenue / target, 1) : 0
              return (
                <div key={goal.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal.name}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f',
                        textTransform: 'uppercase', flexShrink: 0,
                      }}>
                        {goal.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      aria-label="Delete goal"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px 8px', minHeight: 44, minWidth: 44,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                  <div style={{ height: 6, background: '#2a2a27', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                      height: '100%', width: `${pct * 100}%`,
                      background: '#7aab8f', borderRadius: 3,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e8e6df' }}>
                      {fmt(thisMonthRevenue)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
                      {fmt(target)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ Add Goal Modal ══ */}
      {addGoalOpen && (
        <div
          onClick={() => setAddGoalOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161614',
              border: '1px solid #2a2a27',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df', marginBottom: 20 }}>
              Add Goal
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>
                Goal Name
              </label>
              <input
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monthly Rent"
                style={{
                  width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                  fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>
                Target Amount
              </label>
              <input
                type="number"
                value={goalForm.targetAmount}
                onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                placeholder="e.g. 2000"
                style={{
                  width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                  fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>
                Category
              </label>
              <select
                value={goalForm.category}
                onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}
                style={{
                  width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                  fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                  appearance: 'none', boxSizing: 'border-box',
                }}
              >
                {['Rent', 'Equipment', 'Tax Reserve', 'Savings', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAddGoalOpen(false)}
                style={{
                  background: 'transparent', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 16px',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  color: '#7a786f', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                style={{
                  background: '#c9a96e', border: 'none',
                  borderRadius: 8, padding: '10px 16px',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: 600, color: '#0e0e0d', cursor: 'pointer',
                }}
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Log Session Modal ══ */}
      {logOpen && (
        <div
          onClick={() => setLogOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 501,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161614',
              border: '1px solid #2a2a27',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              marginTop: 40,
              marginBottom: 40,
            }}
          >
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df', marginBottom: 20 }}>
              {logStep === 1 ? 'Select Client' : logSelectedClient?.name || 'Log Session'}
            </p>

            {logStep === 1 && (
              <>
                <input
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Search clients..."
                  autoFocus
                  style={{
                    width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                    borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', marginBottom: 12,
                  }}
                />

                {activeClients.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', textAlign: 'center', padding: '16px 0' }}>
                    No clients found. Add a client in the CRM panel first.
                  </p>
                ) : filteredClients.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', textAlign: 'center', padding: '16px 0' }}>
                    No clients match your search.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setLogSelectedClient(c); setLogStep(2) }}
                        style={{
                          background: '#1e1e1b', border: '1px solid #2a2a27',
                          borderRadius: 8, padding: '12px 14px', minHeight: 48,
                          textAlign: 'left', cursor: 'pointer', color: '#e8e6df',
                          fontFamily: 'var(--font-body)', fontSize: 14,
                        }}
                      >
                        {c.name}
                        {c.stage && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginLeft: 10 }}>
                            {c.stage}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    onClick={() => setLogOpen(false)}
                    style={{
                      background: 'transparent', border: '1px solid #2a2a27',
                      borderRadius: 8, padding: '10px 16px', minHeight: 44,
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      color: '#7a786f', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {logStep === 2 && (
              <>
                {[
                  { field: 'date',              label: 'Date',              type: 'date',   placeholder: '' },
                  { field: 'tattooDescription', label: 'Tattoo Description',type: 'text',   placeholder: 'e.g. Floral sleeve' },
                  { field: 'placement',         label: 'Placement',         type: 'text',   placeholder: 'e.g. Left forearm' },
                  { field: 'deposit',           label: 'Deposit ($)',        type: 'number', placeholder: '0' },
                  { field: 'tattooPrice',       label: 'Tattoo Price ($)',   type: 'number', placeholder: '0' },
                  { field: 'amountPaid',        label: 'Amount Paid ($)',    type: 'number', placeholder: '0' },
                  { field: 'tip',               label: 'Tip ($)',            type: 'number', placeholder: '0' },
                  { field: 'originalPrice',     label: 'Original Price ($)', type: 'number', placeholder: '0' },
                  { field: 'giftCardCode',      label: 'Gift Card Code',     type: 'text',   placeholder: 'Optional' },
                  { field: 'discountCode',      label: 'Discount Code',      type: 'text',   placeholder: 'Optional' },
                ].map(({ field, label, type, placeholder }) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input
                      type={type}
                      value={logForm[field]}
                      onChange={e => setLogForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                        borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                        fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>Payment Method</label>
                  <select
                    value={logForm.paymentMethod}
                    onChange={e => setLogForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    style={{
                      width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                      borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                      fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                      appearance: 'none', boxSizing: 'border-box',
                    }}
                  >
                    {['Cash', 'Venmo', 'Zelle', 'CashApp', 'Card', 'Gift Card', 'Other'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {[
                    { key: 'isTouchUp',       label: 'Touch Up' },
                    { key: 'depositRefund',   label: 'Deposit Refunded' },
                    { key: 'discountApplied', label: 'Discount Applied' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 44 }}>
                      <input
                        type="checkbox"
                        checked={logForm[key]}
                        onChange={e => setLogForm(f => ({ ...f, [key]: e.target.checked }))}
                        style={{ width: 18, height: 18, accentColor: '#c9a96e', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df' }}>{label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', display: 'block', marginBottom: 6 }}>Notes</label>
                  <textarea
                    value={logForm.notes}
                    onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes..."
                    rows={3}
                    style={{
                      width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
                      borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
                      fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box', resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setLogStep(1)}
                    style={{
                      background: 'transparent', border: '1px solid #2a2a27',
                      borderRadius: 8, padding: '10px 16px', minHeight: 44,
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      color: '#7a786f', cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLogSave}
                    style={{
                      background: '#c9a96e', border: 'none',
                      borderRadius: 8, padding: '10px 20px', minHeight: 44,
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      fontWeight: 600, color: '#0e0e0d', cursor: 'pointer',
                    }}
                  >
                    Save Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Welcome Modal ══ */}
      {welcomeOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            background: '#161614',
            border: '1px solid #2a2a27',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 480,
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
              textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.1em',
            }}>
              MACRI
            </p>

            <p style={{
              fontFamily: 'var(--font-heading)', fontSize: 24, color: '#e8e6df',
              textAlign: 'center', marginTop: 12,
            }}>
              {getGreeting()}
            </p>

            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f',
              textAlign: 'center', marginTop: 8,
            }}>
              Your studio is ready. What would you like to do?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setBriefingShown(true)}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#1e1e1b', border: '1px solid #2a2a27',
                  color: '#e8e6df', fontFamily: 'var(--font-body)', fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Run my briefing
              </button>

              <button
                onClick={() => { speakText(QUOTES[quoteIdx].text); setWelcomeOpen(false) }}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#1e1e1b', border: '1px solid #c9a96e',
                  color: '#c9a96e', fontFamily: 'var(--font-body)', fontSize: 14,
                  cursor: 'pointer',
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
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
                textAlign: 'center', marginTop: 16,
              }}>
                Briefing agent arrives June 1.
              </p>
            )}

            <button
              onClick={() => setWelcomeOpen(false)}
              style={{
                display: 'block', width: '100%', marginTop: 16,
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
    </div>
  )
}
