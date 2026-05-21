'use client'

import { useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function signOut() {
      await supabase.auth.signOut()
      router.push('/')
    }
    signOut()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      Signing out...
    </div>
  )
}
