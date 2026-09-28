import { createClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail } from '../../../../lib/emails'

// Generates a Supabase recovery link server-side (admin) and delivers it through
// Resend with the Parlor-branded template — instead of Supabase's default email.
// Always responds 200 so it never reveals whether an address has an account.
export async function POST(request) {
  let email = ''
  try { email = (await request.json())?.email?.trim() || '' } catch {}
  if (!email) return Response.json({ ok: true })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
  const origin = new URL(request.url).origin

  const base = process.env.NEXT_PUBLIC_SITE_URL || origin

  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    // error (e.g. no such user) → swallow silently to avoid user enumeration.
    // Link points STRAIGHT to our reset page with the token hash, so it doesn't
    // route through Supabase's Site URL / redirect-allowlist (which was sending
    // the token to the wrong app). The page verifies the token itself.
    if (!error && data?.properties?.hashed_token) {
      const resetUrl = `${base}/auth/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`
      const { data: member } = await admin
        .from('members').select('full_name').eq('email', email).maybeSingle()
      const name = member?.full_name?.split(' ')[0] || ''
      await sendPasswordResetEmail({ to: email, name, resetUrl })
    }
  } catch {}

  return Response.json({ ok: true })
}
