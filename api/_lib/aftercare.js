// Signed aftercare links and the fixed prompts used by the public aftercare endpoint.
// Link fields are signed by the owner only /api/aftercare-link; /api/aftercare
// accepts only fields whose signature matches, so the public page cannot choose prompts.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const LINK_LIMITS = { name: 60, style: 120, placement: 120 }
export const LINK_VALID_DAYS = 60
const SESSION_ID_RE = /^[\w.:-]{1,64}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function linkSecret() {
  return process.env.AFTERCARE_LINK_SECRET || ''
}

function clean(v, max) {
  return [...String(v ?? '')].map(c => (c.charCodeAt(0) < 32 ? ' ' : c)).join('').trim().slice(0, max)
}

// Normalizes owner input into link fields. Returns null when sessionId or date are unusable.
export function normalizeLinkInput(input, nowMs = Date.now()) {
  const sessionId = String(input?.sessionId ?? '')
  if (!SESSION_ID_RE.test(sessionId)) return null
  const date = String(input?.date ?? '')
  if (date && !DATE_RE.test(date)) return null

  const sessionMs = date ? Date.parse(`${date}T00:00:00Z`) : nowMs
  const startMs = Math.max(Number.isNaN(sessionMs) ? nowMs : sessionMs, nowMs)
  const exp = Math.floor(startMs / 1000) + LINK_VALID_DAYS * 86400

  return {
    sessionId,
    name: clean(input?.name, LINK_LIMITS.name) || 'Friend',
    style: clean(input?.style, LINK_LIMITS.style),
    placement: clean(input?.placement, LINK_LIMITS.placement),
    date,
    film: input?.film === true || input?.film === 'true',
    exp,
  }
}

function canonical(l) {
  return ['v1', l.sessionId, l.name, l.style, l.placement, l.date, l.film ? '1' : '0', String(l.exp)]
    .map(s => encodeURIComponent(s))
    .join('|')
}

export function signLink(fields, secret) {
  return createHmac('sha256', secret).update(canonical(fields)).digest('base64url')
}

export function linkPath(fields, sig) {
  const params = new URLSearchParams({
    name: fields.name,
    style: fields.style,
    placement: fields.placement,
    date: fields.date,
    film: fields.film ? 'true' : 'false',
    exp: String(fields.exp),
    sig,
  })
  return `/care/${encodeURIComponent(fields.sessionId)}?${params}`
}

// Validates a link sent by the public page. Returns { ok, fields } or { ok: false, reason }.
export function verifyLink(link, secret, nowMs = Date.now()) {
  if (!link || typeof link !== 'object') return { ok: false, reason: 'unsigned' }
  const { sig } = link
  if (typeof sig !== 'string' || !sig) return { ok: false, reason: 'unsigned' }

  const fields = {
    sessionId: String(link.sessionId ?? ''),
    name: String(link.name ?? ''),
    style: String(link.style ?? ''),
    placement: String(link.placement ?? ''),
    date: String(link.date ?? ''),
    film: link.film === true || link.film === 'true',
    exp: Number(link.exp),
  }
  if (!SESSION_ID_RE.test(fields.sessionId)
    || fields.name.length > LINK_LIMITS.name
    || fields.style.length > LINK_LIMITS.style
    || fields.placement.length > LINK_LIMITS.placement
    || (fields.date && !DATE_RE.test(fields.date))
    || !Number.isInteger(fields.exp)) {
    return { ok: false, reason: 'invalid' }
  }

  const expected = Buffer.from(signLink(fields, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'invalid' }
  }
  if (fields.exp * 1000 < nowMs) return { ok: false, reason: 'expired' }
  return { ok: true, fields }
}

export function daysSince(dateStr, nowMs = Date.now()) {
  if (!dateStr) return 1
  const parts = dateStr.split('-').map(Number)
  const session = new Date(parts[0], parts[1] - 1, parts[2])
  if (Number.isNaN(session.getTime())) return 1
  const now = new Date(nowMs)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.floor((today - session) / 86400000))
}

function styleGuideFor(style) {
  const sl = style.toLowerCase()
  if (sl.includes('watercolor')) return 'Some color blending and softening during healing is completely normal and part of the beauty of this style. After healing protect it from sun with SPF 50.'
  if (sl.includes('black and gray') || sl.includes('portrait')) return 'It may look ashy or dull right now and that is completely normal. Your skin is regenerating over the ink. The depth and contrast will come back once you are fully healed. Keep it moisturized.'
  if (sl.includes('stippled') || sl.includes('pointillism')) return 'The dots may feel raised or bumpy right now. That is completely normal for this style. The texture will smooth out as the skin settles.'
  if (sl.includes('color realism')) return 'The colors may look muted during healing. That is expected. Sun is the biggest threat to color realism so keep it covered and protected. Once the top layer sheds they will pop.'
  if (sl.includes('sketch')) return 'The lines may appear to spread slightly during healing. That is part of the sketch style and completely normal. It will settle into its final look by day 30.'
  if (sl.includes('abstract')) return 'Keep an eye on any raised areas. A little texture during healing is expected but if anything looks swollen or feels hot please reach out to me right away.'
  return ''
}

function placementGuideFor(placement) {
  const pl = placement.toLowerCase()
  if (pl.includes('hand') || pl.includes('finger')) return 'Since it is on your hand please moisturize more frequently, at least 4 times a day. Hands take a beating and that placement needs extra attention.'
  if (pl.includes('rib') || pl.includes('torso') || pl.includes('chest')) return 'Taking deep breaths may feel tight for the first few days. That is normal. Just wear loose breathable clothing and take it easy.'
  if (pl.includes('foot') || pl.includes('ankle')) return 'Keep your foot elevated when resting for the first 48 hours. Avoid tight shoes and socks this week.'
  if (pl.includes('elbow') || pl.includes('knee') || pl.includes('ditch')) return 'The crease area will peel a lot. Please do not pick it. Keep the joint moisturized and avoid bending it aggressively for the first week.'
  return ''
}

export function audioScriptRequest(f, nowMs = Date.now()) {
  const day = Math.min(daysSince(f.date, nowMs), 30)
  const styleGuide = styleGuideFor(f.style)
  const placementAdd = placementGuideFor(f.placement)
  const system = [
    'You are writing a warm, personal 60 second spoken audio script for tattoo artist Saul Gutierrez to send to a client after their tattoo session.',
    'Write in first person as Saul. Warm, calm, reassuring tone.',
    'Zero hyphens or dashes anywhere. No asterisks or special characters. Plain spoken language only.',
    'Recommend Dial Antibacterial fragrance free soap for cleaning and Lubriderm fragrance free or vitamin enriched unscented lotion for moisturizing.',
    f.film ? 'The client has a protective film applied. Advise keeping it on for 3 to 5 days and removing under warm running water before starting the standard routine.' : '',
    'The script must follow this structure:',
    `1. Intro: "Hey ${f.name}, it's Saul..."`,
    '2. Body: Personalized healing guidance based on style and placement. Reference the specific tattoo style and placement naturally.',
    styleGuide ? `Style guidance: ${styleGuide}` : '',
    placementAdd ? `Placement guidance: ${placementAdd}` : '',
    '3. Sign off: "I\'ve got you. Happy healing."',
    'Keep total length under 120 words for a 60 second read.',
  ].filter(Boolean).join(' ')

  return {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system,
    messages: [{
      role: 'user',
      content: `Client name: ${f.name}. Tattoo style: ${f.style || 'custom'}. Placement: ${f.placement || 'body'}. Day ${day} of healing. Write the full audio script now.`,
    }],
  }
}

export const HEALING_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const HEALING_IMAGE_MAX_B64 = 3_000_000

export function healingCheckRequest(f, image, nowMs = Date.now()) {
  const day = Math.min(daysSince(f.date, nowMs), 30)
  return {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: 'You are the MACRI Concierge, a studio AI assistant for Saul Gutierrez. You specialize in tattoo aftercare guidance. Always recommend Dial Antibacterial fragrance free soap for cleaning and Lubriderm fragrance free or vitamin enriched unscented lotion for moisturizing. If the client has a protective film applied, advise keeping it for 3 to 5 days and removing under warm running water before starting the standard routine. Use zero hyphens or dashes. Write all ranges as X to Y. Analyze the uploaded tattoo photo and classify the healing status as one of three options: Healthy, Dry, or Irritated. Provide a one sentence plain language explanation. Return only a JSON object: {"status": "Healthy or Dry or Irritated", "note": "one sentence explanation"}',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
        { type: 'text', text: `Day ${day} of healing. Style: ${f.style || 'custom'}. Assess the healing status.` },
      ],
    }],
  }
}

export function parseHealingResult(text) {
  try {
    const raw = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(raw)
    const status = ['Healthy', 'Dry', 'Irritated'].includes(parsed.status) ? parsed.status : null
    if (!status) return null
    return { status, note: String(parsed.note ?? '').slice(0, 400) }
  } catch {
    return null
  }
}
