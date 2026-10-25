import { serviceClient } from '../../../../lib/apiAuth'
import { sendAccountPasswordLink } from '../../../../lib/passwordRecovery'

// Keep unknown-account responses generic; report service/delivery failures.
export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  try {
    const db = serviceClient()
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    await sendAccountPasswordLink(db, email, base)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'We could not send the password email right now. Please try again.' }, { status: 503 })
  }
}
