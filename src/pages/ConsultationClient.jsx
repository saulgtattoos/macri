import { useState, useEffect, useRef } from 'react'
import {
  CLIENT_DRAFT_KEY, CHANNEL_NAME, SHARED_DEVICE_MAX_AGE_MS, OWN_DEVICE_MAX_AGE_MS,
  writeDraft, readDraft, clearDraft, isSharedDevice, withoutMemoryOnly, ageLabel,
} from '../lib/consultationDraft'
import {
  REFERRAL_OPTIONS, SOCIAL_PLATFORMS, STYLE_OPTIONS, COLOR_OPTIONS, ORIENT_OPTIONS, MUSIC_OPTIONS, SIZE_OPTIONS, EST_STYLE_OPTIONS, HOURLY_STYLES, LABEL_STYLE, INPUT_STYLE, roundTo50, shopMin,
} from '../constants/consultationOptions'
import { Field, PillToggle } from '../components/consultation/FormParts'
import { ClientInfoStep, VisionStep, DesignStep, ExperienceStep, HealthStep, SummaryStep, StudioPricingInfo } from '../components/consultation/ConsultationSteps'
import { MSG_CLIENT_READY, MSG_RESUME, MSG_ANSWERS_RESENT, isFromOpener, answersResendTarget } from '../lib/clientResume'

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
  tattooCount: '',
  sittingEndurance: '',
}

const STEPS = [
  { emoji: '👤', label: 'Client Info' },
  { emoji: '🎨', label: 'The Vision' },
  { emoji: '📐', label: 'Design Details' },
  { emoji: '🏥', label: 'Health and Skin' },
  { emoji: '🎵', label: 'The Experience' },
  { emoji: '💰', label: 'Pricing and Deposit' },
  { emoji: '📋', label: 'Client Summary' },
]


const DRAFT_KEY = CLIENT_DRAFT_KEY

function openedByOwnerPage() {
  try { return !!window.opener && window.opener.location.origin === window.location.origin } catch { return false }
}

// The stored answers of a draft (never the memory only fields), or null.
function storedAnswers(maxAgeMs) {
  const d = readDraft(localStorage, DRAFT_KEY, { maxAgeMs })
  if (d.status === 'valid') return d.data
  if (d.status === 'legacy') {
    try { return withoutMemoryOnly(JSON.parse(localStorage.getItem(DRAFT_KEY))) } catch { return null }
  }
  return null
}

// What the page shows first: the empty form or the choice screen. Nothing from a previous draft
// is shown before a choice. A shared device resumes only when the owner page that opened this
// window tells it to (see clientResume.js).
function initialState(shared, maxAgeMs) {
  const d = readDraft(localStorage, DRAFT_KEY, { maxAgeMs })
  if (d.status === 'saved') clearDraft(localStorage, DRAFT_KEY)
  const exists = d.status === 'valid' || d.status === 'legacy'
  return {
    gate: exists ? 'choose' : 'form',
    formData: defaultForm,
    restored: false,
    pending: exists ? d : { status: 'none' },
    age: d.status === 'valid' ? ageLabel(d.updatedAt) : null,
  }
}

// True when the form differs from a blank form (memory only fields are never kept).
function hasContent(form) {
  return Object.entries(withoutMemoryOnly(form)).some(([k, v]) =>
    JSON.stringify(v ?? null) !== JSON.stringify(defaultForm[k] ?? null))
}


// ─── PillToggle ────────────────────────────────────────────────────────────────


// ─── Field ─────────────────────────────────────────────────────────────────────




// Health and comfort answers are kept in memory only (never saved on this device).
function PrivacyNote({ restored }) {
  return (
    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#a3a097', lineHeight: 1.6, margin: '0 0 18px', padding: '10px 12px', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 8 }}>
      {restored ? 'Please enter these answers again. ' : ''}For your privacy, health and comfort answers are not saved on this device. If the page reloads, you will be asked again.
    </p>
  )
}

// ─── ConsultationClient ────────────────────────────────────────────────────────

export default function ConsultationClient() {
  // Shared device (Client Mode, or a browser the owner uses): a previous draft resumes only when
  // the owner authorizes it from the Consultation page. Client's own device: Continue or Start
  // fresh. Either way the form starts empty and nothing from a previous draft shows before a choice.
  const [shared]  = useState(() => isSharedDevice(localStorage, openedByOwnerPage()))
  const maxAgeMs  = shared ? SHARED_DEVICE_MAX_AGE_MS : OWN_DEVICE_MAX_AGE_MS
  const [init] = useState(() => initialState(shared, maxAgeMs))
  const [pending, setPending]   = useState(init.pending)
  const [formData, setFormData] = useState(init.formData)
  const [gate, setGate]         = useState(init.gate)
  const [restored, setRestored] = useState(init.restored)
  const [confirmNew, setConfirmNew] = useState(false)
  const lastChange = useRef(0)
  const [currentStep, setCurrentStep]       = useState(0)
  const [nameError, setNameError]           = useState(false)
  const [showThankYou, setShowThankYou]     = useState(false)
  const [showWaiting, setShowWaiting]       = useState(false)
  const [estW, setEstW]                     = useState('')
  const [estH, setEstH]                     = useState('')
  const [estStyle, setEstStyle]             = useState('')
  const [isDragging, setIsDragging]         = useState(false)
  const imageURLs                           = useRef({})
  const fileInputRef                        = useRef(null)

  // Autosave: only while the form is in use, only when it has content, never the memory only fields.
  useEffect(() => {
    if (gate !== 'form' || !hasContent(formData)) return
    lastChange.current = Date.now()
    writeDraft(localStorage, DRAFT_KEY, formData, lastChange.current)
  }, [formData, gate])

  function resetToEmpty() {
    Object.values(imageURLs.current).forEach(url => URL.revokeObjectURL(url))
    imageURLs.current = {}
    clearDraft(localStorage, DRAFT_KEY)
    setFormData(defaultForm)
    setCurrentStep(0)
    setPending({ status: 'none' })
    setGate('form')
    setRestored(false)
    setConfirmNew(false)
    setShowThankYou(false)
    setShowWaiting(false)
    setEstW('')
    setEstH('')
    setEstStyle('')
  }

  function resumeDraft() {
    const data = storedAnswers(maxAgeMs)
    if (!data) { resetToEmpty(); return }
    lastChange.current = Date.now()
    setFormData({ ...defaultForm, ...data })
    setCurrentStep(0)
    setRestored(true)
    setGate('form')
  }

  // Latest screen state and answers, for the listeners below.
  const latest = useRef({ showWaiting: false, showThankYou: false, formData: defaultForm })
  useEffect(() => { latest.current = { showWaiting, showThankYou, formData } }, [showWaiting, showThankYou, formData])

  // Messages from the owner page and changes made in other tabs of this browser.
  useEffect(() => {
    let channel = null
    try { channel = new BroadcastChannel(CHANNEL_NAME) } catch { channel = null }
    function onChannel(e) {
      if (e.data?.type === 'CLEAR_CLIENT_DRAFT') resetToEmpty()
      // The owner page reloaded while this window waits: send the answers to it (only to the owner
      // page that opened this window), including those kept in memory only.
      const target = answersResendTarget(e.data, { waiting: latest.current.showWaiting, win: window })
      target?.postMessage({ type: MSG_ANSWERS_RESENT, payload: latest.current.formData }, window.location.origin)
    }
    function onStorage(e) {
      // The draft was removed elsewhere (owner sign out detected, owner cleared it): start empty.
      // Not on the thank you screen: saving also removes the draft, and that screen holds no answers.
      if (((e.key === DRAFT_KEY && e.newValue === null) || e.key === null) && !latest.current.showThankYou) resetToEmpty()
    }
    channel?.addEventListener('message', onChannel)
    window.addEventListener('storage', onStorage)
    return () => {
      channel?.removeEventListener('message', onChannel)
      channel?.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [shared])

  // Inactivity: a form left untouched for 2 hours is cleared (own and shared devices).
  useEffect(() => {
    const id = setInterval(() => {
      if (gate === 'form' && hasContent(formData) && Date.now() - lastChange.current > maxAgeMs) resetToEmpty()
    }, 60 * 1000)
    return () => clearInterval(id)
  }, [gate, formData, maxAgeMs])

  useEffect(() => {
    return () => {
      Object.values(imageURLs.current).forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    function handleMessage(e) {
      if (e.origin !== window.location.origin) return
      // Every owner instruction must come from the owner page that opened this window.
      if (!isFromOpener(e, window)) return
      if (e.data?.type === MSG_RESUME && shared) resumeDraft()
      if (e.data?.type === 'RESET_WIZARD') resetToEmpty()
      if (e.data?.type === 'CONSULTATION_SAVED') {
        // The owner has the answers now; do not leave the client's details on this device.
        Object.values(imageURLs.current).forEach(url => URL.revokeObjectURL(url))
        imageURLs.current = {}
        setFormData(defaultForm)
        clearDraft(localStorage, DRAFT_KEY)
        latest.current.showThankYou = true   // before the draft removal event can arrive
        setShowThankYou(true)
        setShowWaiting(false)
      }
    }
    window.addEventListener('message', handleMessage)
    // Tell the owner page this window is listening; it replies only if it asked this window to resume.
    if (openedByOwnerPage()) window.opener.postMessage({ type: MSG_CLIENT_READY }, window.location.origin)
    return () => window.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'name') setNameError(false)
  }

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

  // ── Step renders ──────────────────────────────────────────────────────────────

  function renderStep0() {
    return <ClientInfoStep formData={formData} set={set} nameError={nameError} />
  }

  function renderStep1() {
    return <VisionStep formData={formData} set={set} fileInputRef={fileInputRef} imageURLs={imageURLs} addImages={addImages} removeImage={removeImage} updateImageNote={updateImageNote} isDragging={isDragging} setIsDragging={setIsDragging} />
  }

  function renderStep2() {
    return <DesignStep formData={formData} set={set} />
  }

  function renderStep3() {
    return <ExperienceStep formData={formData} set={set} notice={<PrivacyNote restored={restored} />} />
  }

  function renderStep4() {
    return <HealthStep formData={formData} set={set} notice={<PrivacyNote restored={restored} />} />
  }

  function renderStep5() {
    const wNum = parseFloat(estW)
    const hNum = parseFloat(estH)
    const showCalc = !!(estW && estH && wNum > 0 && hNum > 0)
    const average  = showCalc ? (wNum + hNum) / 2 : 0
    const plus     = showCalc ? average + 1 : 0
    const minus    = showCalc ? Math.max(0.5, Math.min(wNum, hNum) - 1) : 0

    const isHourly  = HOURLY_STYLES.includes(estStyle)
    const isPerSess = estStyle === 'Per Session'
    const isFlat    = estStyle === 'Fine Line' || estStyle === 'Simple Design'

    const fmtHours = (n) => n % 1 === 0 ? String(n) : n.toFixed(1)

    const showShopMinNote = showCalc && (
      (isHourly && minus * 250 < 100) ||
      (isPerSess && average * 250 < 100)
    )

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
        <StudioPricingInfo cardStyle={CARD_STYLE} labelStyle={CARD_LABEL} />

        <div style={CARD_STYLE}>
          <div style={{ ...CARD_LABEL, marginBottom: 12 }}>PRECISION ESTIMATOR</div>
          <div style={{ marginBottom: 12 }}>
            <span style={LABEL_STYLE}>Style</span>
            <PillToggle
              options={EST_STYLE_OPTIONS}
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

          {showCalc && isHourly && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c9a96e', lineHeight: 2, marginBottom: 12 }}>
              <div>{fmtHours(minus)} to {fmtHours(plus)} hours</div>
              <div>${roundTo50(shopMin(minus * 250)).toLocaleString()} to ${roundTo50(shopMin(plus * 250)).toLocaleString()}</div>
              {showShopMinNote && (
                <div style={{ color: '#7a786f', fontSize: 11 }}>Shop minimum applies.</div>
              )}
            </div>
          )}

          {showCalc && isPerSess && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c9a96e', lineHeight: 2, marginBottom: 12 }}>
              <div>${roundTo50(shopMin(average * 250)).toLocaleString()} to ${roundTo50(shopMin(plus * 250)).toLocaleString()}</div>
              {showShopMinNote && (
                <div style={{ color: '#7a786f', fontSize: 11 }}>Shop minimum applies.</div>
              )}
            </div>
          )}

          {showCalc && isFlat && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#c9a96e', lineHeight: 2, marginBottom: 12 }}>
              <div>${roundTo50(shopMin(average * 250)).toLocaleString()}</div>
              {average * 250 < 100 && (
                <div style={{ color: '#7a786f', fontSize: 11 }}>Shop minimum applies.</div>
              )}
            </div>
          )}

        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.9, marginBottom: 20 }}>
          This estimate is a ballpark figure based on size and your specific style choice. Simpler designs may be more efficient, while complex and intricate pieces may require more time. This serves as a flexible guide to provide a clear idea of the investment involved.
        </div>

        {/* Pricing type, totals, deposit and dates are Saul's decisions: set on the owner page only. */}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df', lineHeight: 1.7,
          padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(201,169,110,0.25)', marginBottom: 20,
        }}>
          Saul will go over your estimate, deposit, and appointment details with you. Nothing here is final until he confirms it with you.
        </div>
      </>
    )
  }

  function renderStep6() {
    return (
      <SummaryStep
        formData={formData}
        imageURLs={imageURLs}
        actions={
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                onClick={() => {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'CLIENT_FORM_DATA', payload: formData }, window.location.origin)
                  }
                  setShowWaiting(true)
                }}
                style={{
                  minHeight: 48,
                  padding: '0 32px',
                  background: 'transparent',
                  color: '#c9a96e',
                  border: '1px solid #c9a96e',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ready to Finalize
              </button>
            </div>
        }
      />
    )
  }

  function renderStep() {
    switch (currentStep) {
      case 0: return renderStep0()
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep4()   // Health and Skin
      case 4: return renderStep3()   // The Experience (ends with music)
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return null
    }
  }

  // ── Thank you screen ──────────────────────────────────────────────────────────

  if (showThankYou) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0e0e0d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#c9a96e', fontSize: 24, marginBottom: 20, lineHeight: 1 }}>
          ✦
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 28,
          fontWeight: 700,
          color: '#e8e6df',
          margin: '0 0 20px',
          lineHeight: 1.2,
        }}>
          Intake Complete
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#7a786f', lineHeight: 1.8, maxWidth: 360, margin: '0 0 10px' }}>
          Saul has received your details.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#7a786f', lineHeight: 1.8, maxWidth: 360, margin: '0 0 10px' }}>
          He will be in touch soon to confirm next steps.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#7a786f', lineHeight: 1.8, maxWidth: 360, margin: 0 }}>
          Thank you for choosing Saul G Tattoos.
        </p>
      </div>
    )
  }

  // ── Waiting screen ────────────────────────────────────────────────────────────

  if (showWaiting) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0e0e0d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#c9a96e', fontSize: 24, marginBottom: 20, lineHeight: 1 }}>
          ✦
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 24,
          fontWeight: 700,
          color: '#e8e6df',
          margin: '0 0 20px',
          lineHeight: 1.2,
        }}>
          Your details have been received.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', lineHeight: 1.8, maxWidth: 360, margin: '0 0 10px' }}>
          Waiting for Saul to finalize your project...
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', lineHeight: 1.8, maxWidth: 360, margin: 0 }}>
          Thank you for choosing Saul G Tattoos.
        </p>
      </div>
    )
  }

  // ── Wizard render ─────────────────────────────────────────────────────────────

  // ── Choice screen: nothing from a previous draft is shown before a choice ──────

  if (gate === 'choose') {
    const age = init.age
    return (
      <div style={{ minHeight: '100vh', background: '#0e0e0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#e8e6df', margin: '0 0 16px', lineHeight: 1.25 }}>
          A consultation form was started on this device
        </h1>
        {age && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#a3a097', margin: '0 0 20px' }}>Last changed {age}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#a3a097', lineHeight: 1.7, maxWidth: 380, margin: '0 0 28px' }}>
          {shared
            ? 'To protect the previous client, only Saul can resume it, from his Consultation page. You can start a new form now.'
            : 'Continue where you left off, or start a new form.'}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!shared && pending.status === 'valid' && (
            <button type="button" onClick={resumeDraft} style={{ minHeight: 48, padding: '0 28px', background: '#c9a96e', color: '#0e0e0d', border: 'none', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Continue
            </button>
          )}
          <button type="button" onClick={resetToEmpty} style={{ minHeight: 48, padding: '0 28px', background: 'transparent', color: '#c9a96e', border: '1px solid #c9a96e', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Start fresh
          </button>
        </div>
      </div>
    )
  }

  const step = STEPS[currentStep]
  const progressPct = ((currentStep + 1) / 7) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0d', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 15,
          fontWeight: 600,
          color: '#e8e6df',
          paddingBottom: 18,
        }}>
          Saul Gutierrez&#8199;|&#8199;Tattoo Artist
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingBottom: 12, flexWrap: 'wrap' }}>
          {confirmNew ? (
            <>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df' }}>Clear this form for the next client?</span>
              <button type="button" onClick={resetToEmpty} style={{ minHeight: 44, padding: '0 16px', background: '#c9a96e', color: '#0e0e0d', border: 'none', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Yes, clear it</button>
              <button type="button" onClick={() => setConfirmNew(false)} style={{ minHeight: 44, padding: '0 16px', background: 'transparent', color: '#a3a097', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmNew(true)} style={{ minHeight: 44, padding: '0 16px', background: 'transparent', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.45)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer' }}>
              Start new client
            </button>
          )}
        </div>
        <div style={{ height: 1, background: 'rgba(201,169,110,0.15)' }} />
      </div>

      {/* Wizard body */}
      <div style={{ flex: 1, padding: '24px 20px 40px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e' }}>
              Step {currentStep + 1} of 7: {step.label}
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
      </div>

      {/* Footer */}
      <div style={{
        padding: '0 0 20px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'rgba(232,230,223,0.2)',
        flexShrink: 0,
      }}>
        Powered by MACRI
      </div>
    </div>
  )
}
