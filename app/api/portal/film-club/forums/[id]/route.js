import { memberOf, requireUser, serviceClient } from '../../../../../../lib/apiAuth'

const json = (error, status) => Response.json({ error }, { status })
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

async function gate(request, params) {
  const user = await requireUser(request)
  if (!user) return { error: json('Sign in', 401) }
  const { id } = await params
  if (!uuid.test(id)) return { error: json('Discussion not found.', 404) }
  const db = serviceClient()
  const { role } = await memberOf(db, user.id)
  const internal = ['admin', 'editor'].includes(role)
  const grant = internal ? null : await db.from('film_club_forum_moderators').select('member_id')
    .eq('forum_id', id).eq('member_id', user.id).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!internal && !grant?.data) return { error: json('Discussion moderation access is required.', 403) }
  const { data, error } = await db.from('film_club_screenings').select('event:events!inner(title)').eq('forum_id', id).maybeSingle()
  if (error) return { error: json('Could not load discussion.', 500) }
  if (!data) return { error: json('Discussion not found.', 404) }
  return { db, user, id, internal, title: data.event.title }
}

export async function GET(request, { params }) {
  const { db, id, internal, title, error } = await gate(request, params)
  if (error) return error
  const [threads, grants] = await Promise.all([
    db.from('forum_threads').select('id,title,body,status,pinned,report_count, forum_replies(id,body,status,report_count)')
      .eq('forum_id', id).order('created_at', { ascending: false }).limit(100),
    internal ? db.from('film_club_forum_moderators').select('member_id,expires_at, member:members!film_club_forum_moderators_member_id_fkey(full_name,email)')
      .eq('forum_id', id).order('expires_at', { ascending: false }) : { data: [] },
  ])
  if (threads.error || grants.error) return json('Could not load moderation records.', 500)
  return Response.json({ threads: threads.data, grants: grants.data, title })
}

export async function PATCH(request, { params }) {
  const { db, user, id, error } = await gate(request, params)
  if (error) return error
  const body = await request.json().catch(() => null)
  if (!uuid.test(body?.threadId)) return json('Select a discussion thread.', 400)
  if (body.replyId && !uuid.test(body.replyId)) return json('Select a reply.', 400)
  if (!['hide', 'restore', 'pin', 'unpin'].includes(body.action) || (body.replyId && ['pin', 'unpin'].includes(body.action))) {
    return json('Invalid moderation action.', 400)
  }
  const { data, error: updateError } = await db.rpc('moderate_film_club_discussion', {
    p_forum: id, p_actor: user.id, p_thread: body.threadId,
    p_reply: body.replyId || null, p_action: body.action,
  })
  if (updateError) return json('Could not update this discussion.', 500)
  return data ? Response.json({ ok: true }) : json('Discussion item unavailable or access expired.', 404)
}
