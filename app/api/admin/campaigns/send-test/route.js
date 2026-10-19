import { Resend } from 'resend'
import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

const ROLES = ['admin', 'editor', 'social_admin']

export async function POST(request) {
  try {
    const user = await requireUser(request)
    if (!user) {
      return Response.json({ error: 'Sign in required' }, { status: 401 })
    }

    const db = serviceClient()
    const me = await memberOf(db, user.id)

    if (!me || !ROLES.includes(me.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { to, subject, html } = await request.json()

    if (
      typeof to !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
      typeof subject !== 'string' ||
      typeof html !== 'string' ||
      !subject.trim() ||
      !html.trim()
    ) {
      return Response.json(
        { error: 'Valid recipient, subject and HTML are required' },
        { status: 400 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'The Parlor <onboarding@resend.dev>',
      to: [to.trim()],
      subject: `[TEST] ${subject}`,
      html,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 502 })
    }

    return Response.json({ ok: true, id: data?.id })
  } catch (error) {
    console.error('Test email failed:', error)
    return Response.json(
      { error: 'Unable to send test email' },
      { status: 500 }
    )
  }
}
