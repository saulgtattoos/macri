import { useState, useEffect, useRef } from 'react'
import { loadClients, saveClients, mkClient } from './CRM'

// ─── Constants ─────────────────────────────────────────────────────────────────

const defaultForm = {
  name: '', phone: '', email: '',
  socialPlatform: 'Instagram', socialHandle: '',
  referralSource: '', firstTimeClient: null,
  concept: '', inspirationNotes: '',
  referenceImages: [],
  isCoverUp: false, coverUpDescription: '',
  isMeaningful: false, meaningStory: '',
  placement: '', size: '',
  style: [], colorProfile: '', orientation: '',
  designNotes: '',
  musicGenre: [], playlist: '', tvShows: '', comfortNotes: '',
  allergies: '', skinConditions: '', medications: '',
  previousReactions: '', medicalClearance: '',
  pricingType: '', estimatedTotal: '', estimatedHours: '',
  sessionEstimateNotes: '',
  depositAmount: '', depositStatus: '',
  consultationDate: '', appointmentDate: '',
  clientTier: 'Deposit Required',
  artistNotes: '',
  projectRating: '',
  strategyNotes: '',
  postSessionDebrief: '',
  placementZones: [],
  tattooCount: '',
  sittingEndurance: '',
  technicalDifficulty: '',
  executionPlan: '',
}

const STEPS = [
  { emoji: '👤', label: 'Client Info' },
  { emoji: '🎨', label: 'The Vision' },
  { emoji: '📐', label: 'Design Details' },
  { emoji: '🎵', label: 'The Experience' },
  { emoji: '🏥', label: 'Health and Skin' },
  { emoji: '💰', label: 'Pricing and Deposit' },
  { emoji: '📋', label: 'Client Summary' },
  { emoji: '🔐', label: 'Artist Vault' },
]

const REFERRAL_OPTIONS   = ['Instagram', 'Google', 'Word of Mouth', 'Existing Client', 'Other']
const SOCIAL_PLATFORMS   = ['Instagram', 'TikTok', 'Facebook']
const STYLE_OPTIONS      = ['Watercolor', 'Black and Gray Realism', 'Sketch Art', 'Abstract', 'Pointillism', 'Other']
const COLOR_OPTIONS      = ['Full Color', 'Limited Color', 'Black and Gray', 'Black and White Only']
const ORIENT_OPTIONS     = ['Vertical', 'Horizontal', 'Wrapping', 'Flexible']
const MUSIC_OPTIONS      = ['Hip Hop', 'Lo-Fi', 'Rock', 'R&B', 'Latin', 'Country', 'Silence', 'Other']
const CLEARANCE_OPTIONS  = ['No Issues', 'Note on File', 'Needs Clearance']
const PRICING_OPTIONS    = ['Hourly', 'Per Session', 'Full Day', 'Shop Minimum']
const DEPOSIT_AMT        = ['$100', '$150', '$200', '$250', 'No Deposit Required']
const DEPOSIT_STATUS     = ['Pending', 'Paid', 'No Deposit Required']
const TIER_OPTIONS       = ['Deposit Required', 'Trusted Client']

const DRAFT_KEY = 'macri_consultation_draft'
const IOS_WAV   = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA=='

const BODY_ZONES = [
  { id: 'Head',                   shape: 'ellipse', cx: 52,  cy: 20,  rx: 19, ry: 19 },
  { id: 'Neck',                   shape: 'rect',    x: 45,   y: 37,   w: 14,  h: 13,  rx: 3 },
  { id: 'Left Shoulder',          shape: 'rect',    x: 14,   y: 41,   w: 28,  h: 20,  rx: 4 },
  { id: 'Right Shoulder',         shape: 'rect',    x: 62,   y: 41,   w: 28,  h: 20,  rx: 4 },
  { id: 'Left Chest',             shape: 'rect',    x: 31,   y: 59,   w: 21,  h: 32,  rx: 3 },
  { id: 'Right Chest',            shape: 'rect',    x: 52,   y: 59,   w: 21,  h: 32,  rx: 3 },
  { id: 'Left Upper Arm',         shape: 'rect',    x: 6,    y: 59,   w: 19,  h: 36,  rx: 4 },
  { id: 'Right Upper Arm',        shape: 'rect',    x: 79,   y: 59,   w: 19,  h: 36,  rx: 4 },
  { id: 'Upper Abdomen',          shape: 'rect',    x: 33,   y: 89,   w: 38,  h: 24,  rx: 3 },
  { id: 'Left Inner Arm',         shape: 'rect',    x: 4,    y: 93,   w: 17,  h: 26,  rx: 3 },
  { id: 'Right Inner Arm',        shape: 'rect',    x: 83,   y: 93,   w: 17,  h: 26,  rx: 3 },
  { id: 'Lower Abdomen',          shape: 'rect',    x: 33,   y: 111,  w: 38,  h: 24,  rx: 3 },
  { id: 'Left Forearm',           shape: 'rect',    x: 2,    y: 117,  w: 15,  h: 26,  rx: 3 },
  { id: 'Right Forearm',          shape: 'rect',    x: 87,   y: 117,  w: 15,  h: 26,  rx: 3 },
  { id: 'Left Hip',               shape: 'rect',    x: 22,   y: 133,  w: 23,  h: 22,  rx: 3 },
  { id: 'Right Hip',              shape: 'rect',    x: 59,   y: 133,  w: 23,  h: 22,  rx: 3 },
  { id: 'Left Hand',              shape: 'rect',    x: 0,    y: 141,  w: 14,  h: 18,  rx: 4 },
  { id: 'Right Hand',             shape: 'rect',    x: 90,   y: 141,  w: 14,  h: 18,  rx: 4 },
  { id: 'Left Upper Thigh',       shape: 'rect',    x: 23,   y: 153,  w: 23,  h: 30,  rx: 3 },
  { id: 'Right Upper Thigh',      shape: 'rect',    x: 58,   y: 153,  w: 23,  h: 30,  rx: 3 },
  { id: 'Left Lower Leg',         shape: 'rect',    x: 25,   y: 181,  w: 20,  h: 28,  rx: 3 },
  { id: 'Right Lower Leg',        shape: 'rect',    x: 59,   y: 181,  w: 20,  h: 28,  rx: 3 },
  { id: 'Left Foot',              shape: 'rect',    x: 22,   y: 207,  w: 22,  h: 14,  rx: 5 },
  { id: 'Right Foot',             shape: 'rect',    x: 61,   y: 207,  w: 22,  h: 14,  rx: 5 },
  { id: 'Upper Back',             shape: 'rect',    x: 143,  y: 56,   w: 30,  h: 28,  rx: 3 },
  { id: 'Mid Back',               shape: 'rect',    x: 143,  y: 82,   w: 30,  h: 26,  rx: 3 },
  { id: 'Lower Back',             shape: 'rect',    x: 143,  y: 106,  w: 30,  h: 22,  rx: 3 },
  { id: 'Left Shoulder Blade',    shape: 'rect',    x: 119,  y: 56,   w: 22,  h: 28,  rx: 3 },
  { id: 'Right Shoulder Blade',   shape: 'rect',    x: 175,  y: 56,   w: 22,  h: 28,  rx: 3 },
  { id: 'Left Glute',             shape: 'rect',    x: 122,  y: 130,  w: 23,  h: 24,  rx: 3 },
  { id: 'Right Glute',            shape: 'rect',    x: 169,  y: 130,  w: 23,  h: 24,  rx: 3 },
  { id: 'Left Upper Thigh Back',  shape: 'rect',    x: 123,  y: 152,  w: 22,  h: 28,  rx: 3 },
  { id: 'Right Upper Thigh Back', shape: 'rect',    x: 169,  y: 152,  w: 22,  h: 28,  rx: 3 },
  { id: 'Left Calf',              shape: 'rect',    x: 124,  y: 178,  w: 20,  h: 26,  rx: 3 },
  { id: 'Right Calf',             shape: 'rect',    x: 168,  y: 178,  w: 20,  h: 26,  rx: 3 },
]

// ─── PillToggle ────────────────────────────────────────────────────────────────

function PillToggle({ options, value, onChange, multi = false }) {
  function handleClick(opt) {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt])
    } else {
      onChange(value === opt ? '' : opt)
    }
  }

  const selected = multi ? (Array.isArray(value) ? value : []) : value

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = multi ? selected.includes(opt) : selected === opt
        return (
          <button
            key={opt}
            onClick={() => handleClick(opt)}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: active ? '1px solid #c9a96e' : '1px solid rgba(122,120,111,0.3)',
              background: active ? '#1e1e1b' : 'transparent',
              color: active ? '#c9a96e' : '#7a786f',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

const LABEL_STYLE = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: '#7a786f',
  marginBottom: 6,
  letterSpacing: '0.04em',
}

const INPUT_STYLE = {
  width: '100%',
  background: '#1e1e1b',
  border: '1px solid #2a2a27',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e8e6df',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span style={LABEL_STYLE}>{label}</span>
      {children}
    </div>
  )
}

// ─── Consultation ──────────────────────────────────────────────────────────────

export default function Consultation() {
  const [formData, setFormData] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY))
      return saved ? { ...defaultForm, ...saved } : defaultForm
    } catch { return defaultForm }
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [nameError, setNameError]     = useState(false)
  const [showDupModal, setShowDupModal] = useState(false)
  const [dupClient, setDupClient]     = useState(null)
  const [estW, setEstW]               = useState('')
  const [estH, setEstH]               = useState('')
  const [estApplied, setEstApplied]   = useState(false)
  const [isDragging, setIsDragging]   = useState(false)
  const [dotPositions, setDotPositions] = useState({})
  const clientWin                     = useRef(null)
  const [clientWinOpen, setClientWinOpen] = useState(false)
  const [estStyle, setEstStyle]           = useState('')
  const imageURLs                         = useRef({})
  const fileInputRef                      = useRef(null)

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
  }, [formData])

  useEffect(() => {
    if (!clientWinOpen) return
    const id = setInterval(() => {
      if (clientWin.current?.closed) setClientWinOpen(false)
    }, 1000)
    return () => clearInterval(id)
  }, [clientWinOpen])

  useEffect(() => {
    return () => {
      Object.values(imageURLs.current).forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  function openClientMode() {
    const win = window.open('/consultation/client', '_blank')
    if (!win) return
    clientWin.current = win
    setClientWinOpen(true)
    try { win.document.documentElement.requestFullscreen() } catch {}
  }

  function set(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'name') setNameError(false)
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function goNext() {
    if (currentStep === 0 && !formData.name.trim()) {
      setNameError(true)
      return
    }
    setCurrentStep(s => Math.min(s + 1, 7))
  }

  function goBack() {
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────

  function addImages(files) {
    const newImages = []
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2)
      imageURLs.current[id] = URL.createObjectURL(file)
      newImages.push({ id, fileName: file.name, note: '' })
    })
    if (!newImages.length) return
    set('referenceImages', [...(formData.referenceImages || []), ...newImages])
  }

  function removeImage(id) {
    if (imageURLs.current[id]) {
      URL.revokeObjectURL(imageURLs.current[id])
      delete imageURLs.current[id]
    }
    set('referenceImages', (formData.referenceImages || []).filter(img => img.id !== id))
  }

  function updateImageNote(id, note) {
    set('referenceImages', (formData.referenceImages || []).map(img =>
      img.id === id ? { ...img, note } : img
    ))
  }

  // ── Save logic ────────────────────────────────────────────────────────────────

  async function doSave(clients, existingId, ttsPlayer) {
    const now = new Date().toISOString()
    const hasImages = (formData.referenceImages || []).length > 0
    const imagesForRecord = hasImages
      ? formData.referenceImages.map(img => ({ ...img, persistencePending: true }))
      : []

    const consultationObj = {
      id: 'consult_' + Date.now(),
      date: now,
      ...formData,
      referenceImages: imagesForRecord,
      ...(hasImages ? { imagesPendingMigration: true } : {}),
    }

    if (existingId !== null) {
      const idx = clients.findIndex(c => c.id === existingId)
      if (idx >= 0) {
        clients[idx] = {
          ...clients[idx],
          stage: 'Design Phase',
          updatedAt: now,
          consultations: [consultationObj, ...(clients[idx].consultations || [])],
        }
      }
    } else {
      const newClient = mkClient({
        id: 'crm_' + Date.now(),
        name: formData.name.trim(),
        phone: formData.phone,
        email: formData.email,
        socialPlatform: formData.socialPlatform,
        socialHandle: formData.socialHandle,
        referralSource: formData.referralSource,
        firstTimeClient: formData.firstTimeClient,
        stage: 'Design Phase',
        clientTier: formData.clientTier,
        updatedAt: now,
        consultations: [consultationObj],
        sessions: [],
      })
      clients.unshift(newClient)
    }

    saveClients(clients)
    localStorage.removeItem(DRAFT_KEY)

    if (clientWin.current && !clientWin.current.closed) {
      clientWin.current.postMessage({ type: 'CONSULTATION_SAVED' }, '*')
    }

    const firstName = formData.name.trim().split(' ')[0]
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Q2Qd4P9qaDNuBFUcFCQr', {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${firstName} consultation saved. They are now on your Project Wall.`,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        ttsPlayer.src = url
        ttsPlayer.play()
        ttsPlayer.onended = () => URL.revokeObjectURL(url)
      }
    } catch {}

    setFormData(defaultForm)
    setCurrentStep(0)
    setShowDupModal(false)
    setDupClient(null)
    setDotPositions({})
  }

  async function saveConsultation() {
    const ttsPlayer = new Audio()
    ttsPlayer.src = IOS_WAV
    ttsPlayer.play().catch(() => {})

    if (!formData.name.trim()) {
      setNameError(true)
      setCurrentStep(0)
      return
    }

    const clients = loadClients()
    const existing = clients.find(c => {
      const nameMatch = c.name?.toLowerCase() === formData.name.trim().toLowerCase()
      const emailMatch = formData.email && c.email?.toLowerCase() === formData.email.toLowerCase()
      return nameMatch || emailMatch
    })

    if (existing) {
      setDupClient(existing)
      setShowDupModal(true)
      return
    }

    await doSave(clients, null, ttsPlayer)
  }

  async function handleAddToExisting() {
    const ttsPlayer = new Audio()
    ttsPlayer.src = IOS_WAV
    ttsPlayer.play().catch(() => {})
    const clients = loadClients()
    await doSave(clients, dupClient.id, ttsPlayer)
  }

  async function handleCreateNew() {
    const ttsPlayer = new Audio()
    ttsPlayer.src = IOS_WAV
    ttsPlayer.play().catch(() => {})
    const clients = loadClients()
    await doSave(clients, null, ttsPlayer)
  }

  // ── Step renders ──────────────────────────────────────────────────────────────

  function renderStep0() {
    return (
      <>
        <Field label="Full Name">
          <input
            type="text"
            value={formData.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Client full name"
            style={{
              ...INPUT_STYLE,
              border: nameError ? '1px solid #f09595' : '1px solid #2a2a27',
            }}
          />
          {nameError && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f09595', marginTop: 4, display: 'block' }}>
              Name is required
            </span>
          )}
        </Field>
        <Field label="Phone Number">
          <input
            type="tel"
            value={formData.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="(916) 000-0000"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={formData.email}
            onChange={e => set('email', e.target.value)}
            placeholder="client@email.com"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Referral Source">
          <PillToggle
            options={REFERRAL_OPTIONS}
            value={formData.referralSource}
            onChange={v => set('referralSource', v)}
          />
        </Field>
        <Field label="First Time Client">
          <PillToggle
            options={['Yes', 'No']}
            value={formData.firstTimeClient === null ? '' : formData.firstTimeClient ? 'Yes' : 'No'}
            onChange={v => set('firstTimeClient', v === 'Yes')}
          />
        </Field>
        <div style={{ marginBottom: 20 }}>
          <span style={LABEL_STYLE}>Social Media</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <PillToggle
                options={SOCIAL_PLATFORMS}
                value={formData.socialPlatform}
                onChange={v => set('socialPlatform', v)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL_STYLE}>Handle or profile link</span>
              <input
                type="text"
                value={formData.socialHandle}
                onChange={e => set('socialHandle', e.target.value)}
                placeholder="e.g. @saulgtattoos"
                style={INPUT_STYLE}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  function renderStep1() {
    return (
      <>
        <Field label="Tattoo Concept and Description">
          <textarea
            value={formData.concept}
            onChange={e => set('concept', e.target.value)}
            placeholder="Describe the tattoo idea..."
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
        </Field>
        <Field label="Inspiration Images Note">
          <input
            type="text"
            value={formData.inspirationNotes}
            onChange={e => set('inspirationNotes', e.target.value)}
            placeholder="Reference links or notes"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Cover Up">
          <PillToggle
            options={['Yes', 'No']}
            value={formData.isCoverUp ? 'Yes' : 'No'}
            onChange={v => set('isCoverUp', v === 'Yes')}
          />
        </Field>
        {formData.isCoverUp && (
          <Field label="Cover Up Description">
            <textarea
              value={formData.coverUpDescription}
              onChange={e => set('coverUpDescription', e.target.value)}
              placeholder="What is being covered..."
              style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
            />
          </Field>
        )}
        <Field label="Meaningful to Client">
          <PillToggle
            options={['Yes', 'No']}
            value={formData.isMeaningful ? 'Yes' : 'No'}
            onChange={v => set('isMeaningful', v === 'Yes')}
          />
        </Field>
        {formData.isMeaningful && (
          <Field label="Meaning or Story">
            <textarea
              value={formData.meaningStory}
              onChange={e => set('meaningStory', e.target.value)}
              placeholder="What does this mean to them..."
              style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
            />
          </Field>
        )}

        {/* Visual Reference Manager */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ ...LABEL_STYLE, marginBottom: 10 }}>Visual References</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addImages(e.target.files); e.target.value = '' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setIsDragging(false)
              addImages(e.dataTransfer.files)
            }}
            style={{
              border: isDragging
                ? '1.5px dashed rgba(201,169,110,0.5)'
                : '1.5px dashed rgba(201,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              marginBottom: (formData.referenceImages?.length > 0) ? 14 : 0,
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f' }}>
              Drag reference photos here or tap to browse
            </span>
          </div>
          {(formData.referenceImages || []).map(img => (
            <div
              key={img.id}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={imageURLs.current[img.id]}
                  alt={img.fileName}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={() => removeImage(img.id)}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: '#e8e6df',
                    fontSize: 11,
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1 }}>
                <span style={LABEL_STYLE}>What elements do you like about this reference?</span>
                <textarea
                  value={img.note}
                  onChange={e => updateImageNote(img.id, e.target.value)}
                  style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  function renderStep2() {
    const selectedZones = formData.placementZones || []

    function handleZoneClick(e, zoneName) {
      const svgEl = e.currentTarget.ownerSVGElement || e.currentTarget.closest('svg')
      let svgX = 0, svgY = 0
      try {
        const pt = svgEl.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svgEl.getScreenCTM().inverse())
        svgX = svgP.x
        svgY = svgP.y
      } catch {}
      if (selectedZones.includes(zoneName)) {
        set('placementZones', selectedZones.filter(z => z !== zoneName))
        setDotPositions(prev => { const n = { ...prev }; delete n[zoneName]; return n })
      } else {
        set('placementZones', [...selectedZones, zoneName])
        setDotPositions(prev => ({ ...prev, [zoneName]: { x: svgX, y: svgY } }))
      }
    }

    function removeZone(zoneName) {
      set('placementZones', selectedZones.filter(z => z !== zoneName))
      setDotPositions(prev => { const n = { ...prev }; delete n[zoneName]; return n })
    }

    return (
      <>
        <Field label="Placement">
          <input
            type="text"
            value={formData.placement}
            onChange={e => set('placement', e.target.value)}
            placeholder="Where on the body"
            style={INPUT_STYLE}
          />
        </Field>

        {/* Body Placement Map */}
        <div style={{ marginBottom: 20 }}>
          <span style={LABEL_STYLE}>Placement Map</span>
          <svg
            viewBox="0 0 210 240"
            width="100%"
            style={{ maxWidth: 420, display: 'block', margin: '4px auto 0' }}
          >
            <text x="52" y="234" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="rgba(122,120,111,0.5)" letterSpacing="0.06em">FRONT</text>
            <text x="158" y="234" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="rgba(122,120,111,0.5)" letterSpacing="0.06em">BACK</text>
            <line x1="105" y1="8" x2="105" y2="226" stroke="rgba(122,120,111,0.2)" strokeWidth="0.5" />
            <ellipse cx={158} cy={20} rx={19} ry={19} fill="transparent" stroke="#7a786f" strokeOpacity={0.3} strokeWidth={0.8} />
            <rect x={151} y={37} width={14} height={13} rx={3} fill="transparent" stroke="#7a786f" strokeOpacity={0.3} strokeWidth={0.8} />
            <rect x={119} y={41} width={22} height={17} rx={4} fill="transparent" stroke="#7a786f" strokeOpacity={0.3} strokeWidth={0.8} />
            <rect x={173} y={41} width={22} height={17} rx={4} fill="transparent" stroke="#7a786f" strokeOpacity={0.3} strokeWidth={0.8} />
            {BODY_ZONES.map(zone => {
              const isSelected = selectedZones.includes(zone.id)
              const props = {
                fill: isSelected ? 'rgba(201,169,110,0.4)' : 'transparent',
                stroke: '#7a786f',
                strokeOpacity: 0.4,
                strokeWidth: 0.8,
                style: { cursor: 'pointer' },
                onClick: e => handleZoneClick(e, zone.id),
              }
              return zone.shape === 'ellipse'
                ? <ellipse key={zone.id} cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry} {...props} />
                : <rect key={zone.id} x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={zone.rx || 0} {...props} />
            })}
            {BODY_ZONES.map(zone => {
              const dot = dotPositions[zone.id]
              if (!dot) return null
              return <circle key={'d' + zone.id} cx={dot.x} cy={dot.y} r={2.5} fill="#c9a96e" style={{ pointerEvents: 'none' }} />
            })}
          </svg>
          {selectedZones.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {selectedZones.map(zone => (
                <div
                  key={zone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    background: 'rgba(201,169,110,0.1)',
                    border: '1px solid rgba(201,169,110,0.3)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: '#c9a96e',
                  }}
                >
                  {zone}
                  <button
                    onClick={() => removeZone(zone)}
                    style={{ background: 'none', border: 'none', color: '#c9a96e', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Approximate Size">
          <input
            type="text"
            value={formData.size}
            onChange={e => set('size', e.target.value)}
            placeholder="e.g. 4x6 inches, palm sized"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Style">
          <PillToggle
            options={STYLE_OPTIONS}
            value={formData.style}
            onChange={v => set('style', v)}
            multi
          />
        </Field>
        <Field label="Color Profile">
          <PillToggle
            options={COLOR_OPTIONS}
            value={formData.colorProfile}
            onChange={v => set('colorProfile', v)}
          />
        </Field>
        <Field label="Orientation">
          <PillToggle
            options={ORIENT_OPTIONS}
            value={formData.orientation}
            onChange={v => set('orientation', v)}
          />
        </Field>
        <Field label="Additional Design Notes">
          <textarea
            value={formData.designNotes}
            onChange={e => set('designNotes', e.target.value)}
            placeholder="Any other design details..."
            style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
          />
        </Field>
      </>
    )
  }

  function renderStep3() {
    return (
      <>
        <Field label="Music Genre">
          <PillToggle
            options={MUSIC_OPTIONS}
            value={formData.musicGenre}
            onChange={v => set('musicGenre', v)}
            multi
          />
        </Field>
        <Field label="Specific Artists or Playlists">
          <input
            type="text"
            value={formData.playlist}
            onChange={e => set('playlist', e.target.value)}
            placeholder="Artists, album, playlist name"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Shows or Movies for Studio TV">
          <input
            type="text"
            value={formData.tvShows}
            onChange={e => set('tvShows', e.target.value)}
            placeholder="What they like to watch"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Comfort Notes">
          <textarea
            value={formData.comfortNotes}
            onChange={e => set('comfortNotes', e.target.value)}
            placeholder="Breaks, water, snacks, sensitivities..."
            style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
          />
        </Field>
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#c9a96e',
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 8,
          }}>TATTOO EXPERIENCE</span>
          <PillToggle
            options={['None', '1 to 5', '5 or more']}
            value={formData.tattooCount}
            onChange={v => set('tattooCount', v)}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#c9a96e',
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 8,
          }}>SITTING ENDURANCE</span>
          <PillToggle
            options={['2 hours', '4 hours', '6 hours', 'Full Day']}
            value={formData.sittingEndurance}
            onChange={v => set('sittingEndurance', v)}
          />
        </div>
      </>
    )
  }

  function renderStep4() {
    return (
      <>
        <Field label="Allergies">
          <input
            type="text"
            value={formData.allergies}
            onChange={e => set('allergies', e.target.value)}
            placeholder="Known allergies"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Skin Conditions">
          <input
            type="text"
            value={formData.skinConditions}
            onChange={e => set('skinConditions', e.target.value)}
            placeholder="Eczema, psoriasis, keloids, etc."
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Medications">
          <input
            type="text"
            value={formData.medications}
            onChange={e => set('medications', e.target.value)}
            placeholder="Blood thinners, topicals, etc."
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Previous Reactions">
          <textarea
            value={formData.previousReactions}
            onChange={e => set('previousReactions', e.target.value)}
            placeholder="Any past reactions to ink or healing issues..."
            style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
          />
        </Field>
        <Field label="Medical Clearance">
          <PillToggle
            options={CLEARANCE_OPTIONS}
            value={formData.medicalClearance}
            onChange={v => set('medicalClearance', v)}
          />
        </Field>
      </>
    )
  }

  function renderStep5() {
    const wNum = parseFloat(estW)
    const hNum = parseFloat(estH)
    const showCalc  = estW && estH && wNum > 0 && hNum > 0
    const baseHours = showCalc ? (wNum + hNum) / 2 : 0
    const lowHours  = showCalc ? Math.max(1, baseHours - 1) : 0
    const highHours = showCalc ? baseHours + 1 : 0
    const rate = 250

    const isHourly = estStyle === 'Watercolor' || estStyle === 'Black and Gray Realism'
    const isFlat   = estStyle === 'Fine Line' || estStyle === 'Simple Design'

    const lowTotal   = Math.round(lowHours * rate)
    const highTotal  = Math.round(highHours * rate)
    const flatAmount = Math.max(100, Math.round(baseHours * rate))
    const sizeTier   = baseHours <= 1.5
      ? 'Small (1 to 3 inches)'
      : baseHours <= 3
      ? 'Medium (3.5 to 6 inches)'
      : 'Large (6.6 inches and above)'

    function applyEstimate() {
      if (!showCalc) return
      const total = isFlat ? Math.max(100, Math.round(baseHours * rate)) : Math.round(baseHours * rate)
      set('estimatedHours', baseHours.toFixed(1))
      set('estimatedTotal', String(total))
      setEstApplied(true)
      setTimeout(() => setEstApplied(false), 2000)
    }

    const CARD_STYLE = {
      background: '#1e1e1b',
      border: '1px solid rgba(201,169,110,0.15)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    }

    const CARD_LABEL = {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: '#c9a96e',
      letterSpacing: '0.08em',
      marginBottom: 10,
    }

    return (
      <>
        <div style={CARD_STYLE}>
          <div style={CARD_LABEL}>STUDIO PRICING INFO</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 10px 0' }}>
              Saul charges $250 per hour. As a general guideline, plan approximately one hour for every one square inch of tattoo area.
            </p>
            <p style={{ margin: '0 0 10px 0' }}>
              Consultations are always complimentary.
            </p>
            <p style={{ margin: 0 }}>
              Tattoo sessions are considered full day events. Duration depends on design complexity and size. Please reserve your entire day and avoid scheduling any other commitments on your session date.
            </p>
          </div>
        </div>

        <div style={CARD_STYLE}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>PRECISION ESTIMATOR</div>
          <div style={{ marginBottom: 12 }}>
            <span style={LABEL_STYLE}>Style</span>
            <PillToggle
              options={['Watercolor', 'Black and Gray Realism', 'Fine Line', 'Simple Design']}
              value={estStyle}
              onChange={v => setEstStyle(v)}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={LABEL_STYLE}>Width (in)</span>
              <input
                type="number"
                value={estW}
                onChange={e => setEstW(e.target.value)}
                placeholder="0"
                style={{ ...INPUT_STYLE, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL_STYLE}>Height (in)</span>
              <input
                type="number"
                value={estH}
                onChange={e => setEstH(e.target.value)}
                placeholder="0"
                style={{ ...INPUT_STYLE, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
          {showCalc && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c9a96e', lineHeight: 1.8, marginBottom: 12 }}>
              {(isHourly || !estStyle) && (
                <div>
                  {'Ballpark '}{lowHours.toFixed(1)}{' to '}{highHours.toFixed(1)}{' hours (Goal: '}{baseHours.toFixed(1)}{' hours)'}
                </div>
              )}
              {isHourly && (
                <div>
                  {'Estimated investment: $'}{lowTotal.toLocaleString()}{' to $'}{highTotal.toLocaleString()}
                </div>
              )}
              {isFlat && (
                <>
                  <div>{'Size tier: '}{sizeTier}</div>
                  <div>{'Estimated investment: $'}{flatAmount.toLocaleString()}</div>
                  <div style={{ color: '#7a786f', fontSize: 12 }}>
                    Shop minimum applies if total falls below $100.
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={applyEstimate}
              style={{
                minHeight: 36,
                padding: '0 16px',
                background: 'transparent',
                color: '#c9a96e',
                border: '1px solid #c9a96e',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Apply to Estimate
            </button>
            {estApplied && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
                Applied
              </span>
            )}
          </div>
        </div>

        <Field label="Session Estimate Notes">
          <textarea
            value={formData.sessionEstimateNotes}
            onChange={e => set('sessionEstimateNotes', e.target.value)}
            style={{ ...INPUT_STYLE, minHeight: 90, resize: 'vertical' }}
          />
        </Field>

        <Field label="Pricing Type">
          <PillToggle
            options={PRICING_OPTIONS}
            value={formData.pricingType}
            onChange={v => set('pricingType', v)}
          />
        </Field>
        <Field label="Estimated Total">
          <input
            type="text"
            value={formData.estimatedTotal}
            onChange={e => set('estimatedTotal', e.target.value)}
            placeholder="Dollar amount"
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Deposit Amount">
          <PillToggle
            options={DEPOSIT_AMT}
            value={formData.depositAmount}
            onChange={v => set('depositAmount', v)}
          />
        </Field>
        <Field label="Deposit Status">
          <PillToggle
            options={DEPOSIT_STATUS}
            value={formData.depositStatus}
            onChange={v => set('depositStatus', v)}
          />
        </Field>
        <Field label="Consultation Date">
          <input
            type="date"
            value={formData.consultationDate}
            onChange={e => set('consultationDate', e.target.value)}
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Appointment Date">
          <input
            type="date"
            value={formData.appointmentDate}
            onChange={e => set('appointmentDate', e.target.value)}
            style={INPUT_STYLE}
          />
        </Field>
        <Field label="Client Tier">
          <PillToggle
            options={TIER_OPTIONS}
            value={formData.clientTier}
            onChange={v => set('clientTier', v)}
          />
        </Field>
      </>
    )
  }

  function renderStep6() {
    const f = formData

    const SECTION_CARD = {
      background: 'rgba(201,169,110,0.04)',
      border: '1px solid rgba(201,169,110,0.12)',
      borderRadius: 12,
      padding: '16px 18px',
      marginBottom: 16,
    }
    const SECTION_LABEL = {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: '#c9a96e',
      letterSpacing: '0.08em',
      marginBottom: 10,
      display: 'block',
    }
    const ROW_KEY = {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: '#7a786f',
      minWidth: 120,
      flexShrink: 0,
    }
    const ROW_VAL = {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: '#e8e6df',
      lineHeight: 1.4,
    }

    function row(label, value) {
      if (!value) return null
      return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
          <span style={ROW_KEY}>{label}</span>
          <span style={ROW_VAL}>{value}</span>
        </div>
      )
    }

    return (
      <>
        <div style={SECTION_CARD}>
          <span style={SECTION_LABEL}>PROJECT OVERVIEW</span>
          {row('Client', f.name)}
          {row('Concept', f.concept)}
          {row('Placement', f.placement)}
          {row('Size', f.size)}
          {row('Style', f.style?.length ? f.style.join(', ') : '')}
          {row('Color Profile', f.colorProfile)}
          {row('Orientation', f.orientation)}
        </div>

        {(f.referenceImages?.length > 0) && (
          <div style={SECTION_CARD}>
            <span style={SECTION_LABEL}>REFERENCE GALLERY</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {f.referenceImages.map(img => (
                <div key={img.id} style={{ width: 120 }}>
                  <img
                    src={imageURLs.current[img.id]}
                    alt={img.fileName}
                    style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', display: 'block', marginBottom: 6 }}
                  />
                  {img.note && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7a786f', lineHeight: 1.4, display: 'block' }}>
                      {img.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={SECTION_CARD}>
          <span style={SECTION_LABEL}>PRICING AND DEPOSIT TERMS</span>
          {row('Pricing Type', f.pricingType)}
          {f.estimatedTotal && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={ROW_KEY}>Estimated Total</span>
              <span style={ROW_VAL}>${f.estimatedTotal}</span>
            </div>
          )}
          {row('Deposit Amount', f.depositAmount)}
          {row('Deposit Status', f.depositStatus)}
          {row('Appointment', f.appointmentDate)}
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: '#7a786f',
            lineHeight: 1.7,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(122,120,111,0.15)',
          }}>
            This estimate is a ballpark figure based on size and your specific style choice. Simpler designs may be more efficient, while complex and intricate pieces may require more time. This serves as a flexible guide to provide a clear idea of the investment involved.
          </div>
        </div>

        <button
          onClick={() => console.log('Export Artistic Agreement coming soon')}
          style={{
            minHeight: 44,
            width: '100%',
            background: 'transparent',
            color: '#c9a96e',
            border: '1px solid #c9a96e',
            borderRadius: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Export Artistic Agreement
        </button>
      </>
    )
  }

  function renderStep7() {
    const VAULT_LABEL = {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: '#c9a96e',
      letterSpacing: '0.08em',
      marginBottom: 8,
      display: 'block',
    }

    const ratingOptions = [
      {
        key: 'Hot',
        active: { background: '#c9a96e', color: '#0e0e0d', border: '1px solid #c9a96e' },
      },
      {
        key: 'Warm',
        active: { background: 'rgba(201,150,80,0.2)', color: '#c99650', border: '1px solid #c99650' },
      },
      {
        key: 'Cool',
        active: { background: 'rgba(143,188,187,0.15)', color: '#8fbcbb', border: '1px solid #8fbcbb' },
      },
      {
        key: 'Red Flag',
        active: { background: 'transparent', color: '#f09595', border: '1px solid #f09595' },
      },
    ]

    const healthRows = [
      ['Allergies', formData.allergies],
      ['Skin Conditions', formData.skinConditions],
      ['Medications', formData.medications],
      ['Previous Reactions', formData.previousReactions],
      ['Medical Clearance', formData.medicalClearance],
    ].filter(([, v]) => v)

    return (
      <>
        <div style={{ marginBottom: 24 }}>
          <span style={VAULT_LABEL}>INTERNAL PROJECT RATING</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ratingOptions.map(({ key, active }) => {
              const isActive = formData.projectRating === key
              return (
                <button
                  key={key}
                  onClick={() => set('projectRating', formData.projectRating === key ? '' : key)}
                  style={{
                    minHeight: 36,
                    padding: '0 14px',
                    borderRadius: 8,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    ...(isActive
                      ? active
                      : { background: 'transparent', color: '#7a786f', border: '1px solid rgba(122,120,111,0.3)' }
                    ),
                  }}
                >
                  {key}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={VAULT_LABEL}>TECHNIQUE AND STRATEGY</span>
          <textarea
            value={formData.strategyNotes}
            onChange={e => set('strategyNotes', e.target.value)}
            placeholder="Needle groupings, voltage, pigment notes, approach for this specific piece."
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={VAULT_LABEL}>POST SESSION DEBRIEF</span>
          <textarea
            value={formData.postSessionDebrief}
            onChange={e => set('postSessionDebrief', e.target.value)}
            placeholder="Log observations after the session. Skin behavior, healing notes, anything to remember for the next visit."
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={VAULT_LABEL}>TECHNICAL DIFFICULTY</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { n: '1', active: { border: '1px solid #7aab8f', color: '#7aab8f' } },
              { n: '2', active: { border: '1px solid #8fbcbb', color: '#8fbcbb' } },
              { n: '3', active: { border: '1px solid #c9a96e', color: '#c9a96e' } },
              { n: '4', active: { border: '1px solid #c99650', color: '#c99650' } },
              { n: '5', active: { border: '1px solid #f09595', color: '#f09595' } },
            ].map(({ n, active }) => {
              const isActive = formData.technicalDifficulty === n
              return (
                <button
                  key={n}
                  onClick={() => set('technicalDifficulty', formData.technicalDifficulty === n ? '' : n)}
                  style={{
                    minHeight: 36,
                    minWidth: 44,
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    cursor: 'pointer',
                    background: 'transparent',
                    transition: 'all 0.15s',
                    ...(isActive
                      ? active
                      : { border: '1px solid rgba(122,120,111,0.3)', color: '#7a786f' }
                    ),
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={VAULT_LABEL}>EXECUTION PLAN</span>
          <textarea
            value={formData.executionPlan}
            onChange={e => set('executionPlan', e.target.value)}
            placeholder="Log your attack plan. Linework first session, color blending second session, black saturation last. Whatever the strategy is for this specific piece."
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
        </div>

        {healthRows.length > 0 && (
          <div style={{
            background: '#1e1e1b',
            border: '1px solid #2a2a27',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 24,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#7a786f',
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: 10,
            }}>
              HEALTH REFERENCE
            </span>
            {healthRows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', minWidth: 130, flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#e8e6df', lineHeight: 1.4 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={saveConsultation}
          style={{
            minHeight: 48,
            width: '100%',
            background: '#c9a96e',
            color: '#0e0e0d',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save to Studio Database
        </button>
      </>
    )
  }

  function renderStep() {
    switch (currentStep) {
      case 0: return renderStep0()
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      case 7: return renderStep7()
      default: return null
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  const step = STEPS[currentStep]
  const progressPct = ((currentStep + 1) / 8) * 100

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: '#e8e6df', marginBottom: 2 }}>
          Consultation
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', letterSpacing: '0.04em' }}>
          Client intake wizard
        </div>
      </div>

      {/* Client Mode */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={openClientMode}
          style={{
            minHeight: 44,
            padding: '0 18px',
            background: 'transparent',
            color: '#c9a96e',
            border: '1px solid #c9a96e',
            borderRadius: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>↗</span>
          Client Mode
        </button>
        {clientWinOpen && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
              Client view is open
            </span>
            <button
              onClick={() => clientWin.current?.postMessage({ type: 'RESET_WIZARD' }, '*')}
              style={{
                minHeight: 28,
                padding: '0 10px',
                background: 'transparent',
                color: '#7a786f',
                border: '1px solid rgba(122,120,111,0.3)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Reset Client View
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e' }}>
            Step {currentStep + 1} of 8: {step.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
            {currentStep + 1} / 8
          </span>
        </div>
        <div style={{ height: 4, background: '#1e1e1b', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #c9a96e, #8fbcbb)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              title={s.label}
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                borderRadius: 4,
                outline: i === currentStep ? '2px solid #c9a96e' : 'none',
                outlineOffset: 2,
                opacity: i < currentStep ? 0.35 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {s.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Wizard card */}
      <div style={{
        background: '#161614',
        border: '1px solid #2a2a27',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '24px 20px 4px' }}>
          {renderStep()}
        </div>

        {/* Nav buttons */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          gap: 10,
          padding: '14px 20px',
        }}>
          {currentStep > 0 && (
            <button
              onClick={goBack}
              style={{
                flex: 1,
                minHeight: 44,
                background: 'transparent',
                color: '#7a786f',
                border: '1px solid rgba(122,120,111,0.2)',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {currentStep < 7 && (
            <button
              onClick={goNext}
              style={{
                flex: currentStep === 0 ? 1 : 2,
                minHeight: 44,
                background: '#c9a96e',
                color: '#0e0e0d',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Duplicate client modal */}
      {showDupModal && dupClient && (
        <div
          onClick={() => setShowDupModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e1e1b',
              border: '1px solid rgba(201,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 360,
              width: '90vw',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowDupModal(false)}
              style={{
                position: 'absolute', top: 12, right: 16,
                background: 'none', border: 'none',
                color: '#7a786f', fontSize: 20, lineHeight: 1,
                cursor: 'pointer', padding: 0,
              }}
            >
              &times;
            </button>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 15,
              fontWeight: 600,
              color: '#e8e6df',
              marginBottom: 10,
            }}>
              Existing profile found for {dupClient.name}.
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: '#7a786f',
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              Would you like to add this consultation to their existing profile, or create a new profile?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleAddToExisting}
                style={{
                  minHeight: 44,
                  background: '#c9a96e',
                  color: '#0e0e0d',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add to Existing Profile
              </button>
              <button
                onClick={handleCreateNew}
                style={{
                  minHeight: 44,
                  background: 'transparent',
                  color: '#e8e6df',
                  border: '1px solid rgba(122,120,111,0.3)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Create New Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
