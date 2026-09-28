import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { sendToSegment } from '../../../../lib/broadcast'

async function requireAdmin(request) {
  const user = await requireUser(request)
  if (!user) return { error: 'Not signed in', status: 401 }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (me.role !== 'admin') return { error: 'Admins only', status: 403 }
  return { user, me, db }
}

export async function GET(request) {
  const a = await requireAdmin(request)
  if (a.error) return Response.json({ error: a.error }, { status: a.status })
  const { data, error } = await a.db
    .from('inbox_broadcasts')
    .select('id, name, segment, segment_id, subject, schedule_type, scheduled_at, event_ref, status, sent_count, created_at, sent_at, email_segments(name)')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ broadcasts: data || [] })
}

export async function POST(request) {
  const a = await requireAdmin(request)
  if (a.error) return Response.json({ error: a.error }, { status: a.status })
  const { db, me, user } = a

  let body = {}
  try { body = await request.json() } catch {}
  const name = (body.name || '').trim()
  const text = (body.body || '').trim()
  // A custom segment id routes through audience 'segment'; otherwise a computed key.
  const segmentId = body.segment_id || null
  const segment = segmentId ? 'segment' : (body.segment || 'all')
  const scheduleType = ['now', 'scheduled', 'event'].includes(body.schedule_type) ? body.schedule_type : 'now'
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 })
  if (!text) return Response.json({ error: 'Message required' }, { status: 400 })
  if (scheduleType === 'scheduled' && !body.scheduled_at) return Response.json({ error: 'Pick a send time' }, { status: 400 })

  const eventRef = body.event_ref || null
  const row = {
    name, segment, segment_id: segmentId, subject: body.subject || null, body: text,
    schedule_type: scheduleType,
    scheduled_at: scheduleType === 'scheduled' ? body.scheduled_at : null,
    event_ref: eventRef,
    created_by: user.id,
    status: scheduleType === 'now' ? 'sent' : 'scheduled',
  }

  if (scheduleType === 'now') {
    row.sent_count = await sendToSegment(db, { audience: segment, segmentId, eventRef, subject: body.subject, body: text, senderName: me.full_name, senderId: user.id })
    row.sent_at = new Date().toISOString()
  }

  const { data, error } = await db.from('inbox_broadcasts').insert(row).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ broadcast: data })
}
