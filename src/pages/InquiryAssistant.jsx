import { useState } from 'react'

// ─── constants ────────────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'email',     label: 'Email' },
  { id: 'instagram', label: 'Instagram DM' },
  { id: 'facebook',  label: 'Facebook DM' },
  { id: 'text',      label: 'Text Message' },
  { id: 'walkin',    label: 'Walk-in' },
  { id: 'other',     label: 'Other' },
]

const TIMINGS = [
  { id: 'recent',  label: 'Recent',        sub: '1–3 days' },
  { id: 'delayed', label: 'Delayed',       sub: '4–14 days' },
  { id: 'late',    label: 'Extremely Late', sub: '2+ weeks' },
]

const CONTENT_TYPES = [
  { id: 'quote',          label: 'Quote & Pricing' },
  { id: 'consult',        label: 'Invite to Consult' },
  { id: 'followup',       label: 'Unfinished Follow-up' },
  { id: 'notfit',         label: 'Not a Fit' },
  { id: 'clientpricing',  label: 'Client Chooses Pricing' },
]

const PRICING_MODELS = [
  { id: 'hourly',   label: 'Hourly',        sub: '$250/hr' },
  { id: 'flat',     label: 'Flat Rate',     sub: 'custom' },
  { id: 'halfday',  label: 'Half Day',      sub: 'custom' },
  { id: 'fullday',  label: 'Full Day',      sub: 'custom' },
  { id: 'client',   label: 'Client Chooses', sub: 'offer both' },
]

const CUSTOM_PRICE_MODELS = new Set(['flat', 'halfday', 'fullday'])

const CONSULT_LINK = 'SaulsAppointments.as.me/TattooConsultation'

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
  const sourceLabel  = SOURCES.find(s => s.id === source)?.label ?? source
  const timingObj    = TIMINGS.find(t => t.id === timing)
  const contentLabel = CONTENT_TYPES.find(c => c.id === contentType)?.label ?? contentType
  const pricingObj   = PRICING_MODELS.find(p => p.id === pricingModel)

  const pricingNote = pricingModel === 'hourly'
    ? 'Hourly at $250/hr'
    : pricingModel === 'client'
    ? 'Offer both hourly ($250/hr) and flat rate options so the client can choose'
    : (pricingObj?.label ?? pricingModel) + (customPrice ? ` — quoted at $${customPrice}` : ' (price not yet specified)')

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
    'For the "text" field, use the exact template below. Replace [FirstName] with the client\'s first name extracted from their inquiry (if no name is found, use "there"). Do not change any other wording. Preserve every line break exactly as shown. Do not add pricing, rates, or links of any kind. The pipe character | is allowed only in the signature line. Do not use dashes or hyphens anywhere.',
    '',
    'TEXT TEMPLATE:',
    textTemplate,
    '',
    'Return ONLY a valid JSON object with exactly these three fields:',
    '{',
    '  "subject": "<email subject line, 6–10 words>",',
    '  "email": "<full email or DM response, signed: Saul | Private Studio, Elk Grove>",',
    '  "text": "<the completed text message using the template above, with [FirstName] replaced>"',
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

  // strip any accidental code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function ChipGroup({ options, value, onChange, cols }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '6px',
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
              borderRadius: '6px',
              padding: opt.sub ? '8px 12px' : '9px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s, border-color 0.12s',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--gold)' : 'var(--text)',
              lineHeight: 1.3,
            }}>
              {opt.label}
            </div>
            {opt.sub && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: active ? 'var(--gold)' : 'var(--muted)',
                opacity: active ? 0.8 : 1,
                marginTop: '2px',
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <div style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: value ? 'var(--gold)' : 'var(--surface2)',
        position: 'relative',
        transition: 'background 0.15s',
        flexShrink: 0,
        border: `1px solid ${value ? 'var(--gold)' : 'var(--muted)'}`,
      }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: value ? 'var(--bg)' : 'var(--muted)',
          position: 'absolute',
          top: '2px',
          left: value ? '18px' : '2px',
          transition: 'left 0.15s, background 0.15s',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: value ? 'var(--text)' : 'var(--muted)',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function InquiryAssistant() {
  const [source,            setSource]           = useState(null)
  const [timing,            setTiming]           = useState(null)
  const [contentType,       setContentType]      = useState(null)
  const [pricingModel,      setPricingModel]     = useState(null)
  const [customPrice,       setCustomPrice]      = useState('')
  const [includeConsultLink, setIncludeConsultLink] = useState(false)
  const [isCoverup,         setIsCoverup]        = useState(false)
  const [inquiry,           setInquiry]          = useState('')
  const [loading,           setLoading]          = useState(false)
  const [output,            setOutput]           = useState(null)
  const [activeTab,         setActiveTab]        = useState('email')
  const [copied,            setCopied]           = useState(null)
  const [error,             setError]            = useState(null)

  const showCustomPrice = CUSTOM_PRICE_MODELS.has(pricingModel)

  const canGenerate = source && timing && contentType && pricingModel && inquiry.trim().length > 10

  async function handleGenerate() {
    setError(null)
    setOutput(null)
    setLoading(true)
    try {
      const prompt = buildPrompt({ source, timing, contentType, pricingModel, customPrice, includeConsultLink, isCoverup, inquiry })
      const result = await callClaude(prompt)
      setOutput(result)
      setActiveTab('email')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(type) {
    const text = type === 'email'
      ? `Subject: ${output.subject}\n\n${output.email}`
      : output.text
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '40px 32px 80px',
    }}>

      {/* header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '8px',
        }}>
          tool / inquiry assistant
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>
          Inquiry Assistant
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--muted)',
          marginTop: '6px',
        }}>
          Configure the context, paste the inquiry, generate a response.
        </p>
      </div>

      {/* controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* source */}
        <div>
          <SectionLabel>Source</SectionLabel>
          <ChipGroup options={SOURCES} value={source} onChange={setSource} cols={3} />
        </div>

        {/* timing */}
        <div>
          <SectionLabel>Response Timing</SectionLabel>
          <ChipGroup options={TIMINGS} value={timing} onChange={setTiming} cols={3} />
        </div>

        {/* content type */}
        <div>
          <SectionLabel>Response Goal</SectionLabel>
          <ChipGroup options={CONTENT_TYPES} value={contentType} onChange={setContentType} />
        </div>

        {/* pricing */}
        <div>
          <SectionLabel>Pricing Model</SectionLabel>
          <ChipGroup options={PRICING_MODELS} value={pricingModel} onChange={setPricingModel} />
          {showCustomPrice && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--muted)',
              }}>$</span>
              <input
                type="number"
                min="0"
                placeholder="Enter price"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--surface2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '160px',
                  outline: 'none',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'transparent'}
              />
            </div>
          )}
        </div>

        {/* toggles */}
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <Toggle
            label="Include consultation link"
            value={includeConsultLink}
            onChange={setIncludeConsultLink}
          />
          <Toggle
            label="Cover-up tattoo"
            value={isCoverup}
            onChange={setIsCoverup}
          />
        </div>

        {/* inquiry textarea */}
        <div>
          <SectionLabel>Client Inquiry</SectionLabel>
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
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text)',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.12s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--surface2)'}
          />
        </div>

        {/* generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          style={{
            alignSelf: 'flex-start',
            background: canGenerate && !loading ? 'var(--gold)' : 'var(--surface2)',
            color: canGenerate && !loading ? 'var(--bg)' : 'var(--muted)',
            border: 'none',
            borderRadius: '7px',
            padding: '11px 28px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {loading ? 'Generating…' : 'Generate Response'}
        </button>

        {/* error */}
        {error && (
          <div style={{
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.25)',
            borderRadius: '7px',
            padding: '12px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#ff8080',
          }}>
            {error}
          </div>
        )}

        {/* output */}
        {output && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {/* tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--surface2)',
            }}>
              {['email', 'text'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? 'var(--gold)' : 'var(--muted)',
                    textTransform: 'capitalize',
                    letterSpacing: '0.04em',
                    transition: 'color 0.12s',
                    marginBottom: '-1px',
                  }}
                >
                  {tab === 'email' ? 'Email / DM' : 'Text Message'}
                </button>
              ))}
            </div>

            {/* content */}
            <div style={{ padding: '20px' }}>
              {activeTab === 'email' && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    letterSpacing: '0.06em',
                  }}>
                    SUBJECT
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '16px',
                    padding: '8px 12px',
                    background: 'var(--surface2)',
                    borderRadius: '5px',
                  }}>
                    {output.subject}
                  </div>
                </>
              )}

              <pre style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                lineHeight: '1.7',
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
              }}>
                {activeTab === 'email' ? output.email : output.text}
              </pre>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleCopy(activeTab)}
                  style={{
                    background: copied === activeTab ? 'rgba(122,171,143,0.15)' : 'var(--surface2)',
                    border: `1px solid ${copied === activeTab ? 'var(--success)' : 'transparent'}`,
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: copied === activeTab ? 'var(--success)' : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied === activeTab
                    ? 'Copied!'
                    : `Copy ${activeTab === 'email' ? 'Email' : 'Text'}`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
