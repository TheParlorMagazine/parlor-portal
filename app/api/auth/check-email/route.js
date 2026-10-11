import { serviceClient } from '../../../../lib/apiAuth'

// POST → check if an email is already registered; if so, send a magic link
export async function POST(request) {
  const { email, returnTo } = await request.json()
  if (!email?.trim()) return Response.json({ error: 'Email required' }, { status: 400 })

  const db = serviceClient()
  const { data: member } = await db.from('members').select('id, full_name').eq('email', email.trim().toLowerCase()).maybeSingle()

  if (!member) {
    // Not registered — caller should redirect to /signup
    return Response.json({ exists: false })
  }

  // Registered — send a magic link so they can sign in without a password
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'}/auth/callback?returnTo=${encodeURIComponent(returnTo || '/')}`
  await supabase.auth.admin.generateLink({ type: 'magiclink', email: email.trim().toLowerCase(), options: { redirectTo } })

  return Response.json({ exists: true, hasName: !!member.full_name?.trim() })
}
