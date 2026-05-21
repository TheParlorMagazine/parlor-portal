'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const PLAN_URLS = {
  'fccb348a-7433-4080-8699-9ef8c0e7a519': 'https://buy.stripe.com/YOUR_READERS_CIRCLE_LINK',
  'c666f321-47e5-40c1-bc2a-565a2f52f64d': 'https://buy.stripe.com/YOUR_PRINTING_PRESS_LINK',
}

export default function CheckoutRelay() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const planId = searchParams.get('planId')
    const returnTo = searchParams.get('returnTo') || '/dashboard'
    const url = PLAN_URLS[planId]
    if (url) {
      window.location.href = `${url}?client_reference_id=${encodeURIComponent(returnTo)}`
    } else {
      window.location.href = '/plans'
    }
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Georgia,serif',color:'#888'}}>
      Redirecting to checkout...
    </div>
  )
}
