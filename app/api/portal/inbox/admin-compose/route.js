import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { notifyMember } from '../../../../../lib/notify'

// Admin-only. GET ?q= searches members by name. POST sends a message (as the
// editors) to a segment or an individual — creating an inbox thread per recipient.

function isPaidPlan(p) { return /reader|printing/i.test(p || '') }
function inAudience(m, audience) {
  if (audience === 'all') return true
  if (audience === 'readers_circle') return /reader/i.test(m.plan || '')
  if (audience === 'printing_press') return /printing/i.test(m.plan || '')
  if (audience === 'free') return !isPaidPlan(m.plan)
  return false
}

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (me.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 })

  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (!q) return Response.json({ members: [] })
  const { data } = await db.from('members')
    .select('id, full_name, email').eq('deactivated', false)
    .ilike('full_name', `%${q}%`).limit(10)
  return Response.json({ members: data || [] })
}

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (me.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 })

  let body = {}
  try { body = await request.json() } catch {}
  const { audience, memberId } = body
  const subject = (body.subject || '').trim() || 'A message from The Parlor'
  const text = (body.body || '').trim()
  if (!text) return Response.json({ error: 'Message required' }, { status: 400 })

  // Resolve recipients
  let recipients = []
  if (audience === 'individual') {
    if (!memberId) return Response.json({ error: 'No recipient' }, { status: 400 })
    const { data } = await db.from('members').select('id, full_name').eq('id', memberId).single()
    if (data) recipients = [data]
  } else {
    const { data } = await db.from('members').select('id, full_name, plan, role').eq('deactivated', false)
    recipients = (data || []).filter(m => m.id !== user.id && m.role !== 'admin' && inAudience(m, audience))
  }
  if (!recipients.length) return Response.json({ error: 'No recipients' }, { status: 400 })

  const now = new Date().toISOString()
  let sent = 0
  for (const r of recipients) {
    const { data: thread } = await db.from('inbox_threads').insert({
      member_id: r.id, subject, last_message_preview: text.slice(0, 140), last_message_at: now,
      member_unread: 1, initiated_by: 'admin',
    }).select().single()
    if (!thread) continue
    await db.from('inbox_messages').insert({
      thread_id: thread.id, sender_type: 'admin', sender_name: me.full_name || 'The Parlor',
      sender_id: user.id, body: text, read: false,
    })
    await notifyMember(db, { memberId: r.id, type: 'inbox', message: `${me.full_name || 'The Parlor'} sent you a message`, linkTo: 'inbox' })
    sent++
  }

  return Response.json({ ok: true, sent })
}
