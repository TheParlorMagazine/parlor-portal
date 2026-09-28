import { requireUser, serviceClient, memberOf } from '../../../../lib/apiAuth'
import { renderDefaultEmail } from '../../../../lib/emails'

const ROLES = ['admin', 'editor', 'social_admin']
const SITE = 'https://theparlormagazine.com'

// Sample data so the built-in design renders realistically in the editor preview.
const SAMPLE = {
  welcome: { name: 'Maya' },
  weekly_digest: { name: 'Maya', notifications: [{ type: 'reply', message: 'Someone replied to your thread in The Reading Room.' }, { type: 'event', message: 'New event: Democracy Salon with DemCon.' }], unread: { count: 2, threads: [{ subject: 'Editorial feedback' }] } },
  password_reset: { name: 'Maya', resetUrl: `${SITE}/auth/reset-password?token=sample` },
  payment_confirmed: { name: 'Maya', planName: "Reader's Circle", amount: 10 },
  payment_failed: { name: 'Maya', planName: "Reader's Circle" },
  plan_upgraded: { name: 'Maya', oldPlan: "Reader's Circle", newPlan: 'Printing Press' },
  cancellation: { name: 'Maya', planName: 'Printing Press' },
  event_rsvp: { name: 'Maya', title: 'Democracy Salon with DemCon', when: 'Friday, October 10, 2026 · 6:00 PM', where: 'Online', eventUrl: `${SITE}/portal/events/sample` },
  event_reminder: { name: 'Maya', title: 'Democracy Salon with DemCon', when: 'Friday, October 10, 2026 · 6:00 PM', eventUrl: `${SITE}/portal/events/sample` },
  forum_invite: { forumName: 'The Reading Room', inviterName: 'Lindsey', joinUrl: `${SITE}/portal/join/sample` },
  order_shipped: { name: 'Maya', order: { order_number: 'PARLOR-1042', carrier: 'USPS', tracking_number: '9400 1000 0000 0000', tracking_url: 'https://tools.usps.com' } },
  print_shipped: { name: 'Maya', issueTitle: 'Vol. 2 — Winter 2026', carrier: 'USPS', trackingNumber: '9400 1000 0000 0000', estimatedArrival: '2026-10-15', trackingUrl: 'https://tools.usps.com' },
}

// GET ?type= → the built-in design HTML for that email, with sample data.
export async function GET(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Sign in' }, { status: 401 })
  const me = await memberOf(serviceClient(), user.id)
  if (!ROLES.includes(me.role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const type = new URL(request.url).searchParams.get('type')
  if (!type) return Response.json({ error: 'type required' }, { status: 400 })
  const html = renderDefaultEmail(type, SAMPLE[type] || {})
  return Response.json({ html })
}
