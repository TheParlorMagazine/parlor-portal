
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  const response = NextResponse.redirect(
    new URL('/', url.origin)
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  if (token_hash && type === 'email') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email'
    })

    if (!error) {
      if (data?.user) {
        try {
          const { sendNewMemberWelcome, isAfterOnboardingLaunch } =
            await import('../../../lib/onboarding')

          if (isAfterOnboardingLaunch(data.user)) {
            await sendNewMemberWelcome(data.user, {
              newRegistration: true
            })
          }
        } catch (onboardingError) {
          console.error('Email onboarding error:', onboardingError)
        }
      }

      return response
    }

    console.error('Email verification failed:', error.message)
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', url.origin)
  )
}


