import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { mkClient, mkComm } from './CRM'
import { saveClient, loadClients } from '../lib/crmService'
import { matchClient } from '../lib/clientMatch'
import { apiPost, claudeFetch } from '../lib/api'
import { recordReplyOpened, markReplySent, loadReplies, replyId } from '../lib/replyService'
import ReplyStatusControl from '../components/ReplyStatusControl'
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
    'You are composing a client response on behalf of Saul Gutierrez, a tattoo artist based in Elk Grove, CA with a private studio. Saul specializes in Watercolor, Black and Gray Realism, Sketch Art, Abstract, and Stippled/Pointillism tattoos. His standard rate is $250/hr. STRICT RULES: Never use hyphens, dashes, or em dashes anywhere in your output. Use commas, periods, or line breaks instead. The pipe character | is only allowed in the signature line.',
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
  const res = await claudeFetch({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
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

// ─── phone + email helpers ────────────────────────────────────────────────────

function isValidPhone(raw) {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 11 ? `+${digits}` : `+1${digits}`
}

function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

function logDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── draft persistence ────────────────────────────────────────────────────────

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

// ─── clipboard ────────────────────────────────────────────────────────────────

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

  const [showOutput,         setShowOutput]         = useState(() => loadSession().showOutput         ?? false)
  const [source,             setSource]             = useState(() => loadSession().source             ?? null)
  const [timing,             setTiming]             = useState(() => loadSession().timing             ?? null)
  const [contentType,        setContentType]        = useState(() => loadSession().contentType        ?? null)
  const [pricingModel,       setPricingModel]       = useState(() => loadSession().pricingModel       ?? null)
  const [customPrice,        setCustomPrice]        = useState(() => loadSession().customPrice        ?? '')
  const [includeConsultLink, setIncludeConsultLink] = useState(() => loadSession().includeConsultLink ?? false)
  const [isCoverup,          setIsCoverup]          = useState(() => loadSession().isCoverup          ?? false)
  const [inquiry,            setInquiry]            = useState(() => loadSession().inquiry            ?? '')
  const [loading,            setLoading]            = useState(false)
  const [output,             setOutput]             = useState(() => loadSession().output             ?? null)
  const [activeTab,          setActiveTab]          = useState(() => loadSession().activeTab          ?? 'email')
  const [copied,             setCopied]             = useState(null)
  const [error,              setError]              = useState(null)
  const [savedToCRM,         setSavedToCRM]         = useState(() => loadSession().savedToCRM         ?? false)
  const [editedEmail,        setEditedEmail]        = useState(() => loadSession().editedEmail        ?? '')
  const [editedText,         setEditedText]         = useState(() => loadSession().editedText         ?? '')
  const [sentAction,         setSentAction]         = useState(null)
  // Reply sent status: each generated draft has an id; Save to CRM ties it to one client.
  const [draftId,            setDraftId]            = useState(() => loadSession().draftId ?? (loadSession().output ? crypto.randomUUID() : null))
  const [tiedClient,         setTiedClient]         = useState(() => loadSession().tiedClient         ?? null)
  const [replies,            setReplies]            = useState({})
  const [clientChoice,       setClientChoice]       = useState(null)  // candidates when the client is not certain
  // Server sends accepted for this draft (by channel), kept so a reload cannot send twice.
  const [providerSent,       setProviderSent]       = useState(() => loadSession().providerSent       ?? {})
  const [sendNotice,         setSendNotice]         = useState({})    // by channel: { kind, text }
  const [sendConfirm,        setSendConfirm]        = useState(null)  // channel waiting for "send without tracking"
  const [recipientPhone, setRecipientPhone] = useState(() => loadSession().recipientPhone ?? '')
  const [smsSending,     setSmsSending]     = useState(false)
  const [logSmsToCRM,    setLogSmsToCRM]    = useState(true)

  const [recipientEmail, setRecipientEmail] = useState(() => loadSession().recipientEmail ?? '')
  const [emailSending,   setEmailSending]   = useState(false)
  const [logEmailToCRM,  setLogEmailToCRM]  = useState(true)

  const pageRef    = useRef(null)
  const crmSaveRef = useRef(false)

  const showCustomPrice = CUSTOM_PRICE_MODELS.has(pricingModel)
  const canGenerate     = !!source && !!timing && !!contentType && !!pricingModel && inquiry.trim().length > 10
  // A reply already accepted by Resend or Twilio for this draft cannot be sent again from here.
  const acceptedBy = (channel) => providerSent[channel] || (replies[channel]?.provider_id ? { via: replies[channel].provider } : null)
  const canSendSms      = isValidPhone(recipientPhone) && editedText.trim().length > 0 && !smsSending && !acceptedBy('text')
  const canSendEmail    = isValidEmail(recipientEmail) && editedEmail.trim().length > 0 && !emailSending && !acceptedBy('email')

  useEffect(() => {
    if (showOutput) document.querySelector('main')?.scrollTo({ top: 0 })
  }, [showOutput])

  useEffect(() => {
    saveSession({
      showOutput, source, timing, contentType, pricingModel, customPrice,
      includeConsultLink, isCoverup, inquiry, output,
      activeTab, savedToCRM, editedEmail, editedText,
      recipientPhone, recipientEmail, draftId, tiedClient, providerSent,
    })
  }, [showOutput, source, timing, contentType, pricingModel, customPrice,
      includeConsultLink, isCoverup, inquiry, output,
      activeTab, savedToCRM, editedEmail, editedText,
      recipientPhone, recipientEmail, draftId, tiedClient, providerSent])

  // Recorded status of this draft's replies (after Save to CRM ties it to a client).
  useEffect(() => {
    if (!tiedClient?.id || !draftId) return
    let active = true
    loadReplies(tiedClient.id).then(({ replies: rows }) => {
      if (!active) return
      const mine = {}
      for (const row of rows) if (row.id === replyId(draftId, row.channel)) mine[row.channel] = row
      setReplies(mine)
    })
    return () => { active = false }
  }, [tiedClient, draftId])

  function replyFields(channel) {
    return channel === 'email'
      ? { id: replyId(draftId, 'email'), clientId: tiedClient?.id, channel: 'email', subject: output?.subject ?? '', body: editedEmail }
      : { id: replyId(draftId, 'text'), clientId: tiedClient?.id, channel: 'text', subject: null, body: editedText }
  }

  function applyReplyResult(res) {
    if (res?.ok && res.reply) setReplies(prev => ({ ...prev, [res.reply.channel]: res.reply }))
  }

  async function handleGenerate() {
    setError(null)
    setOutput(null)
    setSavedToCRM(false)
    crmSaveRef.current = false
    setDraftId(crypto.randomUUID())
    setTiedClient(null)
    setReplies({})
    setClientChoice(null)
    setProviderSent({})
    setSendNotice({})
    setSendConfirm(null)
    setLoading(true)
    try {
      const prompt = buildPrompt({ source, timing, contentType, pricingModel, customPrice, includeConsultLink, isCoverup, inquiry })
      const result = await callClaude(prompt)
      // Filled once per new draft. A reload keeps Saul's edits and the recipient he typed.
      // Recipients come from the inquiry itself, never from a CRM client guessed by name.
      setEditedEmail(result.email || '')
      setEditedText(result.text || '')
      setRecipientEmail(result.client?.email || '')
      setRecipientPhone(result.client?.phone || '')
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
    setDraftId(null)
    setTiedClient(null)
    setReplies({})
    setClientChoice(null)
    setProviderSent({})
    setSendNotice({})
    setSendConfirm(null)
    setEditedEmail('')
    setEditedText('')
    setSentAction(null)
    setRecipientPhone('')
    setRecipientEmail('')
    setLogSmsToCRM(true)
    setLogEmailToCRM(true)
  }

  async function handleCopy(type) {
    const text = type === 'email'
      ? `Subject: ${output.subject}\n\n${editedEmail}`
      : editedText
    await copyToClipboard(text)
    // Copying is not sending: the client's reply status does not change.
    const action = type === 'email' ? 'copyEmail' : 'copyText'
    setSentAction(action)
    setTimeout(() => setSentAction(null), 2500)
  }

  // ─── UPDATED: Open in Gmail uses direct Gmail compose URL ─────────────────
  function handleOpenInGmail() {
    const toEmail   = recipientEmail || output?.client?.email || ''
    const subject   = encodeURIComponent(`Tattoo Inquiry: ${output?.client?.name || 'New Client'} | Saul Gutierrez`)
    const body      = encodeURIComponent(editedEmail)

    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(toEmail)}&su=${subject}&body=${body}`
    window.open(gmailUrl, '_blank')

    // Opening is not sending: only the open is recorded; Mark as sent confirms it.
    if (tiedClient?.id) recordReplyOpened({ ...replyFields('email'), app: 'gmail' }).then(applyReplyResult)
    setSentAction('gmail')
    setTimeout(() => setSentAction(null), 2500)
  }

  function handleOpenInMessages() {
    const phone     = recipientPhone || output?.client?.phone || ''
    const body      = encodeURIComponent(editedText)

    const a = document.createElement('a')
    a.href = `sms:${phone}?body=${body}`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 200)

    if (tiedClient?.id) recordReplyOpened({ ...replyFields('text'), app: 'messages' }).then(applyReplyResult)
    setSentAction('messages')
    setTimeout(() => setSentAction(null), 2500)
  }

  // ─── Twilio SMS send ────────────────────────────────────────────────────────

  // Runs only after the service accepted the message (accepted, not proof of delivery).
  // The notice always says the message went out, then whether CRM recorded it.
  async function recordProviderAcceptance(channel, via, providerId, track) {
    const service = via === 'resend' ? 'Resend' : 'Twilio'
    const what = channel === 'email' ? 'Email' : 'Text'
    const at = new Date().toISOString()
    setProviderSent(prev => ({ ...prev, [channel]: { via, id: providerId || null, at, track } }))
    const sent = `${what} sent: accepted by ${service}. Do not send it again.`
    if (!track) {
      setSendNotice(prev => ({ ...prev, [channel]: { kind: 'warn', text: `${sent} Not recorded in CRM (tracking was turned off).` } }))
      return
    }
    if (!tiedClient?.id) {
      setSendNotice(prev => ({ ...prev, [channel]: { kind: 'warn', text: `${sent} Not recorded in CRM because this draft is not saved to a client. Save to CRM to record it.` } }))
      return
    }
    if (!providerId) {
      setSendNotice(prev => ({ ...prev, [channel]: { kind: 'warn', text: `${sent} No message id came back, so CRM did not record it. Use Mark as sent.` } }))
      return
    }
    const res = await markReplySent({ ...replyFields(channel), via, providerId })
    applyReplyResult(res)
    setSendNotice(prev => ({ ...prev, [channel]: res.ok
      ? { kind: 'ok', text: `${sent} Recorded for ${tiedClient.name || 'this client'}.` }
      : { kind: 'warn', text: `${sent} The CRM record did not save. Use Mark as sent.` } }))
  }

  // Before a server send: an untied draft would go out untracked, so ask first.
  function requestServerSend(channel) {
    if (acceptedBy(channel)) return
    const track = channel === 'email' ? logEmailToCRM : logSmsToCRM
    if (track && !tiedClient?.id) { setSendConfirm(channel); return }
    return channel === 'email' ? handleSendViaGmail() : handleSendViaTwilio()
  }

  async function handleSendViaTwilio() {
    setSendConfirm(null)
    if (!canSendSms) return
    setSmsSending(true)

    try {
      const res = await apiPost('/api/send-sms', {
        to:   normalizePhone(recipientPhone),
        body: editedText,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Send failed (${res.status})`)

      await recordProviderAcceptance('text', 'twilio', data.sid, logSmsToCRM)

      setSentAction('twilio')
      setTimeout(() => setSentAction(null), 2500)
    } catch (err) {
      setSendNotice(prev => ({ ...prev, text: { kind: 'error', text: `Text not sent: ${err.message ?? 'send failed'}. Nothing was recorded.` } }))
    } finally {
      setSmsSending(false)
    }
  }

  // ─── Gmail (Nodemailer) send ────────────────────────────────────────────────

  async function handleSendViaGmail() {
    setSendConfirm(null)
    if (!canSendEmail) return
    setEmailSending(true)

    const clientName = output?.client?.name || ''
    const subject    = `Tattoo Inquiry: ${clientName || 'New Client'} | Saul Gutierrez`

    try {
      const res = await apiPost('/api/send-email', {
        to:      recipientEmail.trim(),
        subject,
        body:    editedEmail,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Send failed (${res.status})`)

      await recordProviderAcceptance('email', 'resend', data.id, logEmailToCRM)

      setSentAction('emailSent')
      setTimeout(() => setSentAction(null), 2500)
    } catch (err) {
      setSendNotice(prev => ({ ...prev, email: { kind: 'error', text: `Email not sent: ${err.message ?? 'send failed'}. Nothing was recorded.` } }))
    } finally {
      setEmailSending(false)
    }
  }

  // ─── Save to CRM ────────────────────────────────────────────────────────────

  // Save to CRM: an existing client is chosen only by one unambiguous email match; anything
  // less certain stops and asks Saul (never a first name guess).
  async function handleSaveToCRM() {
    if (savedToCRM || !output || crmSaveRef.current) return
    const c = output.client ?? {}
    const clients = await loadClients()
    const match = matchClient(clients, {
      name:  c.name,
      email: c.email || recipientEmail,
      phone: c.phone || recipientPhone,
    })
    if (match.decision === 'existing') return saveToClient(match.client)
    if (match.decision === 'new') return saveToClient(null)
    setClientChoice(match.candidates)
  }

  async function saveToClient(existing) {
    if (savedToCRM || !output || crmSaveRef.current) return
    crmSaveRef.current = true
    setClientChoice(null)

    const c   = output.client ?? {}
    const now = new Date().toISOString()

    const newComms = []
    if (editedEmail) newComms.push(mkComm({ channel: 'Email',        subject: output.subject ?? '', body: editedEmail, timestamp: now, replyId: replyId(draftId, 'email') }))
    if (editedText)  newComms.push(mkComm({ channel: 'Text Message', body: editedText, timestamp: now, replyId: replyId(draftId, 'text') }))

    try {
      let saveResult
      let savedClient
      if (existing) {
        // The reply goes into Communications; the client's own notes are left as they are.
        const updated = {
          ...existing,
          communications: [...newComms, ...(existing.communications || [])],
          activityLog: [
            { id: crypto.randomUUID(), timestamp: now, text: `${logDate()} Response logged from Inquiry Assistant.` },
            ...(existing.activityLog || []),
          ],
          updatedAt: now,
        }
        saveResult = await saveClient(updated)
        savedClient = { id: existing.id, name: existing.name || c.name || '' }
      } else {
        const client = mkClient({
          name:        c.name       || '',
          email:       c.email      || recipientEmail || '',
          phone:       c.phone      || recipientPhone || '',
          instagram:   c.instagram  || '',
          tattooIdea:  c.tattooIdea || '',
          style:       c.style      || '',
          placement:   c.placement  || '',
          size:        c.size       || '',
          stage:       'Inquiry',
          status:      null,
          consultationCount: 0,
          communications: newComms,
          notes: editedEmail || editedText || '',
          activityLog: [
            { id: crypto.randomUUID(), timestamp: now, text: `${logDate()} Added from Inquiry Assistant.` },
          ],
        })
        saveResult = await saveClient(client)
        savedClient = { id: client.id, name: client.name }
      }

      setSavedToCRM(true)
      if (!saveResult.ok) {
        toast.error('Saved on this device only. Not saved to the database, so reply status cannot be tracked yet.')
        return
      }
      setTiedClient(savedClient)
      // A reply the service already accepted before saving is recorded now (no second send).
      for (const channel of ['email', 'text']) {
        const sent = providerSent[channel]
        if (!sent?.id || sent.track === false) continue
        const fields = channel === 'email'
          ? { id: replyId(draftId, 'email'), clientId: savedClient.id, channel, subject: output.subject ?? '', body: editedEmail }
          : { id: replyId(draftId, 'text'), clientId: savedClient.id, channel, subject: null, body: editedText }
        const res = await markReplySent({ ...fields, via: sent.via, providerId: sent.id })
        applyReplyResult(res)
        setSendNotice(prev => ({ ...prev, [channel]: res.ok
          ? { kind: 'ok', text: `Earlier send (accepted by ${sent.via === 'resend' ? 'Resend' : 'Twilio'}) is now recorded for ${savedClient.name || 'this client'}.` }
          : { kind: 'warn', text: 'The earlier send could not be recorded. Use Mark as sent.' } }))
      }
    } catch (err) {
      console.error('[MACRI] CRM save failed:', err)
      crmSaveRef.current = false
    }
  }

  // ─── styles ─────────────────────────────────────────────────────────────────

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

  const recipientFieldStyle = (valid) => ({
    width: '100%',
    background: 'var(--surface2)',
    border: `1px solid ${valid ? 'rgba(201,169,110,0.35)' : 'var(--surface2)'}`,
    borderRadius: '7px',
    padding: '10px 14px',
    fontFamily: 'var(--font-mono)', fontSize: '14px',
    color: valid ? 'var(--text)' : 'var(--muted)',
    outline: 'none',
    transition: 'border-color 0.12s, color 0.12s',
    boxSizing: 'border-box',
    letterSpacing: '0.04em',
  })

  const noticeColor = { ok: '#7aab8f', warn: 'var(--gold)', error: '#f09595' }
  const panelStyle = { marginTop: '14px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }
  const smallBtn = (primary) => ({
    minHeight: '40px', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-mono)', fontSize: '11px',
    background: primary ? 'rgba(201,169,110,0.12)' : 'var(--bg)',
    border: `1px solid ${primary ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
    color: primary ? 'var(--gold)' : 'var(--text)',
  })

  // Shown after a server send attempt: always says whether it went out and whether CRM recorded it.
  const sendNoticeLine = (channel) => {
    const sent = providerSent[channel]
    // After a reload the notice is gone but the send happened: say so again.
    const notice = sendNotice[channel] || (sent && !replies[channel]?.provider_id && {
      kind: 'warn',
      text: `${channel === 'email' ? 'Email' : 'Text'} already sent: accepted by ${sent.via === 'resend' ? 'Resend' : 'Twilio'}. Do not send it again. ${sent.track === false ? 'Not recorded in CRM (tracking was turned off).' : 'Not recorded in CRM yet.'}`,
    })
    return notice && (
      <p role="status" style={{ marginTop: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5, color: noticeColor[notice.kind] }}>
        {notice.text}
      </p>
    )
  }

  // Before a server send of a draft not saved to a client.
  const sendConfirmPanel = (channel) => sendConfirm === channel && (
    <div style={panelStyle}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
        This draft is not saved to a client. If you send now, the {channel === 'email' ? 'email' : 'text'} will go out but will not be tracked in CRM.
      </span>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" style={smallBtn(true)} onClick={() => { setSendConfirm(null); handleSaveToCRM() }}>Save to CRM first</button>
        <button type="button" style={smallBtn(false)} onClick={() => (channel === 'email' ? handleSendViaGmail() : handleSendViaTwilio())}>Send without tracking</button>
        <button type="button" style={smallBtn(false)} onClick={() => setSendConfirm(null)}>Cancel</button>
      </div>
    </div>
  )

  // When the client is not certain: Saul picks the existing client or a new one.
  const clientChoicePanel = () => clientChoice && (
    <div style={panelStyle}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
        Which client is this reply for? MACRI found possible matches but is not certain.
      </span>
      {clientChoice.map(({ client: cl, reasons }) => (
        <button key={cl.id} type="button" style={smallBtn(false)} onClick={() => saveToClient(cl)}>
          {cl.name || 'Unnamed'}{cl.email ? ` | ${cl.email}` : ''}{cl.stage ? ` | ${cl.stage}` : ''}
          <span style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Matches on {reasons.join(', ')}</span>
        </button>
      ))}
      <button type="button" style={smallBtn(true)} onClick={() => saveToClient(null)}>
        New client{output?.client?.name ? `: ${output.client.name}` : ''}
      </button>
      <button type="button" style={smallBtn(false)} onClick={() => setClientChoice(null)}>Cancel</button>
    </div>
  )

  const replyStatusBlock = (channel) => (
    <div style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {tiedClient ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
            <span>Saved to CRM: <span style={{ color: 'var(--text)' }}>{tiedClient.name || 'Client'}</span></span>
            <button
              type="button"
              onClick={() => navigate('/crm', { state: { highlightClientId: tiedClient.id } })}
              style={{ background: 'none', border: 'none', padding: '6px 0', color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer' }}
            >
              Open in CRM
            </button>
          </div>
          <ReplyStatusControl {...replyFields(channel)} reply={replies[channel]} onChange={applyReplyResult} />
        </>
      ) : (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--muted)' }}>
          Save to CRM to track whether this reply was sent.
        </span>
      )}
    </div>
  )

  const logCRMCheckbox = (checked, onToggle) => (
    <div
      onClick={onToggle}
      style={{
        marginTop: '14px',
        display: 'flex', alignItems: 'center', gap: '10px',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
        border: `2px solid ${checked ? 'var(--gold)' : 'var(--surface2)'}`,
        background: checked ? 'var(--gold)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}>
        {checked && <span style={{ color: 'var(--bg)', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '12px',
        color: checked ? 'var(--text)' : 'var(--muted)',
        transition: 'color 0.12s',
      }}>
        Log to CRM after sending
      </span>
    </div>
  )

  // ─── render ──────────────────────────────────────────────────────────────────

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

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Response Timing
            </div>
            <ChipGroup options={TIMINGS} value={timing} onChange={setTiming} />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Response Goal
            </div>
            <ChipGroup options={CONTENT_TYPES} value={contentType} onChange={setContentType} />
          </div>

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

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
              Options
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <Toggle label="Include consultation booking link" value={includeConsultLink} onChange={setIncludeConsultLink} />
              <Toggle label="Cover-up tattoo" value={isCoverup} onChange={setIsCoverup} />
            </div>
          </div>

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

            <div style={{ padding: '20px' }}>

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
                    {`Tattoo Inquiry: ${output?.client?.name || 'New Client'} | Saul Gutierrez`}
                  </div>

                  <textarea
                    value={editedEmail}
                    onChange={e => setEditedEmail(e.target.value)}
                    style={outputTextareaBase}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                  />

                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--muted)', marginBottom: '7px',
                    }}>
                      Recipient Email
                    </div>
                    <input
                      type="email"
                      inputMode="email"
                      placeholder="client@email.com"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                      style={recipientFieldStyle(isValidEmail(recipientEmail))}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = isValidEmail(recipientEmail) ? 'rgba(201,169,110,0.35)' : 'var(--surface2)'}
                    />
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => requestServerSend('email')}
                        disabled={!canSendEmail}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'emailSent'
                            ? 'rgba(122,171,143,0.15)'
                            : canSendEmail
                            ? 'var(--gold)'
                            : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'emailSent' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'emailSent'
                            ? '#7aab8f'
                            : canSendEmail
                            ? 'var(--bg)'
                            : 'var(--muted)',
                          fontWeight: 600,
                          cursor: canSendEmail ? 'pointer' : 'not-allowed',
                          opacity: emailSending ? 0.7 : 1,
                          minWidth: '120px',
                        }}
                      >
                        {emailSending ? 'Sending…' : acceptedBy('email') ? 'Accepted by Resend' : 'Send Email'}
                      </button>
                      {sentAction === 'emailSent' && <CountdownRing />}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => handleCopy('email')}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'copyEmail' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'copyEmail' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'copyEmail' ? '#7aab8f' : 'var(--muted)',
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

                  {sendConfirmPanel('email')}
                  {sendNoticeLine('email')}
                  {clientChoicePanel()}
                  {replyStatusBlock('email')}

                  {isValidEmail(recipientEmail) && logCRMCheckbox(logEmailToCRM, () => setLogEmailToCRM(v => !v))}
                </>
              )}

              {activeTab === 'text' && (
                <>
                  <textarea
                    value={editedText}
                    onChange={e => setEditedText(e.target.value)}
                    style={outputTextareaBase}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                  />

                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--muted)', marginBottom: '7px',
                    }}>
                      Recipient Phone
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="(916) 555 0000"
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      style={recipientFieldStyle(isValidPhone(recipientPhone))}
                      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                      onBlur={e => e.target.style.borderColor = isValidPhone(recipientPhone) ? 'rgba(201,169,110,0.35)' : 'var(--surface2)'}
                    />
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 10 }}>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => requestServerSend('text')}
                        disabled={!canSendSms}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'twilio'
                            ? 'rgba(122,171,143,0.15)'
                            : canSendSms
                            ? 'var(--gold)'
                            : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'twilio' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'twilio'
                            ? '#7aab8f'
                            : canSendSms
                            ? 'var(--bg)'
                            : 'var(--muted)',
                          fontWeight: 600,
                          cursor: canSendSms ? 'pointer' : 'not-allowed',
                          opacity: smsSending ? 0.7 : 1,
                          minWidth: '120px',
                        }}
                      >
                        {smsSending ? 'Sending…' : acceptedBy('text') ? 'Accepted by Twilio' : 'Send Text'}
                      </button>
                      {sentAction === 'twilio' && <CountdownRing />}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        onClick={() => handleCopy('text')}
                        style={{
                          ...actionBtnBase,
                          background: sentAction === 'copyText' ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                          border: `1px solid ${sentAction === 'copyText' ? '#7aab8f' : 'transparent'}`,
                          color: sentAction === 'copyText' ? '#7aab8f' : 'var(--muted)',
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

                  {sendConfirmPanel('text')}
                  {sendNoticeLine('text')}
                  {clientChoicePanel()}
                  {replyStatusBlock('text')}

                  {isValidPhone(recipientPhone) && logCRMCheckbox(logSmsToCRM, () => setLogSmsToCRM(v => !v))}
                </>
              )}

            </div>
          </div>

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