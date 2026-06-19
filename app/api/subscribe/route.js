import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const { email } = await req.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Upsert into members table — if already exists, just update updated_at
  const { error } = await supabase
    .from('members')
    .upsert(
      { email: email.toLowerCase().trim(), plan: 'free', status: 'active' },
      { onConflict: 'email', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
