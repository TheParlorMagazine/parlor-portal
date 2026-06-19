import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const resend  = new Resend(process.env.RESEND_API_KEY)
  const FROM    = process.env.RESEND_FROM    || 'The Parlor <onboarding@resend.dev>'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormag.com'
  const firstName = (name || '').split(' ')[0] || 'there'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to The Parlor</title>
</head>
<body style="margin:0;padding:0;background:#fdf6f8;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f8;padding:48px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #f0dde3;">

      <!-- Header -->
      <tr>
        <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-family:'Georgia',serif;font-style:italic;font-size:28px;color:#ffffff;letter-spacing:-0.01em;">
            The Parlor
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:48px 40px;">
          <p style="margin:0 0 8px;font-size:13px;color:#c47080;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">
            Welcome
          </p>
          <h1 style="margin:0 0 20px;font-size:30px;font-weight:700;color:#0a0a0a;line-height:1.2;">
            You're in, ${firstName}.
          </h1>
          <p style="margin:0 0 20px;font-size:16px;color:#444;line-height:1.75;">
            We're so glad you're here. The Parlor is independent media for women who think — essays, reporting, conversations, and culture made by and for women who refuse to be boring about it.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#444;line-height:1.75;">
            Your account is ready. Head to the portal to read, explore, and manage your subscription.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr>
              <td style="background:#0a0a0a;border-radius:8px;padding:0;">
                <a href="${siteUrl}"
                   style="display:block;padding:14px 32px;color:#ffffff;font-family:'Georgia',serif;font-size:16px;font-weight:600;text-decoration:none;text-align:center;">
                  Go to The Parlor →
                </a>
              </td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #f0dde3;margin:32px 0;" />

          <p style="margin:0 0 6px;font-size:14px;color:#888;line-height:1.6;">
            You'll start receiving our newsletter — new pieces, dispatches, and things worth reading. You can manage your preferences any time from your account.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#fdf6f8;padding:24px 40px;text-align:center;border-top:1px solid #f0dde3;">
          <p style="margin:0 0 8px;font-size:12px;color:#bbb;">
            The Parlor · Independent media for women
          </p>
          <p style="margin:0;font-size:12px;color:#ccc;">
            You're receiving this because you created an account at theparlormag.com.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
`

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to The Parlor, ${firstName}`,
    html,
  })

  if (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
