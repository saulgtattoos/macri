import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

// TODO replace with Saul's actual phone number before going live
const SAUL_PHONE_NUMBER = '+12097517285'

function getHealingPhase(days) {
  if (days <= 3) return 'Initial Healing'
  if (days <= 7) return 'Peeling Phase'
  if (days <= 14) return 'Settling Phase'
  if (days <= 30) return 'Final Heal'
  return 'Healed'
}

const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA=='

// Shrinks a photo to at most 1600px and re-encodes as JPEG so it fits the upload limit.
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}

function postAftercare(body) {
  return fetch('/api/aftercare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()

  const name = searchParams.get('name') || 'Friend'
  const style = searchParams.get('style') || ''
  const placement = searchParams.get('placement') || ''
  const dateStr = searchParams.get('date') || ''
  const film = searchParams.get('film') === 'true'
  const exp = Number(searchParams.get('exp'))
  const sig = searchParams.get('sig') || ''

  // Signed links (new) unlock the audio message and photo check through /api/aftercare.
  // Unsigned links sent before signing existed keep the full written care guide.
  const [personalized, setPersonalized] = useState(() => !!sig && exp * 1000 > Date.now())
  const link = { sessionId, name: searchParams.get('name') || '', style, placement, date: dateStr, film, exp, sig }

  const rawDays = computeDays(dateStr)
  const daysSinceSession = Math.min(rawDays, 30)
  const phase = getHealingPhase(rawDays)
  const isFullyHealed = rawDays >= 30

  const [audioState, setAudioState] = useState('idle')
  const [audioNote, setAudioNote] = useState('')
  const audioRef = useRef(null)
  const audioUrlRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  // The message is generated only when the client taps play (one paid request per tap,
  // limited per link per day on the server).
  async function handlePlayPause() {
    if (audioState === 'loading') return
    if (audioState === 'playing') {
      audioRef.current?.pause()
      setAudioState('ready')
      return
    }
    if (audioState === 'ready' && audioRef.current) {
      audioRef.current.play()
      setAudioState('playing')
      return
    }

    // iOS audio unlock: create and unlock the player before any await, then reuse it.
    const player = new Audio()
    player.src = SILENT_WAV
    player.play().catch(() => {})
    audioRef.current = player

    setAudioState('loading')
    setAudioNote('')
    try {
      const res = await postAftercare({ action: 'audio', link })
      if (res.status === 403) { setPersonalized(false); return }
      if (res.status === 429) {
        setAudioNote('You have heard your message the most times allowed for today. Your care guide below has everything you need.')
        setAudioState('error')
        return
      }
      if (!res.ok) throw new Error('audio')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      player.src = url
      player.onended = () => setAudioState('ready')
      player.play()
      setAudioState('playing')
    } catch {
      setAudioState('error')
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
      const data = await resizeImage(imageFile)
      const res = await postAftercare({ action: 'healing-check', link, image: { data, mediaType: 'image/jpeg' } })
      if (res.status === 403) { setPersonalized(false); return }
      if (res.status === 429) {
        setCheckResult({ status: 'Error', note: 'Photo checks are limited each day. Please try again tomorrow or text Saul a photo.' })
        return
      }
      if (!res.ok) throw new Error('check')
      setCheckResult(await res.json())
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
    { title: 'Keep It Clean', body: 'Gently wash with Dial Antibacterial soap (fragrance free) and lukewarm water twice a day. Pat dry with a clean paper towel. Never scrub.' },
    { title: 'Moisturize', body: 'Apply a thin layer of Lubriderm (fragrance free) or a vitamin enriched unscented lotion 2 to 3 times a day. Less is more. Never suffocate the skin.' },
    { title: 'No Sun and No Soaking', body: 'Stay out of direct sunlight. No swimming, hot tubs, or long baths for at least 2 to 3 weeks. Showers are fine.' },
    { title: 'Do Not Pick or Scratch', body: 'Peeling and itching are normal. Let it shed on its own. Picking pulls out ink and creates uneven healing.' },
  ]

  const filmCard = film ? {
    title: 'Protective Film Care',
    body: 'Keep the film applied for 3 to 5 days. A buildup of fluid under the film is completely normal and is your body healing. To remove: peel slowly under warm running water starting from a corner. Once removed, begin the standard soap and lotion routine below.',
    borderColor: '#7aab8f',
  } : null

  const allCards = [
    ...(filmCard ? [filmCard] : []),
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
            MACRI Concierge | Studio AI Assistant
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

          {!personalized && (
            <div style={{ background: '#161614', borderRadius: 12, borderTop: '2px solid #7a786f', padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e', letterSpacing: '0.08em', marginBottom: 10 }}>
                A note from Saul
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#e8e6df', lineHeight: 1.6 }}>
                Your care guide below has everything you need to heal well. My personal audio message and the photo healing check are on your newest aftercare link. Text me and I will send you an updated one.
              </div>
            </div>
          )}

          {/* Audio Player */}
          {personalized && (
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7a786f', padding: '20px 0', lineHeight: 1.6 }}>
                {audioNote || 'Audio unavailable'}
              </div>
            )}
            {(audioState === 'idle' || audioState === 'ready' || audioState === 'playing') && (
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
          )}

          {/* Care Cards */}
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#c9a96e', marginBottom: 16 }}>
              Your Care Guide
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allCards.map((card, i) => (
                <div key={i} style={{ background: '#1e1e1b', borderRadius: 10, borderLeft: `2px solid ${card.borderColor || '#c9a96e'}`, padding: 16 }}>
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
          {personalized && (
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
          )}

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
            <div style={{ marginTop: 12 }}>
              <a
                href="https://www.saulgtattoos.com"
                target="_blank"
                rel="noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c9a96e', textDecoration: 'none' }}
              >
                saulgtattoos.com
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
