import { Resend } from 'resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, body } = req.body

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error } = await resend.emails.send({
      from: 'Saul Gutierrez <onboarding@resend.dev>',
      to,
      subject,
      text: body,
    })

    if (error) throw new Error(error.message)

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Resend error:', err)
    return res.status(500).json({ error: err.message })
  }
}
