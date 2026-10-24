import { serviceClient } from '../../../../lib/apiAuth'
import { sendAccountPasswordLink } from '../../../../lib/passwordRecovery'
import { sendMagicLinkEmail } from '../../../../lib/emails'

// POST → check if an email is already registered; if so, send a magic link via Resend
export async function POST(request) {
  const { email, returnTo, intent } = await request.json().catch(() => ({}))
  if (typeof email !== 'string' || !email.trim()) return Response.json({ error: 'Email required' }, { status: 400 })

  const db = serviceClient()
  const { data: member, error: lookupError } = await db.from('members').select('id, full_name').eq('email', email.trim().toLowerCase()).maybeSingle()

  if (lookupError) return Response.json({ error: 'Could not check your account. Please try again.' }, { status: 503 })

  if (!member) {
    return Response.json({ exists: false })
  }

  // Imported subscribers already have a confirmed auth account, but may not
  // have a password. Recover that account; never create a duplicate member.
  if (intent === 'password-setup') {
    try {
      const sent = await sendAccountPasswordLink(db, email.trim().toLowerCase(), process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin, member.full_name?.split(' ')[0] || '')
      if (!sent) throw new Error('Account unavailable')
      return Response.json({ exists: true, passwordSetup: true })
    } catch { return Response.json({ error: 'We could not send your password setup email right now. Please try again or contact us.' }, { status: 503 }) }
  }

  // Generate the magic link server-side (does NOT send an email)
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'}/auth/callback?returnTo=${encodeURIComponent(returnTo || '/')}`
  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  })

  if (error || !linkData?.properties?.action_link) {
    console.error('generateLink error:', error)
    return Response.json({ error: 'Could not generate sign-in link' }, { status: 500 })
  }

  // Send via Resend instead of Supabase's built-in email
  await sendMagicLinkEmail({
    to: email.trim().toLowerCase(),
    name: member.full_name?.trim() || null,
    magicUrl: linkData.properties.action_link,
  })

  return Response.json({ exists: true, hasName: !!member.full_name?.trim() })
}
