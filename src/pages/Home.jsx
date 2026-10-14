import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES } from '../constants/stages'
import { loadClients as loadClientsDB } from '../lib/crmService'
import { supabase } from '../lib/supabase'
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

function buildSessionMap(clients) {
  const map = {}
  for (const c of clients) {
    for (const s of (c.sessions || [])) {
      if (typeof s !== 'object') continue
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
    const day   = now.getDay()
    const diff  = day === 0 ? 6 : day - 1
    const start = new Date(now); start.setDate(now.getDate() - diff); start.setHours(0, 0, 0, 0)
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
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
      if (typeof s !== 'object') continue
      const d = parseSessionDate(s.date)
      if (d && d >= start && d <= end) result.push(s)
    }
  }
  return result
}

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US')
}

// ─── Goals storage ────────────────────────────────────────────────────────────

const LS_GOALS = 'macri_goals'
function loadGoals() {
  try { return JSON.parse(localStorage.getItem(LS_GOALS)) || [] } catch { return [] }
}
function saveGoals(list) { localStorage.setItem(LS_GOALS, JSON.stringify(list)) }

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

// ─── Welcome helpers ──────────────────────────────────────────────────────────

const LS_WELCOME = 'macri_welcome_last_seen'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting() {
  const h = new Date().getHours()
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const narrow   = useIsNarrow()

  const [clients,    setClients]    = useState([])
  const [goals,      setGoals]      = useState(loadGoals)
  const [dailyBrief, setDailyBrief] = useState(null)

  useEffect(() => {
    const fetchBrief = async () => {
      const { data, error } = await supabase.rpc('get_daily_brief')
      if (error) console.error('Daily brief error:', error)
      if (data) setDailyBrief(data.get_daily_brief ?? data)
    }
    fetchBrief()
  }, [])

  useEffect(() => {
    loadClientsDB().then(setClients)
  }, [])

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

  // Toast
  const [toast, setToast] = useState(null)

  function showToast(msg, color = '#7aab8f') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

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
  const totalActive     = clients.filter(c => c.stage && c.stage !== 'Archive' && c.stage !== 'Completed').length

  // ── Derived: earnings ──

  const periodSessions   = useMemo(() => filterSessions(clients, period), [clients, period])
  const revenue          = periodSessions.reduce((s, x) => s + (parseFloat(x.amountPaid) || 0), 0)
  const tips             = periodSessions.reduce((s, x) => s + (parseFloat(x.tip) || 0), 0)
  const avgPerSession    = periodSessions.length > 0 ? revenue / periodSessions.length : 0
  const taxAside         = revenue * 0.28

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
        .hb-muted-btn { background: transparent; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 11px 16px; min-height: 44px; font-family: var(--font-body); font-size: 14px; color: #7a786f; cursor: pointer; }
      `}</style>

      {/* ══ PAGE HEADER ══ */}
      <div className="hb-section" style={{ marginBottom: 36 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          HomeBase
        </p>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: narrow ? 28 : 34, color: '#e8e6df', fontWeight: 600, lineHeight: 1.15, margin: 0 }}>
          {getGreeting()}
        </h1>
      </div>

      {/* ══ TWO ZONE LAYOUT ══ */}
      <div style={{
        display: narrow ? 'flex' : 'grid',
        flexDirection: narrow ? 'column' : undefined,
        gridTemplateColumns: narrow ? undefined : '1fr 380px',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── LEFT MAIN COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

          {/* ══ TODAY AT A GLANCE ══ */}
          {dailyBrief && (
            <div className="hb-section" style={CARD}>
              <p style={{ ...LABEL_MONO, marginBottom: 18 }}>Today at a Glance</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>

                {/* Sessions tile */}
                <div style={{ background: '#0e0e0d', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ ...LABEL_MONO, marginBottom: 8 }}>Sessions</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#e8e6df', fontWeight: 600, lineHeight: 1, margin: 0 }}>
                    {dailyBrief.overview.appointments_count}
                  </p>
                </div>

                {/* Revenue tile — gold accent border */}
                <div style={{ background: '#0e0e0d', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '2px solid rgba(201,169,110,0.5)' }}>
                  <p style={{ ...LABEL_MONO, marginBottom: 8 }}>Revenue</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#c9a96e', fontWeight: 600, lineHeight: 1, margin: 0 }}>
                    ${dailyBrief.overview.projected_revenue}
                  </p>
                </div>

                {/* Intake tile */}
                <div style={{ background: '#0e0e0d', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ ...LABEL_MONO, marginBottom: 8 }}>Intake</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: '#e8e6df', fontWeight: 600, lineHeight: 1, margin: 0 }}>
                    {dailyBrief.overview.pending_intake_forms}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ══ DAILY QUOTE ══ */}
          <div className="hb-section" style={{ position: 'relative', padding: narrow ? '44px 20px' : '52px 40px', textAlign: 'center' }}>
            <button
              onClick={handleRefresh}
              aria-label="New quote"
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, opacity: 0.6, display: 'flex', alignItems: 'center',
              }}
            >
              <IconRefresh />
            </button>

            <p style={{
              fontFamily: 'var(--font-heading)',
              fontSize: narrow ? 20 : 24,
              color: '#e8e6df',
              fontStyle: 'italic',
              lineHeight: 1.6,
              margin: '0 0 16px',
              maxWidth: 560,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {QUOTES[quoteIdx].text}
            </p>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              {QUOTES[quoteIdx].author}
            </p>

            {/* Read aloud toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleToggleReadAloud}
                aria-label="Toggle read aloud"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', display: 'flex', alignItems: 'center' }}
              >
                <div style={{
                  width: 32, height: 18, borderRadius: 9,
                  background: readAloud ? '#c9a96e' : 'rgba(255,255,255,0.08)',
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: 2, width: 14, height: 14, borderRadius: 7,
                    background: '#e8e6df', display: 'block',
                    left: readAloud ? 16 : 2, transition: 'left 0.2s',
                  }} />
                </div>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', letterSpacing: '0.06em' }}>
                Read aloud
              </span>
            </div>
          </div>

          {/* ══ EARNINGS ══ */}
          <div className="hb-section" style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={LABEL_MONO}>Earnings</p>

              {/* Segmented period selector */}
              <div style={{
                display: 'flex', gap: 2,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 8, padding: 3,
              }}>
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
                      background:   period === key ? '#c9a96e' : 'transparent',
                      border:       'none',
                      borderRadius: 6,
                      padding:      '5px 12px',
                      minHeight:    32,
                      fontFamily:   'var(--font-mono)',
                      fontSize:     11,
                      color:        period === key ? '#0e0e0d' : '#7a786f',
                      cursor:       'pointer',
                      transition:   'background 0.15s, color 0.15s',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'Revenue',         value: fmt(revenue),       color: '#e8e6df', sub: null },
                { label: 'Tips',            value: fmt(tips),          color: '#c9a96e', sub: null },
                { label: 'Avg per Session', value: fmt(avgPerSession), color: '#e8e6df', sub: null },
                { label: 'Tax Aside',       value: fmt(taxAside),      color: '#c9a96e', sub: '28% rule' },
              ].map(({ label, value, color, sub }) => (
                <div key={label} style={{
                  background: '#0e0e0d',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 10, padding: '16px 18px',
                }}>
                  <p style={{ ...LABEL_MONO, marginBottom: 8 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color, fontWeight: 600, lineHeight: 1, margin: 0 }}>
                    {value}
                  </p>
                  {sub && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 5 }}>{sub}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ══ SESSION CALENDAR ══ */}
          <div className="hb-section" style={CARD}>
            <p style={{ ...LABEL_MONO, marginBottom: 18 }}>Session Days</p>

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
                  const isToday  = isCurrentMonth && day === today.getDate()
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
                      Paid {fmt(s.amountPaid)}
                      {parseFloat(s.tip) > 0 ? ` + ${fmt(s.tip)} tip` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 14, letterSpacing: '0.06em' }}>
              {activeCount} active {activeCount === 1 ? 'day' : 'days'} this month
            </p>
          </div>

        </div>

        {/* ── RIGHT SUPPORTING COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ══ STUDIO PIPELINE ══ */}
          <div className="hb-section" style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={LABEL_MONO}>Studio Pipeline</p>
              <button
                className="hb-ghost-btn"
                onClick={() => navigate('/projects')}
              >
                Full Board
              </button>
            </div>

            {/* Active client count hero number */}
            <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 42, color: '#e8e6df', fontWeight: 600, lineHeight: 1, margin: 0 }}>
                {totalActive}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginTop: 5, letterSpacing: '0.08em' }}>
                Active clients
              </p>
            </div>

            {/* Stage breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PIPELINE_STAGES.map(stage => {
                const count = stageCounts[stage]
                const color = STAGE_COLORS[stage] || '#7a786f'
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', flex: 1, letterSpacing: '0.04em' }}>
                      {stage}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-heading)', fontSize: 14,
                      color: count > 0 ? '#e8e6df' : '#3a3a37',
                      fontWeight: 600, minWidth: 20, textAlign: 'right',
                    }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>

            {bottleneckStage && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#f09595', marginTop: 16, letterSpacing: '0.06em' }}>
                {bottleneckStage} is filling up. Check your schedule.
              </p>
            )}
          </div>

          {/* ══ GOALS ══ */}
          <div className="hb-section" style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={LABEL_MONO}>Goals</p>
              <button
                className="hb-ghost-btn"
                onClick={() => setAddGoalOpen(true)}
              >
                Add Goal
              </button>
            </div>

            {goals.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', textAlign: 'center', padding: '20px 0' }}>
                No goals yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {goals.map(goal => {
                  const target = parseFloat(goal.targetAmount) || 0
                  const pct    = target > 0 ? Math.min(thisMonthRevenue / target, 1) : 0
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
                            {pctInt}%
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
                        <div style={{
                          height: '100%', width: `${pct * 100}%`,
                          background: pct >= 1 ? '#7aab8f' : '#c9a96e',
                          borderRadius: 2, transition: 'width 0.4s ease',
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#e8e6df' }}>
                          {fmt(thisMonthRevenue)}
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
          </div>

          {/* ══ LOG SESSION CTA ══ */}
          <div className="hb-section" style={{
            ...CARD,
            display: 'flex', flexDirection: 'column', gap: 10,
            alignItems: 'stretch', textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Ready to log a session?
            </p>
            <button
              className="hb-gold-btn"
              onClick={() => navigate('/session-prep')}
            >
              Log a Session
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
