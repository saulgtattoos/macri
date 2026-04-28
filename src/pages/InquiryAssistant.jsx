import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mkClient, mkComm, loadClients, saveClients } from './CRM'

// ─── constants ────────────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'email',    label: '✉️  Email / Website Form', promptLabel: 'Email or Website Form' },
  { id: 'social',   label: '📱  Social Media DM',      promptLabel: 'Social Media DM (Instagram, Facebook, TikTok, or similar)' },
  { id: 'text',     label: '💬  Text Message',          promptLabel: 'Text Message' },
  { id: 'referral', label: '👥  Referral',              promptLabel: 'Referral' },
]

const TIMINGS = [
  { id: 'recent',  label: 'Recent',         sub: '1–3 days' },
  { id: 'delayed', label: 'Delayed',        sub: '4–14 days' },
  { id: 'late',    label: 'Extremely Late', sub: '2+ weeks' },
]

const CONTENT_TYPES = [
  { id: 'quote',         label: 'Quote & Pricing' },
  { id: 'consult',       label: 'Invite to Consult' },
  { id: 'followup',      label: 'Unfinished Follow-up' },
  { id: 'notfit',        label: 'Not a Fit' },
  { id: 'clientpricing', label: 'Client Chooses Pricing' },
]

const PRICING_MODELS = [
  { id: 'hourly',  label: 'Hourly',          sub: '$250/hr' },
  { id: 'flat',    label: 'Flat Rate',       sub: 'per piece' },
  { id: 'halfday', label: 'Half Day',        sub: 'flat' },
  { id: 'fullday', label: 'Full Day',        sub: 'flat' },
  { id: 'custom',  label: 'Custom Pricing',  sub: 'enter amount' },
]

const CUSTOM_PRICE_MODELS = new Set(['flat', 'halfday', 'fullday', 'custom'])

const CONSULT_LINK = 'SaulsAppointments.as.me/TattooConsultation'

const STEP_META = [
  null,
  { title: 'Source',           description: 'Which channel did this inquiry come from?' },
  { title: 'Response Timing',  description: 'How quickly are you responding?' },
  { title: 'Response Goal',    description: 'What is the purpose of this reply?' },
  { title: 'Pricing Model',    description: 'How do you charge for this session?' },
  { title: 'Options',          description: 'Any extra context for this response?' },
  { title: 'Client Inquiry',   description: 'Paste the client message below.' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

const TEXT_TEMPLATES = {
  recent: [
    'Hi [FirstName]!',
    '',
    'This is Saul, the tattoo artist you reached out to.',
    '',
    "I just sent you a detailed email about your inquiry. Take a look when you get a chance, and if you don't see it check your spam or junk folder.",
    '',
    'Looking forward to hearing from you and hopefully getting the chance to work together soon!',
    '',
    'Thank You,',
    'Saul | Private Studio, Elk Grove',
  ].join('\n'),

  delayed: [
    'Hi [FirstName]!',
    '',
    'This is Saul, the tattoo artist you reached out to. I apologize for the delay in getting back to you.',
    '',
    "I just sent you a detailed email about your inquiry. Take a look when you get a chance, and if you don't see it check your spam or junk folder.",
    '',
    'Looking forward to hearing from you and hopefully getting the chance to work together soon!',
    '',
    'Thank You,',
    'Saul | Private Studio, Elk Grove',
  ].join('\n'),

  late: [
    'Hi [FirstName]!',
    '',
    'This is Saul, the tattoo artist you reached out to. I sincerely apologize for how long it has taken me to get back to you. That is on me and I am truly sorry.',
    '',
    'I just sent you a detailed email about your inquiry. I completely understand if your plans have changed, but I still wanted to reach out personally.',
    '',
    'Looking forward to hearing from you and hopefully getting the chance to work together soon!',
    '',
    'Thank You,',
    'Saul | Private Studio, Elk Grove',
  ].join('\n'),
}

function buildPrompt({ source, timing, contentType, pricingModel, customPrice, includeConsultLink, isCoverup, inquiry }) {
  const sourceLabel  = SOURCES.find(s => s.id === source)?.promptLabel ?? source
  const timingObj    = TIMINGS.find(t => t.id === timing)
  const contentLabel = CONTENT_TYPES.find(c => c.id === contentType)?.label ?? contentType
  const pricingObj   = PRICING_MODELS.find(p => p.id === pricingModel)

  const pricingNote = pricingModel === 'hourly'
    ? 'Hourly at $250/hr'
    : CUSTOM_PRICE_MODELS.has(pricingModel) && customPrice
    ? `The artist has set a custom price. Reference it directly in the email using the exact amount or description provided: ${customPrice}. Do not use generic hourly rate language.`
    : pricingModel === 'custom'
    ? 'Custom pricing (specific amount not yet provided — do not mention a rate).'
    : (pricingObj?.label ?? pricingModel)

  const timingNote = timingObj
    ? `${timingObj.label} (${timingObj.sub}) — ${
        timing === 'recent'  ? 'no apology needed' :
        timing === 'delayed' ? 'brief, genuine acknowledgment of the delay' :
                               'sincere apology for the very late reply'
      }`
    : timing

  const coverupLine = isCoverup
    ? '\n- NOTE: This is a cover-up tattoo inquiry — acknowledge the added complexity.'
    : ''
  const consultLine = includeConsultLink
    ? `\n- INCLUDE this consultation booking link naturally in the message: ${CONSULT_LINK}`
    : ''

  const textTemplate = TEXT_TEMPLATES[timing] ?? TEXT_TEMPLATES.recent

  const lines = [
    'You are composing a client response on behalf of Saul Gutierrez, a tattoo artist based in Elk Grove, CA with a private studio. Saul specializes in Watercolor, Black and Gray Realism, Sketch Art, Abstract, and Stippled/Pointillism tattoos. His standard rate is $250/hr.',
    '',
    'Context for this response:',
    `- CHANNEL: Client reached out via ${sourceLabel}`,
    `- RESPONSE TIMING: ${timingNote}`,
    `- RESPONSE GOAL: ${contentLabel}`,
    `- PRICING: ${pricingNote}` + coverupLine + consultLine,
    '',
    "Client's inquiry:",
    '"""',
    inquiry.trim(),
    '"""',
    '',
    'Write a response that sounds like Saul — professional, warm, concise, and confident. No filler phrases like "I hope this message finds you well." Get to the point quickly.',
    '',
    'CRITICAL FORMATTING RULES — apply to ALL output (email subject, email body, text message):',
    '- NEVER use hyphens (-), en dashes (–), or em dashes (—) anywhere in your writing.',
    '- Use a period or comma where you would otherwise use a dash.',
    '- The ONLY allowed exception is the pipe character | in the signature line.',
    '- This rule is absolute. Do not break it for any reason.',
    '',
    'For the "text" field, use the exact template below. Replace [FirstName] with the client\'s first name extracted from their inquiry (if no name is found, use "there"). Do not change any other wording. Preserve every line break exactly as shown. Do not add pricing, rates, or links of any kind. The pipe character | is allowed only in the signature line. NEVER use hyphens, en dashes, or em dashes anywhere in the text output.',
    '',
    'TEXT TEMPLATE:',
    textTemplate,
    '',
    'Return ONLY a valid JSON object with exactly these four fields:',
    '{',
    '  "subject": "<email subject line, 6–10 words>",',
    '  "email": "<full email or DM response, signed: Saul | Private Studio, Elk Grove>",',
    '  "text": "<the completed text message using the template above, with [FirstName] replaced>",',
    '  "client": {',
    '    "name": "<client full name if found in the inquiry, else empty string>",',
    '    "email": "<email address if present in the inquiry, else empty string>",',
    '    "phone": "<phone number if present in the inquiry, else empty string>",',
    '    "instagram": "<instagram handle without @, if present, else empty string>",',
    '    "tattooIdea": "<brief description of what they want tattooed>",',
    '    "style": "<tattoo style if mentioned, else empty string>",',
    '    "placement": "<body placement if mentioned, else empty string>",',
    '    "size": "<size if mentioned, else empty string>"',
    '  }',
    '}',
    '',
    'No markdown, no code fences, no explanation — raw JSON only.',
  ]

  return lines.join('\n')
}

async function callClaude(prompt) {
  const key = import.meta.env.VITE_ANTHROPIC_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_KEY is not set in your .env file.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text ?? ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)
  const stripDashes = s =>
    typeof s === 'string' ? s.replace(/[-–—]/g, ' ').replace(/ {2,}/g, ' ').trim() : s
  return {
    ...parsed,
    subject: stripDashes(parsed.subject),
    email:   stripDashes(parsed.email),
    text:    stripDashes(parsed.text),
  }
}

// ─── CRM activity helpers ─────────────────────────────────────────────────────

function extractFirstName(emailText) {
  const m = emailText?.match(/(?:Hi|Hey)[,!]?\s+([A-Za-z]+)/m)
  return m ? m[1] : null
}

function findCRMClient(firstName) {
  if (!firstName) return null
  try {
    const clients = loadClients()
    const lower = firstName.toLowerCase()
    return clients.find(c => c.name?.split(' ')[0]?.toLowerCase() === lower) ?? null
  } catch { return null }
}

function logClientActivity(clientId, text) {
  try {
    const clients = loadClients()
    const updated = clients.map(c => {
      if (c.id !== clientId) return c
      const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), text }
      return { ...c, activityLog: [entry, ...(c.activityLog || [])], updatedAt: new Date().toISOString() }
    })
    saveClients(updated)
  } catch { /* silent */ }
}

function tickJourneyResponseSent(clientId) {
  try {
    const clients = loadClients()
    const updated = clients.map(c => {
      if (c.id !== clientId) return c
      const checklist = [...(c.journeyChecklist || [false, false, false, false, false, false])]
      if (checklist[1]) return c  // already ticked
      checklist[1] = true
      const logText = `${logDate()} Inquiry response sent.`
      const entry   = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), text: logText }
      return {
        ...c,
        journeyChecklist: checklist,
        activityLog: [entry, ...(c.activityLog || [])],
        updatedAt: new Date().toISOString(),
      }
    })
    saveClients(updated)
  } catch { /* silent */ }
}

function advanceToInquiryResponse(clientId) {
  try {
    const clients = loadClients()
    const updated = clients.map(c => {
      if (c.id !== clientId || c.stage !== 'Inquiry') return c
      const logText = `${logDate()} Response sent. Stage updated to Inquiry Response.`
      const entry   = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), text: logText }
      return {
        ...c,
        stage: 'Inquiry Response',
        activityLog: [entry, ...(c.activityLog || [])],
        updatedAt: new Date().toISOString(),
      }
    })
    saveClients(updated)
  } catch { /* silent */ }
}

function logDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── draft persistence (localStorage — survives app-switch on iOS) ───────────

const DRAFT_KEY = 'macri_inquiry_draft'

function loadSession() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') ?? {} }
  catch { return {} }
}
function saveSession(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
}
function clearSession() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

// ─── clipboard (iOS Safari safe) ─────────────────────────────────────────────

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return } catch {}
  }
  const el = Object.assign(document.createElement('textarea'), {
    value: text, readOnly: true,
  })
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, el.value.length)
  document.execCommand('copy')
  document.body.removeChild(el)
}

// ─── hooks ────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          Step {current} of {total}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: current === total ? 'var(--gold)' : 'var(--muted)',
          letterSpacing: '0.08em',
        }}>
          {Math.round((current / total) * 100)}%
        </span>
      </div>
      <div style={{ display: 'flex', gap: '3px' }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i < current ? 'var(--gold)' : 'var(--surface2)',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
    </div>
  )
}

function StepHeading({ title, description }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600,
        color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: '5px',
      }}>
        {title}
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)' }}>
        {description}
      </p>
    </div>
  )
}

function ChipGroup({ options, value, onChange, singleColumn = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: singleColumn ? '1fr' : 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '8px',
    }}>
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onChange(active ? null : opt.id)}
            style={{
              background: active ? 'rgba(201,169,110,0.12)' : 'var(--surface2)',
              border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
              borderRadius: '7px',
              padding: opt.sub ? '10px 14px' : '11px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--gold)' : 'var(--text)',
              lineHeight: 1.3,
            }}>
              {opt.label}
            </div>
            {opt.sub && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: active ? 'var(--gold)' : 'var(--muted)',
                opacity: active ? 0.8 : 1, marginTop: '2px',
              }}>
                {opt.sub}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <div style={{
        width: '38px', height: '22px', borderRadius: '11px',
        background: value ? 'var(--gold)' : 'var(--surface2)',
        position: 'relative', transition: 'background 0.15s', flexShrink: 0,
        border: `1px solid ${value ? 'var(--gold)' : 'var(--muted)'}`,
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: value ? 'var(--bg)' : 'var(--muted)',
          position: 'absolute', top: '2px',
          left: value ? '18px' : '2px',
          transition: 'left 0.15s, background 0.15s',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '14px',
        color: value ? 'var(--text)' : 'var(--muted)',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </button>
  )
}

function CountdownRing() {
  // SVG: size=48, sw=4, r=22 — matches ring-deplete keyframe in index.css
  return (
    <svg
      width={48} height={48}
      style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-90deg)',
        pointerEvents: 'none', overflow: 'visible',
      }}
    >
      <circle
        cx={24} cy={24} r={22}
        fill="none"
        stroke="#c9a96e"
        strokeWidth={2.5}
        strokeDasharray={138.23}
        strokeDashoffset={0}
        strokeLinecap="round"
        style={{ animation: 'ring-deplete 2500ms linear forwards' }}
      />
    </svg>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function InquiryAssistant() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Initialise from sessionStorage so state survives app-switches and refreshes
  const [showOutput,         setShowOutput]        = useState(() => loadSession().showOutput         ?? false)
  const [source,             setSource]            = useState(() => loadSession().source             ?? null)
  const [timing,             setTiming]            = useState(() => loadSession().timing             ?? null)
  const [contentType,        setContentType]       = useState(() => loadSession().contentType        ?? null)
  const [pricingModel,       setPricingModel]      = useState(() => loadSession().pricingModel       ?? null)
  const [customPrice,        setCustomPrice]       = useState(() => loadSession().customPrice        ?? '')
  const [includeConsultLink, setIncludeConsultLink] = useState(() => loadSession().includeConsultLink ?? false)
  const [isCoverup,          setIsCoverup]         = useState(() => loadSession().isCoverup          ?? false)
  const [inquiry,            setInquiry]           = useState(() => loadSession().inquiry            ?? '')
  const [loading,            setLoading]           = useState(false)
  const [output,             setOutput]            = useState(() => loadSession().output             ?? null)
  const [activeTab,          setActiveTab]         = useState(() => loadSession().activeTab          ?? 'email')
  const [copied,             setCopied]            = useState(null)
  const [error,              setError]             = useState(null)
  const [savedToCRM,         setSavedToCRM]        = useState(() => loadSession().savedToCRM         ?? false)
  const [editedEmail,        setEditedEmail]       = useState(() => loadSession().editedEmail        ?? '')
  const [editedText,         setEditedText]        = useState(() => loadSession().editedText         ?? '')
  const [sentAction,         setSentAction]        = useState(null)

  const pageRef    = useRef(null)
  const crmSaveRef = useRef(false)

  const showCustomPrice = CUSTOM_PRICE_MODELS.has(pricingModel)
  const canGenerate     = !!source && !!timing && !!contentType && !!pricingModel && inquiry.trim().length > 10

  useEffect(() => {
    if (showOutput) document.querySelector('main')?.scrollTo({ top: 0 })
  }, [showOutput])

  // Persist form + output to sessionStorage on every change
  useEffect(() => {
    saveSession({
      showOutput, source, timing, contentType, pricingModel, customPrice,
      includeConsultLink, isCoverup, inquiry, output,
      activeTab, savedToCRM, editedEmail, editedText,
    })
  }, [showOutput, source, timing, contentType, pricingModel, customPrice,
      includeConsultLink, isCoverup, inquiry, output,
      activeTab, savedToCRM, editedEmail, editedText])

  // Sync editable state when output arrives
  useEffect(() => {
    if (output) {
      setEditedEmail(output.email || '')
      setEditedText(output.text  || '')
    }
  }, [output])

  async function handleGenerate() {
    setError(null)
    setOutput(null)
    setSavedToCRM(false)
    setLoading(true)
    try {
      const prompt = buildPrompt({ source, timing, contentType, pricingModel, customPrice, includeConsultLink, isCoverup, inquiry })
      const result = await callClaude(prompt)
      setOutput(result)
      setActiveTab('email')
      setShowOutput(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    clearSession()
    crmSaveRef.current = false
    setShowOutput(false)
    setSource(null)
    setTiming(null)
    setContentType(null)
    setPricingModel(null)
    setCustomPrice('')
    setIncludeConsultLink(false)
    setIsCoverup(false)
    setInquiry('')
    setOutput(null)
    setError(null)
    setSavedToCRM(false)
    setEditedEmail('')
    setEditedText('')
    setSentAction(null)
  }

  async function handleCopy(type) {
    const text = type === 'email'
      ? `Subject: ${output.subject}\n\n${editedEmail}`
      : editedText
    await copyToClipboard(text)

    const firstName = extractFirstName(editedEmail)
    const crmClient = findCRMClient(firstName)
    if (crmClient) {
      const channel = type === 'email' ? 'Email' : 'Text'
      logClientActivity(crmClient.id, `${logDate()} ${channel} copied via Inquiry Assistant.`)
      advanceToInquiryResponse(crmClient.id)
      tickJourneyResponseSent(crmClient.id)
    }
    const action = type === 'email' ? 'copyEmail' : 'copyText'
    setSentAction(action)
    setTimeout(() => setSentAction(null), 2500)
  }

  function handleOpenInGmail() {
    const firstName = extractFirstName(editedEmail)
    const crmClient = findCRMClient(firstName)
    const toEmail   = crmClient?.email || output?.client?.email || ''
    const subject   = encodeURIComponent(output?.subject || '')
    const body      = encodeURIComponent(editedEmail)

    if (isMobile) {
      // iOS Gmail app deep link
      window.location.href = `googlegmail:///co?to=${encodeURIComponent(toEmail)}&subject=${subject}&body=${body}`
    } else {
      window.open(`mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`)
    }

    if (crmClient) {
      logClientActivity(crmClient.id, `${logDate()} Email sent via Inquiry Assistant.`)
      advanceToInquiryResponse(crmClient.id)
      tickJourneyResponseSent(crmClient.id)
    }
    setSentAction('gmail')
    setTimeout(() => setSentAction(null), 2500)
  }

  function handleOpenInMessages() {
    const firstName = extractFirstName(editedEmail)
    const crmClient = findCRMClient(firstName)
    const phone     = crmClient?.phone || output?.client?.phone || ''
    const body      = encodeURIComponent(editedText)

    // Use <a> click instead of location.href — avoids iOS page-reload on return
    const a = document.createElement('a')
    a.href = `sms:${phone}?body=${body}`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 200)

    if (crmClient) {
      logClientActivity(crmClient.id, `${logDate()} Text message sent via Inquiry Assistant.`)
      advanceToInquiryResponse(crmClient.id)
      tickJourneyResponseSent(crmClient.id)
    }
    setSentAction('messages')
    setTimeout(() => setSentAction(null), 2500)
  }

  function handleSaveToCRM() {
    if (savedToCRM || !output || crmSaveRef.current) return
    crmSaveRef.current = true

    const c   = output.client ?? {}
    const now = new Date().toISOString()

    const newComms = []
    if (editedEmail) newComms.push(mkComm({ channel: 'Email',        subject: output.subject ?? '', body: editedEmail, timestamp: now }))
    if (editedText)  newComms.push(mkComm({ channel: 'Text Message', body: editedText, timestamp: now }))

    try {
      const clients     = loadClients()
      const clientName  = c.name  || ''
      const clientEmail = c.email || ''

      let existingIdx = -1
      if (clientName) {
        const first = clientName.split(' ')[0].toLowerCase()
        existingIdx = clients.findIndex(cl => cl.name?.split(' ')[0]?.toLowerCase() === first)
      }
      if (existingIdx < 0 && clientEmail) {
        existingIdx = clients.findIndex(cl => cl.email?.toLowerCase() === clientEmail.toLowerCase())
      }

      if (existingIdx >= 0) {
        const existing = clients[existingIdx]
        clients[existingIdx] = {
          ...existing,
          communications: [...newComms, ...(existing.communications || [])],
          activityLog: [{ id: crypto.randomUUID(), timestamp: now, text: `${logDate()} Response logged from Inquiry Assistant.` }, ...(existing.activityLog || [])],
          updatedAt: now,
        }
        saveClients(clients)
      } else {
        const client = mkClient({
          name: clientName, email: clientEmail, phone: c.phone || '',
          tattooIdea: c.tattooIdea || '', style: c.style || '',
          placement: c.placement || '', size: c.size || '',
          stage: 'Inquiry', status: null, consultationCount: 0,
          communications: newComms,
          activityLog: [{ id: crypto.randomUUID(), timestamp: now, text: `${logDate()} Added from Inquiry Assistant.` }],
        })
        saveClients([client, ...clients])
      }

      setSavedToCRM(true)
      clearSession()
    } catch (err) {
      console.error('[MACRI] CRM save failed:', err)
      crmSaveRef.current = false
    }
  }

  // Derived for desktop phone display in text tab
  const resolvedPhone = (() => {
    if (!output) return ''
    const firstName = extractFirstName(editedEmail)
    const crmClient = findCRMClient(firstName)
    return crmClient?.phone || output?.client?.phone || ''
  })()

  const outputTextareaBase = {
    width: '100%',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    lineHeight: '1.7',
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    padding: '4px',
    margin: 0,
    boxSizing: 'border-box',
    minHeight: '220px',
    transition: 'border-color 0.12s',
  }

  const actionBtnBase = {
    borderRadius: '6px', padding: '8px 18px',
    fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
    touchAction: 'manipulation',
  }

  return (
    <div ref={pageRef} className="page-content" style={{ maxWidth: '680px', margin: '0 auto' }}>

      {/* page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--gold)', marginBottom: '8px',
        }}>
          tool / inquiry assistant
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 600,
          color: 'var(--text)', letterSpacing: '-0.01em',
        }}>
          Inquiry Assistant
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
          {!showOutput
            ? 'Configure the context, paste the inquiry, generate a response.'
            : 'Your response is ready. Edit, copy, and send.'}
        </p>
      </div>

      {/* ── form ── */}
      {!showOutput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* 1. Source + Inquiry */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Inquiry Source
            </div>
            <ChipGroup options={SOURCES} value={source} onChange={setSource} singleColumn={isMobile} />
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                Client's Message
              </div>
              <textarea
                placeholder="Paste the client's message here…"
                value={inquiry}
                onChange={e => setInquiry(e.target.value)}
                rows={7}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--surface2)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontFamily: 'var(--font-body)', fontSize: '13px',
                  lineHeight: '1.6', color: 'var(--text)',
                  resize: 'vertical', outline: 'none',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
              />
            </div>
          </div>

          {/* 2. Response Timing */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Response Timing
            </div>
            <ChipGroup options={TIMINGS} value={timing} onChange={setTiming} />
          </div>

          {/* 3. Response Goal */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Response Goal
            </div>
            <ChipGroup options={CONTENT_TYPES} value={contentType} onChange={setContentType} />
          </div>

          {/* 4. Pricing */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Pricing Model
            </div>
            <ChipGroup
              options={PRICING_MODELS}
              value={pricingModel}
              onChange={v => { setPricingModel(v); if (!CUSTOM_PRICE_MODELS.has(v)) setCustomPrice('') }}
            />
            {showCustomPrice && (
              <div style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="e.g. 600 or $500 flat rate"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--surface2)',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontFamily: 'var(--font-mono)', fontSize: '13px',
                    color: 'var(--text)', width: '220px', outline: 'none',
                    transition: 'border-color 0.12s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = 'transparent'}
                />
              </div>
            )}
          </div>

          {/* 5. Options */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
              Options
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <Toggle label="Include consultation booking link" value={includeConsultLink} onChange={setIncludeConsultLink} />
              <Toggle label="Cover-up tattoo" value={isCoverup} onChange={setIsCoverup} />
            </div>
          </div>

          {/* Generate */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              style={{
                background: canGenerate && !loading ? 'var(--gold)' : 'var(--surface2)',
                color: canGenerate && !loading ? 'var(--bg)' : 'var(--muted)',
                border: 'none', borderRadius: '7px', padding: '13px 32px',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              {loading ? 'Generating…' : 'Generate Response'}
            </button>

            {error && (
              <div style={{
                marginTop: '14px',
                background: 'rgba(255,80,80,0.08)',
                border: '1px solid rgba(255,80,80,0.25)',
                borderRadius: '7px',
                padding: '12px 16px',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                color: '#ff8080',
              }}>
                {error}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── results ── */}
      {showOutput && output && (
        <div>
          {import.meta.env.DEV && console.log('[MACRI save-to-crm]', { hasOutput: !!output, outputClientName: output?.client?.name, savedToCRM, crmSaveRef: crmSaveRef.current }) && false}

          {/* selections summary */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              SOURCES.find(s => s.id === source)?.promptLabel,
              TIMINGS.find(t => t.id === timing)?.label,
              CONTENT_TYPES.find(c => c.id === contentType)?.label,
            ].filter(Boolean).map(label => (
              <span key={label} style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em',
                color: 'var(--muted)', padding: '3px 8px',
                background: 'var(--surface2)', borderRadius: '4px',
              }}>
                {label}
              </span>
            ))}
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '10px',
            position: 'relative',
          }}>
            {/* tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface2)', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
              {['email', 'text'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'none', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '12px',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? 'var(--gold)' : 'var(--muted)',
                    textTransform: 'capitalize', letterSpacing: '0.04em',
                    transition: 'color 0.12s', marginBottom: '-1px',
                  }}
                >
                  {tab === 'email' ? 'Email / DM' : 'Text Message'}
                </button>
              ))}
            </div>

            {/* content */}
            <div style={{ padding: '20px' }}>

              {/* ── Email tab ── */}
              {activeTab === 'email' && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    color: 'var(--muted)', marginBottom: '4px', letterSpacing: '0.06em',
                  }}>
                    SUBJECT
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                    color: 'var(--text)', marginBottom: '16px',
                    padding: '8px 12px', background: 'var(--surface2)', borderRadius: '5px',
                  }}>
                    {output.subject}
                  </div>

                  <textarea
                    value={editedEmail}
                    onChange={e => setEditedEmail(e.target.value)}
                    style={outputTextareaBase}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                  />

                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => handleCopy('email')}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'copyEmail' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'copyEmail' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'copyEmail' ? '#7aab8f' : 'var(--muted)',
                          fontFamily: sentAction === 'copyEmail' ? 'var(--font-mono)' : 'var(--font-body)',
                        }}
                      >
                        {sentAction === 'copyEmail' ? '✓ Logged' : 'Copy Email'}
                      </button>
                      {sentAction === 'copyEmail' && <CountdownRing />}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={handleOpenInGmail}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'gmail' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'gmail' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'gmail' ? '#7aab8f' : 'var(--muted)',
                          fontFamily: sentAction === 'gmail' ? 'var(--font-mono)' : 'var(--font-body)',
                        }}
                      >
                        {sentAction === 'gmail' ? '✓ Logged' : 'Open in Gmail'}
                      </button>
                      {sentAction === 'gmail' && <CountdownRing />}
                    </div>

                    <button
                      onClick={savedToCRM ? undefined : handleSaveToCRM}
                      style={{
                        ...actionBtnBase,
                        background: savedToCRM ? 'rgba(201,169,110,0.12)' : 'var(--surface2)',
                        border: `1px solid ${savedToCRM ? 'var(--gold)' : 'transparent'}`,
                        color: savedToCRM ? 'var(--gold)' : 'var(--muted)',
                        cursor: savedToCRM ? 'default' : 'pointer',
                        pointerEvents: savedToCRM ? 'none' : 'auto',
                        position: 'relative', zIndex: 10,
                      }}
                    >
                      {savedToCRM
                        ? `${output?.client?.name ? output.client.name.split(' ')[0] : 'Client'} added to CRM`
                        : 'Save to CRM'}
                    </button>
                  </div>
                </>
              )}

              {/* ── Text tab ── */}
              {activeTab === 'text' && (
                <>
                  <textarea
                    value={editedText}
                    onChange={e => setEditedText(e.target.value)}
                    style={outputTextareaBase}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                  />

                  {/* Desktop phone reference */}
                  {!isMobile && resolvedPhone && (
                    <div style={{
                      marginTop: '14px',
                      fontFamily: 'var(--font-mono)', fontSize: '11px',
                      color: 'var(--muted)', letterSpacing: '0.06em',
                    }}>
                      {resolvedPhone}
                    </div>
                  )}

                  <div style={{ marginTop: !isMobile && resolvedPhone ? '8px' : '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => handleCopy('text')}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'copyText' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'copyText' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'copyText' ? '#7aab8f' : 'var(--muted)',
                          fontFamily: sentAction === 'copyText' ? 'var(--font-mono)' : 'var(--font-body)',
                        }}
                      >
                        {sentAction === 'copyText' ? '✓ Logged' : 'Copy Text'}
                      </button>
                      {sentAction === 'copyText' && <CountdownRing />}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={handleOpenInMessages}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'messages' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'messages' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'messages' ? '#7aab8f' : 'var(--muted)',
                          fontFamily: sentAction === 'messages' ? 'var(--font-mono)' : 'var(--font-body)',
                        }}
                      >
                        {sentAction === 'messages' ? '✓ Logged' : 'Open in Messages'}
                      </button>
                      {sentAction === 'messages' && <CountdownRing />}
                    </div>

                    <button
                      onClick={savedToCRM ? undefined : handleSaveToCRM}
                      style={{
                        ...actionBtnBase,
                        background: savedToCRM ? 'rgba(201,169,110,0.12)' : 'var(--surface2)',
                        border: `1px solid ${savedToCRM ? 'var(--gold)' : 'transparent'}`,
                        color: savedToCRM ? 'var(--gold)' : 'var(--muted)',
                        cursor: savedToCRM ? 'default' : 'pointer',
                        pointerEvents: savedToCRM ? 'none' : 'auto',
                        position: 'relative', zIndex: 10,
                      }}
                    >
                      {savedToCRM
                        ? `${output?.client?.name ? output.client.name.split(' ')[0] : 'Client'} added to CRM`
                        : 'Save to CRM'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* result navigation */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setShowOutput(false)}
              style={{
                flex: 1, minHeight: '44px',
                background: 'var(--surface2)', border: '1px solid transparent',
                borderRadius: '8px', padding: '10px 20px',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                color: 'var(--gold)', cursor: 'pointer', transition: 'opacity 0.15s',
              }}
            >
              Back to Edit
            </button>
            <button
              onClick={() => { clearSession(); navigate('/') }}
              style={{
                flex: 1, minHeight: '44px',
                background: 'var(--surface2)', border: '1px solid transparent',
                borderRadius: '8px', padding: '10px 20px',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                color: 'var(--muted)', cursor: 'pointer', transition: 'opacity 0.15s',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
