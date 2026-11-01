import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'
import { recoverMemberWelcome } from '../../../../../lib/onboarding'
export const dynamic = 'force-dynamic'
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request) {
  const admin = await requireUser(request)
  if (!admin) return reply({ error: 'Sign in required.' }, 401)
  const db = serviceClient()
  if ((await memberOf(db, admin.id))?.role !== 'admin') return reply({ error: 'Admin access required.' }, 403)
  let body
  try { body = await request.json() } catch { return reply({ error: 'Choose a subscriber.' }, 400) }
  if (typeof body?.memberId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.memberId)) return reply({ error: 'Choose a valid subscriber.' }, 400)
  try {
    // Load verified auth data server-side; never trust a supplied address or
    // bypass a pending claim because the dashboard shows no sent timestamp.
    const { data, error } = await db.auth.admin.getUserById(body.memberId)
    if (error || !data?.user) return reply({ error: 'Subscriber account could not be found.' }, 404)
    const result = await recoverMemberWelcome(data.user)
    if (result.sent || result.reason === 'already_onboarded') return reply({ sent: Boolean(result.sent), onboardingSentAt: result.sentAt || null })
    const messages = {
      not_verified: 'This account has not verified its email address. No welcome email was sent.',
      already_claimed: 'A welcome send is already claimed. Check Resend and the database before retrying; no new email was sent.',
    }
    if (result.error === 'send_outcome_uncertain') return reply({ error: 'The send or recording outcome is uncertain. Check Resend before retrying to avoid a duplicate.' }, 409)
    return reply({ error: messages[result.reason] || (result.result?.skipped ? 'The welcome automation is disabled. No email was sent.' : 'Resend did not accept the welcome email. No successful send was recorded.') }, 409)
  } catch { return reply({ error: 'Welcome recovery could not complete. Check onboarding database functions and email configuration before retrying.' }, 503) }
}
