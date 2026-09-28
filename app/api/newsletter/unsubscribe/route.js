import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyUnsubToken } from '../../../../lib/unsubToken'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96'

function page(title, body) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="font-family:Georgia,serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0a0a0a;text-align:center;">
       <h1 style="font-size:24px;">${title}</h1>
       <p style="font-size:15px;line-height:1.7;color:#555;">${body}</p>
       <a href="https://theparlormagazine.com" style="color:#c4364a;">Return to The Parlor →</a>
     </body></html>`,
    { headers: { 'content-type': 'text/html' } }
  )
}

// GET ?token= → one-click unsubscribe via a signed token (no login needed).
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token')
  const memberId = verifyUnsubToken(token)
  if (!memberId) return page('Invalid link', 'This unsubscribe link is invalid or has expired. You can manage your email preferences from your account instead.')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: member } = await supabase.from('members').select('email').eq('id', memberId).single()
  if (!member) return page('Not found', 'We couldn’t find that subscription.')

  await supabase.from('members').update({
    newsletter_subscribed: false,
    subscription_status: 'unsubscribed',
    unsubscribed_at: new Date().toISOString(),
  }).eq('id', memberId)

  // Best-effort: flag the Resend audience contact too.
  try {
    if (process.env.RESEND_API_KEY && member.email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.contacts.update({ audienceId: AUDIENCE_ID, email: member.email, unsubscribed: true })
    }
  } catch {}

  return page('You’re unsubscribed', 'You won’t receive The Parlor newsletter anymore. Changed your mind? You can re-subscribe anytime from your account’s email preferences.')
}
