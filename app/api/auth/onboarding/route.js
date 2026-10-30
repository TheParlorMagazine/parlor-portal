import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/apiAuth'
import {
  isAfterOnboardingLaunch,
  sendNewMemberWelcome
} from '../../../../lib/onboarding'

export async function POST(request) {
  try {
    const user = await requireUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const { notifyAdminFreeSignup } = await import('../../../../lib/adminNotifications')
      const provider = user.app_metadata?.provider === 'google' || user.identities?.some(i => i.provider === 'google') ? 'google' : 'email'
      await notifyAdminFreeSignup(user, { provider })
    } catch (error) { console.error('Admin signup notification failed:', error.message) }

    // A browser request cannot authorize onboarding for an old account.
    if (!isAfterOnboardingLaunch(user)) {
      return NextResponse.json({
        skipped: true,
        reason: 'existing_account'
      })
    }

    // Only allow automatic onboarding for verified Google accounts.
    const googleIdentity = user.identities?.some(
      identity => identity.provider === 'google'
    )

    if (!googleIdentity) {
      return NextResponse.json({
        skipped: true,
        reason: 'not_google_account'
      })
    }

    // A newly linked Google identity does not make an old account new.
    const accountCreated = Date.parse(user.created_at)
    const identityCreated = Date.parse(googleIdentity.created_at)

    if (
      !Number.isFinite(accountCreated) ||
      !Number.isFinite(identityCreated) ||
      Math.abs(identityCreated - accountCreated) > 60 * 1000
    ) {
      return NextResponse.json({
        skipped: true,
        reason: 'google_identity_not_created_with_account'
      })
    }

    // Only allow onboarding shortly after the account's creation.
    // This prevents later logins from triggering a welcome email.
    const createdAt = Date.parse(user.created_at)
    const ageMs = Date.now() - createdAt

    if (!Number.isFinite(createdAt) || ageMs < 0 || ageMs > 10 * 60 * 1000) {
      return NextResponse.json({
        skipped: true,
        reason: 'not_initial_google_registration'
      })
    }

    const result = await sendNewMemberWelcome(user, {
      newRegistration: true
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google onboarding error:', error)
    return NextResponse.json(
      { error: 'Onboarding could not be completed' },
      { status: 500 }
    )
  }
}
