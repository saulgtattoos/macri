import { useState, useEffect, useRef } from 'react'
import { loadClients as loadClientsDB } from '../lib/crmService'
import { agentQueueService, sessionsService, inventoryService } from '../lib/dataService'

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ─── helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

const daysSince = (dateStr) => {
  if (!dateStr) return -1
  const then = new Date(dateStr)
  then.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today - then) / 86400000)
}

const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

const agentLabel = (type) => ({
  aftercare_guardian: 'AFTERCARE',
  ghost_hunter: 'GHOST HUNTER',
  supply_sentry: 'SUPPLY SENTRY',
  review_recruiter: 'REVIEW',
}[type] || type.toUpperCase())

const saveQueue = (cards) => {
  localStorage.setItem('macri_agent_queue', JSON.stringify(cards))
}

// ─── styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh', background: '#0e0e0d', color: '#e8e6df',
    fontFamily: 'Inter, sans-serif', padding: '32px 24px',
    maxWidth: 900, margin: '0 auto',
  },
  panelLabel: {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c9a96e',
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
  },
  h1: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, color: '#e8e6df', margin: 0 },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7a786f', marginTop: 4 },
  tabRow: { display: 'flex', gap: 8, marginTop: 28, marginBottom: 20 },
  tab: (active) => ({
    fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600,
    padding: '8px 18px', borderRadius: 8,
    border: active ? '1.5px solid #c9a96e' : '1.5px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.08)' : '#161614',
    color: active ? '#c9a96e' : '#7a786f', cursor: 'pointer', transition: 'all 0.15s',
  }),
  chip: (active) => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '5px 12px', borderRadius: 20,
    border: active ? '1px solid #c9a96e' : '1px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
    color: active ? '#c9a96e' : '#7a786f', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
  }),
  btn: {
    fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600,
    padding: '8px 16px', borderRadius: 8, border: '1px solid #c9a96e',
    background: 'rgba(201,169,110,0.1)', color: '#c9a96e', cursor: 'pointer',
  },
  btnSm: (color = '#c9a96e') => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '4px 10px', borderRadius: 6,
    border: `1px solid ${color}33`, background: `${color}11`, color, cursor: 'pointer',
  }),
  btnDanger: {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '4px 10px', borderRadius: 6,
    border: '1px solid #f0959533', background: '#f0959511', color: '#f09595', cursor: 'pointer',
  },
  badge: (color) => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4,
    background: `${color}18`, color, border: `1px solid ${color}33`, whiteSpace: 'nowrap', flexShrink: 0,
  }),
  card: {
    background: '#161614', border: '1px solid #2a2a26', borderRadius: 12,
    padding: 20, marginBottom: 14,
  },
  textarea: {
    background: '#0e0e0d', border: '1px solid #2a2a26', borderRadius: 6,
    color: '#e8e6df', fontFamily: 'Inter, sans-serif', fontSize: 14,
    padding: '10px 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7,
  },
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(system, user, maxTokens = 300) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error('api')
  const data = await res.json()
  return data.content[0].text.trim()
}

// ─── style and placement guidance ─────────────────────────────────────────────

const STYLE_GUIDANCE = {
  3: {
    'Watercolor': 'Mention color bleeding is normal and no picking.',
    'Black and Gray': 'Mention peeling and ashy look is normal.',
    'Black and Gray Portrait': 'Mention detail preservation and no scratching.',
    'Stippled Shading': 'Mention dots may look raised temporarily.',
    'Color Realism': 'Mention vivid colors will dull during healing.',
    'Sketch Art': 'Mention lines may spread slightly, this is normal for the style.',
    'Abstract': 'Mention to monitor any raised areas.',
  },
  7: {
    'Watercolor': 'Fading is expected. Protect from sun.',
    'Black and Gray': 'Moisturize and avoid sun.',
    'Black and Gray Portrait': 'Sun protection is critical for fine lines.',
    'Stippled Shading': 'Texture settling is normal.',
    'Color Realism': 'Sun is the enemy of color realism.',
    'Sketch Art': 'Healing well. No concern.',
    'Abstract': 'Check for any raised areas.',
  },
  30: {
    'Watercolor': 'Ask how the colors are looking and request a healed photo.',
    'Black and Gray': 'Healed check-in. Mention touch up if needed.',
    'Black and Gray Portrait': 'Request healed photo. Open touch up conversation.',
    'Stippled Shading': 'Final texture check.',
    'Color Realism': 'Healed color check. Mention touch up.',
    'Sketch Art': 'Request healed photo.',
    'Abstract': 'General healed check-in.',
  },
}

const getPlacementNote = (placement = '', dayNum) => {
  const p = placement.toLowerCase()
  const notes = []
  if (p.includes('hand') || p.includes('finger')) notes.push('Warn about accelerated fading.')
  if (dayNum === 3 && (p.includes('rib') || p.includes('torso'))) notes.push('Deep breath discomfort is normal.')
  if (dayNum === 3 && (p.includes('foot') || p.includes('ankle'))) notes.push('No tight shoes, keep elevated.')
  if (dayNum === 7 && (p.includes('elbow') || p.includes('knee'))) notes.push('Expect significant peeling in the crease.')
  return notes.join(' ')
}

// ─── Agent 1: Aftercare Guardian ──────────────────────────────────────────────

async function runAftercareGuardian(sessions, existingCards) {
  const SYSTEM = `You are drafting a warm aftercare follow-up text message for tattoo artist Saul Gutierrez. Write in first person as Saul. Warm, personal, and caring tone. No pricing. No links. No hyphens or dashes. Reference the specific tattoo style and placement naturally. Keep it under 160 characters if possible for SMS. Sign off warmly but do not use a formal signature.`

  const calls = []

  for (const session of sessions) {
    const dateStr = session.date || session.createdAt
    const days = daysSince(dateStr)
    if (days < 0) continue
    const clientName = session.clientName || session.name || 'Friend'
    const style = session.style || ''
    const placement = session.placement || ''

    for (const dayNum of [3, 7, 30]) {
      if (days !== dayNum) continue
      const alreadyExists = existingCards.some(
        (c) => c.agentType === 'aftercare_guardian' &&
               c.metadata?.sessionId === session.id &&
               c.metadata?.dayNumber === dayNum &&
               ['pending', 'approved'].includes(c.status)
      )
      if (alreadyExists) continue

      const styleNote = STYLE_GUIDANCE[dayNum]?.[style] || ''
      const placementNote = getPlacementNote(placement, dayNum)
      const userMsg = [
        `Client name: ${clientName}.`,
        `Tattoo style: ${style || 'not specified'}.`,
        `Placement: ${placement || 'not specified'}.`,
        `Days since session: ${dayNum}.`,
        `Draft a personalized aftercare check-in message for day ${dayNum}.`,
        styleNote ? `Style guidance: ${styleNote}` : '',
        placementNote ? `Placement guidance: ${placementNote}` : '',
      ].filter(Boolean).join('\n')

      calls.push({ session, dayNum, clientName, style, placement, dateStr, userMsg })
    }
  }

  const results = await Promise.allSettled(
    calls.map(async ({ session, dayNum, clientName, style, placement, dateStr, userMsg }) => {
      const msg = await callClaude(SYSTEM, userMsg, 300)
      return {
        id: uid(),
        agentName: 'Aftercare Guardian',
        agentType: 'aftercare_guardian',
        clientId: session.clientId || null,
        clientName,
        subject: `Day ${dayNum} Aftercare Check-in`,
        draftMessage: msg,
        channel: 'SMS',
        status: 'pending',
        metadata: {
          reason: `${dayNum} days since session on ${fmtDate(dateStr)}`,
          triggerDate: now(),
          sessionId: session.id,
          style,
          placement,
          dayNumber: dayNum,
          inventoryItem: null,
        },
        createdAt: now(),
        approvedAt: null,
        sentAt: null,
        dismissedAt: null,
      }
    })
  )

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}

// ─── Agent 2: Ghost Hunter ────────────────────────────────────────────────────

async function runGhostHunter(clients, existingCards) {
  const SYSTEM = `You are drafting a warm follow-up text message for tattoo artist Saul Gutierrez to send to a potential client who has not responded to an inquiry. Write in first person as Saul. Warm, curious, zero pressure tone. No pricing. No links. No hyphens or dashes. Reference their tattoo idea naturally if known. Keep under 160 characters if possible.`

  const eligible = clients.filter((c) => {
    if (!['Inquiry', 'Lead'].includes(c.stage)) return false
    const updatedAt = c.updatedAt || c.createdAt
    if (!updatedAt) return false
    const hoursAgo = (Date.now() - new Date(updatedAt).getTime()) / 3600000
    if (hoursAgo < 48) return false
    return !existingCards.some(
      (card) => card.agentType === 'ghost_hunter' &&
                card.clientId === c.id &&
                card.status === 'pending'
    )
  })

  const results = await Promise.allSettled(
    eligible.map(async (client) => {
      const updatedAt = client.updatedAt || client.createdAt
      const hoursAgo = Math.round((Date.now() - new Date(updatedAt).getTime()) / 3600000)
      const firstName = client.firstName || client.name?.split(' ')[0] || 'there'
      const tattooIdea = client.tattooIdea || client.idea || 'their tattoo'
      const style = client.style || client.styleInterest || 'not specified'

      const userMsg = [
        `Client name: ${firstName}.`,
        `Tattoo idea: ${tattooIdea}.`,
        `Style interest: ${style}.`,
        `Hours since last contact: ${hoursAgo}.`,
        'Draft a gentle follow-up message.',
      ].join('\n')

      const msg = await callClaude(SYSTEM, userMsg, 300)
      return {
        id: uid(),
        agentName: 'Ghost Hunter',
        agentType: 'ghost_hunter',
        clientId: client.id,
        clientName: client.name || firstName,
        subject: `Follow-up: ${firstName}`,
        draftMessage: msg,
        channel: 'SMS',
        status: 'pending',
        metadata: {
          reason: `Inquiry unopened for ${hoursAgo} hours`,
          triggerDate: now(),
          sessionId: null,
          style,
          placement: null,
          dayNumber: null,
          inventoryItem: null,
        },
        createdAt: now(),
        approvedAt: null,
        sentAt: null,
        dismissedAt: null,
      }
    })
  )

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}

// ─── Agent 3: Supply Sentry ───────────────────────────────────────────────────

function runSupplySentry(inventory, existingCards) {
  const newCards = []
  for (const item of inventory) {
    if (item.quantity > item.lowStockThreshold) continue
    const alreadyExists = existingCards.some(
      (c) => c.agentType === 'supply_sentry' &&
             c.metadata?.inventoryItem === item.name &&
             c.status === 'pending'
    )
    if (alreadyExists) continue
    newCards.push({
      id: uid(),
      agentName: 'Supply Sentry',
      agentType: 'supply_sentry',
      clientId: null,
      clientName: null,
      subject: `Low Stock: ${item.name}`,
      draftMessage: `Heads up: ${item.name} is running low. You have ${item.quantity} ${item.unit} left. Reorder from ${item.supplier || 'your supplier'} before your next session.`,
      channel: 'Email',
      status: 'pending',
      metadata: {
        reason: `${item.name} below threshold of ${item.lowStockThreshold} ${item.unit}`,
        triggerDate: now(),
        sessionId: null,
        style: null,
        placement: null,
        dayNumber: null,
        inventoryItem: item.name,
      },
      createdAt: now(),
      approvedAt: null,
      sentAt: null,
      dismissedAt: null,
    })
  }
  return newCards
}

// ─── Agent 4: Review Recruiter ────────────────────────────────────────────────

async function runReviewRecruiter(sessions, existingCards) {
  const SYSTEM = `You are drafting a warm review request message for tattoo artist Saul Gutierrez. Write in first person as Saul. Grateful, warm, zero pressure tone. Never mention money or pricing. No links. No hyphens or dashes. Ask how the healing is going first, then gently mention that a review would mean a lot. Keep under 200 characters.`

  const eligible = sessions.filter((session) => {
    const dateStr = session.date || session.createdAt
    if (daysSince(dateStr) !== 14) return false
    return !existingCards.some(
      (c) => c.agentType === 'review_recruiter' &&
             c.metadata?.sessionId === session.id &&
             ['pending', 'sent'].includes(c.status)
    )
  })

  const results = await Promise.allSettled(
    eligible.map(async (session) => {
      const dateStr = session.date || session.createdAt
      const clientName = session.clientName || session.name || 'Friend'
      const style = session.style || 'not specified'
      const userMsg = [
        `Client name: ${clientName}.`,
        `Tattoo style: ${style}.`,
        'Days since session: 14.',
        'Draft a warm review request message.',
      ].join('\n')
      const msg = await callClaude(SYSTEM, userMsg, 300)
      return {
        id: uid(),
        agentName: 'Review Recruiter',
        agentType: 'review_recruiter',
        clientId: session.clientId || null,
        clientName,
        subject: `Review Request: ${clientName}`,
        draftMessage: msg,
        channel: 'SMS',
        status: 'pending',
        metadata: {
          reason: '14 days since session, review not yet requested',
          triggerDate: now(),
          sessionId: session.id,
          style,
          placement: session.placement || null,
          dayNumber: null,
          inventoryItem: null,
        },
        createdAt: now(),
        approvedAt: null,
        sentAt: null,
        dismissedAt: null,
      }
    })
  )

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}

// ─── run all agents ───────────────────────────────────────────────────────────

async function runAllAgents(currentCards) {
  const [sessions, clients, inventory] = await Promise.all([
    sessionsService.loadAll(),
    loadClientsDB(),
    inventoryService.loadAll(),
  ])

  const aftercareCards = await runAftercareGuardian(sessions, currentCards)
  const allSoFar1 = [...currentCards, ...aftercareCards]

  const ghostCards = await runGhostHunter(clients, allSoFar1)
  const allSoFar2 = [...allSoFar1, ...ghostCards]

  const sentryCards = runSupplySentry(inventory, allSoFar2)
  const allSoFar3 = [...allSoFar2, ...sentryCards]

  const reviewCards = await runReviewRecruiter(sessions, allSoFar3)

  return [...aftercareCards, ...ghostCards, ...sentryCards, ...reviewCards]
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

function AgentCard({ card, onUpdate, showToast, compact = false }) {
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(card.draftMessage)
  const [confirmDismiss, setConfirmDismiss] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const dismissTimer = useRef(null)

  const handleApprove = async () => {
    onUpdate(card.id, { status: 'approved', approvedAt: now() })
    try { await navigator.clipboard.writeText(card.draftMessage) } catch {}
    showToast('Approved and copied to clipboard')
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(card.draftMessage) } catch {}
    showToast('Copied to clipboard')
  }

  const handleMarkSent = () => {
    onUpdate(card.id, { status: 'sent', sentAt: now() })
    showToast('Marked as sent')
  }

  const handleDismiss = () => {
    if (confirmDismiss) {
      clearTimeout(dismissTimer.current)
      onUpdate(card.id, { status: 'dismissed', dismissedAt: now() })
      setConfirmDismiss(false)
    } else {
      setConfirmDismiss(true)
      dismissTimer.current = setTimeout(() => setConfirmDismiss(false), 3000)
    }
  }

  const handleSaveEdit = () => {
    onUpdate(card.id, { draftMessage: draftText })
    setEditing(false)
  }

  const channelColor = card.channel === 'SMS' ? '#7aab8f' : '#c9a96e'
  const statusColor = {
    pending: '#c9a96e', approved: '#c9a96e', sent: '#7aab8f', dismissed: '#7a786f',
  }[card.status] || '#7a786f'

  if (compact) {
    return (
      <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
          onClick={() => setExpanded(!expanded)}
        >
          <span style={S.badge('#c9a96e')}>{agentLabel(card.agentType)}</span>
          {card.clientName
            ? <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#e8e6df', flex: 1, minWidth: 60 }}>{card.clientName}</span>
            : <span style={{ flex: 1 }} />
          }
          <span style={S.badge(channelColor)}>{card.channel}</span>
          <span style={S.badge(statusColor)}>{card.status.charAt(0).toUpperCase() + card.status.slice(1)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f', whiteSpace: 'nowrap' }}>
            {timeAgo(card.sentAt || card.approvedAt || card.dismissedAt || card.createdAt)}
          </span>
        </div>
        {card.metadata?.reason && !expanded && (
          <div style={{ padding: '0 16px 10px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7a786f' }}>Triggered: {card.metadata.reason}</span>
          </div>
        )}
        {expanded && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2a2a26' }}>
            {card.metadata?.reason && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7a786f', margin: '10px 0 12px' }}>
                Triggered: {card.metadata.reason}
              </p>
            )}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Draft Message
            </span>
            <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {card.draftMessage}
              </p>
            </div>
            <button style={S.btnSm('#c9a96e')} onClick={handleCopy}>Copy to Clipboard</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={S.card}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={S.badge('#c9a96e')}>{agentLabel(card.agentType)}</span>
        {card.clientName && (
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 600, color: '#e8e6df', flex: 1 }}>
            {card.clientName}
          </span>
        )}
        {!card.clientName && <span style={{ flex: 1 }} />}
        {card.status === 'approved' && <span style={S.badge('#c9a96e')}>Approved</span>}
        <span style={S.badge(channelColor)}>{card.channel}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f', whiteSpace: 'nowrap' }}>
          {timeAgo(card.createdAt)}
        </span>
      </div>

      {/* Metadata row */}
      {card.metadata?.reason && (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7a786f', margin: '0 0 14px' }}>
          Triggered: {card.metadata.reason}
        </p>
      )}

      {/* Draft message section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Draft Message
          </span>
          {!editing && (
            <button
              style={S.btnSm('#7a786f')}
              onClick={() => { setDraftText(card.draftMessage); setEditing(true) }}
            >
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div>
            <textarea
              style={{ ...S.textarea, minHeight: 120, marginBottom: 8 }}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setEditing(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 8, padding: '12px 14px' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {card.draftMessage}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!editing && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {card.status === 'pending' && (
            <>
              <button style={S.btn} onClick={handleApprove}>Approve</button>
              <button
                style={S.btnSm('#7a786f')}
                onClick={() => { setDraftText(card.draftMessage); setEditing(true) }}
              >
                Edit
              </button>
            </>
          )}
          {card.status === 'approved' && (
            <>
              <button style={S.btn} onClick={handleCopy}>Copy to Clipboard</button>
              <button style={S.btnSm('#7aab8f')} onClick={handleMarkSent}>Mark as Sent</button>
            </>
          )}
          <button
            style={confirmDismiss ? S.btnDanger : S.btnSm('#f09595')}
            onClick={handleDismiss}
          >
            {confirmDismiss ? 'Confirm Dismiss' : 'Dismiss'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── QueueTab ─────────────────────────────────────────────────────────────────

function QueueTab({ cards, onUpdate, showToast, onRunAgents, running }) {
  const queueCards = cards
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (queueCards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, color: '#7a786f', margin: '0 0 10px' }}>
          All clear.
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#7a786f', margin: '0 0 28px' }}>
          Your agents are watching. Check back after your next session.
        </p>
        <button
          style={{ ...S.btn, opacity: running ? 0.5 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
          onClick={onRunAgents}
          disabled={running}
        >
          {running ? 'Agents scanning...' : 'Run Agents Now'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {queueCards.map((card) => (
        <AgentCard key={card.id} card={card} onUpdate={onUpdate} showToast={showToast} />
      ))}
    </div>
  )
}

// ─── LogTab ───────────────────────────────────────────────────────────────────

const LOG_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'aftercare_guardian', label: 'Aftercare' },
  { key: 'ghost_hunter', label: 'Ghost Hunter' },
  { key: 'supply_sentry', label: 'Supply Sentry' },
  { key: 'review_recruiter', label: 'Review' },
]

function LogTab({ cards, showToast }) {
  const [filter, setFilter] = useState('All')

  const logCards = cards
    .filter((c) => ['approved', 'sent', 'dismissed'].includes(c.status))
    .filter((c) => {
      if (filter === 'All') return true
      if (['approved', 'sent', 'dismissed'].includes(filter)) return c.status === filter
      return c.agentType === filter
    })
    .sort((a, b) => {
      const aDate = a.sentAt || a.approvedAt || a.dismissedAt || a.createdAt
      const bDate = b.sentAt || b.approvedAt || b.dismissedAt || b.createdAt
      return new Date(bDate) - new Date(aDate)
    })

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {LOG_FILTERS.map((f) => (
          <button key={f.key} style={S.chip(filter === f.key)} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {logCards.length === 0 && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>
          No entries in the log yet.
        </p>
      )}
      {logCards.map((card) => (
        <AgentCard key={card.id} card={card} onUpdate={() => {}} showToast={showToast} compact />
      ))}
    </div>
  )
}

// ─── AgentQueue (root) ────────────────────────────────────────────────────────

export default function AgentQueue() {
  const [activeTab, setActiveTab] = useState('queue')
  const [cards, setCards] = useState([])
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState(null)
  const hasRun = useRef(false)

  useEffect(() => {
    agentQueueService.loadAll().then((saved) => {
      setCards(saved)
      if (!hasRun.current) {
        hasRun.current = true
        silentScan(saved)
      }
    })
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const silentScan = async (currentCards) => {
    try {
      const newCards = await runAllAgents(currentCards)
      if (newCards.length === 0) return
      const updated = [...newCards, ...currentCards]
      setCards(updated)
      saveQueue(updated)
      newCards.forEach((c) => agentQueueService.saveRecord(c))
    } catch {}
  }

  const handleRunAgents = async () => {
    setRunning(true)
    try {
      const newCards = await runAllAgents(cards)
      const updated = [...newCards, ...cards]
      setCards(updated)
      saveQueue(updated)
      newCards.forEach((c) => agentQueueService.saveRecord(c))
      showToast(`Agents scanned. ${newCards.length} new ${newCards.length === 1 ? 'card' : 'cards'} added.`)
    } catch {
      showToast('Agent scan failed. Check your API key.')
    }
    setRunning(false)
  }

  const updateCard = (id, changes) => {
    setCards((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...changes } : c))
      saveQueue(updated)
      const changedCard = updated.find((c) => c.id === id)
      if (changedCard) agentQueueService.saveRecord(changedCard)
      return updated
    })
  }

  const pendingCount = cards.filter((c) => c.status === 'pending').length

  return (
    <div style={S.page}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#7aab8f', color: '#0e0e0d', fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, padding: '8px 20px', borderRadius: 20, zIndex: 2000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <p style={S.panelLabel}>panel / agents</p>
      <h1 style={S.h1}>Agent Queue</h1>
      <p style={S.subtitle}>
        {pendingCount === 0
          ? 'No cards pending review'
          : `${pendingCount} ${pendingCount === 1 ? 'card' : 'cards'} awaiting review`}
      </p>

      <div style={S.tabRow}>
        {[{ key: 'queue', label: 'Queue' }, { key: 'log', label: 'Log' }].map(({ key, label }) => (
          <button key={key} style={S.tab(activeTab === key)} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <QueueTab
          cards={cards}
          onUpdate={updateCard}
          showToast={showToast}
          onRunAgents={handleRunAgents}
          running={running}
        />
      )}
      {activeTab === 'log' && (
        <LogTab cards={cards} showToast={showToast} />
      )}
    </div>
  )
}
