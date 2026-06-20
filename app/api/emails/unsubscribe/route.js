import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new Response('Invalid unsubscribe link.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch their email so we can update Resend too
  const { data: member } = await supabase.from('members').select('email').eq('id', id).single()

  // Mark unsubscribed from newsletter in Supabase — account stays intact
  await supabase.from('members').update({
    subscription_status: 'unsubscribed',
    unsubscribed_at: new Date().toISOString(),
  }).eq('id', id)

  // Mark unsubscribed in Resend so they stop receiving campaign emails
  if (member?.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.contacts.update({
        audienceId: AUDIENCE_ID,
        email: member.email,
        unsubscribed: true,
      })
    } catch (e) {
      console.error('Resend unsubscribe error:', e)
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — The Parlor</title></head>
<body style="font-family:Georgia,'Source Serif 4',serif;background:#fafafa;margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:440px;margin:0 auto;padding:48px 32px;text-align:center;">
    <div style="width:48px;height:48px;border-radius:50%;background:#f0e8e0;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:20px;">✓</div>
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#0a0a0a;margin:0 0 12px;font-size:22px;">You've been unsubscribed.</h2>
    <p style="color:#777;line-height:1.65;margin:0 0 28px;font-size:15px;">
      You won't receive marketing emails from The Parlor anymore.<br>
      Your account and reading history remain intact.
    </p>
    <a href="https://www.theparlormagazine.com" style="display:inline-block;padding:11px 24px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:14px;border-radius:6px;">
      Return to The Parlor →
    </a>
  </div>
</body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
