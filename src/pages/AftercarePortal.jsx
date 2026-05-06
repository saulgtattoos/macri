import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

// TODO replace with Saul's actual phone number before going live
const SAUL_PHONE_NUMBER = '+12097517285'

function getHealingPhase(days) {
  if (days <= 3) return 'Initial Healing'
  if (days <= 7) return 'Peeling Phase'
  if (days <= 14) return 'Settling Phase'
  if (days <= 30) return 'Final Heal'
  return 'Healed'
}

function computeDays(dateStr) {
  if (!dateStr) return 1
  try {
    const parts = dateStr.trim().split('-')
    if (parts.length < 3) return 1
    const session = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    if (isNaN(session.getTime())) return 1
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diff = Math.floor((today - session) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff)
  } catch {
    return 1
  }
}

export default function AftercarePortal() {
  const [searchParams] = useSearchParams()

  const name = searchParams.get('name') || 'Friend'
  const style = searchParams.get('style') || ''
  const placement = searchParams.get('placement') || ''
  const dateStr = searchParams.get('date') || ''

  const rawDays = computeDays(dateStr)
  const daysSinceSession = Math.min(rawDays, 30)
  const phase = getHealingPhase(rawDays)
  const isFullyHealed = rawDays >= 30

  const [audioState, setAudioState] = useState('loading')
  const audioRef = useRef(null)
  const audioUrlRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    generateAudio()
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  async function generateAudio() {
    try {
      const sl = (style || '').toLowerCase()
      const pl = (placement || '').toLowerCase()

      let styleGuide = ''
      if (sl.includes('watercolor')) {
        styleGuide = 'Some color blending and softening during healing is completely normal and part of the beauty of this style. After healing protect it from sun with SPF 50.'
      } else if (sl.includes('black and gray') || sl.includes('portrait')) {
        styleGuide = 'It may look ashy or dull right now and that is completely normal. Your skin is regenerating over the ink. The depth and contrast will come back once you are fully healed. Keep it moisturized.'
      } else if (sl.includes('stippled') || sl.includes('pointillism')) {
        styleGuide = 'The dots may feel raised or bumpy right now. That is completely normal for this style. The texture will smooth out as the skin settles.'
      } else if (sl.includes('color realism')) {
        styleGuide = 'The colors may look muted during healing. That is expected. Sun is the biggest threat to color realism so keep it covered and protected. Once the top layer sheds they will pop.'
      } else if (sl.includes('sketch')) {
        styleGuide = 'The lines may appear to spread slightly during healing. That is part of the sketch style and completely normal. It will settle into its final look by day 30.'
      } else if (sl.includes('abstract')) {
        styleGuide = 'Keep an eye on any raised areas. A little texture during healing is expected but if anything looks swollen or feels hot please reach out to me right away.'
      }

      let placementAdd = ''
      if (pl.includes('hand') || pl.includes('finger')) {
        placementAdd = 'Since it is on your hand please moisturize more frequently, at least 4 times a day. Hands take a beating and that placement needs extra attention.'
      } else if (pl.includes('rib') || pl.includes('torso') || pl.includes('chest')) {
        placementAdd = 'Taking deep breaths may feel tight for the first few days. That is normal. Just wear loose breathable clothing and take it easy.'
      } else if (pl.includes('foot') || pl.includes('ankle')) {
        placementAdd = 'Keep your foot elevated when resting for the first 48 hours. Avoid tight shoes and socks this week.'
      } else if (pl.includes('elbow') || pl.includes('knee') || pl.includes('ditch')) {
        placementAdd = 'The crease area will peel a lot. Please do not pick it. Keep the joint moisturized and avoid bending it aggressively for the first week.'
      }

      const systemLines = [
        'You are writing a warm, personal 60 second spoken audio script for tattoo artist Saul Gutierrez to send to a client after their tattoo session.',
        'Write in first person as Saul. Warm, calm, reassuring tone.',
        'Zero hyphens or dashes anywhere. No asterisks or special characters. Plain spoken language only.',
        'The script must follow this structure:',
        `1. Intro: "Hey ${name}, it's Saul..."`,
        '2. Body: Personalized healing guidance based on style and placement. Reference the specific tattoo style and placement naturally.',
        styleGuide ? `Style guidance: ${styleGuide}` : '',
        placementAdd ? `Placement guidance: ${placementAdd}` : '',
        '3. Sign off: "I\'ve got you. Happy healing."',
        'Keep total length under 120 words for a 60 second read.',
      ].filter(Boolean).join(' ')

      const userPrompt = `Client name: ${name}. Tattoo style: ${style || 'custom'}. Placement: ${placement || 'body'}. Day ${daysSinceSession} of healing. Write the full audio script now.`

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: systemLines,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!claudeRes.ok) throw new Error('claude')
      const claudeData = await claudeRes.json()
      const script = claudeData.content[0].text.trim()

      const elRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Q2Qd4P9qaDNuBFUcFCQr', {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: script, model_id: 'eleven_turbo_v2' }),
      })
      if (!elRes.ok) throw new Error('elevenlabs')
      const blob = await elRes.blob()
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setAudioState('ready')
      setAudioState('ready')
    } catch {
      setAudioState('error')
    }
  }

  function handlePlayPause() {
    if (!audioRef.current || audioState === 'error') return
    if (audioState === 'playing') {
      audioRef.current.pause()
      setAudioState('ready')
    } else {
      const unlock = new Audio()
      unlock.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA=='
      unlock.play().catch(() => {})
      audioRef.current.play()
      setAudioState('playing')
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setCheckResult(null)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleHealingCheck() {
    if (!imageFile || checking) return
    setChecking(true)
    setCheckResult(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      const mediaType = imageFile.type || 'image/jpeg'
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
          system: 'You are a tattoo healing assessment assistant. Analyze the uploaded tattoo photo and classify the healing status as one of three options: Healthy, Dry, or Irritated. Provide a one sentence plain language explanation. Return only a JSON object: {"status": "Healthy or Dry or Irritated", "note": "one sentence explanation"}',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `Day ${daysSinceSession} of healing. Style: ${style || 'custom'}. Assess the healing status.` },
            ],
          }],
        }),
      })
      if (!claudeRes.ok) throw new Error('claude')
      const claudeData = await claudeRes.json()
      const raw = claudeData.content[0].text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
      const parsed = JSON.parse(raw)
      setCheckResult(parsed)
    } catch {
      setCheckResult({ status: 'Error', note: 'Could not analyze the image. Please try again.' })
    } finally {
      setChecking(false)
    }
  }

  function handleAlertSaul() {
    const msg = `Hey Saul, the MACRI portal flagged some irritation on my tattoo on day ${daysSinceSession}. Can you take a look?`
    window.location.href = `sms:${SAUL_PHONE_NUMBER}&body=${encodeURIComponent(msg)}`
  }

  const sl = (style || '').toLowerCase()
  const pl = (placement || '').toLowerCase()

  const styleCard = sl.includes('watercolor')
    ? { title: 'Protecting Your Color', body: 'Watercolor tattoos are sensitive to sun. After healing always apply SPF 50 before any sun exposure. Colors will soften during healing. That is normal and beautiful.' }
    : sl.includes('black and gray') || sl.includes('portrait')
    ? { title: 'The Ashy Phase', body: 'Your tattoo will look dull and ashy as it heals. This is the skin regenerating over the ink. The depth and contrast will return once fully healed.' }
    : sl.includes('color realism')
    ? { title: 'Color Preservation', body: 'Sun is the enemy of color realism. Keep it covered and moisturized. The colors will appear muted during healing. They will pop once the top layer sheds completely.' }
    : sl.includes('stippled') || sl.includes('pointillism')
    ? { title: 'Dot Texture is Normal', body: 'The stippled dots may feel raised or bumpy during healing. This is completely normal. The texture will smooth out as the skin settles.' }
    : sl.includes('sketch')
    ? { title: 'Line Spread is Normal', body: 'Fine lines in sketch style tattoos may appear to spread slightly during healing. This is expected and part of the style. It will settle into its final look by day 30.' }
    : null

  const placementCard = pl.includes('hand') || pl.includes('finger')
    ? { title: 'Hand Placement Care', body: 'Hands heal faster but also fade faster. Moisturize more frequently, at least 4 times a day. Avoid excessive hand washing with hot water.' }
    : pl.includes('rib') || pl.includes('torso') || pl.includes('chest')
    ? { title: 'Rib and Torso Care', body: 'Deep breaths may feel tight or tender for the first few days. This is normal. Wear loose breathable clothing. Avoid tight waistbands.' }
    : pl.includes('foot') || pl.includes('ankle')
    ? { title: 'Foot and Ankle Care', body: 'Keep your foot elevated when resting for the first 48 hours. Avoid tight shoes and socks. Flip flops are your best friend this week.' }
    : pl.includes('elbow') || pl.includes('knee') || pl.includes('ditch')
    ? { title: 'Joint Placement Care', body: 'The crease area will peel significantly. Do not pick it. Keep the joint moisturized and avoid fully extending or bending aggressively for the first week.' }
    : null

  const universalCards = [
    { title: 'Keep It Clean', body: 'Gently wash with unscented soap and lukewarm water twice a day. Pat dry with a clean paper towel. Never scrub.' },
    { title: 'Moisturize', body: 'Apply a thin layer of unscented lotion or Hustle Butter 2 to 3 times a day. Less is more. Never suffocate the skin.' },
    { title: 'No Sun and No Soaking', body: 'Stay out of direct sunlight. No swimming, hot tubs, or long baths for at least 2 to 3 weeks. Showers are fine.' },
    { title: 'Do Not Pick or Scratch', body: 'Peeling and itching are normal. Let it shed on its own. Picking pulls out ink and creates uneven healing.' },
  ]

  const allCards = [
    ...universalCards,
    ...(styleCard ? [styleCard] : []),
    ...(placementCard ? [placementCard] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0d', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Hero Header */}
        <div style={{ background: '#161614', padding: '28px 20px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#c9a96e', letterSpacing: '0.1em', marginBottom: 12 }}>
            aftercare portal
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#e8e6df', marginBottom: 6 }}>
            Hey {name}.
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7a786f', marginBottom: 16, lineHeight: 1.5 }}>
            Your tattoo is in the {phase} phase.
          </div>
          {isFullyHealed ? (
            <div style={{
              display: 'inline-block',
              background: 'rgba(122,171,143,0.15)', border: '1px solid rgba(122,171,143,0.4)',
              borderRadius: 20, padding: '6px 16px',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7aab8f', letterSpacing: '0.06em',
            }}>
              Fully Healed
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)',
                borderRadius: 20, padding: '6px 14px',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e',
              }}>
                Day {daysSinceSession} of 30
              </div>
              <div style={{
                background: 'rgba(122,120,111,0.15)', border: '1px solid rgba(122,120,111,0.3)',
                borderRadius: 20, padding: '6px 14px',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f',
              }}>
                {phase}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Audio Player */}
          <div style={{ background: '#161614', borderRadius: 12, borderTop: '2px solid #c9a96e', padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e', letterSpacing: '0.08em', marginBottom: 20 }}>
              A message from Saul
            </div>
            {audioState === 'loading' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', padding: '20px 0' }}>
                Generating your message...
              </div>
            )}
            {audioState === 'error' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', padding: '20px 0' }}>
                Audio unavailable
              </div>
            )}
            {(audioState === 'ready' || audioState === 'playing') && (
              <>
                <button
                  onClick={handlePlayPause}
                  aria-label={audioState === 'playing' ? 'Pause' : 'Play'}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: '#c9a96e', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', outline: 'none',
                  }}
                >
                  {audioState === 'playing' ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <div style={{ width: 4, height: 18, background: '#0e0e0d', borderRadius: 2 }} />
                      <div style={{ width: 4, height: 18, background: '#0e0e0d', borderRadius: 2 }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                      borderLeft: '18px solid #0e0e0d',
                      marginLeft: 4,
                    }} />
                  )}
                </button>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7a786f', marginTop: 14 }}>
                  {audioState === 'playing' ? 'Playing...' : 'Tap to hear from Saul'}
                </div>
              </>
            )}
          </div>

          {/* Care Cards */}
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#c9a96e', marginBottom: 16 }}>
              Your Care Guide
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allCards.map((card, i) => (
                <div key={i} style={{ background: '#1e1e1b', borderRadius: 10, borderLeft: '2px solid #c9a96e', padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#e8e6df', marginBottom: 8 }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.6 }}>
                    {card.body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Healing Check */}
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#c9a96e', marginBottom: 6 }}>
              How Is It Looking?
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', marginBottom: 16, lineHeight: 1.5 }}>
              Upload a photo and get an instant healing check.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed #c9a96e', borderRadius: 10,
                padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 10,
                background: imagePreview ? 'transparent' : 'rgba(201,169,110,0.04)',
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Tattoo preview"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f' }}>
                  Tap to upload a photo of your tattoo
                </div>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginBottom: 16, textAlign: 'center' }}>
              Images are processed for clinical analysis only | Not stored on MACRI servers
            </div>
            <button
              onClick={handleHealingCheck}
              disabled={!imageFile || checking}
              style={{
                width: '100%', minHeight: 48,
                background: (!imageFile || checking) ? '#1e1e1b' : '#c9a96e',
                border: 'none', borderRadius: 10,
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                color: (!imageFile || checking) ? '#7a786f' : '#0e0e0d',
                cursor: (!imageFile || checking) ? 'default' : 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {checking ? 'Analyzing...' : 'Check My Healing'}
            </button>
            {checkResult && (
              <div style={{ marginTop: 16 }}>
                {checkResult.status === 'Healthy' && (
                  <div style={{
                    background: 'rgba(122,171,143,0.12)', border: '1px solid rgba(122,171,143,0.35)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: '#7aab8f', marginBottom: 6 }}>
                      Looking Healthy
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.5 }}>
                      {checkResult.note}
                    </div>
                  </div>
                )}
                {checkResult.status === 'Dry' && (
                  <div style={{
                    background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: '#c9a96e', marginBottom: 6 }}>
                      Needs Moisture
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.5, marginBottom: 8 }}>
                      {checkResult.note}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e' }}>
                      Apply lotion or Hustle Butter now.
                    </div>
                  </div>
                )}
                {checkResult.status === 'Irritated' && (
                  <div style={{
                    background: 'rgba(240,149,149,0.1)', border: '1px solid rgba(240,149,149,0.3)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: '#f09595', marginBottom: 6 }}>
                      High Priority
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.5, marginBottom: 12 }}>
                      {checkResult.note}
                    </div>
                    <button
                      onClick={handleAlertSaul}
                      style={{
                        width: '100%', minHeight: 44,
                        background: '#f09595', border: 'none', borderRadius: 8,
                        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                        color: '#0e0e0d', cursor: 'pointer',
                      }}
                    >
                      Alert Saul
                    </button>
                  </div>
                )}
                {checkResult.status === 'Error' && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', textAlign: 'center', padding: '12px 0' }}>
                    {checkResult.note}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: '#c9a96e', marginBottom: 8 }}>
              MACRI
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7a786f', marginBottom: 8 }}>
              Studio of Saul Gutierrez | Elk Grove CA
            </div>
            <a
              href="https://SaulsAppointments.as.me/TattooConsultation"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#c9a96e', textDecoration: 'none' }}
            >
              SaulsAppointments.as.me/TattooConsultation
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
