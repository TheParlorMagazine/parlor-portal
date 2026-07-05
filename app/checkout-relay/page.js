'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const PLAN_IDS = [
  'fccb348a-7433-4080-8699-9ef8c0e7a519', // Reader's Circle
  'c666f321-47e5-40c1-bc2a-565a2f52f64d', // Printing Press
]

function CheckoutRelayInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const planId = searchParams.get('planId')
    const returnTo = searchParams.get('returnTo') || '/dashboard'
    if (!PLAN_IDS.includes(planId)) {
      window.location.href = '/plans'
      return
    }

    async function go() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Must be logged in so the webhook can attribute the subscription
        // to a real member — send them to log in, then back through here.
        const here = `/checkout-relay?planId=${planId}&returnTo=${encodeURIComponent(returnTo)}`
        window.location.href = `/login?returnTo=${encodeURIComponent(here)}`
        return
      }

      // Create the session ourselves (instead of a static Payment Link) so we
      // can send the user back to the exact page they came from — including
      // the paywalled item they were trying to unlock — once payment completes.
      const successUrl = returnTo + (returnTo.includes('?') ? '&' : '?') + 'unlocked=1'
      try {
        const res = await fetch('/api/create-subscription-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            userId: user.id,
            successUrl: window.location.origin + successUrl,
            cancelUrl: window.location.origin + returnTo,
          }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          window.location.href = '/plans'
        }
      } catch {
        window.location.href = '/plans'
      }
    }

    go()
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      Redirecting to checkout...
    </div>
  )
}

export default function CheckoutRelay() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
        Loading...
      </div>
    }>
      <CheckoutRelayInner />
    </Suspense>
  )
}
