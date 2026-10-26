'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase'

const PLAN_IDS = [
  'fccb348a-7433-4080-8699-9ef8c0e7a519', // Reader's Circle
  'c666f321-47e5-40c1-bc2a-565a2f52f64d', // Printing Press
]

function CheckoutRelayInner() {
  const searchParams = useSearchParams()
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const planId = searchParams.get('planId')
    const coupon = searchParams.get('coupon') || undefined
    let returnTo = '/portal'
    try {
      const destination = new URL(searchParams.get('returnTo') || '/portal', window.location.origin)
      if (destination.origin === window.location.origin) returnTo = destination.pathname + destination.search + destination.hash
    } catch {}
    if (!PLAN_IDS.includes(planId)) {
      window.location.href = '/plans'
      return
    }

    async function go() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        // Must be logged in so the webhook can attribute the subscription to a
        // real member — send them to create an account (signup-first; the signup
        // page links to sign-in for returning members), then back through here.
        const here = `/checkout-relay?planId=${planId}${coupon ? `&coupon=${encodeURIComponent(coupon)}` : ''}&returnTo=${encodeURIComponent(returnTo)}`
        window.location.href = `/signup?returnTo=${encodeURIComponent(here)}`
        return
      }

      // Create the session ourselves (instead of a static Payment Link) so we
      // can send the user back to the exact page they came from — including
      // the paywalled item they were trying to unlock — once payment completes.
      const successUrl = new URL(returnTo, window.location.origin)
      successUrl.searchParams.set('unlocked', '1')
      try {
        const res = await fetch('/api/create-subscription-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            planId,
            successUrl: successUrl.toString(),
            cancelUrl: window.location.origin + returnTo,
            ...(coupon ? { coupon } : {}),
          }),
        })
        const data = await res.json()
        if (res.status === 401) {
          window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
          return
        }
        if (res.ok && data.url) {
          window.location.href = data.url
        } else {
          setError(data.error || 'Checkout could not be started. Please try again.')
        }
      } catch {
        setError('Checkout could not be started. Please try again.')
      }
    }

    go().catch(() => setError('We couldn’t verify your sign-in. Please return to plans and try again.'))
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      {error ? <div role="alert"><p>{error}</p><a href="/plans">Back to plans</a></div> : 'Redirecting to checkout...'}
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
