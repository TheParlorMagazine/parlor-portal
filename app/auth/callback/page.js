'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'

export default function AuthCallback() {
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search)
        const authError = params.get('error_description') || params.get('error')

        if (authError) {
          throw new Error(authError.replace(/\+/g, ' '))
        }

        const supabase = createClient()
        const code = params.get('code')
        let session = null

        if (code) {
          // Google OAuth or a PKCE email sign-in link.
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code)

          if (error) throw error
          session = data?.session
        } else {
          // Supabase may have already processed an email magic link
          // and stored the resulting session in the browser.
          const { data, error } = await supabase.auth.getSession()

          if (error) throw error
          session = data?.session
        }

        if (!session?.access_token) {
          throw new Error(
            'We could not establish your login session. Please request a new sign-in link.'
          )
        }

        // Verify that the session belongs to an authenticated user.
        const { data: userData, error: userError } =
          await supabase.auth.getUser()

        if (userError || !userData?.user) {
          throw userError || new Error('Could not verify your account.')
        }

        // Preserve onboarding for newly registered members.
        if (params.get('flow') === 'signup') {
          try {
            const response = await fetch('/api/auth/onboarding', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            })

            if (!response.ok) {
              console.error('Onboarding request failed:', response.status)
            }
          } catch (onboardingError) {
            console.error('Onboarding request failed:', onboardingError)
          }
        }

        // Authentication succeeded.
        window.location.replace('/')
      } catch (err) {
        console.error('Authentication callback failed:', err)
        if (active) {
          setError(err.message || 'Authentication could not be completed.')
        }
      }
    }

    handleCallback()
    return () => { active = false }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: 24
    }}>
      {error ? (
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1>We couldn't sign you in</h1>
          <p style={{ lineHeight: 1.6 }}>{error}</p>
          <a href="/login" style={{ color: '#8b465a' }}>
            Return to login and try again
          </a>
        </div>
      ) : (
        <p>Confirming your account...</p>
      )}
    </div>
  )
}
