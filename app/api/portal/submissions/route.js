import { requireUser, serviceClient } from '../../../../lib/apiAuth'
import { notifyAdmins } from '../../../../lib/notify'
import { CONSENT_VERSION } from '../../../../lib/memberPosts'

const FIELDS = ['title', 'subtitle', 'body', 'cover_image_url', 'byline', 'excerpt', 'share_to_feed', 'vertical', 'bio', 'sources']

// GET → the caller's submissions (list), or ?id= for one.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const id = new URL(request.url).searchParams.get('id')
  if (id) {
    const { data } = await db.from('member_submissions').select('*').eq('id', id).eq('member_id', user.id).single()
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 })
    // Include the linked article's approval state so the author can approve the
    // final version before it publishes.
    let article = null
    if (data.published_article_id) {
      const { data: a } = await db.from('articles').select('id, slug, published, author_approved_at, media_type').eq('id', data.published_article_id).single()
      article = a || null
    }
    return Response.json({ submission: data, article })
  }
  const { data } = await db.from('member_submissions')
    .select('id, title, subtitle, vertical, status, editor_note, published_article_id, updated_at, created_at')
    .eq('member_id', user.id).order('updated_at', { ascending: false })
  return Response.json({ submissions: data || [] })
}

// POST { title, ... } → create a draft
export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  if (!(b.title || '').trim()) return Response.json({ error: 'Title required' }, { status: 400 })
  const db = serviceClient()
  const row = { member_id: user.id }
  for (const f of FIELDS) if (f in b) row[f] = b[f] === '' ? null : b[f]
  const { data, error } = await db.from('member_submissions').insert(row).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ submission: data })
}

// PATCH { id, ...fields, submit? } → update a draft; submit=true sends for review
export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const db = serviceClient()

  // Only the author can edit, and only while draft/rejected (not once submitted/published).
  const { data: existing } = await db.from('member_submissions').select('status, title').eq('id', b.id).eq('member_id', user.id).single()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'rejected', 'changes_requested'].includes(existing.status)) return Response.json({ error: 'This piece is locked while under review.' }, { status: 400 })

  const patch = { updated_at: new Date().toISOString() }
  for (const f of FIELDS) if (f in b) patch[f] = b[f] === '' ? null : b[f]
  if (b.submit) {
    // Consent is required to submit for review; store when + which version.
    const { data: prior } = await db.from('member_submissions').select('consent_accepted_at').eq('id', b.id).single()
    if (!b.consent && !prior?.consent_accepted_at) {
      return Response.json({ error: 'Please accept the member-post terms to submit.' }, { status: 400 })
    }
    patch.status = 'submitted'
    patch.editor_note = null
    if (b.consent) { patch.consent_accepted_at = new Date().toISOString(); patch.consent_version = CONSENT_VERSION }
  }

  const { data, error } = await db.from('member_submissions').update(patch).eq('id', b.id).eq('member_id', user.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (b.submit) {
    const { data: me } = await db.from('members').select('full_name').eq('id', user.id).single()
    await notifyAdmins(db, { type: 'system', message: `${me?.full_name || 'A member'} submitted “${data.title}” for review`, linkTo: 'admin', linkRef: 'community-posts' })
  }
  return Response.json({ submission: data })
}

// DELETE { id } → delete own draft
export async function DELETE(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  let b = {}
  try { b = await request.json() } catch {}
  if (!b.id) return Response.json({ error: 'id required' }, { status: 400 })
  const db = serviceClient()
  const { error } = await db.from('member_submissions').delete().eq('id', b.id).eq('member_id', user.id).in('status', ['draft', 'rejected', 'changes_requested'])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
