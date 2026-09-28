import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'

const ROLES = ['admin', 'finance_admin', 'editor']
const PRINTING_PRESS_ID = 'c666f321-47e5-40c1-bc2a-565a2f52f64d'

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// GET → all print issues, newest first, with shipment counts.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const { data: issues, error } = await db.from('print_issues').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (issues || []).map(i => i.id)
  let counts = {}
  if (ids.length) {
    const { data: ships } = await db.from('print_shipments').select('issue_id, status').in('issue_id', ids)
    for (const s of ships || []) {
      const c = (counts[s.issue_id] ||= { total: 0, shipped: 0 })
      c.total++; if (s.status === 'shipped') c.shipped++
    }
  }
  // How many print subscribers exist right now (to show "generate" potential).
  const { count: subCount } = await db.from('members')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', PRINTING_PRESS_ID).eq('deactivated', false)

  const out = (issues || []).map(i => ({ ...i, counts: counts[i.id] || { total: 0, shipped: 0 } }))
  return Response.json({ issues: out, subscriberCount: subCount || 0 })
}

// POST → create an issue, or run an action (generate shipments).
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db, user } = g
  const b = await request.json().catch(() => ({}))

  if (b.action === 'generate') {
    if (!b.issue_id) return Response.json({ error: 'Missing issue_id' }, { status: 400 })
    // Active print subscribers.
    const { data: subs } = await db.from('members')
      .select('id, mailing_address')
      .eq('plan_id', PRINTING_PRESS_ID).eq('deactivated', false)
    // Existing shipments for this issue (avoid duplicates).
    const { data: existing } = await db.from('print_shipments').select('member_id').eq('issue_id', b.issue_id)
    const have = new Set((existing || []).map(s => s.member_id))
    const rows = (subs || []).filter(s => !have.has(s.id)).map(s => ({
      issue_id: b.issue_id, member_id: s.id, shipping_address: s.mailing_address || null,
    }))
    if (rows.length) await db.from('print_shipments').insert(rows)
    return Response.json({ added: rows.length, total: (subs || []).length, missingAddress: (subs || []).filter(s => !s.mailing_address).length })
  }

  if (!b.title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })
  const { data: issue, error } = await db.from('print_issues').insert({
    title: b.title.trim(),
    issue_number: b.issue_number || null,
    cover_image_url: b.cover_image_url || null,
    scheduled_mail_date: b.scheduled_mail_date || null,
    status: b.status || 'scheduled',
    created_by: user.id,
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ issue })
}

// PATCH → update an issue (title / date / status / cover).
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const b = await request.json().catch(() => ({}))
  if (!b.id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const patch = {}
  for (const f of ['title', 'issue_number', 'cover_image_url', 'scheduled_mail_date', 'status']) {
    if (f in b) patch[f] = b[f] === '' ? null : b[f]
  }
  const { data: issue, error } = await db.from('print_issues').update(patch).eq('id', b.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ issue })
}

// DELETE ?id= → remove an issue (shipments cascade).
export async function DELETE(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await db.from('print_issues').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
