import { requireUser, serviceClient } from '../../../../lib/apiAuth'

const PRINTING_PRESS_ID = 'c666f321-47e5-40c1-bc2a-565a2f52f64d'

function isPrintSubscriber(m) {
  return m?.plan_id === PRINTING_PRESS_ID || (m?.plan && /printing press/i.test(m.plan))
}

// GET → the member's print-delivery view: are they a print subscriber, the
// upcoming scheduled issue(s), and their shipped copies with tracking.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const db = serviceClient()
  const { data: member } = await db.from('members').select('plan, plan_id').eq('id', user.id).single()
  const subscriber = isPrintSubscriber(member)
  if (!subscriber) return Response.json({ subscriber: false, upcoming: [], shipments: [] })

  // This member's shipments, with their issue.
  const { data: ships } = await db
    .from('print_shipments')
    .select('id, status, carrier, tracking_number, tracking_url, estimated_arrival, shipped_at, print_issues!print_shipments_issue_id_fkey(id, title, issue_number, scheduled_mail_date, status)')
    .eq('member_id', user.id)
  const myShipments = ships || []
  const shippedIssueIds = new Set(myShipments.filter(s => s.status === 'shipped').map(s => s.print_issues?.id))

  // Upcoming = issues that are scheduled/mailing and haven't shipped to them yet.
  const { data: issues } = await db
    .from('print_issues')
    .select('id, title, issue_number, scheduled_mail_date, status')
    .in('status', ['scheduled', 'mailing'])
    .order('scheduled_mail_date', { ascending: true })
  const upcoming = (issues || [])
    .filter(i => !shippedIssueIds.has(i.id))
    .map(i => ({ id: i.id, title: i.title, issue_number: i.issue_number, scheduled_mail_date: i.scheduled_mail_date, status: i.status }))

  const shipments = myShipments
    .map(s => ({
      id: s.id,
      status: s.status,
      carrier: s.carrier,
      tracking_number: s.tracking_number,
      tracking_url: s.tracking_url,
      estimated_arrival: s.estimated_arrival,
      shipped_at: s.shipped_at,
      issue_title: s.print_issues?.title || 'Print issue',
      issue_number: s.print_issues?.issue_number || null,
    }))
    .filter(s => s.status === 'shipped')
    .sort((a, b) => new Date(b.shipped_at || 0) - new Date(a.shipped_at || 0))

  return Response.json({ subscriber: true, upcoming, shipments })
}
