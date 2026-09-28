import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { notifyMember } from '../../../../lib/notify'
import { withDisclaimer } from '../../../../lib/memberPosts'

const REVIEW_ROLES = ['admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!REVIEW_ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

function slugify(s) { return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'community-post' }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function toHtml(text) { return (text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n') }
async function uniqueSlug(db, base) {
  let slug = base, n = 1
  while (true) { const { data } = await db.from('articles').select('id').eq('slug', slug).maybeSingle(); if (!data) return slug; slug = `${base}-${++n}` }
}

// GET → submissions queue with author.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { data, error } = await db.from('member_submissions')
    .select('id, title, subtitle, body, byline, vertical, bio, sources, cover_image_url, status, share_to_feed, feed_visible, editor_note, published_article_id, created_at, updated_at, member_id, members!member_submissions_member_id_fkey(full_name, email)')
    .neq('status', 'draft')
    .order('status', { ascending: true }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const submissions = (data || []).map(s => ({ ...s, author_name: s.members?.full_name || 'Member', members: undefined }))
  return Response.json({ submissions })
}

// Body may be rich-text HTML (new editor) or legacy plain text — normalize.
function bodyToHtml(body) {
  const s = body || ''
  return /<\w+[\s>/]/.test(s) ? s : toHtml(s)
}

// PATCH { id, action, editor_note? }
//   approve   → create a DRAFT member-post article (filed in its vertical, disclaimer
//               auto-inserted) to edit, fact-check + publish; returns article id
//   community → keep in the member community space only (visible in the feed)
//   changes   → send back to the author with a note (request changes)
//   remove    → take down (guideline violation)
// Legacy aliases: 'release' → community, 'reject' → changes.
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  let b = {}
  try { b = await request.json() } catch {}
  const action = b.action === 'release' ? 'community' : b.action === 'reject' ? 'changes' : b.action
  if (!b.id || !['approve', 'community', 'changes', 'remove'].includes(action)) return Response.json({ error: 'id and action required' }, { status: 400 })

  const { data: sub } = await db.from('member_submissions').select('*').eq('id', b.id).single()
  if (!sub) return Response.json({ error: 'Not found' }, { status: 404 })
  const now = new Date().toISOString()
  const note = (b.editor_note || '').trim() || null

  if (action === 'changes') {
    await db.from('member_submissions').update({ status: 'changes_requested', feed_visible: false, editor_note: note, reviewed_by: user.id, reviewed_at: now }).eq('id', b.id)
    await notifyMember(db, { memberId: sub.member_id, type: 'system', message: `Your piece “${sub.title}” needs a few changes`, linkTo: 'write', linkRef: sub.id })
    return Response.json({ ok: true, status: 'changes_requested' })
  }

  if (action === 'community') {
    await db.from('member_submissions').update({ status: 'community_only', feed_visible: true, editor_note: note, reviewed_by: user.id, reviewed_at: now }).eq('id', b.id)
    await notifyMember(db, { memberId: sub.member_id, type: 'system', message: `Your post “${sub.title}” is live in the community space`, linkTo: 'blog', linkRef: sub.id })
    return Response.json({ ok: true, status: 'community_only' })
  }

  if (action === 'remove') {
    await db.from('member_submissions').update({ status: 'removed', feed_visible: false, editor_note: note, reviewed_by: user.id, reviewed_at: now }).eq('id', b.id)
    await notifyMember(db, { memberId: sub.member_id, type: 'system', message: `Your post “${sub.title}” was removed by our editors`, linkTo: 'write', linkRef: sub.id })
    return Response.json({ ok: true, status: 'removed' })
  }

  // approve → draft a member-post article, filed in its vertical, disclaimer at top.
  const { data: author } = await db.from('members').select('full_name').eq('id', sub.member_id).single()
  const authorName = (sub.byline || '').trim() || author?.full_name || 'A Parlor member'
  const slug = await uniqueSlug(db, slugify(sub.title))
  const { data: article, error: aerr } = await db.from('articles').insert({
    title: sub.title, subtitle: sub.subtitle || null, slug,
    body: withDisclaimer(bodyToHtml(sub.body)),   // disclaimer block prepended
    cover_image_url: sub.cover_image_url || null,
    author_name: authorName,
    author_bio: sub.bio || null,
    category: sub.vertical || 'Community',        // file into the chosen vertical
    published: false,                             // editor edits, then publishes from the Article editor
    in_library: false,                            // member posts don't auto-enter the Library
    featured: false,
    media_type: 'member_post',
    source_member_post_id: sub.id,
    is_community: true, community_author_id: sub.member_id,
  }).select('id, slug').single()
  if (aerr) return Response.json({ error: aerr.message }, { status: 500 })

  await db.from('member_submissions').update({
    status: 'approved', published_article_id: article.id,
    feed_visible: false,   // stays hidden until the EDITED article publishes; then it appears as both a member article and a community post
    editor_note: note, reviewed_by: user.id, reviewed_at: now,
  }).eq('id', b.id)
  await notifyMember(db, { memberId: sub.member_id, type: 'system', message: `Your piece “${sub.title}” was accepted for The Parlor 🎉`, linkTo: 'write', linkRef: sub.id })
  return Response.json({ ok: true, status: 'approved', article_id: article.id, article_slug: article.slug })
}
