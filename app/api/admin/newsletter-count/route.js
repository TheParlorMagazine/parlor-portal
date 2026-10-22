import { NextResponse } from 'next/server'
import { serviceClient, requireUser, memberOf } from '../../../../lib/apiAuth'

export async function GET(request) {
  try {
    const user = await requireUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = serviceClient()
    const member = await memberOf(db, user.id)

    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { count, error } = await db
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_subscribed', true)
      .neq('role', 'admin')
      .not('email', 'ilike', '%@theparlormagazine.com')

    if (error) {
      console.error('Newsletter count error:', error)
      return NextResponse.json(
        { count: null, error: 'Unable to load newsletter count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Newsletter count error:', error)
    return NextResponse.json(
      { count: null, error: 'Unable to load newsletter count' },
      { status: 500 }
    )
  }
}
