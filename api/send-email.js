import { Resend } from 'resend'
import { requireOwner } from './_lib/auth.js'

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await requireOwner(req, res))) return

  const { to, subject, body } = req.body ?? {}

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' })
  }

  if (typeof to !== 'string' || to.length > 254 || !EMAIL_RE.test(to)
    || typeof subject !== 'string' || subject.length > 200
    || typeof body !== 'string' || body.length > 20000) {
    return res.status(400).json({ error: 'Invalid recipient, subject, or body' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { data, error } = await resend.emails.send({
      from: 'Saul Gutierrez <onboarding@resend.dev>',
      to,
      subject,
      text: body,
    })

    if (error) throw new Error(error.message)

    // Resend accepted the email (not proof of delivery); its id is kept on the reply record.
    return res.status(200).json({ success: true, id: data?.id ?? null })
  } catch (err) {
    console.error('Resend error:', err)
    return res.status(500).json({ error: err.message })
  }
}
