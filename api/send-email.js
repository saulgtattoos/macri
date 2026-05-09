import { createTransport } from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, body } = req.body

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' })
  }

  const transporter = createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  try {
    await transporter.sendMail({
      from: `"Saul Gutierrez" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
      replyTo: process.env.GMAIL_USER,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Gmail send error:', err)
    return res.status(500).json({ error: err.message })
  }
}
