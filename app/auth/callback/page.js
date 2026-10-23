'use client'

import { useEffect, useState } from 'react'
import { completeAuthCallback, authCallbackMessage } from '../../../lib/completeAuthCallback'
import { createClient } from '../../../lib/supabase'

export default function AuthCallback() {
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function handleCallback() {
      try {
        const destination = await completeAuthCallback(createClient(), window.location)
        if (active) window.location.replace(destination)
      } catch (err) {
        console.error('Authentication callback failed:', err)
        if (active) {
          setError(authCallbackMessage(err))
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
