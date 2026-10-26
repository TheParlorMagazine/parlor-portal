'use client'
import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
export default function LiveSessionTracker(){
  const pathname=usePathname()
  useEffect(()=>{window.dispatchEvent(new Event('parlor-live-route'))},[pathname])
  useEffect(()=>{
    const {data}=createClient().auth.onAuthStateChange(()=>{window.dispatchEvent(new Event('parlor-live-auth'))})
    return()=>data?.subscription?.unsubscribe?.()
  },[])
  return <Script src="/live-session.js" strategy="afterInteractive" />
}
