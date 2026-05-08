import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES } from '../constants/stages'
import { loadClients as loadClientsDB, saveClient } from '../lib/crmService'
import { sessionsService } from '../lib/dataService'

// ─── Storage ──────────────────────────────────────────────────────────────────

const LS_GOALS    = 'macri_goals'
const LS_WELCOME  = 'macri_welcome_last_seen'
function loadGoals() {
  try { return JSON.parse(localStorage.getItem(LS_GOALS)) || [] } catch { return [] }
}
function saveGoals(list) {
  localStorage.setItem(LS_GOALS, JSON.stringify(list))
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: 'Your body is a journal, and tattoos are the stories.',                 author: 'Johnny Depp' },
  { text: 'Art is not what you see, but what you make others see.',               author: 'Edgar Degas' },
  { text: 'Every artist dips his brush in his own soul.',                         author: 'Henry Ward Beecher' },
  { text: 'Creativity takes courage.',                                            author: 'Henri Matisse' },
  { text: 'The purpose of art is washing the dust of daily life off our souls.',  author: 'Pablo Picasso' },
  { text: 'Art enables us to find ourselves and lose ourselves at the same time.', author: 'Thomas Merton' },
  { text: "To create one's own world takes courage.",                             author: "Georgia O'Keeffe" },
  { text: 'An artist is not paid for his labor but for his vision.',              author: 'James Whistler' },
  { text: 'Great art picks up where nature ends.',                                author: 'Marc Chagall' },
  { text: 'The job of the artist is always to deepen the mystery.',               author: 'Francis Bacon' },
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
    const key    = import.meta.env.VITE_ELEVENLABS_KEY
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
    const url  = URL.createObjectURL(blob)
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
    const day  = now.getDay()
    const diff = day === 0 ? 6 : day - 1
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

const STYLE_OPTIONS = [
  'Watercolor', 'Black and Gray', 'Black and Gray Portrait',
  'Sketch Art', 'Abstract', 'Stippled Shading', 'Color Realism', 'Fine Line', 'Other',
]

const PAYMENT_OPTIONS = ['Cash', 'Zelle', 'Venmo', 'Apple Pay']

function mkSF() {
  return {
    selectedClientId: null,
    clientName: '',
    date: todayISO(),
    style: 'Watercolor',
    placement: '',
    total: '',
    tip: '',
    payment: 'Cash',
    notes: '',
    film: false,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagramTag: '',
  }
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSVManual(text) {
  const lines = text.split(/\r?\n/)
  const rows  = []
  for (const line of lines) {
    if (!line.trim()) continue
    const row = []
    let inQuote = false
    let cur     = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        row.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    row.push(cur.trim())
    rows.push(row)
  }
  return rows
}

function normalizeDate(str) {
  if (!str || !str.trim()) return todayISO()
  const s = str.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m2) {
    const year = parseInt(m2[3]) < 50 ? `20${m2[3]}` : `19${m2[3]}`
    return `${year}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
  }
  return todayISO()
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

function IconChevronDown({ color = '#7a786f' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronUp({ color = '#7a786f' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 10l4-4 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

function IconMic({ size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const narrow   = useIsNarrow()

  const [clients, setClients] = useState([])
  const [goals,   setGoals]   = useState(loadGoals)

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

  // Welcome modal
  const [welcomeOpen,   setWelcomeOpen]   = useState(false)
  const [briefingShown, setBriefingShown] = useState(false)

  // Log a Session card
  const [logCardOpen,  setLogCardOpen]  = useState(true)
  const [clientMode,   setClientMode]   = useState('existing')
  const [sf,           setSf]           = useState(mkSF)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Voice log
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceMsg,    setVoiceMsg]    = useState('Speak Session')
  const logMicRef    = useRef(null)
  const logStreamRef = useRef(null)
  const logChunksRef = useRef([])
  const logMimeRef   = useRef('')
  const logTtsRef    = useRef(null)

  // Toast
  const [toast, setToast] = useState(null)

  // Aftercare link
  const [lastSavedSession, setLastSavedSession] = useState(null)

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvDups, setCsvDups] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadClientsDB().then(setClients)
  }, [])

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

  const thisMonthRevenue = useMemo(() => {
    return filterSessions(clients, 'month')
      .reduce((s, x) => s + (parseFloat(x.amountPaid) || 0), 0)
  }, [clients])

  // ── Derived: client search ──

  const searchResults = useMemo(() => {
    const q = (sf.clientName || '').toLowerCase().trim()
    if (!q || !dropdownOpen) return []
    return clients
      .filter(c => c.stage !== 'Archive')
      .filter(c => (c.name || '').toLowerCase().includes(q))
      .slice(0, 10)
  }, [sf.clientName, clients, dropdownOpen])

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

  // ── Handlers: aftercare link ──

  async function handleCopyAftercareLink() {
    if (!lastSavedSession) return
    const s = lastSavedSession
    const params = new URLSearchParams({
      name: s.name.split(' ')[0],
      style: s.style,
      placement: s.placement || '',
      date: s.date,
      film: s.film ? 'true' : 'false',
    })
    const link = `${window.location.origin}/care/${s.id}?${params}`
    try {
      await navigator.clipboard.writeText(link)
      showToast('Aftercare link copied', '#7aab8f')
    } catch {
      showToast('Could not copy link', '#f09595')
    }
  }

  // ── Handlers: toast ──

  function showToast(msg, color = '#7aab8f') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Handlers: log session ──

  function clearSF() {
    setSf({ ...mkSF(), date: todayISO() })
    setDropdownOpen(false)
    setLastSavedSession(null)
  }

  function handleClientSelect(c) {
    setSf(f => ({ ...f, selectedClientId: c.id, clientName: c.name || '' }))
    setDropdownOpen(false)
  }

  function handleLogSave() {
    if (clientMode === 'existing') {
      if (!sf.date || !sf.total) return
      const sessionId = Date.now()
      const sess4 = {
        id: sessionId,
        name: sf.clientName,
        date: sf.date,
        style: sf.style,
        placement: sf.placement,
        total: parseFloat(sf.total) || 0,
        tip: parseFloat(sf.tip) || 0,
        payment: sf.payment,
        notes: sf.notes,
        film: sf.film || false,
        clientId: sf.selectedClientId || null,
        createdAt: new Date().toISOString(),
      }
      sessionsService.saveRecord(sess4)

      let updatedClients = clients
      if (sf.selectedClientId) {
        const compatSess = {
          id: String(sessionId),
          date: sf.date,
          tattooDescription: sf.style,
          placement: sf.placement,
          isTouchUp: false,
          deposit: 0,
          depositRefund: false,
          tattooPrice: parseFloat(sf.total) || 0,
          amountPaid: parseFloat(sf.total) || 0,
          tip: parseFloat(sf.tip) || 0,
          paymentMethod: sf.payment,
          giftCardCode: '',
          discountCode: '',
          originalPrice: parseFloat(sf.total) || 0,
          discountApplied: false,
          notes: sf.notes,
        }
        updatedClients = clients.map(c =>
          c.id === sf.selectedClientId
            ? { ...c, sessions: [...(c.sessions || []), compatSess] }
            : c
        )
        setClients(updatedClients)
        saveClient(updatedClients.find(c => c.id === sf.selectedClientId))
      }
      const savedSession = { id: String(sessionId), name: sf.clientName, style: sf.style, placement: sf.placement, date: sf.date, film: sf.film || false }
      showToast('Session logged')
      clearSF()
      setLastSavedSession(savedSession)

    } else {
      if (!sf.firstName.trim() || !sf.lastName.trim()) return
      const newClientId = crypto.randomUUID()
      const fullName    = `${sf.firstName.trim()} ${sf.lastName.trim()}`
      const sessionId   = Date.now()

      const compatSess = {
        id: String(sessionId),
        date: sf.date,
        tattooDescription: sf.style,
        placement: sf.placement,
        isTouchUp: false,
        deposit: 0,
        depositRefund: false,
        tattooPrice: parseFloat(sf.total) || 0,
        amountPaid: parseFloat(sf.total) || 0,
        tip: parseFloat(sf.tip) || 0,
        paymentMethod: sf.payment,
        giftCardCode: '',
        discountCode: '',
        originalPrice: parseFloat(sf.total) || 0,
        discountApplied: false,
        notes: sf.notes,
      }

      const newClient = {
        id: newClientId,
        name: fullName,
        firstName: sf.firstName.trim(),
        lastName: sf.lastName.trim(),
        email: sf.email.trim(),
        phone: sf.phone.trim(),
        instagramTag: sf.instagramTag.trim(),
        notes: sf.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: 'Lead',
        contentDrafts: [],
        sessions: [compatSess],
        tattooIdea: '', style: sf.style, placement: sf.placement, size: '', nextAction: '',
        status: null,
        journeyChecklist:   [false, false, false, false, false, false],
        aftercareChecklist: [false, false, false, false, false],
        consultations: [],
        activityLog: [],
        communications: [],
        consultationCount: 0,
      }

      const sess4 = {
        id: sessionId,
        name: fullName,
        date: sf.date,
        style: sf.style,
        placement: sf.placement,
        total: parseFloat(sf.total) || 0,
        tip: parseFloat(sf.tip) || 0,
        payment: sf.payment,
        notes: sf.notes,
        film: sf.film || false,
        clientId: newClientId,
        createdAt: new Date().toISOString(),
      }

      const updatedClients = [...clients, newClient]
      setClients(updatedClients)
      saveClient(newClient)

      sessionsService.saveRecord(sess4)

      const savedSession = { id: String(sessionId), name: fullName, style: sf.style, placement: sf.placement, date: sf.date, film: sf.film || false }
      showToast('Session logged and client added to CRM')
      setClientMode('existing')
      clearSF()
      setLastSavedSession(savedSession)
    }
  }

  // ── Handlers: voice log ──

  async function handleVoiceTap() {
    if (voiceStatus === 'processing') return

    if (voiceStatus === 'listening') {
      if (logMicRef.current) logMicRef.current.stop()
      return
    }

    const ttsPlayer = new Audio()
    ttsPlayer.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAA' +
      'EAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA=='
    ttsPlayer.play().catch(() => {})
    logTtsRef.current = ttsPlayer

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      logStreamRef.current = stream
      logChunksRef.current = []

      const MIME_PRIORITIES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = MIME_PRIORITIES.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
      logMimeRef.current = mimeType

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) logChunksRef.current.push(e.data) }
      logMicRef.current = mediaRecorder
      mediaRecorder.start(100)

      setVoiceStatus('listening')
      setVoiceMsg('Listening...')

      const silenceCtx    = new (window.AudioContext || window.webkitAudioContext)()
      const silenceSource = silenceCtx.createMediaStreamSource(stream)
      const analyser      = silenceCtx.createAnalyser()
      analyser.fftSize    = 256
      silenceSource.connect(analyser)
      const dataArray  = new Uint8Array(analyser.frequencyBinCount)
      let silenceStart = null
      const silenceInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        if (avg < 8) {
          if (!silenceStart) silenceStart = Date.now()
          else if (Date.now() - silenceStart > 1500) {
            clearInterval(silenceInterval)
            silenceCtx.close()
            mediaRecorder.stop()
          }
        } else {
          silenceStart = null
        }
      }, 100)

      const hardStop = setTimeout(() => {
        clearInterval(silenceInterval)
        silenceCtx.close()
        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
      }, 15000)

      mediaRecorder.onstop = () => {
        clearTimeout(hardStop)
        clearInterval(silenceInterval)
        processVoiceLog()
      }

    } catch {
      setVoiceStatus('error')
      setVoiceMsg('Could not access mic. Try again.')
      setTimeout(() => { setVoiceStatus('idle'); setVoiceMsg('Speak Session') }, 3000)
    }
  }

  async function processVoiceLog() {
    try {
      if (logStreamRef.current) {
        logStreamRef.current.getTracks().forEach(t => t.stop())
        logStreamRef.current = null
      }

      const mime     = logMimeRef.current
      const isMP4    = mime.startsWith('audio/mp4')
      const ext      = isMP4 ? 'mp4' : 'webm'
      const blobType = isMP4 ? 'audio/mp4' : 'audio/webm'

      const blob = new Blob(logChunksRef.current, { type: blobType })
      logChunksRef.current = []
      setVoiceStatus('processing')
      setVoiceMsg('Processing...')

      const elKey = import.meta.env.VITE_ELEVENLABS_KEY
      const fd    = new FormData()
      fd.append('file', blob, `recording.${ext}`)
      fd.append('model_id', 'scribe_v2')
      const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': elKey },
        body: fd,
      })
      if (!sttRes.ok) throw new Error('stt')
      const sttData    = await sttRes.json()
      const transcript = sttData.text?.trim()
      if (!transcript) throw new Error('empty')

      const nowDate = todayISO()
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: `You are a session logging assistant for tattoo artist Saul Gutierrez. Extract session details from the spoken input and return ONLY a JSON object with these fields: name, date (YYYY-MM-DD), style, placement, total (number), tip (number), payment, notes. If a field is not mentioned use empty string or 0 for numbers. Date defaults to today if not mentioned. Today is ${nowDate}.`,
          messages: [{ role: 'user', content: transcript }],
        }),
      })
      if (!claudeRes.ok) throw new Error('claude')
      const claudeData = await claudeRes.json()
      const raw = claudeData.content[0].text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
      const parsed = JSON.parse(raw)

      let matchedClientId = null
      if (parsed.name && clientMode === 'existing') {
        const found = clients.find(c =>
          (c.name || '').toLowerCase().includes((parsed.name || '').toLowerCase())
        )
        if (found) matchedClientId = found.id
      }

      setSf(f => ({
        ...f,
        clientName:       parsed.name       ? parsed.name          : f.clientName,
        selectedClientId: matchedClientId   ? matchedClientId      : f.selectedClientId,
        date:             parsed.date       ? parsed.date          : f.date,
        style:            parsed.style      ? parsed.style         : f.style,
        placement:        parsed.placement  ? parsed.placement     : f.placement,
        total:            parsed.total > 0  ? String(parsed.total) : f.total,
        tip:              parsed.tip   > 0  ? String(parsed.tip)   : f.tip,
        payment:          parsed.payment    ? parsed.payment       : f.payment,
        notes:            parsed.notes      ? parsed.notes         : f.notes,
      }))

      const name     = parsed.name || 'the client'
      const totalAmt = parsed.total > 0 ? `$${parsed.total}` : 'an amount'
      const ttsText  = `Got it. Session with ${name} logged for ${totalAmt}.`

      const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Q2Qd4P9qaDNuBFUcFCQr', {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ttsText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      })
      if (ttsRes.ok) {
        const ttsBlob = await ttsRes.blob()
        const ttsUrl  = URL.createObjectURL(ttsBlob)
        logTtsRef.current.src = ttsUrl
        logTtsRef.current.play()
      }

      setVoiceStatus('done')
      setVoiceMsg('Form filled. Review and save.')
      setTimeout(() => { setVoiceStatus('idle'); setVoiceMsg('Speak Session') }, 5000)

    } catch {
      setVoiceStatus('error')
      setVoiceMsg('Could not process voice. Fill in manually.')
      setTimeout(() => { setVoiceStatus('idle'); setVoiceMsg('Speak Session') }, 3000)
    }
  }

  // ── Handlers: CSV import ──

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleCSVFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target.result
        const rows = parseCSVManual(text)
        if (rows.length < 2) return
        const headers  = rows[0].map(h => h.toLowerCase().trim())
        const dataRows = rows.slice(1)
        const getCol   = (row, name) => {
          const idx = headers.indexOf(name.toLowerCase())
          return idx >= 0 ? (row[idx] || '') : ''
        }
        const currentClients = clients
        const parsed = []
        const dups   = []
        for (const row of dataRows) {
          const fn = getCol(row, 'firstname').trim()
          const ln = getCol(row, 'lastname').trim()
          if (!fn && !ln) continue
          const obj = {
            firstName:    fn,
            lastName:     ln,
            email:        getCol(row, 'email').trim(),
            phone:        getCol(row, 'phone').trim(),
            instagramTag: getCol(row, 'instagramtag').trim(),
            style:        getCol(row, 'style').trim(),
            placement:    getCol(row, 'placement').trim(),
            date:         normalizeDate(getCol(row, 'date')),
            total:        parseFloat(getCol(row, 'total')) || 0,
            tip:          parseFloat(getCol(row, 'tip'))   || 0,
            payment:      getCol(row, 'payment').trim() || 'Cash',
            notes:        getCol(row, 'notes').trim(),
          }
          const fullName = `${fn} ${ln}`.toLowerCase().trim()
          const em       = obj.email.toLowerCase()
          const isDup    = currentClients.some(c => {
            const cName = (c.name || '').toLowerCase()
            const cFn   = (c.firstName || '').toLowerCase()
            const cLn   = (c.lastName  || '').toLowerCase()
            const cEm   = (c.email     || '').toLowerCase().trim()
            const nameMatch  = fn && ln && (cName === fullName || (cFn === fn.toLowerCase() && cLn === ln.toLowerCase()))
            const emailMatch = em && cEm && cEm === em
            return nameMatch || emailMatch
          })
          parsed.push(obj)
          dups.push(isDup)
        }
        setCsvRows(parsed)
        setCsvDups(dups)
        setCsvOpen(true)
      } catch {}
    }
    reader.readAsText(file)
  }

  function handleImportAll() {
    const currentClients = clients
    const newClients     = []
    const newSessions    = []

    csvRows.forEach((row, i) => {
      if (csvDups[i]) return
      const clientId = crypto.randomUUID()
      const fullName = `${row.firstName} ${row.lastName}`.trim()
      const sessions = []

      if (row.total > 0) {
        const sId = Date.now() + i
        sessions.push({
          id: String(sId),
          date: row.date,
          tattooDescription: row.style,
          placement: row.placement,
          isTouchUp: false,
          deposit: 0,
          depositRefund: false,
          tattooPrice: row.total,
          amountPaid: row.total,
          tip: row.tip,
          paymentMethod: row.payment,
          giftCardCode: '',
          discountCode: '',
          originalPrice: row.total,
          discountApplied: false,
          notes: row.notes,
        })
        newSessions.push({
          id: sId,
          name: fullName,
          date: row.date,
          style: row.style,
          placement: row.placement,
          total: row.total,
          tip: row.tip,
          payment: row.payment,
          notes: row.notes,
          clientId,
          createdAt: new Date().toISOString(),
        })
      }

      newClients.push({
        id: clientId,
        name: fullName,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        instagramTag: row.instagramTag,
        notes: row.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stage: 'Lead',
        contentDrafts: [],
        sessions,
        tattooIdea: '', style: row.style, placement: row.placement, size: '', nextAction: '',
        status: null,
        journeyChecklist:   [false, false, false, false, false, false],
        aftercareChecklist: [false, false, false, false, false],
        consultations: [],
        activityLog: [],
        communications: [],
        consultationCount: 0,
      })
    })

    const updatedClients = [...currentClients, ...newClients]
    setClients(updatedClients)
    newClients.forEach(c => saveClient(c))

    newSessions.forEach(s => sessionsService.saveRecord(s))

    const importCount = newClients.length
    const skipCount   = csvDups.filter(Boolean).length
    const msg = skipCount > 0
      ? `${importCount} ${importCount === 1 ? 'client' : 'clients'} imported, ${skipCount} ${skipCount === 1 ? 'duplicate' : 'duplicates'} skipped`
      : `${importCount} ${importCount === 1 ? 'client' : 'clients'} imported`
    showToast(msg)
    setCsvOpen(false)
    setCsvRows([])
    setCsvDups([])
  }

  // ── Styles ──

  const FIELD = {
    width: '100%', background: '#1e1e1b', border: '1px solid #2a2a27',
    borderRadius: 8, padding: '10px 14px', color: '#e8e6df',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', minHeight: 44,
  }

  const LABEL = {
    fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
    display: 'block', marginBottom: 6,
  }

  const cols = narrow ? '1fr' : 'repeat(2, 1fr)'

  const isListening = voiceStatus === 'listening'
  const voiceColor  = voiceStatus === 'error' ? '#f09595'
    : voiceStatus === 'done'    ? '#7aab8f'
    : voiceStatus === 'listening' ? '#c9a96e'
    : '#7a786f'

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: narrow ? '24px 16px 80px' : '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.35); }
          50%       { box-shadow: 0 0 0 10px rgba(201,169,110,0); }
        }
      `}</style>

      {/* Hidden file input for CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCSVFile}
      />

      {/* ══ HEADER ══ */}
      <div>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df' }}>Home Base</span>
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
            fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df',
            fontStyle: 'italic', textAlign: 'center', lineHeight: 1.55, paddingRight: 28,
          }}>
            {QUOTES[quoteIdx].text}
          </p>

          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
            textAlign: 'center', marginTop: 10,
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
            position: 'relative', flexShrink: 0, transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8,
              background: '#e8e6df', display: 'block',
              left: readAloud ? 18 : 2, transition: 'left 0.2s',
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
              padding: '8px 12px', minHeight: 44, display: 'flex', alignItems: 'center',
            }}
          >
            <IconChevronRight color={isCurrentMonth ? '#3a3a37' : '#7a786f'} />
          </button>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAY_LABELS.map(l => (
              <div key={l} style={{
                textAlign: 'center', fontFamily: 'var(--font-mono)',
                fontSize: 10, color: '#7a786f', paddingBottom: 4,
              }}>
                {l}
              </div>
            ))}
          </div>

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
                    fontFamily: 'var(--font-mono)', fontSize: 12,
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

        {expandedDay && sessionMap[expandedDay] && (
          <div style={{ marginTop: 16, borderTop: '1px solid #2a2a27', paddingTop: 12 }}>
            {sessionMap[expandedDay].map((s, i, arr) => (
              <div
                key={s.id || i}
                style={{
                  paddingTop: i === 0 ? 0 : 10, paddingBottom: 10,
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
              background: '#1e1e1b', border: '1px solid #2a2a27',
              borderRadius: 8, padding: '12px 8px', textAlign: 'center',
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
                textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.05em', lineHeight: 1.3,
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
                borderRadius: 8, padding: '6px 14px', minHeight: 44,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: period === key ? '#0e0e0d' : '#7a786f',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { label: 'Revenue',         value: fmt(revenue),       color: '#e8e6df', sub: null },
              { label: 'Tips',            value: fmt(tips),          color: '#c9a96e', sub: null },
              { label: 'Avg per Session', value: fmt(avgPerSession), color: '#e8e6df', sub: null },
              { label: 'Tax Aside',       value: fmt(taxAside),      color: '#c9a96e', sub: '28% rule' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{
                background: '#1e1e1b', border: '1px solid #2a2a27',
                borderRadius: 8, padding: 16, textAlign: 'center',
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
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e' }}>
            Goals
          </span>
          <button
            onClick={() => setAddGoalOpen(true)}
            style={{
              background: 'transparent', border: '1px solid #c9a96e',
              borderRadius: 8, padding: '6px 12px', minHeight: 44,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e', cursor: 'pointer',
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
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', flexShrink: 0 }}>
                        {goal.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      aria-label="Delete goal"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px 8px', minHeight: 44, minWidth: 44,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                  <div style={{ height: 6, background: '#2a2a27', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                      height: '100%', width: `${pct * 100}%`,
                      background: '#7aab8f', borderRadius: 3, transition: 'width 0.3s',
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

      {/* ══ SECTION 6: Log a Session ══ */}
      <div style={CARD}>
        {/* Card header */}
        <button
          onClick={() => setLogCardOpen(o => !o)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 0, marginBottom: logCardOpen ? 20 : 0,
          }}
        >
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e' }}>
            Log a Session
          </span>
          {logCardOpen ? <IconChevronUp color="#7a786f" /> : <IconChevronDown color="#7a786f" />}
        </button>

        {logCardOpen && (
          <>
            {/* ── Voice Log ── */}
            <div style={{
              background: '#1e1e1b',
              border: '1px solid rgba(201,169,110,0.2)',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ width: '100%' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: '#c9a96e', marginBottom: 4 }}>
                  Voice Log
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7a786f', margin: 0 }}>
                  Tap the mic and speak the session details. MACRI fills in the form.
                </p>
              </div>

              <button
                onClick={handleVoiceTap}
                disabled={voiceStatus === 'processing'}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#161614',
                  border: isListening ? '2px solid #c9a96e' : '2px solid #2a2a27',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: voiceStatus === 'processing' ? 'default' : 'pointer',
                  outline: 'none',
                  animation: isListening ? 'micPulse 1.4s ease-in-out infinite' : 'none',
                  transition: 'border-color 0.2s',
                }}
              >
                <IconMic size={28} color={isListening ? '#c9a96e' : '#7a786f'} />
              </button>

              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: voiceColor, margin: 0, textAlign: 'center', minHeight: 16,
              }}>
                {voiceMsg}
              </p>
            </div>

            {/* ── Form ── */}
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14 }}>

              {/* Client Mode toggle — full width */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                {[
                  { key: 'existing', label: 'Existing Client' },
                  { key: 'new',      label: 'New Client' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setClientMode(key); clearSF() }}
                    style={{
                      flex: 1, minHeight: 44,
                      background: clientMode === key ? '#c9a96e' : '#1e1e1b',
                      border: '1px solid #2a2a27',
                      borderRadius: 8,
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      color: clientMode === key ? '#0e0e0d' : '#7a786f',
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* New Client fields */}
              {clientMode === 'new' && (
                <>
                  <div>
                    <label style={LABEL}>First Name *</label>
                    <input
                      style={FIELD}
                      value={sf.firstName}
                      onChange={e => setSf(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Last Name *</label>
                    <input
                      style={FIELD}
                      value={sf.lastName}
                      onChange={e => setSf(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Email</label>
                    <input
                      type="email"
                      style={FIELD}
                      value={sf.email}
                      onChange={e => setSf(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Phone</label>
                    <input
                      type="tel"
                      style={FIELD}
                      value={sf.phone}
                      onChange={e => setSf(f => ({ ...f, phone: e.target.value }))}
                      placeholder="555 555 5555"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Instagram</label>
                    <input
                      style={FIELD}
                      value={sf.instagramTag}
                      onChange={e => setSf(f => ({ ...f, instagramTag: e.target.value }))}
                      placeholder="@handle"
                    />
                  </div>
                </>
              )}

              {/* Existing Client search — full width */}
              {clientMode === 'existing' && (
                <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label style={LABEL}>Client</label>
                  <input
                    style={FIELD}
                    value={sf.clientName}
                    onChange={e => {
                      setSf(f => ({ ...f, clientName: e.target.value, selectedClientId: null }))
                      setDropdownOpen(true)
                    }}
                    onFocus={() => { if (sf.clientName) setDropdownOpen(true) }}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    placeholder="Search by name..."
                  />
                  {dropdownOpen && searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#1e1e1b', border: '1px solid #2a2a27',
                      borderRadius: 8, marginTop: 4, maxHeight: 240, overflowY: 'auto',
                    }}>
                      {searchResults.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={() => handleClientSelect(c)}
                          style={{
                            width: '100%', background: 'none', border: 'none',
                            borderBottom: '1px solid #2a2a27',
                            padding: '10px 14px', minHeight: 44,
                            textAlign: 'left', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df',
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
                </div>
              )}

              {/* Session date */}
              <div>
                <label style={LABEL}>Session Date</label>
                <input
                  type="date"
                  style={FIELD}
                  value={sf.date}
                  onChange={e => setSf(f => ({ ...f, date: e.target.value }))}
                />
              </div>

              {/* Style */}
              <div>
                <label style={LABEL}>Style</label>
                <select
                  style={{ ...FIELD, appearance: 'none' }}
                  value={sf.style}
                  onChange={e => setSf(f => ({ ...f, style: e.target.value }))}
                >
                  {STYLE_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Placement */}
              <div>
                <label style={LABEL}>Placement</label>
                <input
                  style={FIELD}
                  value={sf.placement}
                  onChange={e => setSf(f => ({ ...f, placement: e.target.value }))}
                  placeholder="e.g. Left forearm"
                />
              </div>

              {/* Total */}
              <div>
                <label style={LABEL}>Total ($)</label>
                <input
                  type="number"
                  style={FIELD}
                  value={sf.total}
                  onChange={e => setSf(f => ({ ...f, total: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Tip */}
              <div>
                <label style={LABEL}>Tip ($)</label>
                <input
                  type="number"
                  style={FIELD}
                  value={sf.tip}
                  onChange={e => setSf(f => ({ ...f, tip: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={LABEL}>Payment Method</label>
                <select
                  style={{ ...FIELD, appearance: 'none' }}
                  value={sf.payment}
                  onChange={e => setSf(f => ({ ...f, payment: e.target.value }))}
                >
                  {PAYMENT_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Notes — full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL}>Notes</label>
                <textarea
                  style={{ ...FIELD, resize: 'vertical', minHeight: 80 }}
                  value={sf.notes}
                  onChange={e => setSf(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>

              {/* Film toggle — full width */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
                <button
                  type="button"
                  onClick={() => setSf(f => ({ ...f, film: !f.film }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', display: 'flex', alignItems: 'center' }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: sf.film ? '#c9a96e' : '#2a2a27',
                    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8,
                      background: '#e8e6df', display: 'block',
                      left: sf.film ? 18 : 2, transition: 'left 0.2s',
                    }} />
                  </div>
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
                  Applied Protective Film
                </span>
              </div>

              {/* Save button — full width */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={clearSF}
                  style={{
                    background: 'transparent', border: '1px solid #2a2a27',
                    borderRadius: 8, padding: '10px 16px', minHeight: 44,
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    color: '#7a786f', cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleLogSave}
                  style={{
                    background: '#c9a96e', border: 'none',
                    borderRadius: 8, padding: '10px 24px', minHeight: 44,
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    fontWeight: 600, color: '#0e0e0d', cursor: 'pointer',
                  }}
                >
                  Log Session
                </button>
              </div>
            </div>

            {lastSavedSession && (
              <button
                onClick={handleCopyAftercareLink}
                style={{
                  width: '100%', minHeight: 48,
                  background: '#c9a96e', border: 'none',
                  borderRadius: 10, marginTop: 4,
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: 600, color: '#0e0e0d', cursor: 'pointer',
                }}
              >
                Generate Aftercare Link
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Import Past Clients button ── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleImportClick}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a27',
            borderRadius: 8,
            padding: '10px 20px',
            minHeight: 44,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#7a786f',
            cursor: 'pointer',
          }}
        >
          Import Past Clients
        </button>
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
              background: '#161614', border: '1px solid #2a2a27',
              borderRadius: 12, padding: 24, width: '100%', maxWidth: 480,
            }}
          >
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df', marginBottom: 20 }}>
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
                placeholder="e.g. 2000"
                style={FIELD}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
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
              <button
                onClick={() => setAddGoalOpen(false)}
                style={{
                  background: 'transparent', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 16px',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', cursor: 'pointer',
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

      {/* ══ CSV Preview Modal ══ */}
      {csvOpen && (
        <div
          onClick={() => setCsvOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 600,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: 20, overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161614', border: '1px solid #2a2a27',
              borderRadius: 12, padding: 24, width: '100%', maxWidth: 640,
              marginTop: 40, marginBottom: 40,
            }}
          >
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#e8e6df', marginBottom: 6 }}>
              Import Past Clients
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginBottom: 20 }}>
              {csvRows.length} {csvRows.length === 1 ? 'row' : 'rows'} found
              {csvDups.filter(Boolean).length > 0 && ` · ${csvDups.filter(Boolean).length} ${csvDups.filter(Boolean).length === 1 ? 'duplicate' : 'duplicates'} will be skipped`}
            </p>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['First Name', 'Last Name', 'Email', 'Style', 'Total'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: '#7a786f', padding: '6px 10px', borderBottom: '1px solid #2a2a27' }}>
                        {h}
                      </th>
                    ))}
                    <th style={{ textAlign: 'left', color: '#7a786f', padding: '6px 10px', borderBottom: '1px solid #2a2a27' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ opacity: csvDups[i] ? 0.45 : 1 }}>
                      <td style={{ padding: '8px 10px', color: '#e8e6df', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>{row.firstName}</td>
                      <td style={{ padding: '8px 10px', color: '#e8e6df', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>{row.lastName}</td>
                      <td style={{ padding: '8px 10px', color: '#7a786f', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>{row.email || ''}</td>
                      <td style={{ padding: '8px 10px', color: '#7a786f', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>{row.style || ''}</td>
                      <td style={{ padding: '8px 10px', color: '#7a786f', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>{row.total > 0 ? `$${row.total}` : ''}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(42,42,39,0.5)' }}>
                        {csvDups[i] && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f',
                            background: '#2a2a27', borderRadius: 4, padding: '2px 6px',
                          }}>
                            Duplicate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 10 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginTop: 8, textAlign: 'center' }}>
                  Showing first 10 of {csvRows.length} rows
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setCsvOpen(false); setCsvRows([]); setCsvDups([]) }}
                style={{
                  background: 'transparent', border: '1px solid #2a2a27',
                  borderRadius: 8, padding: '10px 16px', minHeight: 44,
                  fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportAll}
                disabled={csvRows.filter((_, i) => !csvDups[i]).length === 0}
                style={{
                  background: '#c9a96e', border: 'none',
                  borderRadius: 8, padding: '10px 20px', minHeight: 44,
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: 600, color: '#0e0e0d', cursor: 'pointer',
                  opacity: csvRows.filter((_, i) => !csvDups[i]).length === 0 ? 0.4 : 1,
                }}
              >
                Import All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Welcome Modal ══ */}
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
            background: '#161614', border: '1px solid #2a2a27',
            borderRadius: 16, padding: 32, width: '100%', maxWidth: 480,
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
                  color: '#e8e6df', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Run my briefing
              </button>

              <button
                onClick={() => { speakText(QUOTES[quoteIdx].text); setWelcomeOpen(false) }}
                style={{
                  width: '100%', minHeight: 48, borderRadius: 10,
                  background: '#1e1e1b', border: '1px solid #c9a96e',
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

      {/* ══ Toast ══ */}
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
