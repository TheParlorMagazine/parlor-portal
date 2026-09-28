import { createClient } from '@supabase/supabase-js'
import { sendWeeklyDigestEmail } from '../../../../lib/emails'
import { isDigestWeek } from '../../../../lib/cadence'

// Weekly per-member recap: unread notifications (last 7 days) + unread inbox
// messages. Meant to be hit by a scheduler once a week (see setup note below).
// Protected by CRON_SECRET — pass it as `Authorization: Bearer <secret>` or `?secret=`.
//
// Query flags: ?dryRun=1 (compute, don't send), ?memberId=<id> (only that member).

function authorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  const bearer = (request.headers.get('authorization') || '').replace('Bearer ', '')
  return bearer === secret || url.searchParams.get('secret') === secret
}

async function run(request) {
  if (!authorized(request)) {
    return Response.json({ error: process.env.CRON_SECRET ? 'Unauthorized' : 'CRON_SECRET not configured' }, { status: 401 })
  }
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const force = url.searchParams.get('force') === '1'
  const onlyMember = url.searchParams.get('memberId')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'

  // Alternates with the Newsletter — only sends on digest weeks (even ISO weeks).
  if (!dryRun && !force && !onlyMember && !isDigestWeek()) {
    return Response.json({ ok: true, sent: 0, reason: 'off_week' })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()  // bi-weekly window

  let mq = db.from('members').select('id, email, full_name').eq('deactivated', false)
  if (onlyMember) mq = mq.eq('id', onlyMember)
  const { data: members, error } = await mq
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let sent = 0, skipped = 0
  const report = []
  for (const m of members || []) {
    if (!m.email) { skipped++; continue }
    const [{ data: notifs }, { data: threads }] = await Promise.all([
      db.from('notifications').select('type, message, created_at').eq('member_id', m.id).eq('read', false).gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20),
      db.from('inbox_threads').select('subject, member_unread').eq('member_id', m.id).gt('member_unread', 0),
    ])
    const notifications = notifs || []
    const unreadCount = (threads || []).reduce((s, t) => s + (t.member_unread || 0), 0)
    const unread = { count: unreadCount, threads: (threads || []).map(t => ({ subject: t.subject })) }

    if (notifications.length === 0 && unreadCount === 0) { skipped++; continue }
    report.push({ email: m.email, notifications: notifications.length, unread: unreadCount })
    if (!dryRun) {
      try {
        await sendWeeklyDigestEmail({ to: m.email, name: (m.full_name || '').split(' ')[0], notifications, unread, siteUrl })
        sent++
      } catch (e) { report[report.length - 1].error = e.message }
    }
  }

  return Response.json({ ok: true, dryRun, totalMembers: (members || []).length, sent, skipped, report })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
