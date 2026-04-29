import { useState, useEffect, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Storage ──────────────────────────────────────────────────────────────────

const LS_KEY = 'macri_session_prep'

const DEFAULT_TEXTS = [
  'Machine and power supply tested and ready',
  'Needles, correct cartridge, extras beside station',
  'Ink, all colors poured into caps, black topped off',
  'Stencil printed, transfer paper cut, stencil solution on cart',
  'Gloves, correct size, at least 4 pairs at station',
  'Green soap in spray bottle, paper towels stacked',
  'Razor ready if shaving placement area',
  'Saniderm and wrap pre-cut and within reach',
  'Barrier film on machine, cord, and bottles',
  'Client chair and table covered with fresh barrier',
  'Sharps container accessible and not full',
  'Distilled water in rinse cups on tray',
  'Reference image visible at eye level',
  'Phone on do not disturb',
]

function makeDefaultItems() {
  return DEFAULT_TEXTS.map(text => ({ id: crypto.randomUUID(), text, checked: false }))
}

function loadItems() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY))
    return d?.items?.length ? d.items : makeDefaultItems()
  } catch { return makeDefaultItems() }
}

function saveItems(list) {
  localStorage.setItem(LS_KEY, JSON.stringify({ items: list }))
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────

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

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0e0e0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,8 6,12 13,4" />
    </svg>
  )
}

// ─── SortableCheckItem (edit mode) ────────────────────────────────────────────

function SortableCheckItem({ item, onTextChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 48,
        padding: '4px 0',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div
        {...listeners}
        {...attributes}
        style={{
          fontSize: 18, color: '#7a786f', cursor: 'grab',
          touchAction: 'none', userSelect: 'none',
          flexShrink: 0, padding: '0 4px', minHeight: 44,
          display: 'flex', alignItems: 'center',
        }}
      >
        ⠿
      </div>
      <input
        value={item.text}
        onChange={e => onTextChange(item.id, e.target.value)}
        style={{
          flex: 1,
          background: '#1e1e1b',
          border: '1px solid #2a2a27',
          borderRadius: 8,
          color: '#e8e6df',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          padding: '8px 12px',
          outline: 'none',
          minHeight: 40,
        }}
      />
      <button
        onClick={() => onDelete(item.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#f09595', fontSize: 22, lineHeight: 1,
          minWidth: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, padding: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionPrep() {
  const [items, setItems]           = useState(() => loadItems())
  const [editMode, setEditMode]     = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [micStatus, setMicStatus]   = useState('idle')
  const [statusMsg, setStatusMsg]   = useState('Tap to speak')
  const [narrow, setNarrow]         = useState(window.innerWidth < 600)

  const recorderRef = useRef(null)
  const streamRef   = useRef(null)
  const chunksRef   = useRef([])

  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 600)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

  // ── Checklist ──

  function toggleCheck(id) {
    const next = items.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    setItems(next)
    saveItems(next)
  }

  function resetChecks() {
    const next = items.map(item => ({ ...item, checked: false }))
    setItems(next)
    saveItems(next)
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const next = arrayMove(items, oldIdx, newIdx)
    setItems(next)
    saveItems(next)
  }

  function handleTextChange(id, text) {
    const next = items.map(item => item.id === id ? { ...item, text } : item)
    setItems(next)
    saveItems(next)
  }

  function handleDelete(id) {
    const next = items.filter(item => item.id !== id)
    setItems(next)
    saveItems(next)
  }

  function handleAddItem() {
    const text = newItemText.trim()
    if (!text) return
    const next = [...items, { id: crypto.randomUUID(), text, checked: false }]
    setItems(next)
    saveItems(next)
    setNewItemText('')
  }

  // ── Voice ──

  async function handleMicTap() {
    if (micStatus === 'processing') return

    if (micStatus === 'listening') {
      if (recorderRef.current) recorderRef.current.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = processVoice
      recorder.start(100)
      recorderRef.current = recorder

      setMicStatus('listening')
      setStatusMsg('Listening...')
    } catch {
      setMicStatus('error')
      setStatusMsg('Could not process voice. Try again.')
      setTimeout(() => { setMicStatus('idle'); setStatusMsg('Tap to speak') }, 3000)
    }
  }

  async function processVoice() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      setMicStatus('processing')
      setStatusMsg('Checking off your list...')

      // STT via ElevenLabs Scribe V2
      const elKey = import.meta.env.VITE_ELEVENLABS_KEY
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      formData.append('model_id', 'scribe_v2')
      const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': elKey },
        body: formData,
      })
      if (!sttRes.ok) throw new Error('stt')
      const sttData = await sttRes.json()
      const transcript = sttData.text?.trim()
      if (!transcript) throw new Error('empty')

      // Read current state from LS to avoid stale closure
      const current = loadItems()
      const unchecked = current.filter(i => !i.checked).map(i => i.text)

      // Claude API to match transcript to checklist items
      const systemPrompt = `You are a session prep assistant for a tattoo studio. The user will speak what they have completed. Match their words to items in this checklist and return ONLY valid JSON: {"checkedItems": [array of exact item strings that were mentioned], "remaining": [array of exact item strings not yet done]}. Checklist: ${JSON.stringify(unchecked)}`

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
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: transcript }],
        }),
      })
      if (!claudeRes.ok) throw new Error('claude')
      const claudeMsg = await claudeRes.json()
      const raw = claudeMsg.content[0].text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
      const parsed = JSON.parse(raw)

      // Update checklist
      const checkedSet = new Set(parsed.checkedItems || [])
      const next = current.map(item =>
        checkedSet.has(item.text) ? { ...item, checked: true } : item
      )
      setItems(next)
      saveItems(next)

      // TTS response
      const remaining = parsed.remaining || []
      const ttsText = remaining.length === 0
        ? 'You are ready, Saul. Let us get to work.'
        : `Got it, Saul. You still need: ${remaining.join(', ')}.`
      await speakText(ttsText)

      const checkedNames = parsed.checkedItems || []
      setMicStatus('done')
      setStatusMsg(checkedNames.length > 0 ? `Checked off: ${checkedNames.join(', ')}` : 'No items matched')
      setTimeout(() => { setMicStatus('idle'); setStatusMsg('Tap to speak') }, 4000)

    } catch {
      setMicStatus('error')
      setStatusMsg('Could not process voice. Try again.')
      setTimeout(() => { setMicStatus('idle'); setStatusMsg('Tap to speak') }, 3000)
    }
  }

  // ── Styles ──

  const CARD = {
    background: '#161614',
    border: '1px solid #2a2a27',
    borderRadius: 12,
    padding: '20px 24px',
  }

  const BTN_SMALL = {
    background: '#1e1e1b',
    border: '1px solid #2a2a27',
    color: '#7a786f',
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    cursor: 'pointer',
    minHeight: 32,
  }

  const isListening = micStatus === 'listening'
  const statusColor = micStatus === 'error' ? '#f09595'
    : micStatus === 'listening' ? '#c9a96e'
    : '#7a786f'

  return (
    <div style={{ padding: narrow ? '24px 16px 80px' : '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.35); }
          50%       { box-shadow: 0 0 0 10px rgba(201,169,110,0); }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          OPERATIONS
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, color: '#e8e6df', margin: 0, letterSpacing: '-0.01em' }}>
          Session Prep
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', marginTop: 6, marginBottom: 0 }}>
          Run through this before every client arrives. Zero trips to the closet once they sit down.
        </p>
      </div>

      {/* ── Section 1: Checklist ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e' }}>
            Pre-session checklist
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={BTN_SMALL} onClick={() => setEditMode(m => !m)}>
              {editMode ? 'Done' : 'Edit List'}
            </button>
            <button style={BTN_SMALL} onClick={resetChecks}>
              Reset Checks
            </button>
          </div>
        </div>

        {editMode ? (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(item => (
                  <SortableCheckItem
                    key={item.id}
                    item={item}
                    onTextChange={handleTextChange}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                placeholder="Add checklist item..."
                style={{
                  flex: 1,
                  background: '#1e1e1b',
                  border: '1px solid #2a2a27',
                  borderRadius: 8,
                  color: '#e8e6df',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  padding: '8px 12px',
                  outline: 'none',
                  minHeight: 40,
                }}
              />
              <button
                onClick={handleAddItem}
                style={{
                  background: '#1e1e1b',
                  border: '1px solid #c9a96e',
                  color: '#c9a96e',
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  minHeight: 40,
                  whiteSpace: 'nowrap',
                }}
              >
                + Add
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: 48,
                  padding: '4px 0',
                  cursor: 'pointer',
                  borderBottom: idx < items.length - 1 ? '1px solid rgba(42,42,39,0.5)' : 'none',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: item.checked ? '#7aab8f' : '#1e1e1b',
                  border: item.checked ? 'none' : '1px solid #2a2a27',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.checked && <IconCheck />}
                </div>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: item.checked ? '#7a786f' : '#e8e6df',
                  textDecoration: item.checked ? 'line-through' : 'none',
                  flex: 1,
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Voice Assistant ── */}
      <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: '100%' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e', marginBottom: 6 }}>
            Hands Free Assistant
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', margin: 0 }}>
            Speak what you have done. MACRI checks it off and tells you what is left.
          </p>
        </div>

        <button
          onClick={handleMicTap}
          disabled={micStatus === 'processing'}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#1e1e1b',
            border: isListening ? '2px solid #c9a96e' : '2px solid #2a2a27',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: micStatus === 'processing' ? 'default' : 'pointer',
            outline: 'none',
            animation: isListening ? 'micPulse 1.4s ease-in-out infinite' : 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <IconMic size={28} color={isListening ? '#c9a96e' : '#7a786f'} />
        </button>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: statusColor,
          margin: 0,
          textAlign: 'center',
          minHeight: 16,
        }}>
          {statusMsg}
        </p>
      </div>
    </div>
  )
}
