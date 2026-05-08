import { useState, useEffect, useRef } from 'react'
import { inksService, palettesService, brandsService, sessionPrepService } from '../lib/dataService'

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
  notes: '', inStock: true, lastUsed: null, createdAt: now(),
})

const blankPalette = () => ({
  id: uid(), name: '', inkIds: [], notes: '', createdAt: now(),
})

const blankBrand = () => ({
  id: uid(), name: '', website: '', supplierContact: '',
  phone: '', orderUrl: '', notes: '', createdAt: now(),
})

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const parseJSON = (text) => {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return null
  }
}

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
  pill: (active) => ({
    fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 600,
    padding: '6px 18px', borderRadius: 20,
    border: active ? '1px solid #c9a96e' : '1px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.12)' : 'transparent',
    color: active ? '#c9a96e' : '#7a786f', cursor: 'pointer', transition: 'all 0.15s',
  }),
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

function SlideDrawer({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 540,
        background: '#161614', borderLeft: '1px solid #2a2a26', zIndex: 1200,
        overflowY: 'auto', padding: '28px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e8e6df' }}>{title}</span>
          <button onClick={onClose} style={S.btnSm('#7a786f')}>Close</button>
        </div>
        {children}
      </div>
    </>
  )
}

// ─── Ink Library Tab ──────────────────────────────────────────────────────────
function InkLibraryTab({ inks, setInks, brands, palettes, setBrands, setPalettes, showToast }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(() => blankInk(brands))
  const [brandsDrawerOpen, setBrandsDrawerOpen] = useState(false)
  const [palettesDrawerOpen, setPalettesDrawerOpen] = useState(false)

  const brandNames = brands.map((b) => b.name)

  const saveInks = (updated, changedInk) => {
    setInks(updated)
    localStorage.setItem('macri_colorlab_inks', JSON.stringify(updated))
    if (changedInk) inksService.saveRecord(changedInk)
  }

  const filtered = inks.filter((ink) => {
    if (inStockOnly && !ink.inStock) return false
    if (activeFilter !== 'All' && ink.brand !== activeFilter) return false
    return true
  })

  const usageCount = (inkId) => palettes.filter((p) => (p.inkIds || []).includes(inkId)).length

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}) }
    else { setExpanded(id); setEditDraft({ ...inks.find((i) => i.id === id) }) }
  }

  const saveEdit = (id) => {
    saveInks(inks.map((i) => (i.id === id ? { ...editDraft } : i)), editDraft)
    setExpanded(null); setEditDraft({})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      inksService.deleteRecord(id)
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
    const newInk = { ...form, id: uid(), createdAt: now() }
    saveInks([newInk, ...inks], newInk)
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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button style={S.btnSm('#7a786f')} onClick={() => setBrandsDrawerOpen(true)}>Brands</button>
          <button style={S.btnSm('#7a786f')} onClick={() => setPalettesDrawerOpen(true)}>Palettes</button>
          <button style={S.btn} onClick={() => { setForm(blankInk(brands)); setShowModal(true) }}>+ Add Ink</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {inks.length === 0 ? 'No inks yet. Add your first ink above.' : 'No inks match this filter.'}
        </p>
      )}

      {filtered.map((ink) => {
        const isExpanded = expanded === ink.id
        const count = usageCount(ink.id)
        return (
          <div key={ink.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(ink.id)}>
              <Swatch hex={ink.colorHex} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...S.rowText, fontWeight: 500 }}>{ink.name}</div>
                {ink.lastUsed && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', marginTop: 2 }}>
                    Last used {formatDate(ink.lastUsed)}
                  </div>
                )}
              </div>
              <span style={S.badge('#c9a96e')}>{ink.brand || 'No Brand'}</span>
              <span style={S.badge('#7a786f')}>{ink.colorFamily}</span>
              {count > 0 && <span style={S.badge('#c9a96e')}>{count} {count === 1 ? 'palette' : 'palettes'}</span>}
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

      <SlideDrawer open={brandsDrawerOpen} onClose={() => setBrandsDrawerOpen(false)} title="Brands">
        <BrandsTab brands={brands} setBrands={setBrands} inks={inks} />
      </SlideDrawer>

      <SlideDrawer open={palettesDrawerOpen} onClose={() => setPalettesDrawerOpen(false)} title="Palettes">
        <PalettesTab palettes={palettes} setPalettes={setPalettes} inks={inks} showToast={showToast} />
      </SlideDrawer>
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

  const savePalettes = (updated, changedPalette) => {
    setPalettes(updated)
    localStorage.setItem('macri_colorlab_palettes', JSON.stringify(updated))
    if (changedPalette) palettesService.saveRecord(changedPalette)
  }

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}); setAddingInks(false) }
    else { setExpanded(id); setEditDraft({ ...palettes.find((p) => p.id === id) }); setAddingInks(false) }
  }

  const saveEdit = (id) => {
    savePalettes(palettes.map((p) => (p.id === id ? { ...editDraft } : p)), editDraft)
    setExpanded(null); setEditDraft({}); setAddingInks(false)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      palettesService.deleteRecord(id)
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
    const newPalette = { ...form, id: uid(), createdAt: now() }
    savePalettes([newPalette, ...palettes], newPalette)
    setForm(blankPalette()); setShowModal(false)
  }

  const toggleInkInDraft = (inkId) => {
    const d = editDraft
    const has = (d.inkIds || []).includes(inkId)
    setEditDraft({ ...d, inkIds: has ? d.inkIds.filter((id) => id !== inkId) : [...(d.inkIds || []), inkId] })
  }

  const sendToSessionPrep = async (inkIds) => {
    const paletteInks = inkIds.map((id) => inks.find((i) => i.id === id)).filter(Boolean)
    if (paletteInks.length === 0) { showToast('No inks in this palette'); return }
    const existing = await sessionPrepService.loadAll()
    const nextOrder = existing.length
    const newItems = paletteInks.map((ink, idx) => ({ id: uid(), text: ink.name, checked: false, sortOrder: nextOrder + idx }))
    const raw = localStorage.getItem('macri_session_prep')
    let data = { items: [] }
    try { data = raw ? JSON.parse(raw) : { items: [] } } catch {}
    if (!Array.isArray(data.items)) data.items = []
    data.items = [...data.items, ...newItems]
    localStorage.setItem('macri_session_prep', JSON.stringify(data))
    newItems.forEach((item) => sessionPrepService.saveRecord(item))
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
        const paletteInks = (palette.inkIds || []).map((id) => inks.find((i) => i.id === id)).filter(Boolean)
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

  const saveBrands = (updated, changedBrand) => {
    setBrands(updated)
    localStorage.setItem('macri_colorlab_brands', JSON.stringify(updated))
    if (changedBrand) brandsService.saveRecord(changedBrand)
  }

  const colorCount = (name) => inks.filter((i) => i.brand === name).length

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); setEditDraft({}) }
    else { setExpanded(id); setEditDraft({ ...brands.find((b) => b.id === id) }) }
  }

  const saveEdit = (id) => {
    saveBrands(brands.map((b) => (b.id === id ? { ...editDraft } : b)), editDraft)
    setExpanded(null); setEditDraft({})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      brandsService.deleteRecord(id)
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
    const newBrand = { ...form, id: uid(), createdAt: now() }
    saveBrands([newBrand, ...brands], newBrand)
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
function AnalyzeTab({ inks, palettes, setPalettes, showToast, onSendToMixingLab }) {
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [cameraState, setCameraState] = useState('idle')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [paletteName, setPaletteName] = useState('')
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const captureCanvasRef = useRef(null)

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => () => stopStream(), [])

  const handleFileChange = (file) => {
    if (!file) return
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') return
    setImageMime(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImageBase64(e.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
    setResult(null)
    setCameraState('idle')
    stopStream()
  }

  const handleUseCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraState('streaming')
      setImagePreview(null)
      setImageBase64(null)
      setResult(null)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 50)
    } catch {
      showToast('Camera permission denied. Use Upload Image instead.')
    }
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = captureCanvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setImagePreview(dataUrl)
    setImageBase64(dataUrl.split(',')[1])
    setImageMime('image/jpeg')
    setCameraState('captured')
    stopStream()
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const clearImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setResult(null)
    setCameraState('idle')
    stopStream()
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const handleAnalyze = async () => {
    if (!imageBase64 || analyzing) return
    setAnalyzing(true)
    setResult(null)
    try {
      const inkList = inks.map((i) => `${i.name} | ${i.brand} | ${i.colorHex} | ${i.colorFamily} | ${i.inStock ? 'In Stock' : 'Out of Stock'}`).join('\n')
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
          max_tokens: 2000,
          system: 'You are a professional tattoo ink color consultant for Saul Gutierrez, a tattoo artist in Elk Grove CA. You specialize in color matching between artwork and physical ink collections. Analyze the uploaded design image and identify every distinct color region. For each region recommend the best matching ink from Saul\'s owned collection. If no owned ink matches within acceptable range suggest a mixing recipe using only inks he owns with ratios written as X parts to Y parts. Describe every color in plain language. Warn when two recommended inks may look similar to someone with color vision differences. Use zero hyphens or dashes. Write all ranges as X to Y.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
              {
                type: 'text',
                text: `Here is my ink library:\n${inkList || 'No inks in library yet.'}\n\nAnalyze this design and for each color region return a JSON array with this exact shape and nothing else:\n[\n  {\n    "region": "string describing the color area",\n    "targetHex": "#hexcode",\n    "recommendedInk": "exact ink name from library or null",\n    "matchConfidence": "high or medium or low",\n    "mixingRecipe": "X parts InkA to Y parts InkB or null",\n    "warning": "string or null"\n  }\n]\nReturn only the JSON array. No other text before or after.`,
              },
            ],
          }],
        }),
      })
      if (!res.ok) throw new Error('api')
      const data = await res.json()
      const parsed = parseJSON(data.content[0].text)
      setResult(parsed || [])
    } catch {
      showToast('Analysis failed. Please try again.')
    }
    setAnalyzing(false)
  }

  const handleSendToMixingLab = () => {
    if (!result) return
    const targets = result.filter((r) => r.mixingRecipe).map((r) => ({
      targetHex: r.targetHex,
      region: r.region,
      recipe: r.mixingRecipe,
    }))
    if (targets.length === 0) { showToast('No mixing recipes in this analysis'); return }
    onSendToMixingLab(targets)
  }

  const handleSavePalette = () => {
    if (!paletteName.trim() || !result) return
    const matched = result
      .filter((r) => r.recommendedInk)
      .map((r) => inks.find((i) => i.name.toLowerCase() === r.recommendedInk.toLowerCase()))
      .filter(Boolean)
    const recipes = result
      .filter((r) => r.mixingRecipe)
      .map((r) => ({ targetHex: r.targetHex, region: r.region, recipe: r.mixingRecipe, inkIds: [] }))
    const newPalette = {
      id: uid(),
      name: paletteName.trim(),
      sessionId: null,
      inkIds: matched.map((i) => i.id),
      mixingRecipes: recipes,
      createdAt: now(),
    }
    setPalettes((prev) => [newPalette, ...prev])
    palettesService.saveRecord(newPalette)
    setShowSaveModal(false)
    setPaletteName('')
    showToast('Palette saved')
  }

  const handleAddToSessionPrep = async () => {
    if (!result) return
    const inkNames = result.filter((r) => r.recommendedInk).map((r) => r.recommendedInk)
    const matched = inks.filter((ink) => inkNames.some((n) => n.toLowerCase() === ink.name.toLowerCase()))
    if (matched.length === 0) { showToast('No inks matched in your library'); return }
    const existing = await sessionPrepService.loadAll()
    const nextOrder = existing.length
    const newItems = matched.map((ink, idx) => ({ id: uid(), text: ink.name, checked: false, sortOrder: nextOrder + idx }))
    const raw = localStorage.getItem('macri_session_prep')
    let data = { items: [] }
    try { data = raw ? JSON.parse(raw) : { items: [] } } catch {}
    if (!Array.isArray(data.items)) data.items = []
    data.items = [...data.items, ...newItems]
    localStorage.setItem('macri_session_prep', JSON.stringify(data))
    newItems.forEach((item) => sessionPrepService.saveRecord(item))
    showToast('Inks added to Session Prep')
  }

  const confidenceColor = (c) => c === 'high' ? '#7aab8f' : c === 'medium' ? '#c9a96e' : '#f09595'

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
        <button
          style={S.btn}
          onClick={handleUseCamera}
          disabled={cameraState === 'streaming'}
        >
          Use Camera
        </button>
        <button style={S.btn} onClick={() => fileInputRef.current?.click()}>
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files[0])}
        />
      </div>

      {cameraState === 'streaming' && (
        <div style={{ marginBottom: 16 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 12, border: '1px solid #2a2a26', background: '#000', maxHeight: 360 }}
          />
          <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button style={{ ...S.btn, flex: 1 }} onClick={handleCapture}>Capture Photo</button>
            <button style={S.btnSm('#7a786f')} onClick={clearImage}>Cancel</button>
          </div>
        </div>
      )}

      {imagePreview && cameraState !== 'streaming' && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <img
            src={imagePreview}
            alt="Design preview"
            style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12, border: '1px solid #2a2a26', background: '#161614' }}
          />
          <button
            style={{ ...S.btnSm('#7a786f'), position: 'absolute', top: 10, right: 10 }}
            onClick={clearImage}
          >
            Clear
          </button>
        </div>
      )}

      <button
        style={{
          ...S.btn, width: '100%', marginBottom: 24,
          opacity: imageBase64 && !analyzing ? 1 : 0.4,
          cursor: imageBase64 && !analyzing ? 'pointer' : 'not-allowed',
          fontSize: 14, padding: '12px 20px',
        }}
        onClick={handleAnalyze}
        disabled={!imageBase64 || analyzing}
      >
        {analyzing ? 'Analyzing your design...' : 'Analyze Design'}
      </button>

      {result && Array.isArray(result) && result.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {result.map((r, i) => (
              <div key={i} style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.targetHex, border: '1px solid #2a2a26', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#e8e6df', flex: 1, minWidth: 0 }}>{r.region}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: `${confidenceColor(r.matchConfidence)}18`,
                    color: confidenceColor(r.matchConfidence),
                    border: `1px solid ${confidenceColor(r.matchConfidence)}33`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {r.matchConfidence}
                  </span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: r.recommendedInk ? '#c9a96e' : '#7a786f', marginBottom: r.mixingRecipe ? 10 : 0 }}>
                  {r.recommendedInk || 'No direct match'}
                </div>
                {r.mixingRecipe && (
                  <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 8, padding: '8px 12px', marginBottom: r.warning ? 8 : 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Mixing Recipe</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#e8e6df' }}>{r.mixingRecipe}</div>
                  </div>
                )}
                {r.warning && (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#f09595', marginTop: 8 }}>{r.warning}</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={S.btnSm('#c9a96e')} onClick={handleSendToMixingLab}>Send to Mixing Lab</button>
            <button style={S.btnSm('#c9a96e')} onClick={() => setShowSaveModal(true)}>Save as Palette</button>
            <button style={S.btnSm('#7aab8f')} onClick={handleAddToSessionPrep}>Add to Session Prep</button>
          </div>
        </>
      )}

      {result && Array.isArray(result) && result.length === 0 && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>No color regions detected. Try a clearer image.</p>
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

// ─── Witness Tab ──────────────────────────────────────────────────────────────
function WitnessTab({ inks, setInks, showToast }) {
  const [cameraOn, setCameraOn] = useState(false)
  const [useFileMode, setUseFileMode] = useState(false)
  const [pending, setPending] = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
  }, [])

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    return dataUrl.split(',')[1]
  }

  const detectInks = async () => {
    const frame = captureFrame()
    if (!frame) return
    try {
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
          max_tokens: 200,
          system: 'You are an ink bottle label reader. Look at the image and identify any visible tattoo ink bottle labels. For each label you can read extract the brand name and ink color name. Return only a JSON array: [{"brand":"string","name":"string"}] If no labels are visible return an empty array. Return only JSON.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } },
              { type: 'text', text: 'Identify any tattoo ink bottle labels visible in this image.' },
            ],
          }],
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      const detected = parseJSON(data.content[0].text)
      if (!Array.isArray(detected) || detected.length === 0) return
      setPending((prev) => {
        let updated = [...prev]
        let added = 0
        for (const item of detected) {
          const inLibrary = inks.some(
            (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.brand.toLowerCase() === item.brand.toLowerCase()
          )
          const inPending = updated.some(
            (p) => p.name.toLowerCase() === item.name.toLowerCase() && p.brand.toLowerCase() === item.brand.toLowerCase()
          )
          if (!inLibrary && !inPending) {
            updated.push({ id: uid(), name: item.name, brand: item.brand })
            added++
          }
        }
        if (added > 0) setSessionCount((c) => c + added)
        return updated
      })
    } catch {}
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOn(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 50)
      intervalRef.current = setInterval(detectInks, 2000)
    } catch {
      setUseFileMode(true)
    }
  }

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const handleFileWitness = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      try {
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
            max_tokens: 200,
            system: 'You are an ink bottle label reader. Look at the image and identify any visible tattoo ink bottle labels. For each label you can read extract the brand name and ink color name. Return only a JSON array: [{"brand":"string","name":"string"}] If no labels are visible return an empty array. Return only JSON.',
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
                { type: 'text', text: 'Identify any tattoo ink bottle labels visible in this image.' },
              ],
            }],
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        const detected = parseJSON(data.content[0].text)
        if (!Array.isArray(detected) || detected.length === 0) { showToast('No labels detected'); return }
        setPending((prev) => {
          let updated = [...prev]
          let added = 0
          for (const item of detected) {
            const inLibrary = inks.some(
              (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.brand.toLowerCase() === item.brand.toLowerCase()
            )
            const inPending = updated.some(
              (p) => p.name.toLowerCase() === item.name.toLowerCase() && p.brand.toLowerCase() === item.brand.toLowerCase()
            )
            if (!inLibrary && !inPending) { updated.push({ id: uid(), name: item.name, brand: item.brand }); added++ }
          }
          if (added > 0) setSessionCount((c) => c + added)
          return updated
        })
      } catch { showToast('Detection failed. Try again.') }
    }
    reader.readAsDataURL(file)
  }

  const confirmBatch = () => {
    if (pending.length === 0) return
    const newInks = pending.map((p) => ({
      id: uid(), name: p.name, brand: p.brand,
      colorHex: '#888888', colorFamily: 'Other',
      inStock: true, lastUsed: null, notes: '', createdAt: now(),
    }))
    setInks((prev) => [...newInks, ...prev])
    newInks.forEach((ink) => inksService.saveRecord(ink))
    showToast(`${pending.length} ${pending.length === 1 ? 'ink' : 'inks'} added to your library`)
    setPending([])
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{
        background: 'rgba(201,169,110,0.08)', border: '1px solid #c9a96e33',
        borderRadius: 8, padding: '8px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#c9a96e' }}>
          {sessionCount} {sessionCount === 1 ? 'ink' : 'inks'} detected this session
        </span>
      </div>

      {!cameraOn && !useFileMode && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button style={S.btn} onClick={startCamera}>Start Camera</button>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', marginTop: 10 }}>
            Point at your ink bottles. Labels are read automatically every 2 seconds.
          </p>
        </div>
      )}

      {useFileMode && !cameraOn && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', marginBottom: 12 }}>
            Camera unavailable. Upload a photo of your ink bottles to identify labels.
          </p>
          <label style={{ ...S.btn, display: 'inline-block', cursor: 'pointer' }}>
            Upload Photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileWitness(e.target.files[0])} />
          </label>
        </div>
      )}

      {cameraOn && (
        <div style={{ marginBottom: 20 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 12, border: '1px solid #2a2a26', background: '#000', maxHeight: 400 }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button style={S.btnSm('#f09595')} onClick={stopCamera}>Stop Camera</button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ ...S.label, display: 'block', marginBottom: 8 }}>Newly Detected Inks</span>
          <div style={{ border: '1px solid #2a2a26', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            {pending.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #2a2a2620' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', border: '1px solid #7aab8f33', background: '#7aab8f11', color: '#7aab8f', borderRadius: 4 }}>New</span>
                <span style={{ ...S.rowText, fontSize: 13 }}>{p.name}</span>
                <span style={S.rowMuted}>{p.brand}</span>
                <button
                  style={{ ...S.btnSm('#f09595'), marginLeft: 'auto' }}
                  onClick={() => setPending(pending.filter((x) => x.id !== p.id))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button style={{ ...S.btn, width: '100%' }} onClick={confirmBatch}>
            Confirm Batch ({pending.length} {pending.length === 1 ? 'ink' : 'inks'})
          </button>
        </div>
      )}

      {cameraOn && pending.length === 0 && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', textAlign: 'center', marginTop: 16 }}>
          Point at ink bottle labels. New inks will appear here automatically.
        </p>
      )}
    </div>
  )
}

// ─── Mixing Lab Tab ───────────────────────────────────────────────────────────
function MixingLabTab({ inks, palettes, setPalettes, showToast, mixingTargets }) {
  const [mode, setMode] = useState('manual')
  const [targetHex, setTargetHex] = useState('#c9a96e')
  const [targetHexInput, setTargetHexInput] = useState('#c9a96e')
  const [calculating, setCalculating] = useState(false)
  const [recipes, setRecipes] = useState([])

  const handleHexInput = (val) => {
    setTargetHexInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setTargetHex(val)
  }

  const handleColorPicker = (val) => {
    setTargetHex(val)
    setTargetHexInput(val)
  }

  const handleCalculate = async () => {
    if (calculating) return
    setCalculating(true)
    try {
      const inStockInks = inks.filter((i) => i.inStock)
      const inkList = inStockInks.map((i) => `${i.name} | ${i.brand} | ${i.colorHex}`).join('\n')
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
          max_tokens: 500,
          system: 'You are a tattoo ink mixing expert. Given a target hex color and a list of available inks with their hex codes calculate the best mixing recipe to achieve the target using only the available inks. Provide ratios written as X parts to Y parts. Explain in plain language. If the target cannot be closely achieved say so and suggest the nearest achievable mix. Use zero hyphens or dashes. Write all ranges as X to Y.',
          messages: [{
            role: 'user',
            content: `Target hex: ${targetHex}. Available inks:\n${inkList || 'No inks in stock.'}\n\nCalculate the best mixing recipe.`,
          }],
        }),
      })
      if (!res.ok) throw new Error('api')
      const data = await res.json()
      setRecipes((prev) => [{ id: uid(), targetHex, recipeText: data.content[0].text }, ...prev])
    } catch {
      showToast('Calculation failed. Please try again.')
    }
    setCalculating(false)
  }

  const saveRecipe = (recipe) => {
    const newPalette = {
      id: uid(),
      name: `Mix Recipe ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      sessionId: null,
      inkIds: [],
      mixingRecipes: [{ targetHex: recipe.targetHex, region: 'Manual Mix', recipe: recipe.recipeText, inkIds: [] }],
      createdAt: now(),
    }
    setPalettes((prev) => [newPalette, ...prev])
    palettesService.saveRecord(newPalette)
    showToast('Recipe saved to Palettes')
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={S.pill(mode === 'manual')} onClick={() => setMode('manual')}>Manual Target</button>
        <button style={S.pill(mode === 'analysis')} onClick={() => setMode('analysis')}>From Analysis</button>
      </div>

      {mode === 'manual' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 14 }}>
            <div style={S.field}>
              <span style={S.label}>Pick Target Hue</span>
              <input
                type="color"
                style={{ ...S.input, padding: 4, height: 44, width: 80, cursor: 'pointer' }}
                value={targetHex}
                onChange={(e) => handleColorPicker(e.target.value)}
              />
            </div>
            <div style={{ ...S.field, flex: 1 }}>
              <span style={S.label}>Target Hex</span>
              <input
                type="text"
                style={S.input}
                value={targetHexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#c9a96e"
                maxLength={7}
              />
            </div>
          </div>
          <button
            style={{ ...S.btn, width: '100%', opacity: calculating ? 0.5 : 1 }}
            onClick={handleCalculate}
            disabled={calculating}
          >
            {calculating ? 'Calculating...' : 'Calculate Recipe'}
          </button>
        </div>
      )}

      {mode === 'analysis' && (
        <div style={{ marginBottom: 24 }}>
          {mixingTargets.length === 0 ? (
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7a786f' }}>
              No targets from analysis yet. Run Analyze first.
            </p>
          ) : (
            mixingTargets.map((t, i) => (
              <div key={i} style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.targetHex, border: '1px solid #2a2a26', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#e8e6df' }}>{t.region}</span>
                </div>
                <div style={{ background: '#1e1e1b', border: '1px solid #2a2a26', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#7a786f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recipe</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#e8e6df' }}>{t.recipe}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {recipes.length > 0 && (
        <div>
          <span style={{ ...S.label, display: 'block', marginBottom: 12 }}>Calculated Recipes</span>
          {recipes.map((recipe) => (
            <div key={recipe.id} style={{ background: '#161614', border: '1px solid #2a2a26', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: recipe.targetHex, border: '1px solid #2a2a26', flexShrink: 0 }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f' }}>{recipe.targetHex}</span>
              </div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8e6df', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>
                {recipe.recipeText}
              </p>
              <button style={S.btnSm('#c9a96e')} onClick={() => saveRecipe(recipe)}>Save Recipe</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ColorLab (root) ──────────────────────────────────────────────────────────
export default function ColorLab() {
  const [activeTab, setActiveTab] = useState('analyze')
  const [inks, setInks] = useState([])
  const [palettes, setPalettes] = useState([])
  const [brands, setBrands] = useState([])
  const [toast, setToast] = useState(null)
  const [mixingTargets, setMixingTargets] = useState([])

  useEffect(() => {
    async function init() {
      let [b, i, p] = await Promise.all([brandsService.loadAll(), inksService.loadAll(), palettesService.loadAll()])
      if (!b.length) {
        b = SEED_BRANDS
        localStorage.setItem('macri_colorlab_brands', JSON.stringify(b))
        b.forEach((brand) => brandsService.saveRecord(brand))
      }
      setBrands(b)
      setInks(i)
      setPalettes(p)
    }
    init()
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
          { key: 'analyze', label: 'Analyze' },
          { key: 'witness', label: 'Witness' },
          { key: 'mixing', label: 'Mixing Lab' },
          { key: 'inks', label: 'Ink Library' },
        ].map(({ key, label }) => (
          <button key={key} style={S.tab(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {activeTab === 'analyze' && (
        <AnalyzeTab
          inks={inks}
          palettes={palettes}
          setPalettes={setPalettes}
          showToast={showToast}
          onSendToMixingLab={(targets) => { setMixingTargets(targets); setActiveTab('mixing') }}
        />
      )}
      {activeTab === 'witness' && (
        <WitnessTab inks={inks} setInks={setInks} showToast={showToast} />
      )}
      {activeTab === 'mixing' && (
        <MixingLabTab
          inks={inks}
          palettes={palettes}
          setPalettes={setPalettes}
          showToast={showToast}
          mixingTargets={mixingTargets}
        />
      )}
      {activeTab === 'inks' && (
        <InkLibraryTab
          inks={inks}
          setInks={setInks}
          brands={brands}
          palettes={palettes}
          setBrands={setBrands}
          setPalettes={setPalettes}
          showToast={showToast}
        />
      )}
    </div>
  )
}
