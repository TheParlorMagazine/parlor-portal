'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { trackConversion } from '../../lib/trackConversion'

export default function GoogleConversionTracker() {
  const pathname = usePathname(), params = useSearchParams()
  const sessionId = params.get('checkout_session_id') || params.get('session_id')
  useEffect(() => {
    if (/^\/(admin|dashboard)(\/|$)/i.test(pathname)) return
    let alive = true, timer, busy = false, attempts = 0
    const client = createClient()
    async function check() {
      if (!alive || busy || window.ParlorConsent?.analytics() !== true) return
      busy = true
      try {
        const {data:{session}} = await client.auth.getSession()
        if (!session || !alive) return
        const response = await fetch('/api/analytics/conversions' + (sessionId ? '?session_id='+encodeURIComponent(sessionId) : ''),{headers:{Authorization:`Bearer ${session.access_token}`}})
        if (!response.ok || !alive) return
        const data = await response.json()
        if (!alive) return
        for (const event of data.events || []) trackConversion(event)
        if (data.pending && ++attempts < 12) timer = setTimeout(check,1500)
      } catch { /* Tracking must never interrupt authentication or checkout. */ }
      finally { busy = false }
    }
    check()
    const {data} = client.auth.onAuthStateChange(() => { clearTimeout(timer); timer = setTimeout(check,0) })
    return () => { alive=false; clearTimeout(timer); data?.subscription?.unsubscribe?.() }
  },[pathname,sessionId])
  return null
}
