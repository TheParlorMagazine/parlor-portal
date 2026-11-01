import { serviceClient } from './apiAuth'
import { hasWelcomeBeenSent } from './onboardingStatus'
import { initialSignupProvider } from './onboardingEligibility'

// Check whether a member has already completed onboarding.
// This helper does not send emails or change database records.
export async function getOnboardingStatus(userId) {
  const db = serviceClient()

  const { data, error } = await db
    .from('members')
    .select('id, email, full_name, onboarding_email_sent, onboarding_sent, onboarding_sent_at')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Could not load member onboarding status: ${error.message}`)
  }

  return {
    member: data,
    alreadyOnboarded: hasWelcomeBeenSent(data)
  }
}

// Only accounts created very recently are eligible for automatic onboarding.
// This is an additional safeguard, not proof of a new registration.
export function isRecentRegistration(user, minutes = 10) {
  if (!user?.created_at) return false

  const created = new Date(user.created_at).getTime()
  const now = Date.now()

  return Number.isFinite(created) &&
    created <= now &&
    now - created <= minutes * 60 * 1000
}

// Send a welcome email only for an eligible, newly created account.
// Must be called from trusted server-side code after authentication.
export async function sendNewMemberWelcome(user, { newRegistration = false, verifiedEmailConfirmation = false } = {}) {
  if (!newRegistration || !isAfterOnboardingLaunch(user)) {
    return { skipped: true, reason: 'not_eligible_for_new_onboarding' }
  }

  if (!user.email_confirmed_at) {
    return { skipped: true, reason: 'not_verified' }
  }

  // The server OTP-confirmation route already proves the verification event.
  // Preserve that existing email flow, including delayed confirmations. Browser
  // callback requests must independently prove an initial registration.
  if (!verifiedEmailConfirmation && !initialSignupProvider(user)) return { skipped: true, reason: 'not_initial_registration' }
  return sendClaimedWelcome(user)
}

// Explicit admin recovery may target an older verified account. It still honors
// all existing sent flags, the atomic claim and the welcome automation toggle.
export async function recoverMemberWelcome(user) {
  if (!user?.id || !user.email_confirmed_at) return { skipped: true, reason: 'not_verified' }
  return sendClaimedWelcome(user)
}

async function sendClaimedWelcome(user) {
  if (!user.email) return { skipped: true, reason: 'not_verified' }
  const { member, alreadyOnboarded } = await getOnboardingStatus(user.id)

  if (alreadyOnboarded) {
    return { skipped: true, reason: 'already_onboarded' }
  }

  const db = serviceClient()

  const { data: claimed, error: claimError } = await db
    .rpc('claim_welcome_onboarding', { p_user_id: user.id })

  if (claimError) throw claimError

  if (!claimed) {
    return { skipped: true, reason: 'already_claimed' }
  }

  try {
    const { sendWelcomeEmail } = await import('./emails')
    const result = await sendWelcomeEmail({
      to: user.email,
      name: member.full_name,
      idempotencyKey: `welcome:${user.id}`
    })

    if (result?.error || result?.skipped || !result?.data?.id) {
      // A disabled automation or rejected send must not count as sent.
      await db.rpc('release_welcome_onboarding', { p_user_id: user.id })
      return { sent: false, result }
    }

    const sentAt = new Date().toISOString()
    const { error: updateError } = await db
      .from('members')
      .update({
        onboarding_email_sent: true,
        onboarding_sent: true,
        onboarding_sent_at: sentAt
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    return { sent: true, emailId: result.data.id, sentAt }
  } catch (error) {
    // Preserve the claim when the outcome is uncertain to avoid duplicates.
    console.error('Welcome onboarding failed:', error)
    return { sent: false, error: 'send_outcome_uncertain' }
  }
}

// Existing accounts must never be automatically onboarded by the new flow.
// Keep an explicit deployment override. Without one, the repair cutoff keeps
// pre-repair accounts out of automatic mail; they require explicit recovery.
export function isAfterOnboardingLaunch(user) {
  const launch = process.env.ONBOARDING_LAUNCH_AT || '2026-11-01T00:00:00Z'
  if (!user?.created_at) return false

  const launchTime = Date.parse(launch)
  const createdTime = Date.parse(user.created_at)

  return Number.isFinite(launchTime) &&
    Number.isFinite(createdTime) &&
    createdTime >= launchTime
}
