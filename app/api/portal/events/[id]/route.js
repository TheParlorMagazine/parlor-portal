import { requireUser, serviceClient } from '../../../../../lib/apiAuth'

// GET → event detail + this member's RSVP + going count. The join_url is only
// revealed to members who are "going".
export async function GET(request, { params }) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { id } = await params

  const { data: e } = await db.from('events').select('*').eq('id', id).single()
  if (!e || e.status === 'draft') return Response.json({ error: 'Not found' }, { status: 404 })

  const { count: going } = await db.from('event_rsvps').select('member_id', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'going')
  const { data: mine } = await db.from('event_rsvps').select('status').eq('event_id', id).eq('member_id', user.id).maybeSingle()
  const myStatus = mine?.status || null

  const event = {
    id: e.id, title: e.title, blurb: e.blurb, description: e.description, cover_image_url: e.cover_image_url,
    location_type: e.location_type, location: e.location, starts_at: e.starts_at, ends_at: e.ends_at,
    capacity: e.capacity, status: e.status, forum_id: e.forum_id, host_name: e.host_name,
    going_count: going || 0,
    // Only attendees see the join link.
    join_url: myStatus === 'going' ? e.join_url : null,
  }
  return Response.json({ event, my_status: myStatus })
}
