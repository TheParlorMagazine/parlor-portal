import { eventSummary, eventError } from '../../../../lib/eventAccess'
import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

// POST → create a new event (moderators only — caller must be a host of the forum_id)
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const body = await request.json()
  const { title, blurb, description, starts_at, ends_at, tz_offset, location_type, location, join_url, capacity, cover_image_url, is_public, forum_id, status = 'published' } = body
  if (!title?.trim()) return Response.json({ error: 'Title required' }, { status: 400 })

  // Adjust naive datetime-local strings to UTC using the browser's offset (minutes, e.g. -120 for GMT+2)
  function toUTC(naive) {
    if (!naive) return null
    if (naive.includes('Z') || naive.includes('+') || /T.*-\d\d:\d\d$/.test(naive)) return naive
    // getTimezoneOffset() = local - UTC in minutes (negative for UTC+X zones)
    // UTC = local + offset  →  subtract offset from parsed-as-UTC time
    const offsetMs = typeof tz_offset === 'number' ? tz_offset * 60 * 1000 : 0
    return new Date(new Date(naive).getTime() + offsetMs).toISOString()
  }

  const me = await memberOf(db, user.id)
  const supermod = ['admin', 'social_admin'].includes(me.role)
  if (!forum_id && !supermod) return Response.json({ error: 'A forum is required' }, { status: 403 })
  let host_name = null
  if (forum_id) {
    const { data: forum } = await db.from('forums').select('name,status').eq('id', forum_id).single()
    if (!forum || forum.status !== 'active') return Response.json({ error: 'Forum unavailable' }, { status: 400 })
    const { data: mem } = await db.from('forum_members').select('role').eq('forum_id', forum_id).eq('member_id', user.id).maybeSingle()
    if (!supermod && mem?.role !== 'host') return Response.json({ error: 'Moderators only' }, { status: 403 })
    host_name = forum.name
  }
  if (!['draft','published'].includes(status) || (capacity != null && capacity !== '' && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1))) {
    return Response.json({ error: 'Invalid status or capacity' }, { status: 400 })
  }
  const { data: event, error } = await db.from('events').insert({
    title: title.trim(), blurb: blurb?.trim() || null, description: description?.trim() || null,
    starts_at: toUTC(starts_at), ends_at: toUTC(ends_at),
    location_type: location_type || 'virtual', location: location?.trim() || null,
    join_url: join_url?.trim() || null, capacity: capacity ? Number(capacity) : null,
    cover_image_url: cover_image_url?.trim() || null,
    host_name,
    is_public: is_public === true,
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

  const shaped = []
  for (const event of events || []) {
    try {
      const summary = await eventSummary(db, event.id, user.id)
      // List endpoints never include meeting links.
      const { join_url, ...safe } = summary.event
      shaped.push({ ...safe, my_status: summary.my_status, queue_position: summary.queue_position })
    } catch (error) { if (error.code !== '42501') return eventError(error) }
  }
  const now = Date.now()
  const isPast = e => { const t = e.ends_at || e.starts_at; return t && new Date(t).getTime() < now }
  return Response.json({
    upcoming: shaped.filter(e => !isPast(e)),
    past: shaped.filter(isPast).reverse(),
  })
}
