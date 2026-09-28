import { requireUser, serviceClient } from '../../../../../../lib/apiAuth'
import { notifyMember } from '../../../../../../lib/notify'
import { sendEventRsvpEmail } from '../../../../../../lib/emails'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://theparlormagazine.com'

// POST → RSVP to an event. Grants access to the tied forum (auto-joined) and
// sends the confirmation email. Falls to waitlist if the event is at capacity.
export async function POST(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const { data: e } = await db.from('events').select('*').eq('id', id).single()
  if (!e || e.status !== 'published') return Response.json({ error: 'Event not available' }, { status: 404 })

  const { data: existing } = await db.from('event_rsvps').select('status').eq('event_id', id).eq('member_id', user.id).maybeSingle()
  const alreadyGoing = existing?.status === 'going'

  // Capacity check (waitlist when full and not already counted).
  let status = 'going'
  if (e.capacity && !alreadyGoing) {
    const { count } = await db.from('event_rsvps').select('member_id', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'going')
    if ((count || 0) >= e.capacity) status = 'waitlist'
  }

  await db.from('event_rsvps').upsert({ event_id: id, member_id: user.id, status }, { onConflict: 'event_id,member_id' })

  // Going → join the event's discussion forum.
  if (status === 'going' && e.forum_id) {
    await db.from('forum_members').upsert({ forum_id: e.forum_id, member_id: user.id, role: 'member' }, { onConflict: 'forum_id,member_id', ignoreDuplicates: true })
    const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', e.forum_id)
    await db.from('forums').update({ member_count: count || 0 }).eq('id', e.forum_id)
  }

  // Email automation + in-app notification (best effort — never fail the RSVP).
  if (!alreadyGoing && status === 'going') {
    const { data: me } = await db.from('members').select('full_name, email').eq('id', user.id).single()
    if (me?.email) { try { await sendEventRsvpEmail({ to: me.email, name: (me.full_name || 'there').split(' ')[0], event: e, siteUrl: SITE }) } catch {} }
    await notifyMember(db, { memberId: user.id, type: 'event', message: `You're going to “${e.title}”`, linkTo: 'event', linkRef: e.id })
  }

  const { count: going } = await db.from('event_rsvps').select('member_id', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'going')
  return Response.json({ status, going_count: going || 0 })
}

// DELETE → cancel RSVP; removes forum access.
export async function DELETE(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const { data: e } = await db.from('events').select('forum_id').eq('id', id).single()
  await db.from('event_rsvps').update({ status: 'cancelled' }).eq('event_id', id).eq('member_id', user.id)
  if (e?.forum_id) {
    await db.from('forum_members').delete().eq('forum_id', e.forum_id).eq('member_id', user.id)
    const { count } = await db.from('forum_members').select('member_id', { count: 'exact', head: true }).eq('forum_id', e.forum_id)
    await db.from('forums').update({ member_count: count || 0 }).eq('id', e.forum_id)
  }
  const { count: going } = await db.from('event_rsvps').select('member_id', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'going')
  return Response.json({ status: 'cancelled', going_count: going || 0 })
}
