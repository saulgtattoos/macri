import { useState, useEffect, useRef } from 'react'

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

const COLOR_FAMILIES = [
  'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple',
  'Pink', 'Brown', 'Black', 'White', 'Gray', 'Other',
]

const SEED_BRANDS = [
  { id: uid(), name: 'RAW Pigments', website: 'rawpigments.com', orderUrl: 'rawpigments.com/shop', supplierContact: '', phone: '', notes: '', createdAt: now() },
  { id: uid(), name: 'Fusion Ink', website: 'fusionink.com', orderUrl: 'fusionink.com/shop', supplierContact: '', phone: '', notes: '', createdAt: now() },
]

const blankInk = (brands = []) => ({
  id: uid(), name: '', brand: brands[0]?.name || '',
  colorHex: '#000000', colorFamily: 'Black',
  notes: '', inStock: true, createdAt: now(),
})

const blankPalette = () => ({
  id: uid(), name: '', inkIds: [], notes: '', createdAt: now(),
})

const blankBrand = () => ({
  id: uid(), name: '', website: '', supplierContact: '',
  phone: '', orderUrl: '', notes: '', createdAt: now(),
})

const S = {
  page: { minHeight: '100vh', background: '#0e0e0d', color: '#e8e6df', fontFamily: 'Inter, sans-serif', padding: '32px 24px', maxWidth: 900, margin: '0 auto' },
  panelLabel: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c9a96e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 },
  h1: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, color: '#e8e6df', margin: 0 },
  subtitle: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7a786f', marginTop: 4 },
  tabRow: { display: 'flex', gap: 8, marginTop: 28, marginBottom: 20, flexWrap: 'wrap' },
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
  row: (expanded) => ({
    background: expanded ? '#1e1e1b' : '#161614',
    border: expanded ? '1px solid #2a2a26' : '1px solid #1e1e1b',
    borderRadius: 10, marginBottom: 6, overflow: 'hidden', transition: 'background 0.15s',
  }),
  rowMain: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', userSelect: 'none' },
  badge: (color) => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4,
    background: `${color}18`, color, border: `1px solid ${color}33`, whiteSpace: 'nowrap', flexShrink: 0,
  }),
  expandPanel: { padding: '14px 14px 16px', borderTop: '1px solid #2a2a26', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.08em' },
  input: { background: '#0e0e0d', border: '1px solid #2a2a26', borderRadius: 6, color: '#e8e6df', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { background: '#0e0e0d', border: '1px solid #2a2a26', borderRadius: 6, color: '#e8e6df', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modalBox: { background: '#161614', border: '1px solid #2a2a26', borderRadius: 14, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#e8e6df' },
  rowText: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', flex: 1, minWidth: 0 },
  rowMuted: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', flexShrink: 0 },
}

function StockToggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        background: value ? 'rgba(122,171,143,0.15)' : 'rgba(240,149,149,0.1)',
        border: `1px solid ${value ? '#7aab8f44' : '#f0959544'}`,
        borderRadius: 20, padding: '5px 14px', width: 'fit-content',
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: value ? '#7aab8f' : '#f09595' }} />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: value ? '#7aab8f' : '#f09595' }}>
        {value ? 'In Stock' : 'Out of Stock'}
      </span>
    </div>
  )
}

function Swatch({ hex, size = 20 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: hex, border: '1px solid #2a2a26', flexShrink: 0 }} />
}

// ─── Ink Library Tab ──────────────────────────────────────────────────────────
function InkLibraryTab({ inks, setInks, brands }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(() => blankInk(brands))

  const brandNames = brands.map((b) => b.name)

  const saveInks = (updated) => {
    setInks(updated)
    localStorage.setItem('macri_colorlab_inks', JSON.stringify(updated))
  }

  const filtered = inks.filter((ink) => {
    if (inStockOnly && !ink.inStock) return false
    if (activeFilter !== 'All' && ink.brand !== activeFilter) return false
    return true
  })

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}) }
    else { setExpanded(id); setEditDraft({ ...inks.find((i) => i.id === id) }) }
  }

  const saveEdit = (id) => {
    saveInks(inks.map((i) => (i.id === id ? { ...editDraft } : i)))
    setExpanded(null); setEditDraft({})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      saveInks(inks.filter((i) => i.id !== id))
      setConfirmDelete(null)
      if (expanded === id) setExpanded(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    saveInks([{ ...form, id: uid(), createdAt: now() }, ...inks])
    setForm(blankInk(brands)); setShowModal(false)
  }

  const d = editDraft

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button style={S.chip(activeFilter === 'All')} onClick={() => setActiveFilter('All')}>All</button>
          {brandNames.map((b) => (
            <button key={b} style={S.chip(activeFilter === b)} onClick={() => setActiveFilter(b)}>{b}</button>
          ))}
          <button style={S.chip(inStockOnly)} onClick={() => setInStockOnly(!inStockOnly)}>In Stock Only</button>
        </div>
        <button style={S.btn} onClick={() => { setForm(blankInk(brands)); setShowModal(true) }}>+ Add Ink</button>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {inks.length === 0 ? 'No inks yet. Add your first ink above.' : 'No inks match this filter.'}
        </p>
      )}

      {filtered.map((ink) => {
        const isExpanded = expanded === ink.id
        return (
          <div key={ink.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(ink.id)}>
              <Swatch hex={ink.colorHex} />
              <span style={{ ...S.rowText, fontWeight: 500 }}>{ink.name}</span>
              <span style={S.badge('#c9a96e')}>{ink.brand || 'No Brand'}</span>
              <span style={S.badge('#7a786f')}>{ink.colorFamily}</span>
              {!ink.inStock && <span style={S.badge('#f09595')}>Out of Stock</span>}
              <button
                style={confirmDelete === ink.id ? S.btnDanger : { ...S.btnSm('#7a786f'), border: 'none', background: 'transparent' }}
                onClick={(e) => handleDelete(e, ink.id)}
              >
                {confirmDelete === ink.id ? 'Confirm' : '✕'}
              </button>
            </div>

            {isExpanded && (
              <div style={S.expandPanel}>
                <div style={S.field}>
                  <span style={S.label}>Name</span>
                  <input type="text" style={S.input} value={d.name ?? ''} onChange={(e) => setEditDraft({ ...d, name: e.target.value })} />
                </div>
                <div style={S.field}>
                  <span style={S.label}>Brand</span>
                  <select style={S.select} value={d.brand ?? ''} onChange={(e) => setEditDraft({ ...d, brand: e.target.value })}>
                    {brandNames.map((b) => <option key={b}>{b}</option>)}
                    <option value="">Other</option>
                  </select>
                </div>
                <div style={S.field}>
                  <span style={S.label}>Color</span>
                  <input type="color" style={{ ...S.input, padding: 4, height: 38, cursor: 'pointer' }} value={d.colorHex ?? '#000000'} onChange={(e) => setEditDraft({ ...d, colorHex: e.target.value })} />
                </div>
                <div style={S.field}>
                  <span style={S.label}>Color Family</span>
                  <select style={S.select} value={d.colorFamily ?? 'Other'} onChange={(e) => setEditDraft({ ...d, colorFamily: e.target.value })}>
                    {COLOR_FAMILIES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <span style={S.label}>Notes</span>
                  <input type="text" style={S.input} value={d.notes ?? ''} onChange={(e) => setEditDraft({ ...d, notes: e.target.value })} />
                </div>
                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <span style={S.label}>Availability</span>
                  <StockToggle value={d.inStock ?? true} onChange={(v) => setEditDraft({ ...d, inStock: v })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.btnSm('#7a786f')} onClick={() => { setExpanded(null); setEditDraft({}) }}>Cancel</button>
                  <button style={S.btn} onClick={() => saveEdit(ink.id)}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Ink</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={S.field}>
                <span style={S.label}>Name</span>
                <input type="text" style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Brand</span>
                <select style={S.select} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                  {brandNames.map((b) => <option key={b}>{b}</option>)}
                  <option value="">Other</option>
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Color</span>
                <input type="color" style={{ ...S.input, padding: 4, height: 38, cursor: 'pointer' }} value={form.colorHex} onChange={(e) => setForm({ ...form, colorHex: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Color Family</span>
                <select style={S.select} value={form.colorFamily} onChange={(e) => setForm({ ...form, colorFamily: e.target.value })}>
                  {COLOR_FAMILIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                <span style={S.label}>Notes</span>
                <input type="text" style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                <span style={S.label}>Availability</span>
                <StockToggle value={form.inStock} onChange={(v) => setForm({ ...form, inStock: v })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add Ink</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Palettes Tab ─────────────────────────────────────────────────────────────
function PalettesTab({ palettes, setPalettes, inks, showToast }) {
  const [expanded, setExpanded] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [addingInks, setAddingInks] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankPalette())

  const savePalettes = (updated) => {
    setPalettes(updated)
    localStorage.setItem('macri_colorlab_palettes', JSON.stringify(updated))
  }

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}); setAddingInks(false) }
    else { setExpanded(id); setEditDraft({ ...palettes.find((p) => p.id === id) }); setAddingInks(false) }
  }

  const saveEdit = (id) => {
    savePalettes(palettes.map((p) => (p.id === id ? { ...editDraft } : p)))
    setExpanded(null); setEditDraft({}); setAddingInks(false)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      savePalettes(palettes.filter((p) => p.id !== id))
      setConfirmDelete(null)
      if (expanded === id) setExpanded(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    savePalettes([{ ...form, id: uid(), createdAt: now() }, ...palettes])
    setForm(blankPalette()); setShowModal(false)
  }

  const toggleInkInDraft = (inkId) => {
    const d = editDraft
    const has = (d.inkIds || []).includes(inkId)
    setEditDraft({ ...d, inkIds: has ? d.inkIds.filter((id) => id !== inkId) : [...(d.inkIds || []), inkId] })
  }

  const sendToSessionPrep = (inkIds) => {
    const paletteInks = inkIds.map((id) => inks.find((i) => i.id === id)).filter(Boolean)
    if (paletteInks.length === 0) { showToast('No inks in this palette'); return }
    const raw = localStorage.getItem('macri_session_prep')
    let data = { items: [] }
    try { data = raw ? JSON.parse(raw) : { items: [] } } catch {}
    if (!Array.isArray(data.items)) data.items = []
    data.items = [...data.items, ...paletteInks.map((ink) => ({ id: uid(), text: ink.name, checked: false }))]
    localStorage.setItem('macri_session_prep', JSON.stringify(data))
    showToast('Inks added to Session Prep')
  }

  const d = editDraft

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button style={S.btn} onClick={() => { setForm(blankPalette()); setShowModal(true) }}>+ Add Palette</button>
      </div>

      {palettes.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No palettes yet. Create one above.</p>
      )}

      {palettes.map((palette) => {
        const isExpanded = expanded === palette.id
        const paletteInks = palette.inkIds.map((id) => inks.find((i) => i.id === id)).filter(Boolean)
        const shown = paletteInks.slice(0, 10)
        const extra = paletteInks.length - 10
        return (
          <div key={palette.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(palette.id)}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#e8e6df', flex: 1 }}>{palette.name}</span>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {shown.map((ink) => <Swatch key={ink.id} hex={ink.colorHex} size={16} />)}
                {extra > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7a786f', marginLeft: 4 }}>+{extra} more</span>}
              </div>
              <span style={S.badge('#c9a96e')}>{paletteInks.length} inks</span>
              <button
                style={confirmDelete === palette.id ? S.btnDanger : { ...S.btnSm('#7a786f'), border: 'none', background: 'transparent' }}
                onClick={(e) => handleDelete(e, palette.id)}
              >
                {confirmDelete === palette.id ? 'Confirm' : '✕'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ padding: '14px 14px 16px', borderTop: '1px solid #2a2a26' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={S.field}>
                    <span style={S.label}>Palette Name</span>
                    <input type="text" style={S.input} value={d.name ?? ''} onChange={(e) => setEditDraft({ ...d, name: e.target.value })} />
                  </div>
                  <div style={S.field}>
                    <span style={S.label}>Notes</span>
                    <input type="text" style={S.input} value={d.notes ?? ''} onChange={(e) => setEditDraft({ ...d, notes: e.target.value })} />
                  </div>
                </div>

                <span style={{ ...S.label, display: 'block', marginBottom: 8 }}>Inks in this palette</span>
                {(d.inkIds || []).length === 0 && (
                  <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 10 }}>No inks added yet.</p>
                )}
                {(d.inkIds || []).map((inkId) => {
                  const ink = inks.find((i) => i.id === inkId)
                  if (!ink) return null
                  return (
                    <div key={inkId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #2a2a2620' }}>
                      <Swatch hex={ink.colorHex} size={14} />
                      <span style={{ ...S.rowText, fontSize: 13 }}>{ink.name}</span>
                      <span style={S.rowMuted}>{ink.brand}</span>
                      <button
                        style={{ ...S.btnSm('#f09595'), padding: '2px 8px' }}
                        onClick={() => setEditDraft({ ...d, inkIds: d.inkIds.filter((id) => id !== inkId) })}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}

                <button style={{ ...S.btnSm('#7a786f'), marginTop: 10, marginBottom: addingInks ? 10 : 0 }} onClick={() => setAddingInks(!addingInks)}>
                  {addingInks ? 'Close' : '+ Add Inks'}
                </button>

                {addingInks && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #2a2a26', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                    {inks.length === 0 && <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No inks in library.</p>}
                    {inks.map((ink) => {
                      const selected = (d.inkIds || []).includes(ink.id)
                      return (
                        <div
                          key={ink.id}
                          onClick={() => toggleInkInDraft(ink.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', cursor: 'pointer', borderRadius: 6, background: selected ? 'rgba(201,169,110,0.06)' : 'transparent' }}
                        >
                          <Swatch hex={ink.colorHex} size={14} />
                          <span style={{ ...S.rowText, fontSize: 13 }}>{ink.name}</span>
                          <span style={S.rowMuted}>{ink.brand}</span>
                          {selected && <span style={S.badge('#7aab8f')}>Selected</span>}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap' }}>
                  <button style={S.btnSm('#7aab8f')} onClick={() => sendToSessionPrep(d.inkIds || [])}>
                    Send to Session Prep
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={S.btnSm('#7a786f')} onClick={() => { setExpanded(null); setEditDraft({}); setAddingInks(false) }}>Cancel</button>
                    <button style={S.btn} onClick={() => saveEdit(palette.id)}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Palette</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={S.field}>
                <span style={S.label}>Palette Name</span>
                <input type="text" style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Notes</span>
                <input type="text" style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <span style={{ ...S.label, display: 'block', marginBottom: 8 }}>Select Inks</span>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #2a2a26', borderRadius: 8, padding: 10, marginBottom: 16 }}>
              {inks.length === 0 && <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No inks in library yet.</p>}
              {inks.map((ink) => {
                const selected = form.inkIds.includes(ink.id)
                return (
                  <div
                    key={ink.id}
                    onClick={() => setForm({ ...form, inkIds: selected ? form.inkIds.filter((id) => id !== ink.id) : [...form.inkIds, ink.id] })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 6px', cursor: 'pointer', borderRadius: 6, background: selected ? 'rgba(201,169,110,0.06)' : 'transparent' }}
                  >
                    <Swatch hex={ink.colorHex} size={14} />
                    <span style={{ ...S.rowText, fontSize: 13 }}>{ink.name}</span>
                    <span style={S.rowMuted}>{ink.brand}</span>
                    {selected && <span style={S.badge('#7aab8f')}>Selected</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add Palette</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Brands Tab ───────────────────────────────────────────────────────────────
function BrandsTab({ brands, setBrands, inks }) {
  const [expanded, setExpanded] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankBrand())

  const saveBrands = (updated) => {
    setBrands(updated)
    localStorage.setItem('macri_colorlab_brands', JSON.stringify(updated))
  }

  const colorCount = (name) => inks.filter((i) => i.brand === name).length

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}) }
    else { setExpanded(id); setEditDraft({ ...brands.find((b) => b.id === id) }) }
  }

  const saveEdit = (id) => {
    saveBrands(brands.map((b) => (b.id === id ? { ...editDraft } : b)))
    setExpanded(null); setEditDraft({})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      saveBrands(brands.filter((b) => b.id !== id))
      setConfirmDelete(null)
      if (expanded === id) setExpanded(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    saveBrands([{ ...form, id: uid(), createdAt: now() }, ...brands])
    setForm(blankBrand()); setShowModal(false)
  }

  const d = editDraft

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button style={S.btn} onClick={() => { setForm(blankBrand()); setShowModal(true) }}>+ Add Brand</button>
      </div>

      {brands.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No brands yet.</p>
      )}

      {brands.map((brand) => {
        const isExpanded = expanded === brand.id
        const count = colorCount(brand.name)
        return (
          <div key={brand.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(brand.id)}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#e8e6df', flex: 1 }}>{brand.name}</span>
              <span style={S.badge('#c9a96e')}>{count} inks</span>
              {brand.website && (
                <a
                  href={`https://${brand.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {brand.website}
                </a>
              )}
              {brand.supplierContact && <span style={S.rowMuted}>{brand.supplierContact}</span>}
              <button
                style={confirmDelete === brand.id ? S.btnDanger : { ...S.btnSm('#7a786f'), border: 'none', background: 'transparent' }}
                onClick={(e) => handleDelete(e, brand.id)}
              >
                {confirmDelete === brand.id ? 'Confirm' : '✕'}
              </button>
            </div>

            {isExpanded && (
              <div style={S.expandPanel}>
                {[
                  { key: 'name', label: 'Brand Name' },
                  { key: 'supplierContact', label: 'Supplier Contact' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'website', label: 'Website' },
                  { key: 'orderUrl', label: 'Order URL' },
                ].map(({ key, label }) => (
                  <div key={key} style={S.field}>
                    <span style={S.label}>{label}</span>
                    <input type="text" style={S.input} value={d[key] ?? ''} onChange={(e) => setEditDraft({ ...d, [key]: e.target.value })} />
                  </div>
                ))}
                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <span style={S.label}>Notes</span>
                  <input type="text" style={S.input} value={d.notes ?? ''} onChange={(e) => setEditDraft({ ...d, notes: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.btnSm('#7a786f')} onClick={() => { setExpanded(null); setEditDraft({}) }}>Cancel</button>
                  <button style={S.btn} onClick={() => saveEdit(brand.id)}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Brand</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'name', label: 'Brand Name' },
                { key: 'supplierContact', label: 'Supplier Contact' },
                { key: 'phone', label: 'Phone' },
                { key: 'website', label: 'Website' },
                { key: 'orderUrl', label: 'Order URL' },
              ].map(({ key, label }) => (
                <div key={key} style={S.field}>
                  <span style={S.label}>{label}</span>
                  <input type="text" style={S.input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                <span style={S.label}>Notes</span>
                <input type="text" style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add Brand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Analyze Tab ──────────────────────────────────────────────────────────────
function AnalyzeTab({ inks, palettes, setPalettes, showToast }) {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [paletteName, setPaletteName] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('macri_crm_clients')
      if (raw) setClients(JSON.parse(raw))
    } catch {}
  }, [])

  const handleImageChange = (file) => {
    if (!file) return
    setImageFile(file)
    setImageMime(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImageBase64(e.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) handleImageChange(file)
  }

  const handleAnalyze = async () => {
    if (!imageBase64 || analyzing) return
    setAnalyzing(true); setResult(null)
    try {
      const inStockInks = inks.filter((i) => i.inStock)
      const inkList = inStockInks.map((i) => `${i.name} | ${i.brand} | ${i.colorHex} | ${i.colorFamily}`).join('\n')
      const userText = inkList
        ? `Here is my ink library:\n${inkList}\n\nAnalyze the design and tell me which of my inks to use and why.`
        : 'I have no inks in my library yet. Analyze the design and describe what colors would be needed for this tattoo.'

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
          max_tokens: 1000,
          system: 'You are a tattoo ink color expert helping a colorblind tattoo artist named Saul. He works primarily with RAW Pigments and Fusion Ink but also uses other brands. Given a design image and a list of inks he owns, recommend which specific inks from his collection to use for the tattoo. For each ink recommendation give a plain language description of why that color fits. Warn if any two recommended inks may look confusingly similar to someone with color vision differences. Include blending suggestions where relevant. Keep advice practical and concise. Use zero hyphens or dashes in your response. Write all ranges as X to Y.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
              { type: 'text', text: userText },
            ],
          }],
        }),
      })
      if (!res.ok) throw new Error('api')
      const data = await res.json()
      setResult(data.content[0].text)
    } catch {
      setResult('Something went wrong. Please try again.')
    }
    setAnalyzing(false)
  }

  const matchedInks = () => {
    if (!result) return []
    return inks.filter((ink) => result.toLowerCase().includes(ink.name.toLowerCase()))
  }

  const handleSendToSessionPrep = () => {
    const matched = matchedInks()
    if (matched.length === 0) { showToast('No matching inks found in your library'); return }
    const raw = localStorage.getItem('macri_session_prep')
    let data = { items: [] }
    try { data = raw ? JSON.parse(raw) : { items: [] } } catch {}
    if (!Array.isArray(data.items)) data.items = []
    data.items = [...data.items, ...matched.map((ink) => ({ id: uid(), text: ink.name, checked: false }))]
    localStorage.setItem('macri_session_prep', JSON.stringify(data))
    showToast('Inks added to Session Prep')
  }

  const handleSavePalette = () => {
    if (!paletteName.trim()) return
    const matched = matchedInks()
    const newPalette = { id: uid(), name: paletteName.trim(), inkIds: matched.map((i) => i.id), notes: 'Generated by Color Analyze', createdAt: now() }
    const raw = localStorage.getItem('macri_colorlab_palettes')
    let existing = []
    try { existing = raw ? JSON.parse(raw) : [] } catch {}
    const updated = [newPalette, ...existing]
    localStorage.setItem('macri_colorlab_palettes', JSON.stringify(updated))
    setPalettes(updated)
    setShowSaveModal(false); setPaletteName('')
    showToast('Palette saved')
  }

  const clearImage = () => { setImageFile(null); setImagePreview(null); setImageBase64(null); setResult(null) }

  return (
    <div style={{ maxWidth: 620 }}>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c9a96e'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a26'}
        style={{ border: '2px dashed #2a2a26', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#161614', transition: 'border-color 0.15s' }}
      >
        {imagePreview ? (
          <div>
            <img src={imagePreview} alt="Design preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 10 }} />
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', margin: 0 }}>{imageFile?.name}</p>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#7a786f', margin: '0 0 6px' }}>Drop a design image or tap to upload</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', margin: 0 }}>JPEG and PNG accepted</p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={(e) => handleImageChange(e.target.files[0])} />

      {imagePreview && (
        <button style={{ ...S.btnSm('#7a786f'), marginBottom: 14 }} onClick={clearImage}>Clear Image</button>
      )}

      <div style={{ ...S.field, marginBottom: 16 }}>
        <span style={S.label}>Link to client (optional)</span>
        <select style={S.select} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
          <option value="">No client selected</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <button
        style={{ ...S.btn, width: '100%', marginBottom: 20, opacity: imageBase64 ? 1 : 0.4, cursor: imageBase64 ? 'pointer' : 'not-allowed' }}
        onClick={handleAnalyze}
        disabled={!imageBase64 || analyzing}
      >
        {analyzing ? 'Analyzing colors...' : 'Analyze Colors'}
      </button>

      {analyzing && (
        <div style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 10, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#c9a96e', margin: 0 }}>Analyzing colors...</p>
        </div>
      )}

      {result && !analyzing && (
        <>
          <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 10, padding: 20, marginBottom: 14 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{result}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={S.btnSm('#c9a96e')} onClick={() => setShowSaveModal(true)}>Save as Palette</button>
            <button style={S.btnSm('#7aab8f')} onClick={handleSendToSessionPrep}>Send to Session Prep</button>
          </div>
        </>
      )}

      {showSaveModal && (
        <div style={S.modal} onClick={() => setShowSaveModal(false)}>
          <div style={{ ...S.modalBox, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Save as Palette</p>
            <div style={S.field}>
              <span style={S.label}>Palette Name</span>
              <input
                type="text" style={S.input} value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="Summer Garden Set"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSavePalette}>Save Palette</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ColorLab (root) ──────────────────────────────────────────────────────────
export default function ColorLab() {
  const [activeTab, setActiveTab] = useState('inks')
  const [inks, setInks] = useState([])
  const [palettes, setPalettes] = useState([])
  const [brands, setBrands] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const rawBrands = localStorage.getItem('macri_colorlab_brands')
    let b = rawBrands ? JSON.parse(rawBrands) : null
    if (!b || b.length === 0) {
      b = SEED_BRANDS
      localStorage.setItem('macri_colorlab_brands', JSON.stringify(b))
    }
    setBrands(b)

    const rawInks = localStorage.getItem('macri_colorlab_inks')
    setInks(rawInks ? JSON.parse(rawInks) : [])

    const rawPalettes = localStorage.getItem('macri_colorlab_palettes')
    setPalettes(rawPalettes ? JSON.parse(rawPalettes) : [])
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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

      <p style={S.panelLabel}>panel / color lab</p>
      <h1 style={S.h1}>Color Lab</h1>
      <p style={S.subtitle}>
        {inks.length} {inks.length === 1 ? 'ink' : 'inks'}
        <span style={{ margin: '0 8px', color: '#2a2a26' }}>|</span>
        {palettes.length} {palettes.length === 1 ? 'palette' : 'palettes'}
      </p>

      <div style={S.tabRow}>
        {[
          { key: 'inks', label: 'Ink Library' },
          { key: 'palettes', label: 'Palettes' },
          { key: 'brands', label: 'Brands' },
          { key: 'analyze', label: 'Analyze' },
        ].map(({ key, label }) => (
          <button key={key} style={S.tab(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {activeTab === 'inks' && <InkLibraryTab inks={inks} setInks={setInks} brands={brands} />}
      {activeTab === 'palettes' && <PalettesTab palettes={palettes} setPalettes={setPalettes} inks={inks} showToast={showToast} />}
      {activeTab === 'brands' && <BrandsTab brands={brands} setBrands={setBrands} inks={inks} />}
      {activeTab === 'analyze' && <AnalyzeTab inks={inks} palettes={palettes} setPalettes={setPalettes} showToast={showToast} />}
    </div>
  )
}
