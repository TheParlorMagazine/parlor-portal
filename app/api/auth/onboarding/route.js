import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/apiAuth'
import { initialSignupProvider } from '../../../../lib/onboardingEligibility'
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

    if (!initialSignupProvider(user)) {
      return NextResponse.json({ skipped: true, reason: 'not_initial_registration' })
    }

    const result = await sendNewMemberWelcome(user, {
      newRegistration: true
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Signup onboarding error:', error)
    return NextResponse.json(
      { error: 'Onboarding could not be completed' },
      { status: 500 }
    )
  }
}
