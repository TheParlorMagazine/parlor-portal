import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

// Enable only after installing the accompanying migration. Shared across instances.
export async function authEmailRateLimit(request, db, email) {
  if (process.env.AUTH_EMAIL_RATE_LIMIT_ENABLED !== 'true') return null
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) throw new Error('Missing limiter secret')
    const hash = value => createHmac('sha256', secret).update(value).digest('hex')
    // Netlify supplies this single client address. Ignore forwarding headers and
    // do not trust the Netlify header outside a Netlify deployment.
    const candidate = process.env.NETLIFY === 'true' ? request.headers.get('x-nf-client-connection-ip')?.trim() : null
    const ip = candidate && isIP(candidate) ? candidate : null
    const { data, error } = await db.rpc('claim_auth_email_request', {
      email_key: hash(`email:${email}`), ip_key: ip ? hash(`ip:${ip}`) : null,
    })
    if (error || typeof data !== 'number') throw new Error('Limiter unavailable')
    if (data > 0) return Response.json({ error: 'Please wait before requesting another email.' }, {
      status: 429, headers: { 'Retry-After': String(data), 'Cache-Control': 'no-store' },
    })
    return null
  } catch {
    return Response.json({ error: 'Email requests are temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}
