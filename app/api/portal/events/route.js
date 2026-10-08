import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// POST → create a new event (moderators only — caller must be a host of the forum_id)
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const body = await request.json()
  const { title, blurb, description, starts_at, ends_at, location_type, location, join_url, capacity, forum_id, status = 'published' } = body
  if (!title?.trim()) return Response.json({ error: 'Title required' }, { status: 400 })

  // If a forum_id is given, verify the caller is a host of that forum.
  if (forum_id) {
    const { data: mem } = await db.from('forum_memberships').select('role').eq('forum_id', forum_id).eq('member_id', user.id).maybeSingle()
    if (!mem || mem.role !== 'host') return Response.json({ error: 'Not a moderator of this forum' }, { status: 403 })
  }

  const { data: event, error } = await db.from('events').insert({
    title: title.trim(), blurb: blurb?.trim() || null, description: description?.trim() || null,
    starts_at: starts_at || null, ends_at: ends_at || null,
    location_type: location_type || 'virtual', location: location?.trim() || null,
    join_url: join_url?.trim() || null, capacity: capacity ? Number(capacity) : null,
    forum_id: forum_id || null, status, created_by: user.id,
  }).select('id').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: event.id }, { status: 201 })
}

// GET → published events split into upcoming / past, each with the going count
// and this member's RSVP status.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()

  const { data: events, error } = await db.from('events')
    .select('id, title, blurb, cover_image_url, location_type, location, starts_at, ends_at, capacity, status, forum_id, host_name')
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (events || []).map(e => e.id)
  let goingByEvent = {}
  let mine = {}
  if (ids.length) {
    const { data: rsvps } = await db.from('event_rsvps').select('event_id, member_id, status').in('event_id', ids)
    for (const r of rsvps || []) {
      if (r.status === 'going') goingByEvent[r.event_id] = (goingByEvent[r.event_id] || 0) + 1
      if (r.member_id === user.id) mine[r.event_id] = r.status
    }
  }

  const now = Date.now()
  const shaped = (events || []).map(e => ({
    ...e,
    going_count: goingByEvent[e.id] || 0,
    my_status: mine[e.id] || null,
  }))
  const isPast = e => { const t = e.ends_at || e.starts_at; return t && new Date(t).getTime() < now }
  return Response.json({
    upcoming: shaped.filter(e => !isPast(e)),
    past: shaped.filter(isPast).reverse(),
  })
}
