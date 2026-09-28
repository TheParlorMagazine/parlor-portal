import { notifyMember } from './notify'
import { segmentMemberIds } from './segments'

function isPaidPlan(p) { return /reader|printing/i.test(p || '') }
function inAudience(m, audience) {
  if (audience === 'all') return true
  if (audience === 'readers_circle') return /reader/i.test(m.plan || '')
  if (audience === 'printing_press') return /printing/i.test(m.plan || '')
  if (audience === 'free') return !isPaidPlan(m.plan)
  // event_attendees resolves to nobody until Events + registration exist
  return false
}

// Resolve a segment (or a single member) and deliver `body` to each recipient's
// portal inbox as a new thread, sent by the given admin. Returns the sent count.
// `audience` may be a computed key (all/readers_circle/printing_press/free),
// 'individual' (with memberId), or 'segment' (with segmentId → a saved
// email_segments row, the same segments used for email + forums).
export async function sendToSegment(db, { audience, memberId, segmentId, eventRef, subject, body, senderName, senderId }) {
  const subj = (subject || '').trim() || 'A message from The Parlor'
  const text = (body || '').trim()
  if (!text) return 0

  let recipients = []
  if (audience === 'individual' && memberId) {
    const { data } = await db.from('members').select('id, full_name').eq('id', memberId).single()
    if (data) recipients = [data]
  } else if (audience === 'segment' && segmentId) {
    const { data: seg } = await db.from('email_segments').select('*').eq('id', segmentId).single()
    const ids = await segmentMemberIds(db, seg)
    if (ids.length) {
      const { data } = await db.from('members').select('id, full_name, role').in('id', ids).eq('deactivated', false)
      recipients = (data || []).filter(m => m.id !== senderId && m.role !== 'admin')
    }
  } else if (audience === 'event_attendees') {
    // Attendees of a specific event (eventRef), or all going attendees if none given.
    let q = db.from('event_rsvps').select('member_id').eq('status', 'going')
    if (eventRef) q = q.eq('event_id', eventRef)
    const { data: rows } = await q
    const ids = [...new Set((rows || []).map(r => r.member_id))]
    if (ids.length) {
      const { data } = await db.from('members').select('id, full_name, role').in('id', ids).eq('deactivated', false)
      recipients = (data || []).filter(m => m.id !== senderId && m.role !== 'admin')
    }
  } else {
    const { data } = await db.from('members').select('id, full_name, plan, role').eq('deactivated', false)
    recipients = (data || []).filter(m => m.id !== senderId && m.role !== 'admin' && inAudience(m, audience))
  }
  if (!recipients.length) return 0

  const now = new Date().toISOString()
  let sent = 0
  for (const r of recipients) {
    const { data: thread } = await db.from('inbox_threads').insert({
      member_id: r.id, subject: subj, last_message_preview: text.slice(0, 140),
      last_message_at: now, member_unread: 1, initiated_by: 'admin',
    }).select().single()
    if (!thread) continue
    await db.from('inbox_messages').insert({
      thread_id: thread.id, sender_type: 'admin', sender_name: senderName || 'The Parlor',
      sender_id: senderId, body: text, read: false,
    })
    await notifyMember(db, { memberId: r.id, type: 'inbox', message: `${senderName || 'The Parlor'} sent you a message`, linkTo: 'inbox' })
    sent++
  }
  return sent
}
