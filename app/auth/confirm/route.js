
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  // Keep the intended purchase across verification. Older email templates may
  // omit returnTo, so the initiating browser also carries a short-lived cookie.
  let destination = '/'
  let intended = url.searchParams.get('returnTo') || url.searchParams.get('redirect_to')
  if (!intended) {
    try { intended = decodeURIComponent(request.cookies.get('parlor_checkout_return')?.value || '') } catch {}
  }
  try {
    let target = new URL(intended || '/', url.origin)
    if (target.origin === url.origin && target.pathname === '/auth/callback') target = new URL(target.searchParams.get('returnTo') || '/', url.origin)
    if (target.origin === url.origin && !target.pathname.startsWith('/auth/') && !String(intended).includes('\\')) destination = target.pathname + target.search + target.hash
  } catch {}
  const response = NextResponse.redirect(new URL(destination, url.origin))

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

      response.cookies.set('parlor_checkout_return', '', { path: '/', maxAge: 0 })
      return response
    }

    console.error('Email verification failed:', error.message)
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', url.origin)
  )
}


