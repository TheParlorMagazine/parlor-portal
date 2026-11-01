import { NextResponse } from 'next/server'
import { requireUser, serviceClient } from '../../../../lib/apiAuth'

export async function POST(request) {
  try {
    const user = await requireUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to subscribe.' },
        { status: 401 }
      )
    }

    const db = serviceClient()

    const { data, error } = await db
      .from('members')
      .update({ newsletter_subscribed: true, unsubscribed_at: null })
      .eq('id', user.id)
      .select('id, email, newsletter_subscribed')
      .single()

    if (error) {
      console.error('Newsletter subscription error:', error)
      return NextResponse.json(
        { error: 'Could not update newsletter subscription.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, member: data })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
