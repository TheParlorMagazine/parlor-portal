'use client'

import { useEffect } from 'react'

// Safety-net for password-recovery links. If Supabase's Site URL / redirect-URL
// config sends the recovery token to the wrong page (e.g. the homepage as
// `/#access_token=…&type=recovery`), forward it to the reset page — preserving
// the hash so that page's Supabase client establishes the recovery session.
export default function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash || ''
    const isRecovery = /(?:^|&)type=recovery(?:&|$)/.test(hash.replace(/^#/, '')) && /access_token=/.test(hash)
    if (isRecovery && window.location.pathname !== '/auth/reset-password') {
      window.location.replace('/auth/reset-password' + hash)
    }
  }, [])
  return null
}
