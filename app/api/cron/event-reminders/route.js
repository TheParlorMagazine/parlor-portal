import { createClient } from '@supabase/supabase-js'
import { sendEventReminderEmail } from '../../../../lib/emails'
import { notifyMember } from '../../../../lib/notify'

// Sends reminders for events starting within the next 24h to attendees who
// haven't been reminded yet. Hit by a scheduler (netlify/functions/event-reminders.mjs).
// Protected by CRON_SECRET.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'

function authorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  const bearer = (request.headers.get('authorization') || '').replace('Bearer ', '')
  return bearer === secret || url.searchParams.get('secret') === secret
}

async function run(request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const now = new Date()
  const soon = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()

  const { data: events } = await db.from('events')
    .select('id, title, starts_at, forum_id, blurb, location_type, location')
    .eq('status', 'published').gte('starts_at', now.toISOString()).lte('starts_at', soon)
  if (!events || events.length === 0) return Response.json({ ok: true, sent: 0 })

  let sent = 0
  for (const e of events) {
    const { data: rsvps } = await db.from('event_rsvps')
      .select('member_id, members(full_name, email)')
      .eq('event_id', e.id).eq('status', 'going').is('reminded_at', null)
    for (const r of rsvps || []) {
      const email = r.members?.email
      if (email) { try { await sendEventReminderEmail({ to: email, name: (r.members.full_name || 'there').split(' ')[0], event: e, siteUrl: SITE }) } catch {} }
      await notifyMember(db, { memberId: r.member_id, type: 'event', message: `Reminder: “${e.title}” is coming up`, linkTo: 'event', linkRef: e.id })
      await db.from('event_rsvps').update({ reminded_at: new Date().toISOString() }).eq('event_id', e.id).eq('member_id', r.member_id)
      sent++
    }
  }
  return Response.json({ ok: true, sent })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
