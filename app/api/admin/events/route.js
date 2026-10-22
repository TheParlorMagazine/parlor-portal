import { deliverEventMessages } from '../../../../lib/eventMessages'
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

const FIELDS = ['title', 'blurb', 'description', 'cover_image_url', 'location_type', 'location', 'join_url', 'starts_at', 'ends_at', 'capacity', 'status', 'host_name', 'featured_in_newsletter', 'featured_home', 'is_public']
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
  const counts = {}
  for (const event of events || []) {
    const { count, error } = await db.from('event_attendance').select('member_id', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'going')
    if (error) return Response.json({ error: 'Event attendance unavailable' }, { status: 500 })
    counts[event.id] = count || 0
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
  const fields = { is_public: true, ...pick(b) }
  const wantsPrivate = fields.is_public === false
  if (wantsPrivate && !(b.forum_mode === 'connect' && b.forum_id) && b.forum_mode !== 'create' && !b.enable_discussion) {
    return Response.json({ error: 'Private events require a forum' }, { status: 400 })
  }
  const requestedStatus = fields.status || 'draft'
  const { data: event, error } = await db.from('events').insert({ ...fields,
    status: wantsPrivate ? 'draft' : requestedStatus,
    forum_id: b.forum_mode === 'connect' ? b.forum_id : null, created_by: user.id }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  await applyForum(db, event, b, user.id)
  const { data: fresh, error: publishError } = await db.from('events').update({ status: requestedStatus }).eq('id', event.id).select().single()
  if (publishError) return Response.json({ error: 'Event saved as draft; attach a forum before publishing.' }, { status: 400 })
  return Response.json({ event: fresh })
}

// PATCH { id, ...fields, enable_discussion? } → update
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  let b = {}; try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const { data: existing } = await db.from('events').select('*').eq('id', b.id).single()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  await applyForum(db, existing, b, user.id)
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
  const { data: fresh } = await db.from('events').select('*').eq('id', b.id).single()
  const { error: queueError } = await db.rpc('event_registration', { p_event: b.id, p_actor: user.id, p_action: 'reconcile' })
  if (!queueError) { try { await deliverEventMessages(db, b.id) } catch { console.error('Event messages pending retry') } }
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
