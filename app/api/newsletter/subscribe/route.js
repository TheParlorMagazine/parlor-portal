import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96' // General

export async function POST(req) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)

  const [first, ...rest] = (name || '').trim().split(' ')
  const firstName = first || ''
  const lastName  = rest.join(' ') || ''

  const { error } = await resend.contacts.create({
    audienceId: AUDIENCE_ID,
    email: email.toLowerCase().trim(),
    firstName,
    lastName,
    unsubscribed: false,
  })

  if (error) {
    console.error('Resend contact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
