module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, name } = req.body
  const { sendWelcomeEmail } = await import('../lib/emails.js')
  await sendWelcomeEmail({ to: email, name })
  res.json({ sent: true })
}
