import { useState, useEffect, useRef } from 'react'

const LS_KEY = 'macri_dev_queue'

const SEED_ITEMS = [
  { id: '1',  title: 'Save to CRM not working on mobile',                          subtitle: 'Button visible but unresponsive on touch devices',           badge: 'bug',    checked: false, brief: '' },
  { id: '2',  title: 'View Full Profile missing from card back',                   subtitle: 'No way to open drawer from back of card',                   badge: 'bug',    checked: false, brief: '' },
  { id: '3',  title: 'Replace Archive button with View Full Profile on card front', subtitle: 'Gold button, opens drawer',                                 badge: 'polish', checked: false, brief: '' },
  { id: '4',  title: 'Archive fix: remove from active grid, show in Archived tab only', subtitle: 'Archived cards should not appear in main CRM view',    badge: 'polish', checked: false, brief: '' },
  { id: '5',  title: 'Card back jump menu: show drawer section names not pipeline stages', subtitle: 'Client Status, Project Details, Journey Checklist, etc.', badge: 'polish', checked: false, brief: '' },
  { id: '6',  title: 'Inquiry Assistant layout reorder + emoji sources + custom pricing', subtitle: 'Email, Social DM, Text, Referral. Custom pricing shows input.', badge: 'next', checked: false, brief: '' },
  { id: '7',  title: 'Fix dashes in generated AI output',                          subtitle: 'No hyphens, dashes, or em dashes in email or text output',  badge: 'bug',    checked: false, brief: '' },
  { id: '8',  title: 'Consultation panel',                                         subtitle: 'Standalone wizard, saves to CRM and logs to drawer',        badge: 'next',   checked: false, brief: '' },
  { id: '9',  title: 'Communications panel',                                       subtitle: 'All client messages in one place',                          badge: 'future', checked: false, brief: '' },
  { id: '10', title: 'Finances panel',                                             subtitle: 'Revenue tracking, session totals, deposits',                badge: 'future', checked: false, brief: '' },
  { id: '11', title: 'Supabase migration',                                         subtitle: 'Triggers when cross device or multi user is needed',        badge: 'future', checked: false, brief: '' },
  { id: '12', title: 'Landing page',                                               subtitle: 'GetMacri.com, goes live after app is stable for Saul',      badge: 'future', checked: false, brief: '' },
  { id: '13', title: 'Onboarding flow for other artists',                          subtitle: 'After June 1 multi artist milestone',                       badge: 'future', checked: false, brief: '' },
]

const BADGE_STYLES = {
  bug:    { background: '#3d1a1a', color: '#f09595' },
  next:   { background: '#1a2d1a', color: '#7aab8f' },
  polish: { background: '#2a2518', color: '#c9a96e' },
  future: { background: '#1e1e1b', color: '#7a786f' },
}

const BADGE_LABELS = ['bug', 'next', 'polish', 'future']

function Badge({ type }) {
  const style = BADGE_STYLES[type] || BADGE_STYLES.future
  return (
    <span style={{
      ...style,
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      padding: '2px 7px',
      borderRadius: '20px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {type}
    </span>
  )
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        border: checked ? 'none' : '1.5px solid #7a786f',
        background: checked ? '#c9a96e' : 'transparent',
        flexShrink: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'background 0.15s, border 0.15s',
      }}
      aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function ChecklistItem({ item, onToggle, onSaveBrief, onDelete, onEditTitle, isExpanded, onToggleExpand }) {
  const [briefText,      setBriefText]      = useState(item.brief || '')
  const [copied,         setCopied]         = useState(false)
  const [editingTitle,   setEditingTitle]   = useState(false)
  const [titleInput,     setTitleInput]     = useState(item.title)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const confirmTimerRef = useRef(null)

  useEffect(() => {
    setBriefText(item.brief || '')
  }, [item.brief])

  // Reset titleInput if the item's title changes externally
  useEffect(() => {
    if (!editingTitle) setTitleInput(item.title)
  }, [item.title, editingTitle])

  const hasBrief = (item.brief || '').trim().length > 0

  function saveBrief() {
    onSaveBrief(item.id, briefText)
  }

  function commitTitle() {
    const trimmed = titleInput.trim()
    if (trimmed && trimmed !== item.title) onEditTitle(item.id, trimmed)
    else setTitleInput(item.title)
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
    if (e.key === 'Escape') { setTitleInput(item.title); setEditingTitle(false) }
  }

  function handleDeleteClick() {
    if (confirmDelete) {
      clearTimeout(confirmTimerRef.current)
      onDelete(item.id)
    } else {
      setConfirmDelete(true)
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  async function copyBrief() {
    if (!briefText.trim()) return
    try {
      await navigator.clipboard.writeText(briefText)
    } catch {
      const el = Object.assign(document.createElement('textarea'), { value: briefText })
      el.style.cssText = 'position:fixed;top:-9999px;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      background: '#161614',
      borderRadius: '12px',
      overflow: 'hidden',
      opacity: item.checked ? 0.45 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          minHeight: '44px',
          userSelect: 'none',
        }}
      >
        {/* Checkbox — stop propagation so tap doesn't also toggle expand */}
        <div style={{ paddingTop: '2px' }} onClick={e => e.stopPropagation()}>
          <Checkbox checked={item.checked} onChange={() => onToggle(item.id)} />
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={editingTitle ? e => e.stopPropagation() : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {editingTitle ? (
              <input
                autoFocus
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKeyDown}
                onClick={e => e.stopPropagation()}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#e8e6df',
                  background: '#1e1e1b',
                  border: '1px solid #c9a96e',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  outline: 'none',
                  lineHeight: 1.4,
                  flex: 1,
                  minWidth: 0,
                }}
              />
            ) : (
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                color: '#e8e6df',
                textDecoration: item.checked ? 'line-through' : 'none',
                lineHeight: 1.4,
              }}>
                {item.title}
              </span>
            )}
            {!editingTitle && <Badge type={item.badge} />}
          </div>
          {item.subtitle && (
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: '#7a786f',
              marginTop: '3px',
              lineHeight: 1.4,
            }}>
              {item.subtitle}
            </p>
          )}
        </div>

        {/* Brief dot + chevron */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '3px',
          flexShrink: 0,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: hasBrief ? '#c9a96e' : '#7a786f',
            flexShrink: 0,
            transition: 'background 0.15s',
          }} />
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
              color: '#7a786f',
              flexShrink: 0,
            }}
          >
            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Expandable brief panel */}
      <div style={{
        maxHeight: isExpanded ? '520px' : '0',
        overflow: 'hidden',
        transition: 'max-height 250ms ease',
      }}>
        <div style={{ padding: '0 16px 16px' }}>
          {/* Item actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              onClick={e => { e.stopPropagation(); setEditingTitle(true); setTitleInput(item.title) }}
              style={{
                background: '#1e1e1b',
                color: '#7a786f',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: '34px',
              }}
            >
              Edit Title
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDeleteClick() }}
              style={{
                background: confirmDelete ? 'rgba(239,68,68,0.12)' : '#1e1e1b',
                color: confirmDelete ? '#ef4444' : '#7a786f',
                border: confirmDelete ? '1px solid rgba(239,68,68,0.3)' : 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: confirmDelete ? 600 : 500,
                cursor: 'pointer',
                minHeight: '34px',
                transition: 'all 0.15s',
              }}
            >
              {confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#7a786f',
            marginBottom: '8px',
            letterSpacing: '0.06em',
          }}>
            Claude Code Brief
          </div>
          <textarea
            className="dev-brief-textarea"
            value={briefText}
            onChange={e => setBriefText(e.target.value)}
            onBlur={saveBrief}
            placeholder="Paste Claude Code brief here..."
            style={{
              width: '100%',
              minHeight: '180px',
              background: '#0e0e0d',
              border: '1px solid #1e1e1b',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#e8e6df',
              padding: '12px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.65,
              display: 'block',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '10px',
          }}>
            <button
              onClick={copyBrief}
              style={{
                background: '#1e1e1b',
                color: '#7a786f',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: '36px',
                transition: 'color 0.15s',
              }}
            >
              {copied ? 'Copied' : 'Copy Brief'}
            </button>
            <button
              onClick={saveBrief}
              style={{
                background: '#c9a96e',
                color: '#0e0e0d',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              Save Brief
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DevQueue() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const migrated = parsed.map(item =>
          'brief' in item ? item : { ...item, brief: '' }
        )
        const needsMigration = parsed.some(item => !('brief' in item))
        if (needsMigration) {
          localStorage.setItem(LS_KEY, JSON.stringify(migrated))
        }
        return migrated
      }
    } catch {}
    return SEED_ITEMS
  })

  const [expandedId,  setExpandedId]  = useState(null)
  const [form,        setForm]        = useState({ title: '', subtitle: '', badge: 'next' })
  const [titleError,  setTitleError]  = useState(false)
  const newItemRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

  const checkedCount = items.filter(i => i.checked).length
  const totalCount   = items.length
  const progress     = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  function toggleItem(id) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function saveBrief(id, brief) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, brief } : item
    ))
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
    setExpandedId(prev => prev === id ? null : prev)
  }

  function editItemTitle(id, newTitle) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: newTitle } : item
    ))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setTitleError(true)
      return
    }
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      badge: form.badge,
      checked: false,
      brief: '',
    }
    setItems(prev => [...prev, newItem])
    setForm({ title: '', subtitle: '', badge: 'next' })
    setTitleError(false)
    setTimeout(() => {
      newItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  return (
    <div className="page-content" style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '26px',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '0.02em',
          marginBottom: '4px',
        }}>
          Dev Queue
        </h1>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#7a786f',
        }}>
          Build roadmap | MACRI v3
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: '#7a786f',
          marginBottom: '8px',
        }}>
          {checkedCount} of {totalCount} complete
        </p>
        <div style={{
          width: '100%',
          height: '4px',
          background: '#1e1e1b',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#c9a96e',
            borderRadius: '4px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
        {items.map((item, idx) => (
          <div key={item.id} ref={idx === items.length - 1 ? newItemRef : null}>
            <ChecklistItem
              item={item}
              onToggle={toggleItem}
              onSaveBrief={saveBrief}
              onDelete={deleteItem}
              onEditTitle={editItemTitle}
              isExpanded={expandedId === item.id}
              onToggleExpand={() => toggleExpand(item.id)}
            />
          </div>
        ))}
      </div>

      {/* Add Item Form */}
      <div style={{
        background: '#161614',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#7a786f',
          marginBottom: '14px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Add item
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setTitleError(false) }}
            style={{
              background: '#1e1e1b',
              border: titleError ? '1.5px solid #f09595' : '1.5px solid transparent',
              borderRadius: '8px',
              padding: '12px 14px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#e8e6df',
              outline: 'none',
              minHeight: '44px',
              width: '100%',
              transition: 'border-color 0.15s',
            }}
          />
          <input
            type="text"
            placeholder="Short description (optional)"
            value={form.subtitle}
            onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            style={{
              background: '#1e1e1b',
              border: '1.5px solid transparent',
              borderRadius: '8px',
              padding: '12px 14px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#e8e6df',
              outline: 'none',
              minHeight: '44px',
              width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BADGE_LABELS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setForm(f => ({ ...f, badge: b }))}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: form.badge === b ? '1.5px solid #c9a96e' : '1.5px solid #3a3830',
                  background: form.badge === b ? 'rgba(201,169,110,0.1)' : 'transparent',
                  color: form.badge === b ? '#c9a96e' : '#7a786f',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  minHeight: '36px',
                }}
              >
                {b}
              </button>
            ))}
          </div>
          <button
            type="submit"
            style={{
              background: '#c9a96e',
              color: '#0e0e0d',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              minHeight: '44px',
              width: '100%',
              cursor: 'pointer',
              marginTop: '2px',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Add to Queue
          </button>
        </form>
      </div>
    </div>
  )
}
