'use client'

import { useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const returnTo = params.get('returnTo') || '/'
      const { error, data } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        router.push('/login?error=confirmation_failed')
        return
      }
      // Check if member needs to set their name
      try {
        const res = await fetch('/api/portal/profile', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        const d = await res.json()
        if (!d.member?.full_name?.trim()) {
          router.push(`/portal/setup?next=${encodeURIComponent(returnTo)}`)
          return
        }
      } catch {}
      router.push(returnTo)
    }
    handleCallback()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      Confirming your account...
    </div>
  )
}
