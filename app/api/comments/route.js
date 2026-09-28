import { requireUser, serviceClient } from '../../../lib/apiAuth'
import { notifyMember } from '../../../lib/notify'

// Article comments. Reading is PUBLIC; posting/editing/removing is limited to
// signed-in members (free or paid subscribers) — never anonymous visitors.
// Flat + one level of replies: a reply's parent_id must be a top-level comment.

function authorRow(db, userId) {
  return db.from('members').select('id, full_name, avatar_url, deactivated').eq('id', userId).single()
}

// Shape one DB row for the client (never leaks member_id of others beyond name/avatar).
function shape(row) {
  return {
    id: row.id,
    parent_id: row.parent_id,
    body: row.body,
    created_at: row.created_at,
    edited_at: row.edited_at,
    member_id: row.member_id,
    author_name: row.members?.full_name || 'Member',
    author_avatar: row.members?.avatar_url || null,
  }
}

// GET /api/comments?article_id=... → { comments: [{...top-level, replies: []}], count }
export async function GET(request) {
  const articleId = new URL(request.url).searchParams.get('article_id')
  if (!articleId) return Response.json({ error: 'article_id required' }, { status: 400 })
  const db = serviceClient()
  const { data, error } = await db
    .from('article_comments')
    .select('id, parent_id, body, created_at, edited_at, member_id, members!article_comments_member_id_fkey(full_name, avatar_url)')
    .eq('article_id', articleId)
    .eq('status', 'live')
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data || []).map(shape)
  const tops = rows.filter(r => !r.parent_id).map(r => ({ ...r, replies: [] }))
  const byId = Object.fromEntries(tops.map(t => [t.id, t]))
  for (const r of rows) {
    if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].replies.push(r)
  }
  return Response.json({ comments: tops, count: rows.length })
}

// POST { article_id, body, parent_id? } → creates a comment (subscriber-only)
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in to comment' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  if (!b.article_id || !body) return Response.json({ error: 'article_id and body required' }, { status: 400 })
  if (body.length > 5000) return Response.json({ error: 'Comment too long' }, { status: 400 })

  const db = serviceClient()
  const { data: me } = await authorRow(db, user.id)
  if (!me || me.deactivated) return Response.json({ error: 'Not allowed' }, { status: 403 })

  // A reply must attach to an existing top-level comment on the same article.
  let parentId = null
  let parentAuthor = null
  if (b.parent_id) {
    const { data: parent } = await db
      .from('article_comments')
      .select('id, parent_id, member_id, article_id, status')
      .eq('id', b.parent_id).single()
    if (!parent || parent.article_id !== b.article_id || parent.status !== 'live') {
      return Response.json({ error: 'Parent comment not found' }, { status: 400 })
    }
    // Collapse deeper nesting to one level: reply to the top-level ancestor.
    parentId = parent.parent_id || parent.id
    parentAuthor = parent.member_id
  }

  const { data: created, error } = await db
    .from('article_comments')
    .insert({ article_id: b.article_id, member_id: user.id, parent_id: parentId, body })
    .select('id, parent_id, body, created_at, edited_at, member_id, members!article_comments_member_id_fkey(full_name, avatar_url)')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Notify the parent author of a reply (not yourself).
  if (parentAuthor && parentAuthor !== user.id) {
    const { data: art } = await db.from('articles').select('slug, title').eq('id', b.article_id).single()
    await notifyMember(db, {
      memberId: parentAuthor,
      type: 'reply',
      message: `${me.full_name || 'A member'} replied to your comment on “${art?.title || 'an article'}”`,
      linkTo: 'article',
      linkRef: art?.slug || null,
    })
  }
  return Response.json({ comment: shape(created) })
}

// PATCH { id, body } → edit your own comment
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  const body = (b.body || '').trim()
  if (!b.id || !body) return Response.json({ error: 'id and body required' }, { status: 400 })
  const db = serviceClient()
  const { data: updated, error } = await db
    .from('article_comments')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', b.id).eq('member_id', user.id).eq('status', 'live')
    .select('id, parent_id, body, created_at, edited_at, member_id, members!article_comments_member_id_fkey(full_name, avatar_url)')
    .single()
  if (error || !updated) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ comment: shape(updated) })
}

// DELETE { id } → soft-remove your own comment
export async function DELETE(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const db = serviceClient()
  const { error } = await db
    .from('article_comments')
    .update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: user.id })
    .eq('id', b.id).eq('member_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
