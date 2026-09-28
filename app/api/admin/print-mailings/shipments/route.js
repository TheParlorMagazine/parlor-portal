import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { sendPrintIssueShippedEmail } from '../../../../../lib/emails'

const ROLES = ['admin', 'finance_admin', 'editor']

async function gate(request) {
  const user = await requireUser(request)
  if (!user) return { error: Response.json({ error: 'Sign in' }, { status: 401 }) }
  const db = serviceClient()
  const me = await memberOf(db, user.id)
  if (!ROLES.includes(me.role)) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  return { db, user }
}

// GET ?issue_id= → shipments for an issue, with member name/email/address.
export async function GET(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const issueId = new URL(request.url).searchParams.get('issue_id')
  if (!issueId) return Response.json({ error: 'Missing issue_id' }, { status: 400 })

  const { data, error } = await db.from('print_shipments')
    .select('*, members!print_shipments_member_id_fkey(full_name, email, mailing_address)')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const shipments = (data || []).map(s => ({
    ...s,
    member_name: s.members?.full_name || null,
    member_email: s.members?.email || null,
    member_address: s.shipping_address || s.members?.mailing_address || null,
    members: undefined,
  }))
  return Response.json({ shipments })
}

async function emailFor(db, ship, issue) {
  const { data: m } = await db.from('members').select('full_name, email').eq('id', ship.member_id).single()
  if (!m?.email) return false
  try {
    await sendPrintIssueShippedEmail({
      to: m.email, name: m.full_name || '',
      issueTitle: issue?.title || 'Your issue',
      carrier: ship.carrier, trackingNumber: ship.tracking_number, trackingUrl: ship.tracking_url,
      estimatedArrival: ship.estimated_arrival,
    })
    return true
  } catch (e) { console.error('print shipped email failed:', e.message); return false }
}

// PATCH → update one shipment (tracking/carrier/eta/status). Marking it shipped
// stamps shipped_at and (unless notify:false) emails the member their tracking.
export async function PATCH(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const b = await request.json().catch(() => ({}))
  if (!b.id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { data: existing } = await db.from('print_shipments').select('*').eq('id', b.id).single()
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const patch = {}
  for (const f of ['carrier', 'tracking_number', 'tracking_url', 'estimated_arrival']) {
    if (f in b) patch[f] = b[f] === '' ? null : b[f]
  }
  const willShip = b.status === 'shipped' && existing.status !== 'shipped'
  if (b.status === 'shipped') { patch.status = 'shipped'; if (!existing.shipped_at) patch.shipped_at = new Date().toISOString() }
  if (b.status === 'pending') { patch.status = 'pending' }

  const { data: ship, error } = await db.from('print_shipments').update(patch).eq('id', b.id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let emailed = false
  if (willShip && b.notify !== false) {
    const { data: issue } = await db.from('print_issues').select('title').eq('id', ship.issue_id).single()
    emailed = await emailFor(db, ship, issue)
    if (emailed) await db.from('print_shipments').update({ notified_at: new Date().toISOString() }).eq('id', ship.id)
  }
  return Response.json({ shipment: ship, emailed })
}

// POST → bulk mark every pending shipment in an issue shipped and email them.
// Body: { action:'ship_all', issue_id, carrier?, estimated_arrival?, notify? }
export async function POST(request) {
  const g = await gate(request); if (g.error) return g.error
  const { db } = g
  const b = await request.json().catch(() => ({}))
  if (b.action !== 'ship_all' || !b.issue_id) return Response.json({ error: 'Bad request' }, { status: 400 })

  const { data: issue } = await db.from('print_issues').select('title').eq('id', b.issue_id).single()
  const { data: pending } = await db.from('print_shipments').select('*').eq('issue_id', b.issue_id).eq('status', 'pending')

  const now = new Date().toISOString()
  let shipped = 0, emailed = 0
  for (const s of pending || []) {
    const patch = { status: 'shipped', shipped_at: now }
    if (b.carrier && !s.carrier) patch.carrier = b.carrier
    if (b.estimated_arrival && !s.estimated_arrival) patch.estimated_arrival = b.estimated_arrival
    const { data: ship } = await db.from('print_shipments').update(patch).eq('id', s.id).select().single()
    shipped++
    if (b.notify !== false && ship) {
      const ok = await emailFor(db, ship, issue)
      if (ok) { emailed++; await db.from('print_shipments').update({ notified_at: now }).eq('id', ship.id) }
    }
  }
  // Flip the issue to "sent" once everything has gone out.
  await db.from('print_issues').update({ status: 'sent' }).eq('id', b.issue_id)
  return Response.json({ shipped, emailed })
}
