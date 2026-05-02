import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'macri_crm_clients'
const PROMOTED_KEY = 'macri_wall_first_run_done'
const API_KEY      = import.meta.env.VITE_ANTHROPIC_KEY

function loadClients() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

function saveClients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

// ─── Pipeline config ──────────────────────────────────────────────────────────

const STAGES = [
  { key: 'inquiry',          label: 'Inquiry',          color: '#378ADD' },
  { key: 'waiting-on-reply', label: 'Waiting on Reply', color: '#C4934A' },
  { key: 'consultation',     label: 'Consultation',     color: '#1D9E75' },
  { key: 'deposit-paid',     label: 'Deposit Paid',     color: '#7AAB8F' },
  { key: 'scheduled',        label: 'Scheduled',        color: '#8B6FD4' },
  { key: 'in-progress',      label: 'In Progress',      color: '#C9A96E' },
  { key: 'healed',           label: 'Healed',           color: '#55C47A' },
  { key: 'void',             label: 'Void',             color: '#F09595' },
  { key: 'archived',         label: 'Archived',         color: '#7A786F' },
]

const ACTIVE_STAGES = STAGES.filter(s => s.key !== 'void' && s.key !== 'archived')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function isWithin7Days(client) {
  if (!client.sessionDate) return false
  const d    = new Date(client.sessionDate)
  const now  = new Date()
  const diff = (d - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

// ─── AI Paste Import Modal ────────────────────────────────────────────────────

function ImportNotesModal({ isOpen, onClose, onImport }) {
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [preview, setPreview] = useState(null)

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are a data extraction assistant for a tattoo studio app called MACRI.

Extract client data from the following consultation note and return ONLY a valid JSON object with no markdown, no explanation, and no extra text.

The JSON must match this exact shape:
{
  "name": "string or empty string",
  "phone": "string or empty string",
  "email": "string or empty string",
  "tattooIdea": "string summarizing the tattoo concept in one to two sentences",
  "style": "string — pick the closest from: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Stippled Shading, Color Realism, Black and Gray Portrait — or leave empty if unclear",
  "placement": "string or empty string",
  "size": "string or empty string",
  "estimatedHours": "string or empty string",
  "depositStatus": "string — Paid, Void, or empty string",
  "colors": "string summarizing color preferences or empty string",
  "notes": "string with any additional context worth keeping"
}

Consultation note:
${text}`,
          }],
        }),
      })

      const data   = await res.json()
      const raw    = data.content?.[0]?.text ?? ''
      const clean  = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPreview(parsed)
    } catch {
      setError('Could not parse that note. Make sure your API key is set and the note has some client details.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!preview) return
    onImport(preview)
    setText('')
    setPreview(null)
    setError('')
    onClose()
  }

  function handleClose() {
    setText('')
    setPreview(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const field = {
    width: '100%', background: '#1e1e1b',
    border: '1px solid #2a2a27', borderRadius: 8,
    padding: '10px 12px', fontFamily: 'var(--font-body)',
    fontSize: 13, color: 'var(--text)', outline: 'none',
    boxSizing: 'border-box', resize: 'vertical',
    lineHeight: 1.6,
  }

  const label = {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--muted)', marginBottom: 6, display: 'block',
  }

  return (
    <>
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 501, background: '#161614',
        borderRadius: 16, border: '1px solid #2a2a27',
        width: 560, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
        padding: 24,
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 20,
          fontWeight: 700, color: 'var(--text)', marginBottom: 6,
        }}>
          Import from Notes
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--muted)', marginBottom: 20,
        }}>
          Paste any consultation note. Claude will extract the client details automatically.
        </div>

        {!preview ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={label}>Paste your note</span>
              <textarea
                rows={12}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste consultation notes here..."
                style={field}
              />
            </div>

            {error && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: '#f09595', marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleClose} style={{
                background: 'transparent', border: '1px solid #2a2a27',
                color: 'var(--muted)', borderRadius: 8, padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                style={{
                  background: loading || !text.trim()
                    ? 'rgba(201,169,110,0.25)' : '#c9a96e',
                  color: '#0e0e0d', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontFamily: 'var(--font-body)',
                  fontSize: 13, fontWeight: 600,
                  cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Extracting...' : 'Extract Client Data'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: '#7aab8f', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 12,
              }}>
                Extracted — Review before saving
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(preview).map(([key, val]) => (
                  <div key={key} style={{
                    display: 'grid', gridTemplateColumns: '140px 1fr',
                    gap: 8, alignItems: 'flex-start',
                  }}>
                    <span style={{ ...label, marginBottom: 0, paddingTop: 2 }}>{key}</span>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setPreview(p => ({ ...p, [key]: e.target.value }))}
                      style={{
                        background: '#1e1e1b', border: '1px solid #2a2a27',
                        borderRadius: 6, padding: '7px 10px',
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: 'var(--text)', outline: 'none',
                        width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPreview(null)} style={{
                background: 'transparent', border: '1px solid #2a2a27',
                color: 'var(--muted)', borderRadius: 8, padding: '10px 16px',
                fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
              }}>
                Back
              </button>
              <button onClick={handleConfirm} style={{
                background: '#c9a96e', color: '#0e0e0d', border: 'none',
                borderRadius: 8, padding: '10px 20px',
                fontFamily: 'var(--font-body)', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}>
                Save to CRM and Wall
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Bulk Promote Modal ───────────────────────────────────────────────────────

function BulkPromoteModal({ isOpen, clients, onConfirm, onSkip }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (isOpen) setSelected([])
  }, [isOpen])

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function toggleAll() {
    setSelected(s => s.length === clients.length ? [] : clients.map(c => c.id))
  }

  if (!isOpen) return null

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 501, background: '#161614',
        borderRadius: 16, border: '1px solid #2a2a27',
        width: 480, maxWidth: '95vw',
        maxHeight: '85vh', overflowY: 'auto',
        padding: 24,
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 20,
          fontWeight: 700, color: 'var(--text)', marginBottom: 6,
        }}>
          Add clients to Project Wall
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13,
          color: 'var(--muted)', marginBottom: 20,
        }}>
          You have {clients.length} {clients.length === 1 ? 'client' : 'clients'} in your CRM not yet on the board. Select who to add.
        </div>

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={toggleAll}
            style={{
              background: 'transparent', border: '1px solid #2a2a27',
              color: 'var(--muted)', borderRadius: 6, padding: '5px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              cursor: 'pointer', marginBottom: 12,
            }}
          >
            {selected.length === clients.length ? 'Deselect All' : 'Select All'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clients.map(c => {
              const sel = selected.includes(c.id)
              return (
                <div
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    background: sel ? 'rgba(201,169,110,0.08)' : '#1e1e1b',
                    border: `1px solid ${sel ? 'rgba(201,169,110,0.3)' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: sel ? '#c9a96e' : 'transparent',
                    border: `2px solid ${sel ? '#c9a96e' : '#3a3a37'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && (
                      <span style={{ color: '#0e0e0d', fontSize: 11, fontWeight: 700 }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-heading)', fontSize: 14,
                    color: 'var(--text)',
                  }}>
                    {c.name}
                  </span>
                  {c.stage && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--muted)', marginLeft: 'auto',
                    }}>
                      {c.stage}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onSkip} style={{
            background: 'transparent', border: '1px solid #2a2a27',
            color: 'var(--muted)', borderRadius: 8, padding: '10px 16px',
            fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
          }}>
            Skip for now
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            style={{
              background: selected.length ? '#c9a96e' : 'rgba(201,169,110,0.25)',
              color: '#0e0e0d', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontFamily: 'var(--font-body)',
              fontSize: 13, fontWeight: 600,
              cursor: selected.length ? 'pointer' : 'not-allowed',
            }}
          >
            Add {selected.length > 0 ? `${selected.length} ` : ''}to Board
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Board Card ───────────────────────────────────────────────────────────────

function BoardCard({ client, color, onOpen, onDragStart, onDragOver, onDrop }) {
  const soon = isWithin7Days(client)
  const rgb  = hexToRgb(color)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, client.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, null, client.id)}
      onClick={() => onOpen(client)}
      style={{
        background: `rgba(${rgb}, 0.08)`,
        border: `1px solid rgba(${rgb}, 0.2)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
        outline: soon ? `1px solid rgba(201,169,110,0.5)` : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${rgb}, 0.14)`
        e.currentTarget.style.borderColor = `rgba(${rgb}, 0.4)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `rgba(${rgb}, 0.08)`
        e.currentTarget.style.borderColor = `rgba(${rgb}, 0.2)`
        e.currentTarget.style.borderLeftColor = color
      }}
    >
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: 13,
        fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
      }}>
        {client.name || 'Unnamed'}
      </div>
      {soon && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: '#c9a96e', marginTop: 4,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Session this week
        </div>
      )}
    </div>
  )
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({
  stage, clients, activeOnly,
  onOpen, onDragStart, onDragOver, onDrop,
  onColumnDragOver, onColumnDrop,
}) {
  const [dragOver, setDragOver] = useState(false)
  const rgb = hexToRgb(stage.color)

  if (activeOnly && (stage.key === 'void' || stage.key === 'archived')) return null

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); onColumnDragOver(e) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { setDragOver(false); onColumnDrop(e, stage.key) }}
      style={{
        width: 200, flexShrink: 0,
        background: dragOver ? `rgba(${rgb}, 0.06)` : '#161614',
        border: `1px solid ${dragOver ? `rgba(${rgb}, 0.4)` : '#2a2a27'}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        background: `rgba(${rgb}, 0.15)`,
        borderBottom: `2px solid ${stage.color}`,
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          color: stage.color, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {stage.label}
        </span>
        <span style={{
          background: `rgba(${rgb}, 0.25)`,
          color: stage.color,
          borderRadius: 99, padding: '1px 7px',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        }}>
          {clients.length}
        </span>
      </div>

      <div style={{
        padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 6,
        minHeight: 80,
      }}>
        {clients.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'rgba(122,120,111,0.4)', textAlign: 'center',
            padding: '16px 0', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Empty
          </div>
        ) : (
          clients.map(c => (
            <BoardCard
              key={c.id}
              client={c}
              color={stage.color}
              onOpen={onOpen}
              onDragStart={onDragStart}
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── ProjectWall ──────────────────────────────────────────────────────────────

export default function ProjectWall() {
  const ctx        = useOutletContext?.() ?? {}
  const navigate   = useNavigate()

  const [clients,      setClients]      = useState(loadClients)
  const [activeOnly,   setActiveOnly]   = useState(true)
  const [bulkOpen,     setBulkOpen]     = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)
  const [dragClientId, setDragClientId] = useState(null)

  useEffect(() => {
    const done = localStorage.getItem(PROMOTED_KEY)
    if (!done) {
      const unpromoted = clients.filter(c => !c.projectStage)
      if (unpromoted.length > 0) setBulkOpen(true)
    }
  }, [])

  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setClients(loadClients())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function persist(list) {
    setClients(list)
    saveClients(list)
  }

  function handleBulkConfirm(ids) {
    const updated = clients.map(c =>
      ids.includes(c.id)
        ? { ...c, projectStage: 'waiting-on-reply', projectOrder: 0 }
        : c
    )
    persist(updated)
    setBulkOpen(false)
    localStorage.setItem(PROMOTED_KEY, 'true')
  }

  function handleBulkSkip() {
    setBulkOpen(false)
    localStorage.setItem(PROMOTED_KEY, 'true')
  }

  function handleImport(data) {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    const newClient = {
      id,
      name:         data.name || 'New Client',
      phone:        data.phone || '',
      email:        data.email || '',
      tattooIdea:   data.tattooIdea || '',
      style:        data.style || '',
      placement:    data.placement || '',
      size:         data.size || '',
      notes:        data.notes || '',
      stage:        'Inquiry',
      projectStage: 'waiting-on-reply',
      projectOrder: 0,
      sessions:     [],
      createdAt:    now,
      updatedAt:    now,
    }
    persist([newClient, ...clients])
  }

  function handleDragStart(e, clientId) {
    setDragClientId(clientId)
    e.dataTransfer.setData('text/plain', clientId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleColumnDrop(e, stageKey) {
    e.preventDefault()
    const id = dragClientId || e.dataTransfer.getData('text/plain')
    if (!id) return
    const updated = clients.map(c =>
      c.id === id
        ? { ...c, projectStage: stageKey, updatedAt: new Date().toISOString() }
        : c
    )
    persist(updated)
    setDragClientId(null)
  }

  function handleCardDrop(e, _unused, targetClientId) {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = dragClientId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetClientId) return

    const source = clients.find(c => c.id === sourceId)
    const target = clients.find(c => c.id === targetClientId)
    if (!source || !target || source.projectStage !== target.projectStage) return

    const stageClients = clients
      .filter(c => c.projectStage === source.projectStage)
      .sort((a, b) => (a.projectOrder ?? 0) - (b.projectOrder ?? 0))

    const srcIdx = stageClients.findIndex(c => c.id === sourceId)
    const tgtIdx = stageClients.findIndex(c => c.id === targetClientId)
    if (srcIdx < 0 || tgtIdx < 0) return

    const reordered   = [...stageClients]
    const [moved]     = reordered.splice(srcIdx, 1)
    reordered.splice(tgtIdx, 0, moved)

    const orderMap = new Map(reordered.map((c, i) => [c.id, i]))
    const updated  = clients.map(c =>
      orderMap.has(c.id)
        ? { ...c, projectOrder: orderMap.get(c.id) }
        : c
    )
    persist(updated)
    setDragClientId(null)
  }

  function handleOpen(client) {
    navigate('/crm', { state: { openClientId: client.id } })
  }

  const wallClients = clients.filter(c => c.projectStage)
  const unpromoted  = clients.filter(c => !c.projectStage)

  const columnMap = {}
  for (const s of STAGES) {
    columnMap[s.key] = wallClients
      .filter(c => c.projectStage === s.key)
      .sort((a, b) => (a.projectOrder ?? 0) - (b.projectOrder ?? 0))
  }

  const totalActive = ACTIVE_STAGES.reduce(
    (sum, s) => sum + (columnMap[s.key]?.length ?? 0), 0
  )

  return (
    <div className="page-content" style={{ minHeight: '100%' }}>

      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 6,
          }}>
            panel / project wall
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 24,
            fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em',
          }}>
            Project Wall
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--muted)', marginTop: 4,
          }}>
            {totalActive} active {totalActive === 1 ? 'project' : 'projects'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            onClick={() => setActiveOnly(a => !a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: '7px 14px',
              background: activeOnly ? 'rgba(201,169,110,0.08)' : '#1e1e1b',
              border: `1px solid ${activeOnly ? 'rgba(201,169,110,0.3)' : '#2a2a27'}`,
              borderRadius: 8,
            }}
          >
            <div style={{
              width: 28, height: 16, borderRadius: 99,
              background: activeOnly ? '#c9a96e' : '#3a3a37',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: activeOnly ? 14 : 2,
                width: 12, height: 12, borderRadius: 99,
                background: '#0e0e0d', transition: 'left 0.2s',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: activeOnly ? '#c9a96e' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Active Only
            </span>
          </div>

          <button
            onClick={() => setImportOpen(true)}
            style={{
              background: '#1e1e1b', color: 'var(--muted)',
              border: '1px solid #2a2a27', borderRadius: 8,
              padding: '8px 14px', minHeight: 36,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Import from Notes
          </button>

          {unpromoted.length > 0 && (
            <button
              onClick={() => setBulkOpen(true)}
              style={{
                background: 'rgba(201,169,110,0.08)', color: '#c9a96e',
                border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: 8, padding: '8px 14px', minHeight: 36,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Add from CRM ({unpromoted.length})
            </button>
          )}
        </div>
      </div>

      {wallClients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: 20,
            fontWeight: 600, color: 'var(--text)', marginBottom: 8,
          }}>
            Your board is empty
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--muted)', marginBottom: 20,
          }}>
            Add clients from your CRM or import a consultation note to get started.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {unpromoted.length > 0 && (
              <button
                onClick={() => setBulkOpen(true)}
                style={{
                  background: '#c9a96e', color: '#0e0e0d',
                  border: 'none', borderRadius: 8, padding: '10px 20px',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Add Clients from CRM
              </button>
            )}
            <button
              onClick={() => setImportOpen(true)}
              style={{
                background: '#1e1e1b', color: 'var(--muted)',
                border: '1px solid #2a2a27', borderRadius: 8,
                padding: '10px 20px', fontFamily: 'var(--font-body)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Import from Notes
            </button>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, minWidth: 'max-content' }}>
            {STAGES.map(stage => (
              <BoardColumn
                key={stage.key}
                stage={stage}
                clients={columnMap[stage.key] ?? []}
                activeOnly={activeOnly}
                onOpen={handleOpen}
                onDragStart={handleDragStart}
                onDragOver={e => e.preventDefault()}
                onDrop={handleCardDrop}
                onColumnDragOver={e => e.preventDefault()}
                onColumnDrop={handleColumnDrop}
              />
            ))}
          </div>
        </div>
      )}

      <BulkPromoteModal
        isOpen={bulkOpen}
        clients={unpromoted}
        onConfirm={handleBulkConfirm}
        onSkip={handleBulkSkip}
      />

      <ImportNotesModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

    </div>
  )
}