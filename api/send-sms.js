// api/send-sms.js
// Vercel serverless function — POST { to, body }
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in env

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, body } = req.body ?? {}

  if (!to || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, body' })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: 'Twilio credentials not configured' })
  }

  // Normalize phone number — strip everything except digits and leading +
  const normalized = to.replace(/[^\d+]/g, '')
  const phone = normalized.startsWith('+') ? normalized : `+1${normalized}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams()
  params.append('To',   phone)
  params.append('From', from)
  params.append('Body', body)

  try {
    const twilioRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: params.toString(),
    })

    const data = await twilioRes.json()

    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        error: data?.message ?? 'Twilio error',
        code:  data?.code,
      })
    }

    return res.status(200).json({ success: true, sid: data.sid })
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'Unknown error' })
  }
}