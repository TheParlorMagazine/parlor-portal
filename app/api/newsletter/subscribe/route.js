import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96' // General

export async function POST(req) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const resend    = new Resend(process.env.RESEND_API_KEY)
  const supabase  = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [first, ...rest] = (name || '').trim().split(' ')
  const firstName  = first || ''
  const lastName   = rest.join(' ') || ''
  const cleanEmail = email.toLowerCase().trim()

  // 1. Add / re-activate in Resend
  const { error } = await resend.contacts.create({
    audienceId: AUDIENCE_ID,
    email: cleanEmail,
    firstName,
    lastName,
    unsubscribed: false,
  })

  if (error) {
    console.error('Resend contact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Ensure they exist as a site member in Supabase.
  //    ignoreDuplicates: true means existing full accounts are never overwritten.
  await supabase.from('members').upsert(
    {
      email: cleanEmail,
      name: name?.trim() || null,
      plan: 'free',
      subscription_status: 'active',
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'email', ignoreDuplicates: true }
  )

  return NextResponse.json({ ok: true })
}
