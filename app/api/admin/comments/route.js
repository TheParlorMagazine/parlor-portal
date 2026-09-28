import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

// Unified moderation queue — reported article comments AND forum threads/replies.
// Gated to Portal Management roles.
const MOD_ROLES = ['admin', 'social_admin']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!MOD_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

function excerpt(html, n = 200) {
  const text = (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text
}

// GET → every reported live item (comments + forum threads + forum replies),
// newest-report first within each kind, merged and sorted by report count.
export async function GET(request) {
  const g = await gate(request)
  if (g.error) return g.error
  const { db } = g

  const [comRes, thrRes, repRes, bpRes, brRes, mpRes] = await Promise.all([
    db.from('article_comments')
      .select('id, body, created_at, report_count, members!article_comments_member_id_fkey(full_name), articles(title, slug)')
      .eq('status', 'live').gt('report_count', 0),
    db.from('forum_threads')
      .select('id, title, body, created_at, report_count, forum_id, members!forum_threads_member_id_fkey(full_name), forums(name)')
      .eq('status', 'live').gt('report_count', 0),
    db.from('forum_replies')
      .select('id, body, created_at, report_count, thread_id, members!forum_replies_member_id_fkey(full_name), forum_threads(title, forum_id, forums(name))')
      .eq('status', 'live').gt('report_count', 0),
    db.from('book_prompts')
      .select('id, title, body, created_at, report_count, book_id, members!book_prompts_member_id_fkey(full_name), book_club(title)')
      .eq('status', 'live').gt('report_count', 0),
    db.from('book_prompt_replies')
      .select('id, body, created_at, report_count, prompt_id, members!book_prompt_replies_member_id_fkey(full_name), book_prompts(book_id, title, book_club(title))')
      .eq('status', 'live').gt('report_count', 0),
    db.from('member_posts')
      .select('id, body, created_at, report_count, member_id, members!member_posts_member_id_fkey(full_name)')
      .eq('status', 'live').gt('report_count', 0),
  ])

  const items = []

  // Comments carry structured reasons; attach them.
  const comments = comRes.data || []
  const ids = comments.map(c => c.id)
  let reasonsByComment = {}
  if (ids.length) {
    const { data: reps } = await db.from('comment_reports').select('comment_id, reason, created_at').in('comment_id', ids).order('created_at', { ascending: false })
    for (const r of reps || []) (reasonsByComment[r.comment_id] ||= []).push(r)
  }
  for (const c of comments) {
    items.push({
      id: c.id, type: 'comment', body: c.body, created_at: c.created_at, report_count: c.report_count,
      author_name: c.members?.full_name || 'Member',
      context: c.articles?.title ? `Comment on “${c.articles.title}”` : 'Comment',
      href: c.articles?.slug ? `/post/${c.articles.slug}` : null,
      reasons: (reasonsByComment[c.id] || []).map(r => r.reason).filter(Boolean),
    })
  }
  for (const t of thrRes.data || []) {
    items.push({
      id: t.id, type: 'forum_thread', body: `${t.title}${t.body ? ' — ' + excerpt(t.body) : ''}`, created_at: t.created_at, report_count: t.report_count,
      author_name: t.members?.full_name || 'Member',
      context: `Thread in ${t.forums?.name || 'a forum'}`,
      href: t.forum_id ? `/portal/forums/${t.forum_id}/${t.id}` : null, reasons: [],
    })
  }
  for (const r of repRes.data || []) {
    items.push({
      id: r.id, type: 'forum_reply', body: excerpt(r.body), created_at: r.created_at, report_count: r.report_count,
      author_name: r.members?.full_name || 'Member',
      context: `Reply in ${r.forum_threads?.forums?.name || 'a forum'}`,
      href: r.forum_threads?.forum_id ? `/portal/forums/${r.forum_threads.forum_id}/${r.thread_id}` : null, reasons: [],
    })
  }
  for (const p of bpRes.data || []) {
    items.push({
      id: p.id, type: 'book_prompt', body: `${p.title}${p.body ? ' — ' + excerpt(p.body) : ''}`, created_at: p.created_at, report_count: p.report_count,
      author_name: p.members?.full_name || 'Editor',
      context: `Book club prompt · ${p.book_club?.title || ''}`,
      href: p.book_id ? `/portal/reading-room/${p.book_id}/${p.id}` : null, reasons: [],
    })
  }
  for (const r of brRes.data || []) {
    items.push({
      id: r.id, type: 'book_reply', body: excerpt(r.body), created_at: r.created_at, report_count: r.report_count,
      author_name: r.members?.full_name || 'Member',
      context: `Book club response · ${r.book_prompts?.book_club?.title || ''}`,
      href: r.book_prompts?.book_id ? `/portal/reading-room/${r.book_prompts.book_id}/${r.prompt_id}` : null, reasons: [],
    })
  }

  for (const p of mpRes.data || []) {
    items.push({
      id: p.id, type: 'member_post', body: excerpt(p.body || '(image/link post)'), created_at: p.created_at, report_count: p.report_count,
      author_name: p.members?.full_name || 'Member',
      context: 'Member post',
      href: p.member_id ? `/portal/members/${p.member_id}` : null, reasons: [],
    })
  }

  items.sort((a, b) => b.report_count - a.report_count || new Date(b.created_at) - new Date(a.created_at))
  return Response.json({ comments: items })
}

// PATCH { id, type, action } — keep (clear reports) or remove (soft-delete).
export async function PATCH(request) {
  const g = await gate(request)
  if (g.error) return g.error
  const { db, user } = g
  let b = {}
  try { b = await request.json() } catch {}
  const type = b.type || 'comment'
  if (!b.id || !['keep', 'remove'].includes(b.action)) {
    return Response.json({ error: 'id and action (keep|remove) required' }, { status: 400 })
  }

  const TABLES = { forum_thread: 'forum_threads', forum_reply: 'forum_replies', book_prompt: 'book_prompts', book_reply: 'book_prompt_replies', member_post: 'member_posts', comment: 'article_comments' }
  const table = TABLES[type] || 'article_comments'

  if (b.action === 'remove') {
    const { error } = await db.from(table).update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: user.id }).eq('id', b.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // Keep counts honest.
    if (type === 'forum_reply') {
      const { data: r } = await db.from('forum_replies').select('thread_id').eq('id', b.id).single()
      if (r) { const { count } = await db.from('forum_replies').select('id', { count: 'exact', head: true }).eq('thread_id', r.thread_id).eq('status', 'live'); await db.from('forum_threads').update({ reply_count: count || 0 }).eq('id', r.thread_id) }
    } else if (type === 'forum_thread') {
      const { data: t } = await db.from('forum_threads').select('forum_id').eq('id', b.id).single()
      if (t) { const { count } = await db.from('forum_threads').select('id', { count: 'exact', head: true }).eq('forum_id', t.forum_id).eq('status', 'live'); await db.from('forums').update({ thread_count: count || 0 }).eq('id', t.forum_id) }
    } else if (type === 'book_reply') {
      const { data: r } = await db.from('book_prompt_replies').select('prompt_id').eq('id', b.id).single()
      if (r) { const { count } = await db.from('book_prompt_replies').select('id', { count: 'exact', head: true }).eq('prompt_id', r.prompt_id).eq('status', 'live'); await db.from('book_prompts').update({ reply_count: count || 0 }).eq('id', r.prompt_id) }
    }
  } else {
    if (type === 'comment') await db.from('comment_reports').delete().eq('comment_id', b.id)
    const { error } = await db.from(table).update({ report_count: 0 }).eq('id', b.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
