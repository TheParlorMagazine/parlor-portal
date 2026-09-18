import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const AUDIENCE_ID = 'a90d5605-469b-41b4-b16f-86e26690ea96'

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.contacts.list({ audienceId: AUDIENCE_ID })
    if (error) return NextResponse.json({ count: null, error: error.message })
    const active = (data?.data || []).filter(c => !c.unsubscribed)
    return NextResponse.json({ count: active.length })
  } catch (e) {
    return NextResponse.json({ count: null, error: e.message })
  }
}
