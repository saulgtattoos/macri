// Public aftercare endpoint used by /care links. No login, so it is locked down by:
//   signed link fields (HMAC), link expiry, fixed server side prompts,
//   input and image caps, and per IP, per link and global daily limits (fail closed).
// Body: { action: 'audio' | 'healing-check', link: {...fields, exp, sig}, image?: { data, mediaType } }

import { allowPost, clientIp, getBody } from './_lib/http.js'
import { consumeAll, hashIp, RateLimitUnavailable } from './_lib/rateLimit.js'
import {
  audioScriptRequest, healingCheckRequest, HEALING_IMAGE_MAX_B64, HEALING_IMAGE_TYPES,
  linkSecret, parseHealingResult, verifyLink,
} from './_lib/aftercare.js'
import { callAnthropic, callTts, sendAudio, AFTERCARE_VOICE_ID, NotConfiguredError } from './_lib/upstream.js'

export const LIMITS = {
  ipPerHour: 20,
  audioPerLinkPerDay: 3,
  checksPerLinkPerDay: 6,
  globalPerDay: 150,
}

export default async function handler(req, res) {
  if (!allowPost(req, res)) return
  res.setHeader('Cache-Control', 'no-store')

  const secret = linkSecret()
  if (!secret) return res.status(503).json({ error: 'unavailable' })

  const body = getBody(req)
  const action = body?.action
  if (action !== 'audio' && action !== 'healing-check') return res.status(400).json({ error: 'invalid_action' })

  const verdict = verifyLink(body.link, secret)
  if (!verdict.ok) return res.status(403).json({ error: verdict.reason })
  const f = verdict.fields

  let image
  if (action === 'healing-check') {
    image = body.image
    if (!image || !HEALING_IMAGE_TYPES.has(image.mediaType) || typeof image.data !== 'string' || !image.data) {
      return res.status(400).json({ error: 'invalid_image' })
    }
    if (image.data.length > HEALING_IMAGE_MAX_B64) return res.status(413).json({ error: 'image_too_large' })
  }

  const day = 86400
  try {
    const blocked = await consumeAll([
      { name: 'ip', bucket: `aftercare:ip:${hashIp(clientIp(req), secret)}`, windowSeconds: 3600, limit: LIMITS.ipPerHour },
      action === 'audio'
        ? { name: 'link', bucket: `aftercare:link:${f.sessionId}:audio`, windowSeconds: day, limit: LIMITS.audioPerLinkPerDay }
        : { name: 'link', bucket: `aftercare:link:${f.sessionId}:check`, windowSeconds: day, limit: LIMITS.checksPerLinkPerDay },
      { name: 'global', bucket: 'aftercare:global', windowSeconds: day, limit: LIMITS.globalPerDay },
    ])
    if (blocked) return res.status(429).json({ error: 'rate_limited', scope: blocked })
  } catch (err) {
    if (err instanceof RateLimitUnavailable) return res.status(503).json({ error: 'unavailable' })
    throw err
  }

  try {
    if (action === 'audio') {
      const claude = await callAnthropic(audioScriptRequest(f))
      if (!claude.ok) return res.status(502).json({ error: 'upstream' })
      const script = (await claude.json())?.content?.[0]?.text?.trim()
      if (!script) return res.status(502).json({ error: 'upstream' })
      const tts = await callTts({ voice_id: AFTERCARE_VOICE_ID, text: script.slice(0, 1500), model_id: 'eleven_turbo_v2' })
      if (!tts.ok) return res.status(502).json({ error: 'upstream' })
      return sendAudio(res, tts)
    }

    const claude = await callAnthropic(healingCheckRequest(f, image))
    if (!claude.ok) return res.status(502).json({ error: 'upstream' })
    const result = parseHealingResult((await claude.json())?.content?.[0]?.text)
    if (!result) return res.status(502).json({ error: 'upstream' })
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof NotConfiguredError) return res.status(503).json({ error: 'unavailable' })
    return res.status(502).json({ error: 'upstream' })
  }
}
