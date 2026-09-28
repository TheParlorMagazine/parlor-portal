import { requireUser, serviceClient } from '../../../../lib/apiAuth'

// GET  → the caller's own member row (safe subset)
// PATCH → update the caller's own editable profile fields
const READABLE = 'id, email, full_name, bio, headline, avatar_url, banner_url, mailing_address, phone, plan, plan_id, subscription_status, newsletter_subscribed, print_subscriber, role, joined_at, badges'

// Only these fields may be changed by the member (never plan/role/stripe/etc.)
const EDITABLE = ['full_name', 'bio', 'headline', 'avatar_url', 'banner_url', 'mailing_address', 'phone', 'newsletter_subscribed']

export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const db = serviceClient()
  const { data, error } = await db.from('members').select(READABLE).eq('id', user.id).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ member: data })
}

export async function PATCH(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Bad JSON' }, { status: 400 }) }

  const patch = {}
  for (const k of EDITABLE) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'No editable fields' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const db = serviceClient()
  const { data, error } = await db
    .from('members').update(patch).eq('id', user.id).select(READABLE).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ member: data })
}
