import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { STAGES } from '../constants/stages'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'macri_crm_clients'
const SECTION_ORDER_KEY = 'macri_drawer_section_order'


const STAGE_STYLE = {
  'Inquiry':          { bg: 'rgba(91,141,184,0.18)',  color: '#78aed4' },
  'Inquiry Response': { bg: 'rgba(100,160,210,0.18)', color: '#64b4e0' },
  'Consultation':     { bg: 'rgba(201,169,110,0.18)', color: '#c9a96e' },
  'Design Phase':     { bg: 'rgba(167,139,250,0.18)', color: '#a78bfa' },
  'Approval':         { bg: 'rgba(251,146,60,0.18)',  color: '#fb923c' },
  'Scheduled':        { bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
  'Completed':        { bg: 'rgba(122,171,143,0.2)',  color: '#7aab8f' },
  'Archive':          { bg: 'rgba(122,120,111,0.18)', color: '#7a786f' },
}

const STATUS_CONFIG = {
  urgent:  { label: 'Urgent needs attention', emoji: '🔴', color: '#ef4444' },
  waiting: { label: 'Waiting on client',      emoji: '🟡', color: '#f0b429' },
  ready:   { label: 'Ready to go',            emoji: '🟢', color: '#7aab8f' },
}

const AVATAR_PALETTE = [
  '#c9a96e', '#7aab8f', '#78aed4', '#a78bfa', '#f87171', '#34d399', '#fb923c',
]

const JOURNEY_LABELS = [
  'Inquiry received',
  'Inquiry response sent',
  'Consultation completed',
  'Deposit paid',
  'Appointment scheduled',
  'Tattoo completed',
]

const AFTERCARE_LABELS = [
  'Same day aftercare instructions sent',
  'Day 3 check in sent',
  'Week 2 healing check sent',
  'Healed photo requested',
  'Review link sent',
]

const SCENARIOS = ['Session in Progress', 'Project Complete', 'Touch Up']

const TEMPLATES = {
  'Session in Progress': [
    'Hey [Name], great session today, we made some serious progress on your piece. I am really happy with how it is developing. Since we still have more work to do, treat this exactly like a finished tattoo for now. Keep it clean, moisturized, out of the sun, and no picking. Your skin needs to fully heal before we go back in. Any questions at all, text me.',
    'Hey [Name], checking in. How is everything feeling? Some itching and peeling is totally normal right now, just the healing doing its job. Keep it moisturized and let me know if anything looks off. We will get back in there once it is ready.',
    'Hey [Name], two weeks out, how is it looking? Send me a photo when you get a chance so I can see how it is settling. Once it is fully healed we can plan the next session and keep building.',
  ],
  'Project Complete': [
    'Hey [Name], what a day. Your piece is done and I could not be more proud of how it turned out. It was a real honor working on this with you. Keep it clean and moisturized, avoid soaking in water and direct sun, and do not pick at it no matter what. If you have any questions during the heal text me anytime. Thank you for trusting me with your vision.',
    'Hey [Name], just checking in on your healed piece. How is it feeling? Itching and peeling around now is completely normal, just keep moisturizing and leave it alone. You are almost through the hardest part.',
    'Hey [Name], two weeks in already. How is it looking? Send me a photo when you get a chance, I would love to see how it is settling. If anything needs a little touch up once it is fully healed, we will take care of it.',
  ],
  'Touch Up': [
    'Hey [Name], good to see you again today. The touch up is looking clean, really happy with how we dialed it in. Treat it just like the first time around, keep it moisturized, out of the sun, and no picking. Should heal up fast since it was a smaller area. Text me if anything feels off.',
    'Hey [Name], checking in on the touch up. How is it feeling? Should be moving through the healing process pretty quickly. Keep moisturizing and let me know if you have any questions.',
    'Hey [Name], two weeks out from your touch up. How is it looking? Send me a photo when you can so I can see how it settled.',
  ],
}

const MOVABLE_SECTIONS = [
  'clientStatus', 'projectDetails', 'pipelineStage',
  'journeyChecklist', 'aftercareChecklist', 'consultationLog', 'communications', 'activityNotes',
  'paymentHistory',
]

const SECTION_LABELS = {
  clientStatus:       'Client Status',
  projectDetails:     'Project Details',
  pipelineStage:      'Pipeline Stage',
  journeyChecklist:   'Journey Checklist',
  aftercareChecklist: 'Client Care',
  consultationLog:    'Consultation Log',
  communications:     'Communications',
  activityNotes:      'Activity and Notes',
  paymentHistory:     'Payment History',
}

// 10 sections for the card back jump menu
const ALL_JUMP_SECTIONS = [
  { id: 'header',             label: 'Header',                    locked: true },
  { id: 'clientStatus',       label: 'Client Status',             locked: false },
  { id: 'projectDetails',     label: 'Project Details',           locked: false },
  { id: 'pipelineStage',      label: 'Pipeline Stage',            locked: false },
  { id: 'journeyChecklist',   label: 'Journey Checklist',         locked: false },
  { id: 'aftercareChecklist', label: 'Client Care',       locked: false },
  { id: 'consultationLog',    label: 'Consultation Log',          locked: false },
  { id: 'communications',     label: 'Communications',            locked: false },
  { id: 'activityNotes',      label: 'Activity and Notes',        locked: false },
  { id: 'paymentHistory',     label: 'Payment History',           locked: false },
  { id: 'bottomActions',      label: 'Persistent Bottom Actions', locked: true },
]

// ─── utils ────────────────────────────────────────────────────────────────────

export function mkClient(data = {}) {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: '', email: '', phone: '',
    tattooIdea: '', style: '', placement: '', size: '', nextAction: '',
    stage: 'Inquiry', status: null,
    journeyChecklist:   [false, false, false, false, false, false],
    aftercareChecklist: [false, false, false, false, false],
    consultations:  [],
    activityLog:    [],
    communications: [],
    sessions:       [],
    consultationCount: 0,
    createdAt: now, updatedAt: now,
    ...data,
  }
}

function mkSession(data = {}) {
  return {
    id:              crypto.randomUUID(),
    date:            today(),
    tattooDescription: '',
    placement:       '',
    isTouchUp:       false,
    deposit:         '',
    depositRefund:   '',
    tattooPrice:     '',
    amountPaid:      '',
    tip:             '',
    paymentMethod:   'Cash',
    giftCardCode:    '',
    discountCode:    '',
    originalPrice:   '',
    discountApplied: '',
    notes:           '',
    ...data,
  }
}

export function mkComm(data = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'inquiry',
    channel: null,
    timestamp: new Date().toISOString(),
    subject: '', body: '', notes: '',
    editable: true,
    ...data,
  }
}

export function loadClients() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

export function saveClients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function mkActivity(text) {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), text }
}

function avatarColor(name) {
  let h = 0
  for (const ch of (name ?? '')) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(isoDate) {
  try {
    const [y, m, d] = isoDate.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return isoDate }
}

function formatTs(iso) {
  try {
    const d = new Date(iso)
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    )
  } catch { return '' }
}

function loadSectionOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(SECTION_ORDER_KEY))
    if (Array.isArray(stored)) {
      if (!stored.includes('communications')) {
        const idx = stored.indexOf('activityNotes')
        const migrated = [...stored]
        migrated.splice(idx >= 0 ? idx : stored.length, 0, 'communications')
        if (migrated.length === MOVABLE_SECTIONS.length && migrated.every(id => MOVABLE_SECTIONS.includes(id))) {
          saveSectionOrder(migrated)
          return migrated
        }
      }
      if (!stored.includes('paymentHistory')) {
        const migrated = [...stored, 'paymentHistory']
        if (migrated.length === MOVABLE_SECTIONS.length && migrated.every(id => MOVABLE_SECTIONS.includes(id))) {
          saveSectionOrder(migrated)
          return migrated
        }
      }
      if (
        stored.length === MOVABLE_SECTIONS.length &&
        stored.every(id => MOVABLE_SECTIONS.includes(id))
      ) return stored
    }
  } catch {}
  return [...MOVABLE_SECTIONS]
}

function saveSectionOrder(order) {
  localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order))
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Date', 'Client Name', 'Phone', 'Email', 'Tattoo Description', 'Placement',
  'Touch Up', 'Deposit', 'Deposit Refund', 'Tattoo Price', 'Amount Paid', 'Tip',
  'Payment Method', 'Gift Card Code', 'Discount Code', 'Original Price',
  'Discount Applied', 'Notes', 'Pipeline Stage', 'Style', 'Source', 'Archived',
]

function csvEsc(val) {
  const s = (val == null || val === false) ? '' : val === true ? 'true' : String(val)
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function buildCSV(clients) {
  const lines = [CSV_HEADERS.join(',')]
  for (const c of clients) {
    const archived = c.stage === 'Archive' ? 'true' : 'false'
    const profileCells = [
      '', c.name, c.phone || '', c.email || '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      c.stage || '', c.style || '', c.source || '', archived,
    ]
    const sessionCells = s => [
      s.date || '', c.name, c.phone || '', c.email || '',
      s.tattooDescription || '', s.placement || '',
      s.isTouchUp ? 'true' : '',
      s.deposit || '', s.depositRefund || '', s.tattooPrice || '',
      s.amountPaid || '', s.tip || '', s.paymentMethod || '',
      s.giftCardCode || '', s.discountCode || '', s.originalPrice || '',
      s.discountApplied || '', s.notes || '',
      c.stage || '', c.style || '', c.source || '', archived,
    ]
    const sessions = c.sessions || []
    if (sessions.length === 0) {
      lines.push(profileCells.map(csvEsc).join(','))
    } else {
      for (const s of sessions) lines.push(sessionCells(s).map(csvEsc).join(','))
    }
  }
  return lines.join('\n')
}

function parseCSVText(raw) {
  const src = raw.replace(/^﻿/, '')
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQ = false
      } else { field += ch }
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); field = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else if (ch !== '\r') {
      field += ch
    }
  }
  row.push(field)
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

// ─── hooks ────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

// ─── small components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 52 }) {
  const color   = avatarColor(name)
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '1a', border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-heading)', fontSize: size * 0.38, fontWeight: 700, color }}>
        {initial}
      </span>
    </div>
  )
}

function StageBadge({ stage }) {
  const s = STAGE_STYLE[stage] ?? STAGE_STYLE['Inquiry']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: '4px',
      background: s.bg, color: s.color,
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      letterSpacing: '0.06em', fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {stage}
    </span>
  )
}

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <div style={{ width: 8, height: 8 }} />
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: cfg.color, boxShadow: `0 0 6px ${cfg.color}99`,
    }} />
  )
}

function DragHeader({ label, badge, mono = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, userSelect: 'none' }}>
      <span style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-heading)',
        fontSize: mono ? '11px' : '13px',
        color: mono ? 'var(--gold)' : 'var(--text)',
        letterSpacing: mono ? '0.1em' : undefined,
        textTransform: mono ? 'uppercase' : undefined,
        fontWeight: 400, flex: 1,
      }}>
        {label}
      </span>
      {badge != null && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--gold)',
          background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)',
          borderRadius: 4, padding: '1px 7px',
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function SortableSection({ id, isEditMode, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'stretch',
        ...(isEditMode && isDragging ? {
          border: '1px solid #c9a96e',
          background: '#1e1e1b',
          borderRadius: 8,
          zIndex: 10,
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        } : {}),
      }}
      {...attributes}
    >
      {isEditMode && (
        <div
          {...listeners}
          style={{
            width: 24, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', color: '#7a786f', fontSize: 18,
            touchAction: 'none', userSelect: 'none',
          }}
        >
          ⠿
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, color: '#7a786f', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}

function btn(variant) {
  const base = {
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: 500,
    transition: 'opacity 0.15s',
  }
  if (variant === 'primary') return { ...base, background: 'var(--gold)', color: 'var(--bg)', fontSize: '13px', padding: '10px 20px', fontWeight: 600 }
  if (variant === 'ghost')   return { ...base, background: 'var(--surface2)', color: 'var(--muted)', fontSize: '12px', padding: '7px 12px', border: '1px solid transparent' }
  if (variant === 'danger')  return { ...base, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', padding: '7px 12px', border: '1px solid rgba(239,68,68,0.2)' }
  if (variant === 'confirm') return { ...base, background: 'rgba(239,68,68,0.25)', color: '#ff6b6b', fontSize: '12px', padding: '7px 12px', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 600 }
}

// ─── InlineField ──────────────────────────────────────────────────────────────

function InlineField({ label, value, onSave, linkHref }) {
  const [editing, setEditing] = useState(false)
  const [local,   setLocal]   = useState(value || '')

  useEffect(() => {
    if (!editing) setLocal(value || '')
  }, [value, editing])

  function commit() {
    setEditing(false)
    if (local.trim() !== (value || '').trim()) onSave(local.trim())
  }

  return (
    <div style={{ minHeight: 44 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5,
      }}>
        {label}
      </div>
      {editing ? (
        <input
          type="text"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
          autoFocus
          style={{
            width: '100%', background: 'var(--surface2)',
            border: '1px solid var(--gold)', borderRadius: 8,
            padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14,
            color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
          {value && linkHref ? (
            <a
              href={linkHref}
              style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: '#7a786f', textDecoration: 'none' }}
            >
              {value}
            </a>
          ) : (
            <span
              onClick={() => setEditing(true)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'text', flex: 1,
                color: value ? '#7a786f' : 'var(--muted)',
                fontWeight: value ? 500 : 400,
                opacity: value ? 1 : 0.45,
              }}
            >
              {value || 'Tap to add'}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 13, padding: '4px 6px',
              opacity: 0.5, flexShrink: 0, lineHeight: 1,
            }}
          >
            ✎
          </button>
        </div>
      )}
    </div>
  )
}

// ─── TemplatePanel ────────────────────────────────────────────────────────────

function TemplatePanel({ itemIndex, firstName, phone, isMobile, onMarkSent, onClose }) {
  const [scenario, setScenario] = useState(null)
  const [copied,   setCopied]   = useState(false)

  const rawTemplate = scenario ? TEMPLATES[scenario][itemIndex] : null
  const text = rawTemplate ? rawTemplate.replace(/\[Name\]/g, firstName) : null

  function copyText() {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openMessages() {
    if (!text) return
    const body   = encodeURIComponent(text)
    const target = phone ? `sms:${phone}?body=${body}` : `sms:?body=${body}`
    window.location.href = target
  }

  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 12,
      border: '1px solid rgba(201,169,110,0.2)',
      padding: 16, marginTop: 4, marginBottom: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Choose Scenario
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '4px 8px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: scenario ? 16 : 0 }}>
        {SCENARIOS.map(s => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            style={{
              background: scenario === s ? 'rgba(201,169,110,0.12)' : 'var(--surface2)',
              border: `1px solid ${scenario === s ? 'var(--gold)' : 'transparent'}`,
              borderRadius: 8, padding: '10px 14px',
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: scenario === s ? 'var(--gold)' : 'var(--muted)',
              cursor: 'pointer', minHeight: 44,
              transition: 'all 0.15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {text && (
        <>
          {!isMobile && phone && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              {phone}
            </div>
          )}
          <div style={{
            background: 'var(--surface)', borderRadius: 8,
            border: '1px solid var(--surface2)', padding: '12px 14px',
            marginBottom: 10,
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--text)', lineHeight: 1.65,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            userSelect: 'text',
          }}>
            {text}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              onClick={copyText}
              style={{
                flex: 1, minHeight: 44, borderRadius: 8,
                background: copied ? 'rgba(122,171,143,0.12)' : 'var(--surface2)',
                border: `1px solid ${copied ? '#7aab8f' : 'transparent'}`,
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: copied ? '#7aab8f' : 'var(--text)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            {isMobile ? (
              <button
                onClick={openMessages}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 8,
                  background: 'rgba(201,169,110,0.08)',
                  border: '1px solid rgba(201,169,110,0.25)',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--gold)', cursor: 'pointer',
                }}
              >
                Open in Messages
              </button>
            ) : (
              <div style={{
                flex: 1, minHeight: 44, borderRadius: 8,
                background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                padding: '0 12px',
              }}>
                {phone || 'No phone on file'}
              </div>
            )}
          </div>
          <button
            onClick={onMarkSent}
            style={{
              width: '100%', minHeight: 44, borderRadius: 8,
              background: 'rgba(201,169,110,0.06)',
              border: '1px solid rgba(201,169,110,0.2)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--gold)', cursor: 'pointer',
            }}
          >
            Mark as Sent
          </button>
        </>
      )}
    </div>
  )
}

// ─── ClientDrawer ─────────────────────────────────────────────────────────────

function ClientDrawer({ isOpen, client, onUpdate, onDelete, onClose, jumpSection }) {
  const isMobile = useIsMobile()

  const [activeAftercarePanel, setActiveAftercarePanel] = useState(null)
  const [addConsultOpen,       setAddConsultOpen]       = useState(false)
  const [consultForm,          setConsultForm]          = useState({ date: today(), duration: '', notes: '' })
  const [expandedConsults,     setExpandedConsults]     = useState({})
  const [commLogOpen,          setCommLogOpen]          = useState(false)
  const [commForm,             setCommForm]             = useState({ channel: 'Text Message', subject: '', body: '' })
  const [expandedComms,        setExpandedComms]        = useState({})
  const [noteInput,            setNoteInput]            = useState('')
  const [isListening,          setIsListening]          = useState(false)
  const [logSessionOpen,       setLogSessionOpen]       = useState(false)
  const [expandedSessions,     setExpandedSessions]     = useState({})
  const [deleteSessionTarget,  setDeleteSessionTarget]  = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleteFading,   setDeleteFading]   = useState(false)
  const [sectionOrder,   setSectionOrder]   = useState(loadSectionOrder)
  const [layoutEditMode, setLayoutEditMode] = useState(false)

  const consultRef    = useRef(null)
  const sectionRefs   = useRef({})
  const scrollBodyRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  useEffect(() => {
    if (!isOpen) {
      setActiveAftercarePanel(null)
      setAddConsultOpen(false)
      setNoteInput('')
      setConfirmDelete(false)
      setExpandedConsults({})
      setCommLogOpen(false)
      setCommForm({ channel: 'Text Message', subject: '', body: '' })
      setExpandedComms({})
      setLogSessionOpen(false)
      setExpandedSessions({})
      setDeleteSessionTarget(null)
      setLayoutEditMode(false)
      setSectionOrder(loadSectionOrder())
    }
  }, [isOpen])

  useEffect(() => {
    setConsultForm({ date: today(), duration: '', notes: '' })
  }, [client?.id])

  // Jump to section when drawer opens
  useEffect(() => {
    if (!isOpen || !jumpSection) return
    const timer = setTimeout(() => {
      const body = scrollBodyRef.current
      if (!body) return
      if (jumpSection === 'bottomActions') {
        if (consultRef.current) {
          body.scrollTop = consultRef.current.offsetTop - body.offsetTop
        }
        return
      }
      const el = sectionRefs.current[jumpSection]
      if (el) body.scrollTop = el.offsetTop - body.offsetTop
    }, 350)
    return () => clearTimeout(timer)
  }, [isOpen, jumpSection])

  if (!client) return null

  const firstName = client.name?.split(' ')[0] || 'Client'
  const journey   = client.journeyChecklist   || [false, false, false, false, false, false]
  const aftercare = client.aftercareChecklist || [false, false, false, false, false]
  const consults  = client.consultations      || []
  const activity  = client.activityLog        || []
  const sessions  = client.sessions           || []

  function push(updated, logText) {
    const base = { ...updated, updatedAt: new Date().toISOString() }
    if (logText) {
      base.activityLog = [mkActivity(logText), ...(updated.activityLog || [])]
    }
    onUpdate(base)
  }

  function saveField(field, value) {
    push({ ...client, [field]: value })
  }

  function changeStage(stage) {
    push({ ...client, stage }, `Stage updated to ${stage}`)
  }

  function changeStatus(status) {
    const label = status ? STATUS_CONFIG[status].label : 'Status cleared'
    push({ ...client, status }, label)
  }

  function toggleJourney(i) {
    const next = [...journey]
    next[i] = !next[i]
    push(
      { ...client, journeyChecklist: next },
      `Journey: ${JOURNEY_LABELS[i]} ${next[i] ? 'completed' : 'unchecked'}`
    )
  }

  function handleAftercareItemTap(i) {
    if (aftercare[i]) {
      const next = [...aftercare]
      next[i] = false
      push({ ...client, aftercareChecklist: next }, `Aftercare: ${AFTERCARE_LABELS[i]} unchecked`)
      return
    }
    if (i < 3) {
      setActiveAftercarePanel(prev => prev === i ? null : i)
    } else {
      const next = [...aftercare]
      next[i] = true
      push({ ...client, aftercareChecklist: next }, `Aftercare: ${AFTERCARE_LABELS[i]} completed`)
    }
  }

  function markAftercareSent(i) {
    const next = [...aftercare]
    next[i] = true
    push({ ...client, aftercareChecklist: next }, `Aftercare: ${AFTERCARE_LABELS[i]} completed`)
    setActiveAftercarePanel(null)
  }

  function saveConsultation() {
    const isCompleted = client.stage === 'Completed'
    const newConsult  = {
      id: crypto.randomUUID(),
      date: consultForm.date,
      duration: consultForm.duration,
      notes: consultForm.notes,
      newProject: isCompleted,
    }
    let updated = {
      ...client,
      consultations: [newConsult, ...consults],
      consultationCount: (client.consultationCount || 0) + 1,
    }
    if (isCompleted) {
      updated.journeyChecklist   = [false, false, false, false, false, false]
      updated.aftercareChecklist = [false, false, false, false, false]
      updated.consultationCount  = 1
    }
    const logText = isCompleted
      ? `New project started. Consultation logged on ${formatDate(consultForm.date)}. Checklists reset.`
      : `Consultation logged on ${formatDate(consultForm.date)}`
    push(updated, logText)
    setConsultForm({ date: today(), duration: '', notes: '' })
    setAddConsultOpen(false)
  }

  function addNote() {
    if (!noteInput.trim()) return
    const note = noteInput.trim()
    onUpdate({
      ...client,
      updatedAt: new Date().toISOString(),
      activityLog: [mkActivity(note), ...activity],
    })
    setNoteInput('')
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser'); return }
    const rec = new SR()
    rec.continuous     = false
    rec.interimResults = false
    setIsListening(true)
    rec.onresult = e => {
      const transcript = e.results[0][0].transcript
      onUpdate({
        ...client,
        updatedAt: new Date().toISOString(),
        activityLog: [mkActivity(transcript), ...activity],
      })
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend   = () => setIsListening(false)
    rec.start()
  }

  function addCommEntry() {
    if (!commForm.body.trim()) return
    const entry = mkComm({
      channel: commForm.channel,
      subject: commForm.channel === 'Email' ? commForm.subject.trim() : '',
      body: commForm.body.trim(),
    })
    push({ ...client, communications: [entry, ...(client.communications || [])] })
    setCommForm({ channel: 'Text Message', subject: '', body: '' })
    setCommLogOpen(false)
  }

  function handleSaveSession(session) {
    push(
      { ...client, sessions: [session, ...sessions] },
      `Session logged: ${session.tattooDescription || 'Tattoo session'} on ${formatDate(session.date)}`
    )
    setLogSessionOpen(false)
  }

  function handleDeleteSession(sessionId) {
    push({ ...client, sessions: sessions.filter(s => s.id !== sessionId) })
    setDeleteSessionTarget(null)
  }

  function handleStartConsult() {
    setAddConsultOpen(true)
    setTimeout(() => consultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function handleArchive() {
    changeStage('Archive')
  }

  function handleUnarchive() {
    changeStage('Inquiry')
  }

  function handleDelete() {
    if (confirmDelete) {
      setDeleteFading(true)
      setTimeout(() => {
        onDelete(client.id)
        onClose()
      }, 300)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3500)
    }
  }

  // ─── Layout edit ─────────────────────────────────────────────────────────

  function handleDragEnd({ active, over }) {
    if (over && active.id !== over.id) {
      setSectionOrder(prev => {
        const oldIdx = prev.indexOf(active.id)
        const newIdx = prev.indexOf(over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  function handleLayoutDone() {
    saveSectionOrder(sectionOrder)
    setLayoutEditMode(false)
  }

  // ─── Section renderers ────────────────────────────────────────────────────

  function renderSectionContent(sectionId) {
    switch (sectionId) {

      case 'clientStatus':
        return (
          <>
            <DragHeader label="Client Status" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const active = client.status === key
                return (
                  <button
                    key={key}
                    onClick={() => changeStatus(active ? null : key)}
                    style={{
                      background: active ? `${cfg.color}14` : 'transparent',
                      border: `1px solid ${active ? cfg.color : 'var(--surface2)'}`,
                      borderRadius: 8, padding: '13px 16px',
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: active ? cfg.color : 'var(--muted)',
                      cursor: 'pointer', textAlign: 'left', minHeight: 48,
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                )
              })}
              {client.status && (
                <button
                  onClick={() => changeStatus(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    color: 'var(--muted)', textAlign: 'left',
                    padding: '8px 4px', minHeight: 44,
                  }}
                >
                  Clear Status
                </button>
              )}
            </div>
          </>
        )

      case 'projectDetails':
        return (
          <>
            <DragHeader label="Project Details" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 20px' }}>
              <InlineField
                label="Phone"
                value={client.phone}
                onSave={v => saveField('phone', v)}
                linkHref={client.phone ? `tel:${client.phone}` : null}
              />
              <InlineField
                label="Email"
                value={client.email}
                onSave={v => saveField('email', v)}
                linkHref={client.email ? `mailto:${client.email}` : null}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <InlineField
                  label="Tattoo Idea"
                  value={client.tattooIdea}
                  onSave={v => saveField('tattooIdea', v)}
                />
              </div>
              <InlineField label="Style"     value={client.style}     onSave={v => saveField('style', v)} />
              <InlineField label="Placement" value={client.placement} onSave={v => saveField('placement', v)} />
              <InlineField label="Size"      value={client.size}      onSave={v => saveField('size', v)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <InlineField
                  label="Next Action"
                  value={client.nextAction}
                  onSave={v => saveField('nextAction', v)}
                />
              </div>
            </div>
          </>
        )

      case 'pipelineStage':
        return (
          <>
            <DragHeader label="Pipeline Stage" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.map(stage => {
                const active = client.stage === stage
                return (
                  <button
                    key={stage}
                    onClick={() => changeStage(stage)}
                    style={{
                      background: active ? 'rgba(201,169,110,0.08)' : 'transparent',
                      border: `1px solid ${active ? 'var(--gold)' : 'var(--surface2)'}`,
                      borderRadius: 8, padding: '13px 16px',
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      color: active ? 'var(--gold)' : 'var(--text)',
                      cursor: 'pointer', textAlign: 'left', minHeight: 48,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{stage}</span>
                    {active && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                        Active
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )

      case 'journeyChecklist':
        return (
          <>
            <DragHeader label="Journey Checklist" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {JOURNEY_LABELS.map((label, i) => (
                <div
                  key={i}
                  onClick={() => toggleJourney(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 0', cursor: 'pointer', minHeight: 48,
                    borderBottom: i < JOURNEY_LABELS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${journey[i] ? 'var(--gold)' : 'var(--surface2)'}`,
                    background: journey[i] ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {journey[i] && (
                      <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 14, flex: 1,
                    color: journey[i] ? 'var(--muted)' : 'var(--text)',
                    textDecoration: journey[i] ? 'line-through' : 'none',
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )

      case 'aftercareChecklist':
        return (
          <>
            <DragHeader label="Client Care" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {AFTERCARE_LABELS.map((label, i) => (
                <div key={i}>
                  <div
                    onClick={() => handleAftercareItemTap(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 0', cursor: 'pointer', minHeight: 48,
                      borderBottom: (i < AFTERCARE_LABELS.length - 1 && activeAftercarePanel !== i)
                        ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${aftercare[i] ? 'var(--gold)' : 'var(--surface2)'}`,
                      background: aftercare[i] ? 'var(--gold)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {aftercare[i] && (
                        <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 14, flex: 1,
                      color: aftercare[i] ? 'var(--muted)' : 'var(--text)',
                      textDecoration: aftercare[i] ? 'line-through' : 'none',
                    }}>
                      {label}
                    </span>
                    {i < 3 && !aftercare[i] && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold)', opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Template
                      </span>
                    )}
                  </div>
                  {activeAftercarePanel === i && (
                    <TemplatePanel
                      itemIndex={i}
                      firstName={firstName}
                      phone={client.phone}
                      isMobile={isMobile}
                      onMarkSent={() => markAftercareSent(i)}
                      onClose={() => setActiveAftercarePanel(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )

      case 'consultationLog':
        return (
          <div ref={consultRef}>
            <DragHeader label="Consultation Log" badge={client.consultationCount || 0} />

            {!addConsultOpen && (
              <button
                onClick={() => setAddConsultOpen(true)}
                style={{
                  width: '100%', minHeight: 44, borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--gold)',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--gold)', cursor: 'pointer', marginBottom: 14,
                }}
              >
                Add Consultation
              </button>
            )}

            {addConsultOpen && (
              <div style={{
                background: 'rgba(201,169,110,0.04)',
                border: '1px solid rgba(201,169,110,0.18)',
                borderRadius: 12, padding: 16, marginBottom: 14,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Date</div>
                    <input
                      type="date"
                      value={consultForm.date}
                      onChange={e => setConsultForm(f => ({ ...f, date: e.target.value }))}
                      style={{
                        width: '100%', background: 'var(--surface2)',
                        border: '1px solid var(--surface2)', borderRadius: 8,
                        padding: '10px 12px', fontFamily: 'var(--font-body)',
                        fontSize: 14, color: 'var(--text)', outline: 'none',
                        colorScheme: 'dark', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Duration</div>
                    <input
                      type="text"
                      value={consultForm.duration}
                      onChange={e => setConsultForm(f => ({ ...f, duration: e.target.value }))}
                      placeholder="30 min"
                      style={{
                        width: '100%', background: 'var(--surface2)',
                        border: '1px solid var(--surface2)', borderRadius: 8,
                        padding: '10px 12px', fontFamily: 'var(--font-body)',
                        fontSize: 14, color: 'var(--text)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                    <textarea
                      value={consultForm.notes}
                      onChange={e => setConsultForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      placeholder="What was discussed..."
                      style={{
                        width: '100%', background: 'var(--surface2)',
                        border: '1px solid var(--surface2)', borderRadius: 8,
                        padding: '10px 12px', fontFamily: 'var(--font-body)',
                        fontSize: 14, color: 'var(--text)', outline: 'none',
                        resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setAddConsultOpen(false); setConsultForm({ date: today(), duration: '', notes: '' }) }}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 8,
                        border: '1px solid var(--surface2)', background: 'var(--surface2)',
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: 'var(--muted)', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveConsultation}
                      style={{
                        flex: 2, minHeight: 44, borderRadius: 8, border: 'none',
                        background: 'var(--gold)', fontFamily: 'var(--font-body)',
                        fontSize: 13, fontWeight: 600, color: 'var(--bg)', cursor: 'pointer',
                      }}
                    >
                      Save Consultation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {consults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {consults.map(c => (
                  <div key={c.id}>
                    {c.newProject && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--surface2)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          New Project
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--surface2)' }} />
                      </div>
                    )}
                    <div
                      onClick={() => setExpandedConsults(p => ({ ...p, [c.id]: !p[c.id] }))}
                      style={{
                        background: 'var(--surface2)', borderRadius: 12,
                        border: '1px solid transparent', padding: '12px 14px',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                          {formatDate(c.date)}
                        </span>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {c.duration && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                              {c.duration}
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                            {expandedConsults[c.id] ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>
                      {expandedConsults[c.id] && c.notes && (
                        <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                          {c.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'communications': {
        const commEntries = (client.communications || []).filter(e => e.channel === 'Email' || e.channel === 'Text Message')
        return (
          <>
            <DragHeader label="Communications" badge={commEntries.length} mono />

            {commEntries.length === 0 && !commLogOpen && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)', padding: '8px 0 12px' }}>
                No messages logged yet.
              </div>
            )}

            {commEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {commEntries.map(entry => {
                  const isEmail  = entry.channel === 'Email'
                  const expanded = expandedComms[entry.id]
                  return (
                    <div key={entry.id} style={{ background: 'var(--surface2)', borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedComms(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', minHeight: 44 }}
                      >
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                          background: isEmail ? 'rgba(78,129,200,0.18)' : 'rgba(122,171,143,0.18)',
                          color: isEmail ? '#78aed4' : '#7aab8f',
                        }}>
                          {entry.channel}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {formatTs(entry.timestamp)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                          {expanded ? '▲' : '▼'}
                        </span>
                      </div>
                      {expanded && (
                        <div style={{
                          background: 'var(--surface2)', borderRadius: 8,
                          margin: '0 12px 12px', padding: 12,
                          fontFamily: 'var(--font-body)', fontSize: 13,
                          color: '#e8e6df', lineHeight: 1.65,
                        }}>
                          {entry.subject && (
                            <div style={{ fontWeight: 500, marginBottom: 8, color: 'var(--text)' }}>
                              {entry.subject}
                            </div>
                          )}
                          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {entry.body}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!commLogOpen ? (
              <button
                onClick={() => setCommLogOpen(true)}
                style={{
                  width: '100%', minHeight: 44, borderRadius: 8,
                  background: 'transparent', border: '1px solid var(--surface2)',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--muted)', cursor: 'pointer',
                }}
              >
                + Log Message
              </button>
            ) : (
              <div style={{
                background: 'rgba(201,169,110,0.04)',
                border: '1px solid rgba(201,169,110,0.18)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {['Email', 'Text Message'].map(ch => (
                    <button
                      key={ch}
                      onClick={() => setCommForm(f => ({ ...f, channel: ch }))}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 8,
                        background: commForm.channel === ch ? 'rgba(201,169,110,0.1)' : 'var(--surface2)',
                        border: `1px solid ${commForm.channel === ch ? 'var(--gold)' : 'transparent'}`,
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: commForm.channel === ch ? 'var(--gold)' : 'var(--muted)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                {commForm.channel === 'Email' && (
                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Subject"
                      value={commForm.subject}
                      onChange={e => setCommForm(f => ({ ...f, subject: e.target.value }))}
                      style={{
                        width: '100%', background: 'var(--surface2)',
                        border: '1px solid var(--surface2)', borderRadius: 8,
                        padding: '10px 12px', fontFamily: 'var(--font-body)',
                        fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <textarea
                    placeholder="Paste message content"
                    value={commForm.body}
                    onChange={e => setCommForm(f => ({ ...f, body: e.target.value }))}
                    rows={4}
                    style={{
                      width: '100%', background: 'var(--surface2)',
                      border: '1px solid var(--surface2)', borderRadius: 8,
                      padding: '10px 12px', fontFamily: 'var(--font-body)',
                      fontSize: 14, color: 'var(--text)', outline: 'none',
                      resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setCommLogOpen(false); setCommForm({ channel: 'Text Message', subject: '', body: '' }) }}
                    style={{
                      flex: 1, minHeight: 44, borderRadius: 8,
                      border: '1px solid var(--surface2)', background: 'var(--surface2)',
                      fontFamily: 'var(--font-body)', fontSize: 13,
                      color: 'var(--muted)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCommEntry}
                    style={{
                      flex: 2, minHeight: 44, borderRadius: 8, border: 'none',
                      background: 'var(--gold)', fontFamily: 'var(--font-body)',
                      fontSize: 13, fontWeight: 600, color: 'var(--bg)', cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </>
        )
      }

      case 'activityNotes':
        return (
          <>
            <DragHeader label="Activity and Notes" />

            <div style={{ marginBottom: 16 }}>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={2}
                placeholder="Add a note..."
                style={{
                  width: '100%', background: 'var(--surface2)',
                  border: '1px solid var(--surface2)', borderRadius: 8,
                  padding: '10px 12px', fontFamily: 'var(--font-body)',
                  fontSize: 14, color: 'var(--text)', outline: 'none',
                  resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                  marginBottom: 8,
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() }
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={addNote}
                  style={{
                    flex: 1, minHeight: 44, borderRadius: 8,
                    border: '1px solid var(--gold)', background: 'transparent',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    color: 'var(--gold)', cursor: 'pointer',
                  }}
                >
                  Add Note
                </button>
                <button
                  onClick={startVoice}
                  title={isListening ? 'Listening...' : 'Voice Update'}
                  style={{
                    minWidth: 48, minHeight: 44, borderRadius: 8,
                    border: `1px solid ${isListening ? '#ef4444' : 'var(--surface2)'}`,
                    background: isListening ? 'rgba(239,68,68,0.1)' : 'var(--surface2)',
                    color: isListening ? '#ef4444' : 'var(--muted)',
                    cursor: 'pointer', fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {isListening ? '⏺' : '🎙'}
                </button>
              </div>
            </div>

            {activity.length === 0 ? (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--muted)', textAlign: 'center', padding: '28px 0',
              }}>
                No activity yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activity.map(entry => (
                  <div key={entry.id} style={{ borderLeft: '2px solid var(--surface2)', paddingLeft: 14 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.04em' }}>
                      {formatTs(entry.timestamp)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                      {entry.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )

      case 'paymentHistory': {
        const fmt$ = v => (v !== '' && v != null && !isNaN(v)) ? `$${parseFloat(v).toFixed(2)}` : null
        return (
          <>
            <DragHeader label="Payment History" badge={sessions.length || null} mono />

            <button
              onClick={() => setLogSessionOpen(true)}
              style={{
                width: '100%', minHeight: 44, borderRadius: 8,
                background: 'transparent',
                border: '1px solid var(--gold)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                color: 'var(--gold)', cursor: 'pointer',
                marginBottom: sessions.length ? 16 : 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              + Log Session
            </button>

            {sessions.length === 0 && (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--muted)', padding: '8px 0 4px',
              }}>
                No sessions logged yet.
              </div>
            )}

            {sessions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => {
                  const expanded = expandedSessions[s.id]
                  const paid = fmt$(s.amountPaid)
                  const tip  = fmt$(s.tip)
                  return (
                    <div key={s.id} style={{ background: 'var(--surface2)', borderRadius: 10, overflow: 'hidden' }}>

                      {/* Collapsed header row */}
                      <div
                        onClick={() => setExpandedSessions(p => ({ ...p, [s.id]: !p[s.id] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', cursor: 'pointer', minHeight: 44,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              color: 'var(--muted)', whiteSpace: 'nowrap',
                            }}>
                              {formatDate(s.date)}
                            </span>
                            {s.isTouchUp && (
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: 'var(--gold)', background: 'rgba(201,169,110,0.12)',
                                border: '1px solid rgba(201,169,110,0.3)',
                                borderRadius: 4, padding: '1px 5px',
                              }}>
                                Touch Up
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)',
                            marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {s.tattooDescription || '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                          {paid && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                              {paid}{tip ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> +{tip}</span> : null}
                            </span>
                          )}
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {s.paymentMethod}
                          </span>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 4, flexShrink: 0 }}>
                          {expanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {/* Expanded details */}
                      {expanded && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
                            {[
                              s.placement       && ['Placement',        s.placement],
                              fmt$(s.tattooPrice)  && ['Tattoo Price',     fmt$(s.tattooPrice)],
                              fmt$(s.deposit)      && ['Deposit',          fmt$(s.deposit)],
                              fmt$(s.depositRefund)&& ['Deposit Refund',   fmt$(s.depositRefund)],
                              fmt$(s.amountPaid)   && ['Amount Paid',      fmt$(s.amountPaid)],
                              fmt$(s.tip)          && ['Tip',              fmt$(s.tip)],
                              s.paymentMethod   && ['Payment Method',   s.paymentMethod],
                              (s.paymentMethod === 'Gift Card' && s.giftCardCode) && ['Gift Card Code', s.giftCardCode],
                              s.discountCode    && ['Discount Code',    s.discountCode],
                              s.discountApplied && ['Discount Applied', s.discountApplied],
                              fmt$(s.originalPrice) && ['Original Price', fmt$(s.originalPrice)],
                              s.notes           && ['Notes',            s.notes],
                            ].filter(Boolean).map(([label, val]) => (
                              <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 10,
                                  color: 'var(--muted)', letterSpacing: '0.07em',
                                  textTransform: 'uppercase', minWidth: 110, flexShrink: 0, paddingTop: 1,
                                }}>
                                  {label}
                                </span>
                                <span style={{
                                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', flex: 1,
                                }}>
                                  {val}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteSessionTarget(s.id) }}
                            style={{
                              marginTop: 12, width: '100%', minHeight: 36,
                              background: 'transparent', border: '1px solid #f09595',
                              color: '#f09595', borderRadius: 8, padding: '8px 14px',
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            Delete Session
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      }

      default:
        return null
    }
  }

  // ─── Drawer layout ────────────────────────────────────────────────────────

  const drawerStyle = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 201,
        background: 'var(--surface)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: deleteFading ? 0 : 1,
        transition: deleteFading
          ? 'opacity 0.3s'
          : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: deleteFading ? 'none' : 'auto',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        zIndex: 201, background: 'var(--surface)',
        borderLeft: '1px solid var(--surface2)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: deleteFading ? 0 : 1,
        transition: deleteFading
          ? 'opacity 0.3s'
          : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: deleteFading ? 'none' : 'auto',
      }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
      />

      <div style={drawerStyle}>

        <div ref={scrollBodyRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 160 }}>

          {/* Header — locked, not draggable */}
          <div style={{
            padding: '18px 24px 16px',
            borderBottom: '1px solid var(--surface2)',
            background: 'var(--surface)',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold)',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              View Full Profile
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700,
                  color: 'var(--text)', lineHeight: 1.1, marginBottom: 6,
                  wordBreak: 'break-word',
                }}>
                  {client.name || 'Unnamed Client'}
                </div>
                {client.tattooIdea && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#7a786f', lineHeight: 1.4 }}>
                    {client.tattooIdea}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: -4 }}>
                {layoutEditMode ? (
                  <button
                    onClick={handleLayoutDone}
                    style={{
                      background: '#c9a96e', color: '#0e0e0d', border: 'none',
                      borderRadius: 8, padding: '6px 12px', minHeight: 36,
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={() => setLayoutEditMode(true)}
                    style={{
                      background: 'var(--surface2)', color: 'var(--gold)', border: 'none',
                      borderRadius: 8, padding: '6px 12px', minHeight: 36,
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Edit Layout
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    background: 'none', border: 'none', color: 'var(--muted)',
                    cursor: 'pointer', fontSize: 20, flexShrink: 0,
                    minWidth: 44, minHeight: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Orderable sections */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((sectionId, idx) => (
                <SortableSection
                  key={sectionId}
                  id={sectionId}
                  isEditMode={layoutEditMode}
                >
                  <div
                    ref={el => { sectionRefs.current[sectionId] = el }}
                    style={{
                      padding: layoutEditMode ? '22px 24px 22px 8px' : '22px 24px',
                      borderBottom: idx < sectionOrder.length - 1 ? '1px solid var(--surface2)' : 'none',
                    }}
                  >
                    {renderSectionContent(sectionId)}
                  </div>
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>

        </div>

        {/* Persistent Bottom Actions — locked */}
        <div style={{
          flexShrink: 0,
          background: 'var(--surface)',
          borderTop: '1px solid var(--surface2)',
          padding: '14px 24px',
          paddingBottom: `calc(14px + env(safe-area-inset-bottom, 0px))`,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={handleStartConsult}
              style={{
                flex: 2, minHeight: 48, borderRadius: 8, border: 'none',
                background: 'var(--gold)', fontFamily: 'var(--font-body)',
                fontSize: 14, fontWeight: 600, color: 'var(--bg)', cursor: 'pointer',
              }}
            >
              Start Consult
            </button>
            <button
              onClick={client.stage === 'Archive' ? handleUnarchive : handleArchive}
              style={{
                flex: 1, minHeight: 48, borderRadius: 8,
                border: '1px solid var(--surface2)',
                background: 'var(--surface2)',
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              {client.stage === 'Archive' ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, minHeight: 48, borderRadius: 8, border: 'none',
                background: 'none', fontFamily: 'var(--font-body)',
                fontSize: 13, color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 10, textAlign: 'center' }}>
            <button
              onClick={handleDelete}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 12,
                color: confirmDelete ? '#ef4444' : 'rgba(239,68,68,0.45)',
                transition: 'color 0.15s', padding: '4px 0',
              }}
            >
              {confirmDelete ? 'Confirm Delete?' : 'Delete Client Permanently'}
            </button>
          </div>
        </div>

      </div>

      {deleteSessionTarget && (
        <>
          <div
            onClick={() => setDeleteSessionTarget(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)' }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 501, background: '#161614',
            borderRadius: 12, padding: 24,
            width: 400, maxWidth: '92vw',
            border: '1px solid var(--surface2)',
          }}>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
              color: '#e8e6df', marginBottom: 12,
            }}>
              Delete Session?
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: '#7a786f', marginBottom: 24, lineHeight: 1.5, margin: '0 0 24px',
            }}>
              This will permanently remove this session from the client record. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteSessionTarget(null)}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: 'transparent', border: '1px solid #2a2a27',
                  color: '#7a786f', borderRadius: 8,
                  fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(deleteSessionTarget)}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: '#f09595', color: '#0e0e0d',
                  border: 'none', borderRadius: 8,
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      <LogSessionModal
        isOpen={logSessionOpen}
        onSave={handleSaveSession}
        onClose={() => setLogSessionOpen(false)}
      />
    </>
  )
}

// ─── AddClientModal ───────────────────────────────────────────────────────────

function AddClientModal({ isOpen, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', tattooIdea: '' })
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const canSave = form.name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    onSave(mkClient({ ...form }))
    setForm({ name: '', phone: '', email: '', tattooIdea: '' })
    onClose()
  }

  if (!isOpen) return null

  const fieldStyle = {
    width: '100%', background: 'var(--surface2)',
    border: '1px solid var(--surface2)', borderRadius: 8,
    padding: '10px 12px', fontFamily: 'var(--font-body)',
    fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  }

  const FIELDS = [
    { key: 'name',       label: 'Name',       placeholder: 'Full name',         required: true },
    { key: 'phone',      label: 'Phone',       placeholder: '(916) 555 0000' },
    { key: 'email',      label: 'Email',       placeholder: 'email@example.com' },
    { key: 'tattooIdea', label: 'Tattoo Idea', placeholder: 'Brief description' },
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301, background: 'var(--surface)',
        borderRadius: 16, border: '1px solid var(--surface2)',
        padding: 24, width: 380, maxWidth: '92vw',
      }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
          Add Client
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FIELDS.map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                {label}{required ? ' *' : ''}
              </div>
              <input
                type="text"
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
                onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave() }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8,
              border: '1px solid var(--surface2)', background: 'var(--surface2)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, minHeight: 44, borderRadius: 8, border: 'none',
              background: canSave ? 'var(--gold)' : 'rgba(201,169,110,0.25)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: 600, color: 'var(--bg)',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Add Client
          </button>
        </div>
      </div>
    </>
  )
}

// ─── ImportPreviewModal ───────────────────────────────────────────────────────

function ImportPreviewModal({ isOpen, headers, rows, error, onConfirm, onClose }) {
  if (!isOpen) return null
  const previewRows = rows.slice(0, 5)
  const thStyle = {
    padding: '6px 10px', background: 'var(--surface2)',
    color: 'var(--muted)', textAlign: 'left', whiteSpace: 'nowrap',
    fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'var(--font-mono)', fontSize: 11,
  }
  const tdStyle = {
    padding: '5px 10px', color: 'var(--text)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap', maxWidth: 180,
    overflow: 'hidden', textOverflow: 'ellipsis',
    fontFamily: 'var(--font-mono)', fontSize: 11,
  }
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 401, background: '#161614',
        borderRadius: 12, padding: 24,
        width: 560, maxWidth: '95vw',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--surface2)',
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
          color: '#e8e6df', marginBottom: 6,
        }}>
          Import Preview
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--muted)', marginBottom: 16,
        }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''} found. Review before importing.
        </div>

        {error ? (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: '#f09595', marginBottom: 20, flex: 1,
          }}>
            {error}
          </div>
        ) : (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', marginBottom: 20 }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>{headers.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td key={ci} style={tdStyle}>{row[ci] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid #1e1e1b',
              color: '#7a786f', borderRadius: 8, padding: '10px 16px',
              fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          {!error && (
            <button
              onClick={onConfirm}
              style={{
                background: '#c9a96e', color: '#0e0e0d',
                border: 'none', borderRadius: 8, padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Confirm Import
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── LogSessionModal ─────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['Cash', 'Venmo', 'Zelle', 'CashApp', 'Card', 'Gift Card', 'Other']

function LogSessionModal({ isOpen, onSave, onClose }) {
  const blankForm = {
    date: today(), tattooDescription: '', placement: '',
    isTouchUp: false, deposit: '', depositRefund: '',
    tattooPrice: '', amountPaid: '', tip: '',
    paymentMethod: 'Cash', giftCardCode: '',
    discountCode: '', originalPrice: '', discountApplied: '', notes: '',
  }
  const [form, setForm] = useState(blankForm)
  const set = key => val => setForm(f => ({ ...f, [key]: val }))
  const setE = key => e => set(key)(e.target.value)

  const canSave = form.date.trim() && form.tattooDescription.trim()

  function handleSave() {
    if (!canSave) return
    onSave(mkSession({ ...form }))
    setForm(blankForm)
  }

  function handleClose() {
    setForm(blankForm)
    onClose()
  }

  if (!isOpen) return null

  const fieldStyle = {
    width: '100%', background: 'var(--surface2)',
    border: '1px solid var(--surface2)', borderRadius: 8,
    padding: '10px 12px', fontFamily: 'var(--font-body)',
    fontSize: 14, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--muted)', marginBottom: 6, display: 'block',
  }
  const focus = e => { e.target.style.borderColor = 'var(--gold)' }
  const blur  = e => { e.target.style.borderColor = 'var(--surface2)' }

  const moneyField = (key, label) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none',
        }}>$</span>
        <input
          type="number" min="0" step="0.01" inputMode="decimal"
          value={form[key]} onChange={setE(key)}
          style={{ ...fieldStyle, paddingLeft: 24 }}
          onFocus={focus} onBlur={blur}
          placeholder="0.00"
        />
      </div>
    </div>
  )

  return (
    <>
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 401, background: 'var(--surface)',
        borderRadius: 16, border: '1px solid var(--surface2)',
        width: 440, maxWidth: '95vw',
        maxHeight: '88vh', overflowY: 'auto',
        padding: 24,
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
          color: 'var(--text)', marginBottom: 20,
        }}>
          Log Session
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Date */}
          <div>
            <span style={labelStyle}>Date *</span>
            <input
              type="date" value={form.date} onChange={setE('date')}
              style={{ ...fieldStyle, colorScheme: 'dark' }}
              onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Tattoo Description */}
          <div>
            <span style={labelStyle}>Tattoo Description *</span>
            <textarea
              rows={2} value={form.tattooDescription} onChange={setE('tattooDescription')}
              placeholder="Brief description of the tattoo"
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Placement */}
          <div>
            <span style={labelStyle}>Placement</span>
            <input
              type="text" value={form.placement} onChange={setE('placement')}
              placeholder="e.g. Inner forearm"
              style={fieldStyle} onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Is Touch Up toggle */}
          <div>
            <span style={labelStyle}>Session Type</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[false, true].map(val => {
                const active = form.isTouchUp === val
                return (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => set('isTouchUp')(val)}
                    style={{
                      flex: 1, minHeight: 44, borderRadius: 8, cursor: 'pointer',
                      background: active ? 'rgba(201,169,110,0.1)' : 'var(--surface2)',
                      border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
                      fontFamily: 'var(--font-body)', fontSize: 13,
                      color: active ? 'var(--gold)' : 'var(--muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {val ? 'Touch Up' : 'Normal'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Money fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {moneyField('tattooPrice',  'Tattoo Price')}
            {moneyField('deposit',      'Deposit')}
            {moneyField('depositRefund','Deposit Refund')}
            {moneyField('amountPaid',   'Amount Paid')}
            {moneyField('tip',          'Tip')}
          </div>

          {/* Payment Method segmented */}
          <div>
            <span style={labelStyle}>Payment Method</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PAYMENT_METHODS.map(m => {
                const active = form.paymentMethod === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set('paymentMethod')(m)}
                    style={{
                      minWidth: 'calc(33.33% - 4px)', flex: '1 0 auto',
                      minHeight: 44, borderRadius: 8, cursor: 'pointer',
                      background: active ? 'rgba(201,169,110,0.1)' : 'var(--surface2)',
                      border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
                      fontFamily: 'var(--font-body)', fontSize: 13,
                      color: active ? 'var(--gold)' : 'var(--muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Gift Card Code — conditional */}
          {form.paymentMethod === 'Gift Card' && (
            <div>
              <span style={labelStyle}>Gift Card Code</span>
              <input
                type="text" value={form.giftCardCode} onChange={setE('giftCardCode')}
                placeholder="Card code or last 4"
                style={fieldStyle} onFocus={focus} onBlur={blur}
              />
            </div>
          )}

          {/* Discount Code */}
          <div>
            <span style={labelStyle}>Discount Code</span>
            <input
              type="text" value={form.discountCode} onChange={setE('discountCode')}
              placeholder="Optional"
              style={fieldStyle} onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Discount fields — conditional on discountCode */}
          {form.discountCode.trim() && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {moneyField('originalPrice', 'Original Price')}
              <div>
                <span style={labelStyle}>Discount Applied</span>
                <input
                  type="text" value={form.discountApplied} onChange={setE('discountApplied')}
                  placeholder="e.g. 10% or $20"
                  style={fieldStyle} onFocus={focus} onBlur={blur}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <span style={labelStyle}>Notes</span>
            <textarea
              rows={3} value={form.notes} onChange={setE('notes')}
              placeholder="Any additional notes"
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={focus} onBlur={blur}
            />
          </div>

        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8,
              border: '1px solid var(--surface2)', background: 'var(--surface2)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 2, minHeight: 44, borderRadius: 8, border: 'none',
              background: canSave ? 'var(--gold)' : 'rgba(201,169,110,0.25)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: 600, color: 'var(--bg)',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Save Session
          </button>
        </div>
      </div>
    </>
  )
}

// ─── ClientCard ───────────────────────────────────────────────────────────────

function ClientCard({ client, onOpen, onArchive, onUnarchive, onDelete }) {
  const [flipped,           setFlipped]           = useState(false)
  const [activeJump,        setActiveJump]        = useState(null)
  const [backConfirmDelete, setBackConfirmDelete] = useState(false)
  const [cardFading,        setCardFading]        = useState(false)
  const [jumpSections, setJumpSections] = useState(loadSectionOrder)

  // Refresh jump section order whenever the card flips to back
  useEffect(() => {
    if (flipped) setJumpSections(loadSectionOrder())
  }, [flipped])

  function handleOuterClick() {
    setFlipped(f => !f)
  }

  function handleJump(sectionId) {
    setActiveJump(sectionId)
    onOpen(client, sectionId)
  }

  function handleDeleteBack(e) {
    e.stopPropagation()
    if (backConfirmDelete) {
      setCardFading(true)
      setTimeout(() => onDelete(client.id), 300)
    } else {
      setBackConfirmDelete(true)
      setTimeout(() => setBackConfirmDelete(false), 3500)
    }
  }

  // Build the 9-item jump list in current drawer order
  const orderedJumpSections = [
    { id: 'header',        label: 'Header',                    locked: true },
    ...jumpSections.map(id => ({ id, label: SECTION_LABELS[id], locked: false })),
    { id: 'bottomActions', label: 'Persistent Bottom Actions', locked: true },
  ]

  return (
    <div
      style={{
        position: 'relative', height: 300, userSelect: 'none',
        opacity: cardFading ? 0 : 1,
        transition: cardFading ? 'opacity 0.3s' : 'none',
        pointerEvents: cardFading ? 'none' : 'auto',
      }}
    >
      {/* Card wrapper */}
      <div
        className="crm-card-scene"
        style={{ height: '100%', cursor: 'pointer' }}
        onClick={handleOuterClick}
      >
        <div className={`crm-card-inner${flipped ? ' flipped' : ''}`}>

          {/* ── FRONT ── */}
          <div
            className="crm-card-face"
            style={{
              background: 'var(--surface)', border: '1px solid var(--surface2)',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
            }}
          >
            {/* Avatar + status dot */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Avatar name={client.name} size={48} />
              <StatusDot status={client.status} />
            </div>

            {/* Name + status label + idea */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{
                fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 600,
                color: 'var(--text)', lineHeight: 1.2,
              }}>
                {client.name || 'Unnamed Client'}
              </div>
              {client.status && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                  color: STATUS_CONFIG[client.status]?.color,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {STATUS_CONFIG[client.status]?.label}
                </div>
              )}
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500,
                color: '#7a786f', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {client.tattooIdea || '—'}
              </div>
            </div>

            {/* Stage badge + View Full Profile button */}
            <div className="card-front-bottom-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StageBadge stage={client.stage} />
              <button
                onClick={e => { e.stopPropagation(); onOpen(client, null) }}
                style={{
                  background: '#c9a96e',
                  border: 'none',
                  borderRadius: 6, padding: '0 14px',
                  minHeight: 44,
                  fontFamily: 'var(--font-body)', fontSize: '12px',
                  fontWeight: 600, color: 'var(--bg)', cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                View Full Profile
              </button>
            </div>
          </div>

          {/* ── BACK ── */}
          <div
            className="crm-card-face crm-card-back"
            style={{
              background: 'var(--surface)', border: '1px solid var(--surface2)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* View Full Profile — pinned top, primary CTA */}
            <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
              <button
                onClick={e => { e.stopPropagation(); onOpen(client, null) }}
                style={{
                  width: '100%', minHeight: 44, padding: '0 14px',
                  background: '#c9a96e',
                  border: 'none', borderRadius: 7,
                  fontFamily: 'var(--font-body)', fontSize: '13px',
                  fontWeight: 600, color: 'var(--bg)', cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                View Full Profile
              </button>
            </div>

            {/* Jump menu — 9 sections */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2px 12px' }}>
              {orderedJumpSections.map(({ id, label, locked }) => {
                const isActive = activeJump === id
                return (
                  <div
                    key={id}
                    onClick={e => { e.stopPropagation(); if (!locked) handleJump(id) }}
                    style={{
                      padding: '6px 4px',
                      fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 400,
                      color: 'var(--text)',
                      opacity: isActive ? 1 : (locked ? 0.2 : 0.4),
                      cursor: locked ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'opacity 0.15s',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => {
                      if (!locked && !isActive) e.currentTarget.style.opacity = '0.4'
                    }}
                  >
                    <span>{label}</span>
                    {locked && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, opacity: 0.6, letterSpacing: '0.08em' }}>
                        locked
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom bar — back + delete */}
            <div style={{ padding: '10px 12px 12px', flexShrink: 0, borderTop: '1px solid var(--surface2)' }}>
              <button
                onClick={e => { e.stopPropagation(); setFlipped(false) }}
                style={{
                  width: '100%', minHeight: 48,
                  background: 'transparent', border: '1px solid #c9a96e',
                  color: '#c9a96e', borderRadius: 8, padding: '14px 16px',
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                Back
              </button>
              <button
                onClick={handleDeleteBack}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 11,
                  color: backConfirmDelete ? '#ef4444' : 'rgba(239,68,68,0.4)',
                  padding: '3px 0', marginTop: 24,
                  transition: 'color 0.15s',
                  textAlign: 'center',
                }}
              >
                {backConfirmDelete ? 'Confirm Delete?' : 'Delete Client Permanently'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export default function CRM() {
  const ctx = useOutletContext?.() ?? {}
  const externalOpenDrawer = ctx.openDrawer ?? null
  const location = useLocation()


  const [clients,      setClients]      = useState(loadClients)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [stageFilter,  setStageFilter]  = useState('All')
  const [jumpSection,  setJumpSection]  = useState(null)
  const [importOpen,   setImportOpen]   = useState(false)
  const [importRows,   setImportRows]   = useState([])
  const [importHdrs,   setImportHdrs]   = useState([])
  const [importError,  setImportError]  = useState('')
  const importRef = useRef(null)

  function persist(list) {
    setClients(list)
    saveClients(list)
  }

  function handleClientUpdate(updatedClient) {
    persist(clients.map(c => c.id === updatedClient.id ? updatedClient : c))
  }

  function handleDeleteClient(id) {
    persist(clients.filter(c => c.id !== id))
    setDrawerOpen(false)
    setEditTarget(null)
  }

  function handleAddClient(newClient) {
    persist([newClient, ...clients])
  }

  function handleArchive(id) {
    persist(clients.map(c =>
      c.id === id
        ? { ...c, stage: 'Archive', updatedAt: new Date().toISOString() }
        : c
    ))
  }

  function handleUnarchive(id) {
    persist(clients.map(c =>
      c.id === id
        ? { ...c, stage: 'Inquiry', updatedAt: new Date().toISOString() }
        : c
    ))
  }

  function handleExport() {
    const csv  = buildCSV(clients)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `MACRI_Clients_${today()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    importRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const allRows = parseCSVText(ev.target.result ?? '')
        if (allRows.length < 2) throw new Error()
        const headers = allRows[0].map(h => h.trim())
        const lower   = headers.map(h => h.toLowerCase())
        if (!lower.includes('client name') && !lower.includes('clients name')) throw new Error()
        setImportHdrs(headers)
        setImportRows(allRows.slice(1))
        setImportError('')
      } catch {
        setImportHdrs([])
        setImportRows([])
        setImportError('This file could not be imported. Check that it is a valid MACRI CSV export.')
      }
      setImportOpen(true)
    }
    reader.onerror = () => {
      setImportHdrs([])
      setImportRows([])
      setImportError('This file could not be imported. Check that it is a valid MACRI CSV export.')
      setImportOpen(true)
    }
    reader.readAsText(file)
  }

  function handleImportConfirm() {
    const lower = importHdrs.map(h => h.toLowerCase().trim())
    const ci = (...names) => { for (const n of names) { const i = lower.indexOf(n); if (i >= 0) return i } return -1 }
    const gc = (row, idx) => idx >= 0 ? (row[idx] ?? '').trim() : ''

    const nameIdx  = ci('client name', 'clients name')
    const phoneIdx = ci('phone')
    const emailIdx = ci('email')
    const stageIdx = ci('pipeline stage')
    const styleIdx = ci('style')
    const srcIdx   = ci('source')
    const archIdx  = ci('archived')
    const dateIdx  = ci('date')
    const descIdx  = ci('tattoo description')
    const placIdx  = ci('placement')
    const touchIdx = ci('touch up')
    const depIdx   = ci('deposit')
    const refIdx   = ci('deposit refund')
    const priceIdx = ci('tattoo price')
    const paidIdx  = ci('amount paid')
    const tipIdx   = ci('tip')
    const pmIdx    = ci('payment method')
    const gcIdx    = ci('gift card code')
    const dcIdx    = ci('discount code')
    const opIdx    = ci('original price')
    const daIdx    = ci('discount applied')
    const notesIdx = ci('notes')

    const byName = new Map()
    for (const row of importRows) {
      const name = gc(row, nameIdx)
      if (!name) continue
      if (!byName.has(name)) byName.set(name, [])
      byName.get(name).push(row)
    }

    let updated = [...clients]

    for (const [name, rows] of byName) {
      const profile = rows[0]
      const newSessions = rows
        .filter(r => gc(r, dateIdx) || gc(r, descIdx))
        .map(r => mkSession({
          date:              gc(r, dateIdx)  || today(),
          tattooDescription: gc(r, descIdx),
          placement:         gc(r, placIdx),
          isTouchUp:         ['true', 'yes', '1'].includes(gc(r, touchIdx).toLowerCase()),
          deposit:           gc(r, depIdx),
          depositRefund:     gc(r, refIdx),
          tattooPrice:       gc(r, priceIdx),
          amountPaid:        gc(r, paidIdx),
          tip:               gc(r, tipIdx),
          paymentMethod:     gc(r, pmIdx) || 'Cash',
          giftCardCode:      gc(r, gcIdx),
          discountCode:      gc(r, dcIdx),
          originalPrice:     gc(r, opIdx),
          discountApplied:   gc(r, daIdx),
          notes:             gc(r, notesIdx),
        }))

      const existingIdx = updated.findIndex(c => c.name.trim().toLowerCase() === name.toLowerCase())
      if (existingIdx >= 0) {
        const existing = updated[existingIdx].sessions || []
        const deduped = newSessions.filter(ns =>
          !existing.some(es =>
            es.date.trim().toLowerCase() === ns.date.trim().toLowerCase() &&
            es.tattooDescription.trim().toLowerCase() === ns.tattooDescription.trim().toLowerCase()
          )
        )
        updated[existingIdx] = {
          ...updated[existingIdx],
          sessions:  [...existing, ...deduped],
          updatedAt: new Date().toISOString(),
        }
      } else {
        const archVal    = gc(profile, archIdx).toLowerCase()
        const isArchived = archVal === 'true' || archVal === '1'
        const csvStage   = gc(profile, stageIdx)
        updated.push(mkClient({
          name,
          phone:   gc(profile, phoneIdx),
          email:   gc(profile, emailIdx),
          style:   gc(profile, styleIdx),
          source:  gc(profile, srcIdx),
          stage:   isArchived ? 'Archive' : (csvStage || 'Inquiry'),
          sessions: newSessions,
        }))
      }
    }

    persist(updated)
    setImportOpen(false)
    setImportRows([])
    setImportHdrs([])
    setImportError('')
  }

function openDrawer(client, section = null) {
    setEditTarget(client)
    setJumpSection(section)
    setDrawerOpen(true)
  }

  useEffect(() => {
    const id = location.state?.openClientId
    if (!id) return
    const client = clients.find(c => c.id === id)
    if (client) openDrawer(client, null)
  }, [location.state])

  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setClients(loadClients())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const liveEditTarget = editTarget
    ? (clients.find(c => c.id === editTarget.id) ?? editTarget)
    : null

  const filtered = stageFilter === 'All'
    ? clients.filter(c => c.stage !== 'Archive')
    : stageFilter === 'Archived'
    ? clients.filter(c => c.stage === 'Archive')
    : clients.filter(c => c.stage === stageFilter)

  const stageCounts = {
    ...Object.fromEntries(STAGES.map(s => [s, clients.filter(c => c.stage === s).length])),
    Archived: clients.filter(c => c.stage === 'Archive').length,
  }

  return (
    <div className="page-content" style={{ minHeight: '100%' }}>

      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '24px',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>
            panel / crm
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Client Roster
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              background: '#1e1e1b', color: '#c9a96e',
              border: '1px solid #2a2a27', borderRadius: 8,
              padding: '8px 14px', minHeight: 36,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Export CSV
          </button>
          <button
            onClick={handleImportClick}
            style={{
              background: '#1e1e1b', color: '#7a786f',
              border: '1px solid #2a2a27', borderRadius: 8,
              padding: '8px 14px', minHeight: 36,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Import CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            style={{
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              background: 'var(--gold)', color: 'var(--bg)',
              fontSize: '13px', padding: '10px 20px', fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* stage filter chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {['All', ...STAGES.filter(s => s !== 'Archive'), 'Archived'].map(s => {
          const active       = stageFilter === s
          const isArchiveTab = s === 'Archived'
          const count = s === 'All'
            ? clients.filter(c => c.stage !== 'Archive').length
            : isArchiveTab
            ? stageCounts.Archived
            : (stageCounts[s] ?? 0)
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              style={{
                padding: '5px 12px', borderRadius: '5px', cursor: 'pointer',
                background: active
                  ? isArchiveTab ? 'rgba(122,120,111,0.12)' : 'rgba(201,169,110,0.12)'
                  : 'var(--surface)',
                border: `1px solid ${active
                  ? isArchiveTab ? 'var(--muted)' : 'var(--gold)'
                  : 'var(--surface2)'}`,
                fontFamily: 'var(--font-body)', fontSize: '12px',
                color: active
                  ? isArchiveTab ? 'var(--muted)' : 'var(--gold)'
                  : 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {s}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: active
                  ? isArchiveTab ? 'var(--muted)' : 'var(--gold)'
                  : 'var(--muted)',
                opacity: 0.65,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            {stageFilter === 'All' ? 'No clients yet' : stageFilter === 'Archived' ? 'No archived clients' : `No ${stageFilter} clients`}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
            {stageFilter === 'All' ? 'Add your first client or save one from Inquiry Assistant.' : stageFilter === 'Archived' ? 'Archived clients will appear here.' : 'Try a different filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onOpen={openDrawer}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDeleteClient}
            />
          ))}
        </div>
      )}

      <input
        ref={importRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <ImportPreviewModal
        isOpen={importOpen}
        headers={importHdrs}
        rows={importRows}
        error={importError}
        onConfirm={handleImportConfirm}
        onClose={() => { setImportOpen(false); setImportError('') }}
      />

      <AddClientModal
        isOpen={addModalOpen}
        onSave={handleAddClient}
        onClose={() => setAddModalOpen(false)}
      />

      <ClientDrawer
        isOpen={drawerOpen}
        client={liveEditTarget}
        onUpdate={handleClientUpdate}
        onDelete={handleDeleteClient}
        onClose={() => { setDrawerOpen(false); setEditTarget(null); setJumpSection(null) }}
        jumpSection={jumpSection}
      />

    </div>
  )
}
