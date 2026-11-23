import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '../../../../lib/apiAuth'
import { authEmailRateLimit } from '../../../../lib/authEmailRateLimit'

export async function POST(request) {
  const body = (await request.json().catch(() => null)) || {}
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  try {
    const limited = await authEmailRateLimit(request, serviceClient(), email)
    if (limited) return limited
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const returnTo = typeof body.returnTo === 'string' && body.returnTo.startsWith('/') && !body.returnTo.startsWith('//') && !body.returnTo.includes('\\') ? body.returnTo : '/'
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${base}/auth/callback?flow=signup&returnTo=${encodeURIComponent(returnTo)}` } })
    // Do not disclose whether an address is registered or already confirmed.
    if (error && !['user_not_found', 'email_already_confirmed'].includes(error.code)) {
      return Response.json({ error: error.status === 429 ? 'Please wait before requesting another confirmation email.' : 'We could not request a confirmation email right now. Please try again.' }, { status: error.status === 429 ? 429 : 503, headers: error.status === 429 ? { 'Retry-After': '60' } : {} })
    }
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'We could not request a confirmation email right now. Please try again.' }, { status: 503 })
  }
}
