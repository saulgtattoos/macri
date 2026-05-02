import { useState, useEffect } from 'react'

// ─── utils ───────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const fmt$ = (n) => `$${Number(n).toFixed(2)}`
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

// ─── seed data ────────────────────────────────────────────────────────────────
const SEED_INVENTORY = [
  { name: 'Black Ink', category: 'Inks', brand: 'Dynamic', supplier: 'Kingpin Tattoo Supply', unitCost: 12, quantity: 8, lowStockThreshold: 2, unit: 'bottle', notes: '' },
  { name: 'Magnum Needles 15M1', category: 'Needles', brand: 'Cheyenne', supplier: 'Kingpin Tattoo Supply', unitCost: 0.85, quantity: 50, lowStockThreshold: 10, unit: 'piece', notes: '' },
  { name: 'Round Liner Needles 5RL', category: 'Needles', brand: 'Cheyenne', supplier: 'Kingpin Tattoo Supply', unitCost: 0.85, quantity: 40, lowStockThreshold: 10, unit: 'piece', notes: '' },
  { name: 'Nitrile Gloves Medium', category: 'Gloves', brand: 'Ammex', supplier: 'Amazon', unitCost: 18, quantity: 3, lowStockThreshold: 2, unit: 'box', notes: '' },
  { name: 'Hustle Butter', category: 'Aftercare', brand: 'Hustle Butter', supplier: 'Amazon', unitCost: 14, quantity: 4, lowStockThreshold: 2, unit: 'bottle', notes: '' },
  { name: 'Stencil Stuff', category: 'Stencil Supplies', brand: 'Stencil Stuff', supplier: 'Kingpin Tattoo Supply', unitCost: 16, quantity: 2, lowStockThreshold: 1, unit: 'bottle', notes: '' },
  { name: 'Ink Caps Small', category: 'Ink Caps', brand: 'Generic', supplier: 'Amazon', unitCost: 8, quantity: 6, lowStockThreshold: 2, unit: 'pack', notes: '' },
  { name: 'Machine Covers', category: 'Machine Covers', brand: 'Generic', supplier: 'Amazon', unitCost: 10, quantity: 5, lowStockThreshold: 2, unit: 'pack', notes: '' },
  { name: 'iPad Covers', category: 'iPad Covers', brand: 'Generic', supplier: 'Amazon', unitCost: 12, quantity: 3, lowStockThreshold: 2, unit: 'pack', notes: '' },
  { name: 'Bottle Covers', category: 'Bottle Covers', brand: 'Generic', supplier: 'Amazon', unitCost: 8, quantity: 4, lowStockThreshold: 2, unit: 'pack', notes: '' },
  { name: 'Sensi Wrap', category: 'Sensi Wrap', brand: 'CoFlex', supplier: 'Amazon', unitCost: 22, quantity: 2, lowStockThreshold: 1, unit: 'pack', notes: '' },
  { name: 'Painters Tape 1 inch', category: 'Tape', brand: '3M', supplier: 'Amazon', unitCost: 6, quantity: 3, lowStockThreshold: 2, unit: 'roll', notes: '' },
  { name: 'Painters Tape 2 inch', category: 'Tape', brand: '3M', supplier: 'Amazon', unitCost: 8, quantity: 3, lowStockThreshold: 2, unit: 'roll', notes: '' },
  { name: 'Scotch Tape', category: 'Tape', brand: 'Scotch', supplier: 'Amazon', unitCost: 4, quantity: 4, lowStockThreshold: 2, unit: 'roll', notes: '' },
].map((item) => ({ ...item, id: uid(), createdAt: now() }))

const CATEGORIES = [
  'Inks', 'Needles', 'Gloves', 'Aftercare', 'Stencil Supplies',
  'Ink Caps', 'Machine Covers', 'iPad Covers', 'Bottle Covers',
  'Sensi Wrap', 'Tape', 'Other',
]

const UNITS = ['box', 'bottle', 'pack', 'piece', 'roll', 'sheet']

const CART_STATUSES = ['to-order', 'ordered', 'purchased']

// ─── blank forms ──────────────────────────────────────────────────────────────
const blankInventory = () => ({
  id: uid(),
  name: '',
  category: 'Inks',
  brand: '',
  supplier: '',
  unitCost: '',
  quantity: '',
  lowStockThreshold: 2,
  unit: 'bottle',
  notes: '',
  createdAt: now(),
})

const blankCart = () => ({
  id: uid(),
  name: '',
  brand: '',
  quantityNeeded: '',
  estimatedCost: '',
  whereToBuy: '',
  inventoryItemId: null,
  status: 'to-order',
  purchasedAt: null,
  createdAt: now(),
})

// ─── category badge colors ────────────────────────────────────────────────────
const catColor = (cat) => {
  const map = {
    Inks: '#c9a96e',
    Needles: '#7aab8f',
    Gloves: '#9e86c8',
    Aftercare: '#7ab8d0',
    'Stencil Supplies': '#d08f7a',
    'Ink Caps': '#c9a96e',
    'Machine Covers': '#7a786f',
    'iPad Covers': '#7a786f',
    'Bottle Covers': '#7a786f',
    'Sensi Wrap': '#b07ab8',
    Tape: '#7ab8d0',
    Other: '#7a786f',
  }
  return map[cat] || '#7a786f'
}

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
  subtitle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#7a786f',
    marginTop: 4,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginTop: 28,
    marginBottom: 20,
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
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1px solid #2a2a26',
    background: '#1e1e1b',
    color: '#e8e6df',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
}

// ─── InventoryTab ─────────────────────────────────────────────────────────────
function InventoryTab({ inventory, setInventory, cart, setCart }) {
  const [activeCat, setActiveCat] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankInventory())
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editDraft, setEditDraft] = useState({})

  const filtered = activeCat === 'All' ? inventory : inventory.filter((i) => i.category === activeCat)

  const isLow = (item) => item.quantity <= item.lowStockThreshold

  // ensure low stock items appear in cart
  const syncLowStockToCart = (inv, crt) => {
    let updated = [...crt]
    inv.forEach((item) => {
      if (item.quantity <= item.lowStockThreshold) {
        const exists = updated.some((c) => c.inventoryItemId === item.id && c.status !== 'purchased')
        if (!exists) {
          updated.push({
            ...blankCart(),
            name: item.name,
            brand: item.brand,
            quantityNeeded: item.lowStockThreshold * 2 || 2,
            estimatedCost: item.unitCost * (item.lowStockThreshold * 2 || 2),
            whereToBuy: item.supplier,
            inventoryItemId: item.id,
            status: 'to-order',
          })
        }
      }
    })
    return updated
  }

  const saveInventory = (updated) => {
    const newCart = syncLowStockToCart(updated, cart)
    setInventory(updated)
    setCart(newCart)
    localStorage.setItem('macri_inventory', JSON.stringify(updated))
    localStorage.setItem('macri_cart', JSON.stringify(newCart))
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    const item = { ...form, id: uid(), createdAt: now() }
    saveInventory([item, ...inventory])
    setForm(blankInventory())
    setShowModal(false)
  }

  const adjustQty = (e, id, delta) => {
    e.stopPropagation()
    const updated = inventory.map((i) =>
      i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
    )
    saveInventory(updated)
  }

  const toggleExpand = (id) => {
    if (expanded === id) {
      setExpanded(null)
      setEditDraft({})
    } else {
      setExpanded(id)
      const item = inventory.find((i) => i.id === id)
      setEditDraft({ ...item })
    }
  }

  const saveEdit = (id) => {
    const updated = inventory.map((i) => (i.id === id ? { ...editDraft } : i))
    saveInventory(updated)
    setExpanded(null)
    setEditDraft({})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      saveInventory(inventory.filter((i) => i.id !== id))
      setConfirmDelete(null)
      if (expanded === id) setExpanded(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div>
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['All', ...CATEGORIES].map((cat) => (
            <button key={cat} style={S.chip(activeCat === cat)} onClick={() => setActiveCat(cat)}>
              {cat}
            </button>
          ))}
        </div>
        <button style={S.btn} onClick={() => { setForm(blankInventory()); setShowModal(true) }}>
          + Add Item
        </button>
      </div>

      {/* item list */}
      {filtered.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No items in this category.</p>
      )}
      {filtered.map((item) => {
        const low = isLow(item)
        const isExpanded = expanded === item.id
        const draft = editDraft

        return (
          <div key={item.id} style={S.row(isExpanded)}>
            <div style={S.rowMain} onClick={() => toggleExpand(item.id)}>
              {/* name */}
              <span style={{ ...S.rowText, fontWeight: 500 }}>{item.name}</span>

              {/* category badge */}
              <span style={S.badge(catColor(item.category))}>{item.category}</span>

              {/* brand */}
              <span style={{ ...S.rowMuted, display: 'none', '@media (min-width: 600px)': { display: 'inline' } }}>
                {item.brand}
              </span>

              {/* quantity controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button style={S.qtyBtn} onClick={(e) => adjustQty(e, item.id, -1)}>−</button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, minWidth: 40, textAlign: 'center' }}>
                  {item.quantity} {item.unit}
                </span>
                <button style={S.qtyBtn} onClick={(e) => adjustQty(e, item.id, 1)}>+</button>
              </div>

              {/* unit cost */}
              <span style={S.rowMuted}>{fmt$(item.unitCost)}</span>

              {/* low stock badge */}
              {low && <span style={S.badge('#f09595')}>Low Stock</span>}

              {/* delete */}
              <button
                style={confirmDelete === item.id ? S.btnDanger : { ...S.btnSm('#7a786f'), border: 'none', background: 'transparent' }}
                onClick={(e) => handleDelete(e, item.id)}
              >
                {confirmDelete === item.id ? 'Confirm' : '✕'}
              </button>
            </div>

            {/* expanded detail + inline edit */}
            {isExpanded && (
              <div style={S.expandPanel}>
                {[
                  { key: 'name', label: 'Name', type: 'text' },
                  { key: 'brand', label: 'Brand', type: 'text' },
                  { key: 'supplier', label: 'Supplier', type: 'text' },
                  { key: 'unitCost', label: 'Unit Cost', type: 'number' },
                  { key: 'quantity', label: 'Quantity', type: 'number' },
                  { key: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key} style={S.field}>
                    <span style={S.label}>{label}</span>
                    <input
                      type={type}
                      style={S.input}
                      value={draft[key] ?? ''}
                      onChange={(e) => setEditDraft({ ...draft, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    />
                  </div>
                ))}

                <div style={S.field}>
                  <span style={S.label}>Category</span>
                  <select style={S.select} value={draft.category ?? ''} onChange={(e) => setEditDraft({ ...draft, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div style={S.field}>
                  <span style={S.label}>Unit</span>
                  <select style={S.select} value={draft.unit ?? ''} onChange={(e) => setEditDraft({ ...draft, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>

                <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                  <span style={S.label}>Notes</span>
                  <input type="text" style={S.input} value={draft.notes ?? ''} onChange={(e) => setEditDraft({ ...draft, notes: e.target.value })} />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={S.btnSm('#7a786f')} onClick={() => { setExpanded(null); setEditDraft({}) }}>Cancel</button>
                  <button style={S.btn} onClick={() => saveEdit(item.id)}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* add item modal */}
      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Inventory Item</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'brand', label: 'Brand', type: 'text' },
                { key: 'supplier', label: 'Supplier', type: 'text' },
                { key: 'unitCost', label: 'Unit Cost', type: 'number' },
                { key: 'quantity', label: 'Starting Quantity', type: 'number' },
                { key: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key} style={S.field}>
                  <span style={S.label}>{label}</span>
                  <input
                    type={type}
                    style={S.input}
                    value={form[key]}
                    placeholder={key === 'lowStockThreshold' ? '2' : ''}
                    onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  />
                </div>
              ))}

              <div style={S.field}>
                <span style={S.label}>Category</span>
                <select style={S.select} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div style={S.field}>
                <span style={S.label}>Unit</span>
                <select style={S.select} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>

              <div style={{ ...S.field, gridColumn: '1 / -1' }}>
                <span style={S.label}>Notes</span>
                <input type="text" style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CartTab ──────────────────────────────────────────────────────────────────
function CartTab({ cart, setCart, inventory, setInventory }) {
  const [activeStatus, setActiveStatus] = useState('to-order')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(blankCart())

  const saveCart = (updated) => {
    setCart(updated)
    localStorage.setItem('macri_cart', JSON.stringify(updated))
  }

  const saveInventory = (updated) => {
    setInventory(updated)
    localStorage.setItem('macri_inventory', JSON.stringify(updated))
  }

  const handleAdd = () => {
    if (!form.name.trim()) return
    saveCart([{ ...form, id: uid(), createdAt: now() }, ...cart])
    setForm(blankCart())
    setShowModal(false)
  }

  const markOrdered = (id) => {
    saveCart(cart.map((c) => c.id === id ? { ...c, status: 'ordered' } : c))
  }

  const markPurchased = (id) => {
    const item = cart.find((c) => c.id === id)
    if (!item) return
    const updated = cart.map((c) => c.id === id ? { ...c, status: 'purchased', purchasedAt: now() } : c)
    saveCart(updated)

    // increment inventory quantity if linked
    if (item.inventoryItemId) {
      const updatedInv = inventory.map((inv) =>
        inv.id === item.inventoryItemId
          ? { ...inv, quantity: inv.quantity + (item.quantityNeeded || 0) }
          : inv
      )
      saveInventory(updatedInv)
    }
  }

  const removeItem = (id) => {
    saveCart(cart.filter((c) => c.id !== id))
  }

  const statusLabel = { 'to-order': 'To Order', ordered: 'Ordered', purchased: 'Purchased' }

  const visible = cart
    .filter((c) => c.status === activeStatus)
    .sort((a, b) => {
      if (activeStatus === 'purchased') return new Date(b.purchasedAt) - new Date(a.purchasedAt)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const toOrderCount = cart.filter((c) => c.status === 'to-order').length
  const orderedCount = cart.filter((c) => c.status === 'ordered').length

  return (
    <div>
      {/* sub tab row + add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {CART_STATUSES.map((s) => (
            <button key={s} style={S.chip(activeStatus === s)} onClick={() => setActiveStatus(s)}>
              {statusLabel[s]}
              {s === 'to-order' && toOrderCount > 0 && (
                <span style={{ marginLeft: 6, background: '#f0959533', color: '#f09595', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>
                  {toOrderCount}
                </span>
              )}
              {s === 'ordered' && orderedCount > 0 && (
                <span style={{ marginLeft: 6, background: '#c9a96e33', color: '#c9a96e', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>
                  {orderedCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeStatus !== 'purchased' && (
          <button style={S.btn} onClick={() => { setForm(blankCart()); setShowModal(true) }}>
            + Add Item
          </button>
        )}
      </div>

      {/* cart items */}
      {visible.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {activeStatus === 'purchased' ? 'No purchase history yet.' : 'Nothing here. Good job!'}
        </p>
      )}
      {visible.map((item) => (
        <div key={item.id} style={{ ...S.row(false), cursor: 'default' }}>
          <div style={{ ...S.rowMain, cursor: 'default' }}>
            {/* auto badge */}
            {item.inventoryItemId && (
              <span style={S.badge('#7ab8d0')}>Auto</span>
            )}

            {/* name */}
            <span style={{ ...S.rowText, fontWeight: 500 }}>{item.name}</span>

            {/* brand */}
            {item.brand && <span style={S.rowMuted}>{item.brand}</span>}

            {/* qty needed */}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8e6df' }}>
              qty {item.quantityNeeded}
            </span>

            {/* estimated cost */}
            {item.estimatedCost > 0 && (
              <span style={S.rowMuted}>{fmt$(item.estimatedCost)}</span>
            )}

            {/* where to buy */}
            {item.whereToBuy && (
              <span style={S.badge('#7a786f')}>{item.whereToBuy}</span>
            )}

            {/* purchased date */}
            {item.status === 'purchased' && item.purchasedAt && (
              <span style={{ ...S.rowMuted, fontSize: 10 }}>{fmtDate(item.purchasedAt)}</span>
            )}

            {/* actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {item.status === 'to-order' && (
                <>
                  <button style={S.btnSm('#c9a96e')} onClick={() => markOrdered(item.id)}>Mark Ordered</button>
                  <button style={S.btnDanger} onClick={() => removeItem(item.id)}>Remove</button>
                </>
              )}
              {item.status === 'ordered' && (
                <button style={S.btnSm('#7aab8f')} onClick={() => markPurchased(item.id)}>Mark Purchased</button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* add cart item modal */}
      {showModal && (
        <div style={S.modal} onClick={() => setShowModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={S.modalTitle}>Add Cart Item</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'name', label: 'Item Name', type: 'text' },
                { key: 'brand', label: 'Brand', type: 'text' },
                { key: 'quantityNeeded', label: 'Quantity Needed', type: 'number' },
                { key: 'estimatedCost', label: 'Estimated Cost', type: 'number' },
                { key: 'whereToBuy', label: 'Where to Buy', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} style={S.field}>
                  <span style={S.label}>{label}</span>
                  <input
                    type={type}
                    style={S.input}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btnSm('#7a786f')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleAdd}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Supplies (root) ──────────────────────────────────────────────────────────
export default function Supplies() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [inventory, setInventory] = useState([])
  const [cart, setCart] = useState([])

  // bootstrap from localStorage
  useEffect(() => {
    const storedInv = localStorage.getItem('macri_inventory')
    const storedCart = localStorage.getItem('macri_cart')

    let inv = storedInv ? JSON.parse(storedInv) : null
    if (!inv || inv.length === 0) {
      inv = SEED_INVENTORY
      localStorage.setItem('macri_inventory', JSON.stringify(inv))
    }

    let crt = storedCart ? JSON.parse(storedCart) : []

    // auto-add low stock items to cart on first load
    inv.forEach((item) => {
      if (item.quantity <= item.lowStockThreshold) {
        const exists = crt.some((c) => c.inventoryItemId === item.id && c.status !== 'purchased')
        if (!exists) {
          crt.push({
            ...blankCart(),
            name: item.name,
            brand: item.brand,
            quantityNeeded: item.lowStockThreshold * 2 || 2,
            estimatedCost: item.unitCost * (item.lowStockThreshold * 2 || 2),
            whereToBuy: item.supplier,
            inventoryItemId: item.id,
            status: 'to-order',
          })
        }
      }
    })

    localStorage.setItem('macri_cart', JSON.stringify(crt))
    setInventory(inv)
    setCart(crt)
  }, [])

  const lowStockCount = inventory.filter((i) => i.quantity <= i.lowStockThreshold).length
  const cartCount = cart.filter((c) => c.status === 'to-order').length

  return (
    <div style={S.page}>
      {/* page header */}
      <p style={S.panelLabel}>panel / supplies</p>
      <h1 style={S.h1}>Supplies</h1>
      <p style={S.subtitle}>
        {inventory.length} items in inventory
        {lowStockCount > 0 && (
          <span style={{ marginLeft: 10, color: '#f09595', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            {lowStockCount} low stock
          </span>
        )}
        {cartCount > 0 && (
          <span style={{ marginLeft: 10, color: '#c9a96e', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            {cartCount} to order
          </span>
        )}
      </p>

      {/* main tabs */}
      <div style={S.tabRow}>
        <button style={S.tab(activeTab === 'inventory')} onClick={() => setActiveTab('inventory')}>
          Inventory
        </button>
        <button style={S.tab(activeTab === 'cart')} onClick={() => setActiveTab('cart')}>
          Cart
          {cartCount > 0 && (
            <span style={{ marginLeft: 6, background: '#f0959533', color: '#f09595', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* tab content */}
      {activeTab === 'inventory' ? (
        <InventoryTab
          inventory={inventory}
          setInventory={setInventory}
          cart={cart}
          setCart={setCart}
        />
      ) : (
        <CartTab
          cart={cart}
          setCart={setCart}
          inventory={inventory}
          setInventory={setInventory}
        />
      )}
    </div>
  )
}
