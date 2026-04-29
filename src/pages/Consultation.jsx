import { useState, useEffect } from 'react'
import { loadClients, saveClients, mkClient } from './CRM'

// ─── Constants ─────────────────────────────────────────────────────────────────

const defaultForm = {
  name: '', phone: '', email: '',
  referralSource: '', firstTimeClient: null,
  concept: '', inspirationNotes: '',
  isCoverUp: false, coverUpDescription: '',
  isMeaningful: false, meaningStory: '',
  placement: '', size: '',
  style: [], colorProfile: '', orientation: '',
  designNotes: '',
  musicGenre: [], playlist: '', tvShows: '', comfortNotes: '',
  allergies: '', skinConditions: '', medications: '',
  previousReactions: '', medicalClearance: '',
  pricingType: '', estimatedTotal: '',
  depositAmount: '', depositStatus: '',
  consultationDate: '', appointmentDate: '',
  clientTier: 'Deposit Required',
  artistNotes: '',
}

const STEPS = [
  { emoji: '👤', label: 'Client Info' },
  { emoji: '🎨', label: 'The Vision' },
  { emoji: '📐', label: 'Design Details' },
  { emoji: '🎵', label: 'The Experience' },
  { emoji: '🏥', label: 'Health and Skin' },
  { emoji: '💰', label: 'Pricing and Deposit' },
  { emoji: '✍️', label: 'Artist Notes' },
]

const REFERRAL_OPTIONS   = ['Instagram', 'Google', 'Word of Mouth', 'Existing Client', 'Other']
const STYLE_OPTIONS      = ['Watercolor', 'Black and Gray Realism', 'Sketch Art', 'Abstract', 'Pointillism', 'Other']
const COLOR_OPTIONS      = ['Full Color', 'Limited Color', 'Black and Gray', 'Black and White Only']
const ORIENT_OPTIONS     = ['Vertical', 'Horizontal', 'Wrapping', 'Flexible']
const MUSIC_OPTIONS      = ['Hip Hop', 'Lo-Fi', 'Rock', 'R&B', 'Latin', 'Country', 'Silence', 'Other']
const CLEARANCE_OPTIONS  = ['No Issues', 'Note on File', 'Needs Clearance']
const PRICING_OPTIONS    = ['Hourly', 'Per Session', 'Full Day', 'Shop Minimum']
const DEPOSIT_AMT        = ['$100', '$150', '$200', '$250', 'Waived']
const DEPOSIT_STATUS     = ['Pending', 'Paid', 'Waived']
const TIER_OPTIONS       = ['Deposit Required', 'Trusted Client']

const DRAFT_KEY = 'macri_consultation_draft'
const IOS_WAV   = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA=='

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

// ─── Summary ───────────────────────────────────────────────────────────────────

function buildSummaryLines(f) {
  const lines = []
  if (f.name)            lines.push(['Client',          f.name])
  if (f.concept)         lines.push(['Concept',         f.concept])
  if (f.placement)       lines.push(['Placement',       f.placement])
  if (f.size)            lines.push(['Size',            f.size])
  if (f.style?.length)   lines.push(['Style',           f.style.join(', ')])
  if (f.colorProfile)    lines.push(['Color Profile',   f.colorProfile])
  if (f.pricingType)     lines.push(['Pricing',         f.pricingType])
  if (f.estimatedTotal)  lines.push(['Estimated Total', f.estimatedTotal])
  if (f.depositAmount)   lines.push(['Deposit Amount',  f.depositAmount])
  if (f.depositStatus)   lines.push(['Deposit Status',  f.depositStatus])
  if (f.appointmentDate) lines.push(['Appointment',     f.appointmentDate])
  return lines
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

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
  }, [formData])

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
    setCurrentStep(s => Math.min(s + 1, 6))
  }

  function goBack() {
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  // ── Save logic ────────────────────────────────────────────────────────────────

  async function doSave(clients, existingId, ttsPlayer) {
    const now = new Date().toISOString()
    const consultationObj = { id: 'consult_' + Date.now(), date: now, ...formData }

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
      </>
    )
  }

  function renderStep2() {
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
    return (
      <>
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
            placeholder="$500, two sessions, etc."
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
    const summaryLines = buildSummaryLines(formData)
    return (
      <>
        <Field label="Private Notes — These do not appear in the client summary">
          <textarea
            value={formData.artistNotes}
            onChange={e => set('artistNotes', e.target.value)}
            placeholder="Notes for your eyes only..."
            style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
          />
        </Field>

        {summaryLines.length > 0 && (
          <div style={{
            background: 'rgba(201,169,110,0.05)',
            border: '1px solid rgba(201,169,110,0.15)',
            borderRadius: 12,
            padding: '16px 18px',
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#c9a96e',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}>
              CLIENT SUMMARY
            </div>
            {summaryLines.map(([key, val], i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', minWidth: 110, flexShrink: 0 }}>
                  {key}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#e8e6df', lineHeight: 1.4 }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={saveConsultation}
            style={{
              minHeight: 48,
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
            Save and Add to Project Wall
          </button>
          <button
            onClick={() => console.log('PDF coming soon')}
            style={{
              minHeight: 44,
              background: 'transparent',
              color: '#e8e6df',
              border: '1px solid rgba(122,120,111,0.3)',
              borderRadius: 8,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Export Client PDF
          </button>
          <button
            onClick={() => console.log('PDF coming soon')}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a786f',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
              padding: '4px 0',
              textAlign: 'center',
              letterSpacing: '0.03em',
            }}
          >
            Export Private Artist Sheet
          </button>
        </div>
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
      default: return null
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  const step = STEPS[currentStep]
  const progressPct = ((currentStep + 1) / 7) * 100

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

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e' }}>
            Step {currentStep + 1} of 7 &mdash; {step.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f' }}>
            {currentStep + 1} / 7
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
                fontSize: 18,
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
          {currentStep < 6 && (
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
