import { createClient } from '@supabase/supabase-js'
import { sendEventReminderEmail } from '../../../../lib/emails'

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
  let failed = 0
  let uncertain = 0

  for (const e of events) {
    const { data: rsvps, error: rsvpError } = await db.from('event_rsvps')
      .select('member_id, members(full_name, email)')
      .eq('event_id', e.id)
      .eq('status', 'going')
      .is('reminded_at', null)

    if (rsvpError) {
      console.error('Reminder RSVP lookup failed:', rsvpError)
      continue
    }

    for (const r of rsvps || []) {
      const email = r.members?.email
      if (!email) continue

      const { data: claimed, error: claimError } = await db.rpc(
        'claim_event_reminder',
        { p_event_id: e.id, p_member_id: r.member_id }
      )

      if (claimError) {
        console.error('Reminder claim failed:', claimError)
        continue
      }

      if (!claimed) continue

      let status = 'uncertain'
      let resendId = null

      try {
        const result = await sendEventReminderEmail({
          to: email,
          name: (r.members.full_name || 'there').split(' ')[0],
          event: e,
          siteUrl: SITE,
        })

        if (result?.data?.id && !result.error) {
          status = 'accepted'
          resendId = result.data.id
        } else {
          status = 'failed'
          console.error('Reminder email not accepted:', e.id, r.member_id, result)
        }
      } catch (error) {
        console.error('Reminder email outcome uncertain:', e.id, r.member_id, error)
      }

      const { error: trackingError } = await db
        .from('event_reminder_deliveries')
        .update({
          status,
          resend_email_id: resendId,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', e.id)
        .eq('member_id', r.member_id)

      if (trackingError) {
        console.error('Reminder tracking update failed:', trackingError)
      }

      if (!trackingError && status === 'accepted') {
        const { error: markError } = await db
          .from('event_rsvps')
          .update({ reminded_at: new Date().toISOString() })
          .eq('event_id', e.id)
          .eq('member_id', r.member_id)
          .eq('status', 'going')
          .is('reminded_at', null)

        if (markError) {
          console.error('Reminder timestamp update failed:', markError)
        }

        sent++
      } else if (status === 'failed') {
        failed++
      } else {
        uncertain++
      }

      // Claim the in-app notification independently of email delivery.
      // Only one scheduled job can claim it.
      const { data: notificationClaimed, error: notificationClaimError } =
        await db.rpc('claim_event_reminder_notification', {
          p_event_id: e.id,
          p_member_id: r.member_id,
        })

      if (notificationClaimError) {
        console.error('In-app reminder claim failed:', notificationClaimError)
      } else if (notificationClaimed) {
        try {
          const { error: notificationError } = await db
            .from('notifications')
            .insert({
              member_id: r.member_id,
              type: 'event',
              message: `Reminder: “${e.title}” is coming up`,
              link_to: 'event',
              link_ref: e.id,
              read: false,
            })

          if (notificationError) {
            console.error('In-app reminder insertion failed:', notificationError)
          }
        } catch (error) {
          console.error('In-app reminder notification failed:', error)
        }
      }
    }
  }

  return Response.json({ ok: true, sent, failed, uncertain })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
