import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyUnsubContext } from '../../../../lib/unsubToken'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96'

function page(title, body) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="font-family:Georgia,serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0a0a0a;text-align:center;">
       <h1 style="font-size:24px;">${title}</h1>
       <p style="font-size:15px;line-height:1.7;color:#555;">${body}</p>
       <a href="https://theparlormagazine.com" style="color:#c4364a;">Return to The Parlor →</a>
     </body></html>`,
    { headers: { 'content-type': 'text/html', 'Cache-Control':'private, no-store' } }
  )
}

// A GET must not unsubscribe someone just because a security scanner visits it.
export async function GET(request) {
  const token=new URL(request.url).searchParams.get('token')
  if(!verifyUnsubContext(token))return page('Invalid link','This unsubscribe link is invalid. Manage your preferences from your account instead.')
  return page('Unsubscribe from The Parlor?',`Confirm that you no longer want newsletter and campaign emails. Your account stays intact.<form method="POST" action="?token=${encodeURIComponent(token)}"><button type="submit" style="font:inherit;background:#7A263A;color:#fff;border:0;padding:12px 24px;margin-top:20px;cursor:pointer">Unsubscribe</button></form>`)
}

// Signed POST also supports email clients' RFC 8058 one-click unsubscribe.
export async function POST(request) {
  const token = new URL(request.url).searchParams.get('token')
  const context = verifyUnsubContext(token)
  const memberId = context?.memberId
  if (!memberId) return page('Invalid link', 'This unsubscribe link is invalid or has expired. You can manage your email preferences from your account instead.')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: member } = await supabase.from('members').select('email').eq('id', memberId).single()
  if (!member) return page('Not found', 'We couldn’t find that subscription.')

  const {data:unsubscribed,error:unsubscribeError}=await supabase.rpc('unsubscribe_email_member',{p_member:memberId,p_campaign:context.campaignId})
  if(unsubscribeError || !unsubscribed)return new Response('We could not save your preference. Please try again.',{status:503,headers:{'Cache-Control':'no-store'}})

  // Best-effort: flag the Resend audience contact too.
  try {
    if (process.env.RESEND_API_KEY && member.email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.contacts.update({ audienceId: AUDIENCE_ID, email: member.email, unsubscribed: true })
    }
  } catch {}

  return page('You’re unsubscribed', 'You won’t receive The Parlor newsletter anymore. Changed your mind? You can re-subscribe anytime from your account’s email preferences.')
}
