import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const EVENT_ROLES = ['admin', 'editor', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!EVENT_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

const FIELDS = ['title', 'blurb', 'description', 'cover_image_url', 'location_type', 'location', 'join_url', 'starts_at', 'ends_at', 'capacity', 'status', 'host_name', 'featured_in_newsletter', 'featured_home']
function pick(b) {
  const out = {}
  for (const f of FIELDS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  return out
}

// Create (or ensure) the tied discussion forum for an event; returns forum_id.
async function ensureForum(db, event, userId, name, cover) {
  if (event.forum_id) return event.forum_id
  const forumName = (name || '').trim() || `${event.title} — Discussion`
  const coverUrl = (cover || '').trim() || event.cover_image_url || null
  const base = { name: forumName, description: 'Discussion room for event attendees.', tied_to_type: 'event', tied_to_ref: event.id, created_by: userId, member_count: 1 }
  let { data: forum, error } = await db.from('forums').insert({ ...base, cover_image_url: coverUrl }).select('id').single()
  if (error) { // cover_image_url column not added yet — create without it
    const r = await db.from('forums').insert(base).select('id').single()
    forum = r.data
  }
  if (!forum) return null
  await db.from('forum_members').insert({ forum_id: forum.id, member_id: userId, role: 'host' })
  await db.from('events').update({ forum_id: forum.id }).eq('id', event.id)
  return forum.id
}

// Apply the chosen forum option: create a new forum, connect an existing one,
// or leave as-is. `event` is the current row (may already have forum_id).
async function applyForum(db, event, b, userId) {
  const mode = b.forum_mode || (b.enable_discussion ? 'create' : 'none')
  if (mode === 'connect' && b.forum_id) {
    await db.from('events').update({ forum_id: b.forum_id }).eq('id', event.id)
  } else if (mode === 'create' && !event.forum_id) {
    await ensureForum(db, event, userId, b.forum_name, b.forum_cover)
  }
}

// GET → all events (admin view) with going counts.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { data: events } = await db.from('events').select('*').order('starts_at', { ascending: false })
  const ids = (events || []).map(e => e.id)
  let counts = {}
  if (ids.length) {
    const { data: rsvps } = await db.from('event_rsvps').select('event_id, status').in('event_id', ids).eq('status', 'going')
    for (const r of rsvps || []) counts[r.event_id] = (counts[r.event_id] || 0) + 1
  }
  const { data: forums } = await db.from('forums').select('id, name, tied_to_type').order('name', { ascending: true })
  return Response.json({ events: (events || []).map(e => ({ ...e, going_count: counts[e.id] || 0 })), forums: forums || [] })
}

// POST { ...fields, enable_discussion? } → create an event (+ optional forum)
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  let b = {}; try { b = await request.json() } catch {}
  if (!(b.title || '').trim()) return Response.json({ error: 'Title required' }, { status: 400 })
  let { data: event, error } = await db.from('events').insert({ ...pick(b), created_by: user.id }).select().single()
  if (error && /featured_home/.test(error.message || '')) { // column not migrated yet — save without it
    const { featured_home, ...rest } = pick(b)
    const r = await db.from('events').insert({ ...rest, created_by: user.id }).select().single(); event = r.data; error = r.error
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await applyForum(db, event, b, user.id)
  const { data: fresh } = await db.from('events').select('*').eq('id', event.id).single()
  return Response.json({ event: fresh })
}

// PATCH { id, ...fields, enable_discussion? } → update
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const patch = pick(b)
  let event
  if (Object.keys(patch).length) {
    let { data, error } = await db.from('events').update(patch).eq('id', b.id).select().single()
    if (error && /featured_home/.test(error.message || '')) { // column not migrated yet — save without it
      const { featured_home, ...rest } = patch
      if (Object.keys(rest).length) { const r = await db.from('events').update(rest).eq('id', b.id).select().single(); data = r.data; error = r.error }
      else { const r = await db.from('events').select('*').eq('id', b.id).single(); data = r.data; error = null }
    }
    if (error) return Response.json({ error: error.message }, { status: 500 })
    event = data
  } else {
    const { data } = await db.from('events').select('*').eq('id', b.id).single()
    event = data
  }
  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })
  await applyForum(db, event, b, user.id)
  const { data: fresh } = await db.from('events').select('*').eq('id', b.id).single()
  return Response.json({ event: fresh })
}

// DELETE { id }
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { error } = await g.db.from('events').delete().eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
