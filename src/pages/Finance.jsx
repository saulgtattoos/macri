import { useState, useEffect, useRef } from 'react'

// ─── utils ────────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const fmt$ = (n) => `$${Math.abs(Number(n)).toFixed(2)}`
const fmtSigned = (n) => (n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`)
const todayISO = () => new Date().toISOString().slice(0, 10)
const currentYM = () => new Date().toISOString().slice(0, 7)

const parseDate = (str) => {
  if (!str) return ''
  str = String(str).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`
  const m2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m2) return `${2000 + parseInt(m2[3])}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
  return str
}

const fmtDateShort = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${d}`
}

const fmtMonthYear = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]} ${y}`
}

const fmtMonthShort = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`
}

const fmtDateLong = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]} ${d}, ${y}`
}

const fmtY = (val) => {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`
  return `$${Math.round(val)}`
}

const parseCSV = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const cols = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ; continue }
      if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue }
      cur += c
    }
    cols.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '') })
    return obj
  })
}

// ─── constants ────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'Supplies', 'Equipment', 'Software', 'Studio Rent', 'Marketing',
  'Education', 'Insurance', 'Meals', 'Travel', 'Other',
]

const PAYMENT_METHODS = ['Cash', 'Zelle', 'Venmo', 'Apple Pay', 'Card', 'Other']
const INCOME_PAYMENT_METHODS = ['Cash', 'Zelle', 'Venmo', 'Apple Pay']

const INCOME_STYLES = [
  'Watercolor', 'Black and Gray', 'Black and Gray Portrait',
  'Sketch Art', 'Abstract', 'Stippled Shading', 'Color Realism', 'Other',
]

// ─── blank forms ──────────────────────────────────────────────────────────────
const blankExpense = () => ({
  id: uid(),
  date: todayISO(),
  category: 'Supplies',
  vendor: '',
  description: '',
  amount: '',
  paymentMethod: 'Cash',
  deductible: true,
  notes: '',
  createdAt: now(),
})

const blankGoal = () => ({
  id: uid(),
  month: currentYM(),
  targetAmount: '',
  notes: '',
  createdAt: now(),
})

// ─── shared styles ────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#0e0e0d',
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    padding: '32px 24px',
    maxWidth: 900,
    margin: '0 auto',
  },
  panelLabel: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#c9a96e',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#e8e6df',
    margin: 0,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginTop: 28,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tab: (active) => ({
    fontFamily: 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 18px',
    borderRadius: 8,
    border: active ? '1.5px solid #c9a96e' : '1.5px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.08)' : '#161614',
    color: active ? '#c9a96e' : '#7a786f',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  chip: (active) => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '5px 12px',
    borderRadius: 20,
    border: active ? '1px solid #c9a96e' : '1px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
    color: active ? '#c9a96e' : '#7a786f',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  }),
  btn: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #c9a96e',
    background: 'rgba(201,169,110,0.1)',
    color: '#c9a96e',
    cursor: 'pointer',
  },
  btnSm: (color = '#c9a96e') => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${color}33`,
    background: `${color}11`,
    color,
    cursor: 'pointer',
  }),
  btnDanger: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #f0959533',
    background: '#f0959511',
    color: '#f09595',
    cursor: 'pointer',
  },
  row: (expanded) => ({
    background: expanded ? '#1e1e1b' : '#161614',
    border: expanded ? '1px solid #2a2a26' : '1px solid #1e1e1b',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
    transition: 'background 0.15s',
  }),
  rowMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  badge: (color) => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: `${color}18`,
    color,
    border: `1px solid ${color}33`,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  expandPanel: {
    padding: '14px 14px 16px',
    borderTop: '1px solid #2a2a26',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#7a786f',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  input: {
    background: '#0e0e0d',
    border: '1px solid #2a2a26',
    borderRadius: 6,
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: '#0e0e0d',
    border: '1px solid #2a2a26',
    borderRadius: 6,
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 24,
  },
  modalBox: {
    background: '#161614',
    border: '1px solid #2a2a26',
    borderRadius: 14,
    padding: 28,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
    color: '#e8e6df',
  },
  rowText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: '#e8e6df',
    flex: 1,
    minWidth: 0,
  },
  rowMuted: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    color: '#7a786f',
    flexShrink: 0,
  },
  card: {
    background: '#161614',
    border: '1px solid #2a2a26',
    borderRadius: 12,
    padding: '18px 20px',
  },
  cardLabel: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#7a786f',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
    margin: 0,
  },
  cardValue: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    color: '#c9a96e',
    margin: '8px 0 0',
  },
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, color }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1e1e1b', border: `1px solid ${color}44`,
      borderRadius: 10, padding: '10px 20px',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color,
      zIndex: 2000, whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────
function OverviewTab({ sessions, expenses, goals, onGoalsTabClick }) {
  const [period, setPeriod] = useState('month')

  const today = new Date()

  const inPeriod = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr + 'T12:00:00')
    if (period === 'week') {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      start.setHours(0, 0, 0, 0)
      return d >= start
    }
    if (period === 'month') {
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
    }
    if (period === 'year') return d.getFullYear() === today.getFullYear()
    return true
  }

  const fs = sessions.filter((s) => inPeriod(s.date))
  const fe = expenses.filter((e) => inPeriod(e.date))

  const grossRevenue = fs.reduce((sum, s) => sum + (s.total || 0), 0)
  const tips = fs.reduce((sum, s) => sum + (s.tip || 0), 0)
  const totalExpenses = fe.reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = grossRevenue - totalExpenses
  const taxReserve = grossRevenue * 0.28
  const avgPerSession = fs.length > 0 ? grossRevenue / fs.length : 0

  const thisYM = today.toISOString().slice(0, 7)
  const curGoal = goals.find((g) => g.month === thisYM)
  const curRevenue = sessions
    .filter((s) => s.date && s.date.startsWith(thisYM))
    .reduce((sum, s) => sum + (s.total || 0), 0)
  const goalPct = curGoal ? Math.min(100, (curRevenue / curGoal.targetAmount) * 100) : 0
  const goalMet = curGoal && curRevenue >= curGoal.targetAmount

  const last6 = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const ym = d.toISOString().slice(0, 7)
    const ms = sessions.filter((s) => s.date && s.date.startsWith(ym))
    const me = expenses.filter((e) => e.date && e.date.startsWith(ym))
    last6.push({
      ym,
      label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
      revenue: ms.reduce((sum, s) => sum + (s.total || 0), 0),
      expenses: me.reduce((sum, e) => sum + (e.amount || 0), 0),
    })
  }

  const maxVal = Math.max(...last6.map((m) => Math.max(m.revenue, m.expenses)), 1)

  const payTotals = {}
  fs.forEach((s) => {
    const pm = s.payment || 'Other'
    payTotals[pm] = (payTotals[pm] || 0) + (s.total || 0)
  })

  const svgW = 560, svgH = 170
  const padL = 44, padR = 16, padT = 10, padB = 30
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB
  const monthW = chartW / 6
  const barW = monthW * 0.28

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year'], ['all', 'All Time']].map(([k, l]) => (
          <button key={k} style={S.chip(period === k)} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={S.card}>
          <p style={S.cardLabel}>Gross Revenue</p>
          <p style={S.cardValue}>{fmt$(grossRevenue)}</p>
        </div>
        <div style={S.card}>
          <p style={S.cardLabel}>Tips</p>
          <p style={{ ...S.cardValue, color: '#c9a96e' }}>{fmt$(tips)}</p>
        </div>
        <div style={S.card}>
          <p style={S.cardLabel}>Total Expenses</p>
          <p style={{ ...S.cardValue, color: '#f09595' }}>{fmt$(totalExpenses)}</p>
        </div>
        <div style={S.card}>
          <p style={S.cardLabel}>Net Profit</p>
          <p style={{ ...S.cardValue, color: netProfit >= 0 ? '#7aab8f' : '#f09595' }}>
            {netProfit < 0 ? '-' : ''}{fmt$(netProfit)}
          </p>
        </div>
      </div>

      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e' }}>28% tax reserve</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c9a96e' }}>{fmt$(taxReserve)}</span>
        </div>
        <div style={{ borderTop: '1px solid #2a2a26', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>avg per session</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#e8e6df' }}>{fmt$(avgPerSession)}</span>
        </div>
      </div>

      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8e6df', margin: '0 0 10px' }}>
          Monthly Goal
        </p>
        {curGoal ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>
                {fmt$(curRevenue)} of {fmt$(curGoal.targetAmount)}
              </span>
              {goalMet
                ? <span style={S.badge('#7aab8f')}>Goal Reached</span>
                : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f' }}>{goalPct.toFixed(0)}% complete</span>
              }
            </div>
            <div style={{ background: '#2a2a26', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ background: '#c9a96e', height: '100%', width: `${goalPct}%`, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            {!goalMet && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', margin: '6px 0 0' }}>
                {fmt$(Math.max(0, curGoal.targetAmount - curRevenue))} remaining
              </p>
            )}
          </div>
        ) : (
          <p
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f', cursor: 'pointer', margin: 0 }}
            onClick={onGoalsTabClick}
          >
            No goal set for this month. Set one in Goals.
          </p>
        )}
      </div>

      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8e6df', margin: '0 0 8px' }}>Last 6 Months</p>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          {[['#c9a96e', 'Revenue'], ['#f09595', 'Expenses']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f' }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: 'visible' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + chartH * (1 - t)
            return (
              <g key={t}>
                <line x1={padL} x2={padL + chartW} y1={y} y2={y} stroke="#2a2a26" strokeWidth={0.5} />
                <text x={padL - 4} y={y + 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#7a786f">
                  {fmtY(maxVal * t)}
                </text>
              </g>
            )
          })}
          {last6.map((m, i) => {
            const x = padL + i * monthW + monthW * 0.1
            const revH = Math.max(chartH * (m.revenue / maxVal), m.revenue > 0 ? 2 : 0)
            const expH = Math.max(chartH * (m.expenses / maxVal), m.expenses > 0 ? 2 : 0)
            return (
              <g key={m.ym}>
                <rect x={x} y={padT + chartH - revH} width={barW} height={revH} fill="#c9a96e" rx={3} />
                <rect x={x + barW + 3} y={padT + chartH - expH} width={barW} height={expH} fill="#f09595" rx={3} />
                <text x={x + barW} y={padT + chartH + 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#7a786f">
                  {m.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8e6df', margin: '0 0 12px' }}>
          Payment Methods
        </p>
        {grossRevenue === 0 ? (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f', margin: 0 }}>No sessions in this period.</p>
        ) : (
          ['Cash', 'Zelle', 'Venmo', 'Apple Pay', 'Other'].map((pm) => {
            const amt = payTotals[pm] || 0
            if (amt === 0) return null
            return (
              <div key={pm} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e1b' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#e8e6df' }}>{pm}</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>{(amt / grossRevenue * 100).toFixed(1)}%</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e' }}>{fmt$(amt)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── IncomeTab ────────────────────────────────────────────────────────────────
function IncomeTab({ sessions, setSessions }) {
  const thisYM = new Date().toISOString().slice(0, 7)
  const [activeMonth, setActiveMonth] = useState(thisYM)
  const [activePay, setActivePay] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [toast, setToast] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const fileRef = useRef(null)

  const showToast = (msg, color = '#7aab8f') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  const allMonths = [...new Set(sessions.map((s) => s.date ? s.date.slice(0, 7) : null).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
  if (!allMonths.includes(activeMonth)) allMonths.unshift(activeMonth)

  const filtered = sessions
    .filter((s) => s.date && s.date.startsWith(activeMonth))
    .filter((s) => activePay === 'All' || s.payment === activePay)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const totalGross = filtered.reduce((sum, s) => sum + (s.total || 0), 0)
  const totalTips = filtered.reduce((sum, s) => sum + (s.tip || 0), 0)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      const existingSet = new Set(sessions.map((s) => `${s.date}|${s.name}|${s.total}`))
      const parsed = []
      rows.forEach((row, idx) => {
        const name = (row.name || '').trim()
        const total = parseFloat(row.total) || 0
        if (!name || total === 0) return
        const date = parseDate(row.date || '')
        const tip = parseFloat(row.tip) || 0
        const style = (row.style || '').trim()
        const payment = (row.payment || 'Cash').trim() || 'Cash'
        const isDupe = existingSet.has(`${date}|${name}|${total}`)
        parsed.push({ id: Date.now() + idx, name, date, style, total, tip, payment, _dupe: isDupe })
      })
      setPreviewData(parsed)
      setShowPreview(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = () => {
    const nonDupes = previewData.filter((r) => !r._dupe)
    const dupeCount = previewData.length - nonDupes.length
    const cleaned = nonDupes.map(({ _dupe, ...r }) => r)
    const updated = [...sessions, ...cleaned]
    setSessions(updated)
    localStorage.setItem('sessions_v4', JSON.stringify(updated))
    setShowPreview(false)
    setPreviewData([])
    const msg = dupeCount > 0
      ? `${cleaned.length} sessions imported, ${dupeCount} duplicates skipped`
      : `${cleaned.length} sessions imported`
    showToast(msg)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select style={{ ...S.select, width: 'auto', minWidth: 140 }} value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)}>
            {allMonths.map((ym) => <option key={ym} value={ym}>{fmtMonthShort(ym)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', ...INCOME_PAYMENT_METHODS].map((pm) => (
              <button key={pm} style={S.chip(activePay === pm)} onClick={() => setActivePay(pm)}>{pm}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          <button style={S.btnSm()} onClick={() => fileRef.current?.click()}>Import Past Sessions</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No sessions found for this period.</p>
      ) : filtered.map((s) => {
        const isExpanded = expanded === s.id
        return (
          <div key={s.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => setExpanded(isExpanded ? null : s.id)}>
              <span style={{ ...S.rowMuted, minWidth: 50 }}>{fmtDateShort(s.date)}</span>
              <span style={{ ...S.rowText, fontWeight: 500 }}>{s.name}</span>
              {s.style && <span style={S.badge('#c9a96e')}>{s.style}</span>}
              <span style={S.badge('#7a786f')}>{s.payment || 'Cash'}</span>
              {s.tip > 0 && <span style={{ ...S.rowMuted, color: '#c9a96e' }}>+{fmt$(s.tip)} tip</span>}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c9a96e', flexShrink: 0 }}>{fmt$(s.total)}</span>
            </div>
            {isExpanded && (
              <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #2a2a26', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Date', s.date], ['Client', s.name], ['Style', s.style || 'Not specified'], ['Payment', s.payment || 'Cash'], ['Total', fmt$(s.total)], ['Tip', fmt$(s.tip)]].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ ...S.label, margin: '0 0 2px' }}>{label}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#e8e6df', margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {filtered.length > 0 && (
        <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 10, padding: '12px 16px', marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>{filtered.length} sessions</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e' }}>gross {fmt$(totalGross)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e' }}>tips {fmt$(totalTips)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e', fontWeight: 700 }}>total {fmt$(totalGross + totalTips)}</span>
        </div>
      )}

      {showPreview && (
        <div style={S.modal} onClick={() => setShowPreview(false)}>
          <div style={{ ...S.modalBox, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Import Sessions</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f', margin: '0 0 12px' }}>
              {previewData.length} rows found. Showing first 10.
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Date', 'Name', 'Style', 'Total', 'Payment', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#7a786f', borderBottom: '1px solid #2a2a26' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.date}</td>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.name}</td>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.style}</td>
                      <td style={{ padding: '4px 8px', color: '#c9a96e' }}>{fmt$(r.total)}</td>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.payment}</td>
                      <td style={{ padding: '4px 8px' }}>{r._dupe && <span style={S.badge('#7a786f')}>duplicate</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowPreview(false)}>Cancel</button>
              <button style={S.btn} onClick={handleImport}>Import All</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} color={toast.color} />}
    </div>
  )
}

// ─── ExpensesTab ──────────────────────────────────────────────────────────────
function ExpensesTab({ expenses, setExpenses }) {
  const thisYM = new Date().toISOString().slice(0, 7)
  const [activeMonth, setActiveMonth] = useState(thisYM)
  const [activeCat, setActiveCat] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankExpense())
  const [toast, setToast] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const fileRef = useRef(null)

  const showToast = (msg, color = '#7aab8f') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  const saveExpenses = (updated) => {
    setExpenses(updated)
    localStorage.setItem('macri_expenses', JSON.stringify(updated))
  }

  const allMonths = [...new Set(expenses.map((e) => e.date ? e.date.slice(0, 7) : null).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
  if (!allMonths.includes(activeMonth)) allMonths.unshift(activeMonth)

  const filtered = expenses
    .filter((e) => e.date && e.date.startsWith(activeMonth))
    .filter((e) => activeCat === 'All' || e.category === activeCat)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const totalFiltered = filtered.reduce((sum, e) => sum + (e.amount || 0), 0)

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}); return }
    setExpanded(id)
    setEditDraft({ ...expenses.find((e) => e.id === id) })
  }

  const saveEdit = (id) => {
    saveExpenses(expenses.map((e) => e.id === id ? { ...editDraft } : e))
    setExpanded(null)
    setEditDraft({})
  }

  const handleDelete = (evt, id) => {
    evt.stopPropagation()
    if (confirmDelete === id) {
      saveExpenses(expenses.filter((e) => e.id !== id))
      setConfirmDelete(null)
      if (expanded === id) setExpanded(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleAdd = () => {
    if (!form.amount || (!form.vendor && !form.description)) return
    saveExpenses([{ ...form, id: uid(), createdAt: now() }, ...expenses])
    setForm(blankExpense())
    setShowModal(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      const CATS_LC = EXPENSE_CATEGORIES.map((c) => c.toLowerCase())
      const parsed = rows.map((row) => {
        const amount = parseFloat(row.amount) || 0
        const vendor = (row.vendor || '').trim()
        const description = (row.description || '').trim()
        if (amount === 0 || (!vendor && !description)) return null
        const catRaw = (row.category || '').trim().toLowerCase()
        const catIdx = CATS_LC.indexOf(catRaw)
        const category = catIdx >= 0 ? EXPENSE_CATEGORIES[catIdx] : 'Other'
        const deductibleRaw = (row.deductible || '').trim().toLowerCase()
        const deductible = row.deductible === undefined ? true : ['yes', 'true', '1'].includes(deductibleRaw)
        const paymentMethod = (row.paymentmethod || row['payment method'] || row.payment || 'Other').trim() || 'Other'
        return { id: uid(), date: parseDate(row.date || ''), category, vendor, description, amount, paymentMethod, deductible, notes: (row.notes || '').trim(), createdAt: now() }
      }).filter(Boolean)
      setPreviewData(parsed)
      setShowPreview(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = () => {
    saveExpenses([...expenses, ...previewData])
    setShowPreview(false)
    showToast(`${previewData.length} expenses imported`)
    setPreviewData([])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select style={{ ...S.select, width: 'auto', minWidth: 140 }} value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)}>
            {allMonths.map((ym) => <option key={ym} value={ym}>{fmtMonthShort(ym)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', ...EXPENSE_CATEGORIES].map((cat) => (
              <button key={cat} style={S.chip(activeCat === cat)} onClick={() => setActiveCat(cat)}>{cat}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          <button style={S.btnSm()} onClick={() => fileRef.current?.click()}>Import CSV</button>
          <button style={S.btn} onClick={() => { setForm(blankExpense()); setShowModal(true) }}>+ Add Expense</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No expenses for this period.</p>
      ) : filtered.map((exp) => {
        const isExpanded = expanded === exp.id
        return (
          <div key={exp.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(exp.id)}>
              <span style={{ ...S.rowMuted, minWidth: 50 }}>{fmtDateShort(exp.date)}</span>
              <span style={S.badge('#7a786f')}>{exp.category}</span>
              <span style={{ ...S.rowText, fontWeight: 500 }}>{exp.vendor || exp.description}</span>
              {exp.vendor && exp.description && <span style={{ ...S.rowMuted, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{exp.description}</span>}
              {exp.deductible && <span style={S.badge('#7aab8f')}>deductible</span>}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f09595', flexShrink: 0 }}>{fmt$(exp.amount)}</span>
              <button
                style={confirmDelete === exp.id ? S.btnDanger : { ...S.btnSm('#7a786f'), border: 'none', background: 'transparent' }}
                onClick={(evt) => handleDelete(evt, exp.id)}
              >
                {confirmDelete === exp.id ? 'Confirm' : '✕'}
              </button>
            </div>
            {isExpanded && (
              <div style={S.expandPanel}>
                {[
                  { key: 'date', label: 'Date', type: 'date' },
                  { key: 'vendor', label: 'Vendor', type: 'text' },
                  { key: 'description', label: 'Description', type: 'text' },
                  { key: 'amount', label: 'Amount', type: 'number' },
                  { key: 'notes', label: 'Notes', type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key} style={S.field}>
                    <span style={S.label}>{label}</span>
                    <input
                      type={type}
                      style={S.input}
                      value={editDraft[key] ?? ''}
                      onChange={(e) => setEditDraft({ ...editDraft, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                    />
                  </div>
                ))}
                <div style={S.field}>
                  <span style={S.label}>Category</span>
                  <select style={S.select} value={editDraft.category ?? 'Other'} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.field}>
                  <span style={S.label}>Payment Method</span>
                  <select style={S.select} value={editDraft.paymentMethod ?? 'Other'} onChange={(e) => setEditDraft({ ...editDraft, paymentMethod: e.target.value })}>
                    {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ ...S.field, gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="ded-edit" checked={editDraft.deductible ?? true} onChange={(e) => setEditDraft({ ...editDraft, deductible: e.target.checked })} />
                  <label htmlFor="ded-edit" style={{ ...S.label, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Tax deductible</label>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.btnSm('#7a786f')} onClick={() => { setExpanded(null); setEditDraft({}) }}>Cancel</button>
                  <button style={S.btn} onClick={() => saveEdit(exp.id)}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {filtered.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f09595' }}>
          Total: {fmt$(totalFiltered)}
        </div>
      )}

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Expense</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'date', label: 'Date', type: 'date' },
                { key: 'vendor', label: 'Vendor', type: 'text' },
                { key: 'description', label: 'Description', type: 'text' },
                { key: 'amount', label: 'Amount', type: 'number' },
                { key: 'notes', label: 'Notes', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} style={S.field}>
                  <span style={S.label}>{label}</span>
                  <input
                    type={type}
                    style={S.input}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                  />
                </div>
              ))}
              <div style={S.field}>
                <span style={S.label}>Category</span>
                <select style={S.select} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Payment Method</span>
                <select style={S.select} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ded-add" checked={form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.checked })} />
                <label htmlFor="ded-add" style={{ ...S.label, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Tax deductible</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div style={S.modal} onClick={() => setShowPreview(false)}>
          <div style={{ ...S.modalBox, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Import Expenses</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f', margin: '0 0 12px' }}>
              {previewData.length} rows found. Showing first 10.
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Date', 'Category', 'Vendor', 'Amount'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#7a786f', borderBottom: '1px solid #2a2a26' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.date}</td>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.category}</td>
                      <td style={{ padding: '4px 8px', color: '#e8e6df' }}>{r.vendor}</td>
                      <td style={{ padding: '4px 8px', color: '#f09595' }}>{fmt$(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowPreview(false)}>Cancel</button>
              <button style={S.btn} onClick={handleImport}>Import All</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} color={toast.color} />}
    </div>
  )
}

// ─── PLTab ────────────────────────────────────────────────────────────────────
const getPeriodRange = (period, customStart, customEnd) => {
  const t = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  if (period === 'month') {
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
    return { start: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-01`, end: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(last)}` }
  }
  if (period === 'quarter') {
    const q = Math.floor(t.getMonth() / 3)
    const qs = new Date(t.getFullYear(), q * 3, 1)
    const qe = new Date(t.getFullYear(), q * 3 + 3, 0)
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    return { start: fmt(qs), end: fmt(qe) }
  }
  if (period === 'year') return { start: `${t.getFullYear()}-01-01`, end: `${t.getFullYear()}-12-31` }
  return { start: customStart, end: customEnd }
}

function PLTab({ sessions, expenses }) {
  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState(new Date().toISOString().slice(0, 7) + '-01')
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10))
  const [showAll, setShowAll] = useState(false)

  const { start, end } = getPeriodRange(period, customStart, customEnd)
  const inRange = (d) => d >= start && d <= end

  const fs = sessions.filter((s) => s.date && inRange(s.date))
  const fe = expenses.filter((e) => e.date && inRange(e.date))

  const styleMap = {}
  fs.forEach((s) => {
    const style = INCOME_STYLES.includes(s.style) ? s.style : 'Other'
    styleMap[style] = (styleMap[style] || 0) + (s.total || 0)
  })

  const expCatMap = {}
  fe.forEach((e) => {
    const cat = EXPENSE_CATEGORIES.includes(e.category) ? e.category : 'Other'
    expCatMap[cat] = (expCatMap[cat] || 0) + (e.amount || 0)
  })

  const grossRevenue = fs.reduce((sum, s) => sum + (s.total || 0), 0)
  const tipsTotal = fs.reduce((sum, s) => sum + (s.tip || 0), 0)
  const totalIncome = grossRevenue + tipsTotal
  const totalExpenses = fe.reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = grossRevenue - totalExpenses
  const taxReserve = grossRevenue * 0.28
  const afterTax = grossRevenue - taxReserve

  const handleExportCSV = () => {
    const rows = [['Category', 'Line Item', 'Amount']]
    INCOME_STYLES.forEach((style) => {
      const amt = styleMap[style] || 0
      if (amt > 0 || showAll) rows.push(['Revenue', style, amt.toFixed(2)])
    })
    rows.push(['Revenue', 'GROSS REVENUE', grossRevenue.toFixed(2)])
    rows.push(['Revenue', 'Tips', tipsTotal.toFixed(2)])
    rows.push(['Revenue', 'TOTAL INCOME', totalIncome.toFixed(2)])
    EXPENSE_CATEGORIES.forEach((cat) => {
      const amt = expCatMap[cat] || 0
      if (amt > 0 || showAll) rows.push(['Expenses', cat, amt.toFixed(2)])
    })
    rows.push(['Expenses', 'TOTAL EXPENSES', totalExpenses.toFixed(2)])
    rows.push(['Summary', 'NET PROFIT', netProfit.toFixed(2)])
    rows.push(['Summary', 'TAX RESERVE 28%', taxReserve.toFixed(2)])
    rows.push(['Summary', 'EST INCOME AFTER TAX', afterTax.toFixed(2)])
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pl_${start.replace(/-/g, '')}_to_${end.replace(/-/g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const mono = { fontFamily: 'JetBrains Mono, monospace' }

  const PLRow = ({ label, amount, isSummary, color, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ ...mono, fontSize: isSummary ? 12 : 11, color: isSummary ? '#e8e6df' : '#7a786f', fontWeight: isSummary ? 600 : 400, paddingLeft: indent ? 16 : 0 }}>
        {label}
      </span>
      <span style={{ ...mono, fontSize: isSummary ? 12 : 11, color: color || (isSummary ? '#e8e6df' : '#c9a96e') }}>
        {fmt$(amount)}
      </span>
    </div>
  )

  const Div = () => <div style={{ borderTop: '1px solid #2a2a26', margin: '8px 0' }} />

  return (
    <div>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pl-report { display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; padding: 40px !important; background: white !important; }
          #pl-report * { color: black !important; background: transparent !important; border-color: #bbb !important; font-family: monospace !important; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year'], ['custom', 'Custom Range']].map(([k, l]) => (
          <button key={k} style={S.chip(period === k)} onClick={() => setPeriod(k)}>{l}</button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" style={{ ...S.input, width: 150 }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span style={{ ...mono, fontSize: 12, color: '#7a786f' }}>to</span>
            <input type="date" style={{ ...S.input, width: 150 }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <span style={{ ...mono, fontSize: 11, color: '#7a786f' }}>Show All Lines</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnSm()} onClick={handleExportCSV}>Export CSV</button>
          <button style={S.btnSm()} onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div id="pl-report" style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 12, padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e8e6df', margin: '0 0 4px' }}>PROFIT AND LOSS</p>
          <p style={{ ...mono, fontSize: 11, color: '#7a786f', margin: '0 0 2px' }}>Saul Gutierrez | Private Studio | Elk Grove CA</p>
          <p style={{ ...mono, fontSize: 11, color: '#7a786f', margin: 0 }}>
            Period: {fmtDateLong(start)} to {fmtDateLong(end)}
          </p>
        </div>

        <Div />
        <p style={{ ...mono, fontSize: 11, color: '#c9a96e', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>REVENUE</p>
        {INCOME_STYLES.map((style) => {
          const amt = styleMap[style] || 0
          if (!showAll && amt === 0) return null
          return <PLRow key={style} label={style} amount={amt} indent />
        })}
        <Div />
        <PLRow label="GROSS REVENUE" amount={grossRevenue} isSummary />
        <PLRow label="Tips" amount={tipsTotal} indent />
        <PLRow label="TOTAL INCOME" amount={totalIncome} isSummary />

        <Div />
        <p style={{ ...mono, fontSize: 11, color: '#f09595', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>EXPENSES</p>
        {EXPENSE_CATEGORIES.map((cat) => {
          const amt = expCatMap[cat] || 0
          if (!showAll && amt === 0) return null
          return <PLRow key={cat} label={cat} amount={amt} color="#f09595" indent />
        })}
        <Div />
        <PLRow label="TOTAL EXPENSES" amount={totalExpenses} isSummary color="#f09595" />

        <Div />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8e6df' }}>NET PROFIT</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: netProfit >= 0 ? '#7aab8f' : '#f09595' }}>
            {netProfit < 0 ? '-' : ''}{fmt$(netProfit)}
          </span>
        </div>

        <Div />
        <PLRow label="TAX RESERVE (28%)" amount={taxReserve} isSummary color="#c9a96e" />
        <PLRow label="EST. INCOME AFTER TAX" amount={afterTax} isSummary color={afterTax >= 0 ? '#7aab8f' : '#f09595'} />
      </div>
    </div>
  )
}

// ─── GoalsTab ─────────────────────────────────────────────────────────────────
function GoalsTab({ sessions, goals, setGoals }) {
  const thisYM = new Date().toISOString().slice(0, 7)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankGoal())

  const curGoal = goals.find((g) => g.month === thisYM)
  const curRevenue = sessions
    .filter((s) => s.date && s.date.startsWith(thisYM))
    .reduce((sum, s) => sum + (s.total || 0), 0)
  const goalPct = curGoal ? Math.min(100, (curRevenue / curGoal.targetAmount) * 100) : 0
  const goalMet = curGoal && curRevenue >= curGoal.targetAmount

  const saveGoals = (updated) => {
    setGoals(updated)
    localStorage.setItem('macri_finance_goals', JSON.stringify(updated))
  }

  const openModal = (goal) => {
    setForm(goal ? { ...goal } : { ...blankGoal(), month: thisYM })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.targetAmount) return
    const existing = goals.find((g) => g.month === form.month)
    const updated = existing
      ? goals.map((g) => g.month === form.month ? { ...form, id: existing.id } : g)
      : [{ ...form, id: uid(), createdAt: now() }, ...goals]
    saveGoals(updated)
    setShowModal(false)
  }

  const history = goals.filter((g) => g.month !== thisYM).sort((a, b) => b.month.localeCompare(a.month))

  return (
    <div>
      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
              {fmtMonthYear(thisYM)}
            </p>
            {curGoal
              ? <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 700, color: '#c9a96e', margin: 0 }}>{fmt$(curGoal.targetAmount)}</p>
              : <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: '#7a786f', margin: 0 }}>No goal set</p>
            }
          </div>
          <button style={S.btn} onClick={() => openModal(curGoal || null)}>
            {curGoal ? 'Edit Goal' : 'Set Goal'}
          </button>
        </div>
        {curGoal && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>{fmt$(curRevenue)} earned</span>
              {goalMet
                ? <span style={S.badge('#7aab8f')}>Goal Reached</span>
                : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>{goalPct.toFixed(0)}% complete</span>
              }
            </div>
            <div style={{ background: '#2a2a26', borderRadius: 4, height: 10, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ background: '#c9a96e', height: '100%', width: `${goalPct}%`, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            {!goalMet && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', margin: 0 }}>
                {fmt$(Math.max(0, curGoal.targetAmount - curRevenue))} remaining
              </p>
            )}
            {curGoal.notes && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7a786f', margin: '10px 0 0' }}>{curGoal.notes}</p>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8e6df', margin: '0 0 12px' }}>History</p>
          {history.map((g) => {
            const actual = sessions
              .filter((s) => s.date && s.date.startsWith(g.month))
              .reduce((sum, s) => sum + (s.total || 0), 0)
            const net = actual - g.targetAmount
            const met = actual >= g.targetAmount
            return (
              <div key={g.id} style={{ ...S.row(false), cursor: 'default' }}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', fontWeight: 500 }}>{fmtMonthYear(g.month)}</span>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>goal {fmt$(g.targetAmount)}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e' }}>actual {fmt$(actual)}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: net >= 0 ? '#7aab8f' : '#f09595' }}>{fmtSigned(net)}</span>
                    <span style={S.badge(met ? '#7aab8f' : '#f09595')}>{met ? 'Met' : 'Missed'}</span>
                    <button style={S.btnSm()} onClick={() => openModal(g)}>Edit</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>{goals.find((g) => g.month === form.month) ? 'Edit Goal' : 'Set Goal'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={S.field}>
                <span style={S.label}>Month</span>
                <input type="month" style={S.input} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Target Amount</span>
                <input type="number" style={S.input} value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Notes</span>
                <input type="text" style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave}>Save Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Finance (root) ───────────────────────────────────────────────────────────
export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sessions, setSessions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [goals, setGoals] = useState([])

  useEffect(() => {
    const s = localStorage.getItem('sessions_v4')
    const e = localStorage.getItem('macri_expenses')
    const g = localStorage.getItem('macri_finance_goals')
    setSessions(s ? JSON.parse(s) : [])
    setExpenses(e ? JSON.parse(e) : [])
    setGoals(g ? JSON.parse(g) : [])
  }, [])

  const thisYM = new Date().toISOString().slice(0, 7)
  const monthRevenue = sessions.filter((s) => s.date && s.date.startsWith(thisYM)).reduce((sum, s) => sum + (s.total || 0), 0)
  const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(thisYM)).reduce((sum, e) => sum + (e.amount || 0), 0)
  const netProfit = monthRevenue - monthExpenses

  return (
    <div style={S.page}>
      <p style={S.panelLabel}>panel / finance</p>
      <h1 style={S.h1}>Finance</h1>
      <p style={{ ...S.subtitle, color: netProfit >= 0 ? '#7aab8f' : '#f09595' }}>
        {fmtMonthYear(thisYM)} net profit: {netProfit < 0 ? '-' : ''}{fmt$(netProfit)}
      </p>

      <div style={S.tabRow}>
        {[['overview', 'Overview'], ['income', 'Income'], ['expenses', 'Expenses'], ['pl', 'P&L'], ['goals', 'Goals']].map(([k, l]) => (
          <button key={k} style={S.tab(activeTab === k)} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab sessions={sessions} expenses={expenses} goals={goals} onGoalsTabClick={() => setActiveTab('goals')} />
      )}
      {activeTab === 'income' && (
        <IncomeTab sessions={sessions} setSessions={setSessions} />
      )}
      {activeTab === 'expenses' && (
        <ExpensesTab expenses={expenses} setExpenses={setExpenses} />
      )}
      {activeTab === 'pl' && (
        <PLTab sessions={sessions} expenses={expenses} />
      )}
      {activeTab === 'goals' && (
        <GoalsTab sessions={sessions} goals={goals} setGoals={setGoals} />
      )}
    </div>
  )
}
