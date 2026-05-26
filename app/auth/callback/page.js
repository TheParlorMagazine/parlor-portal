'use client'

import { useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleCallback() {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )
      if (error) {
        router.push('/login?error=confirmation_failed')
        return
      }
      router.push('/')
    }
    handleCallback()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      Confirming your account...
    </div>
  )
}
