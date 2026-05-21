'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const PLAN_URLS = {
  'price_1TZYzvK5nyqAS54Z7D3vJBMV': 'https://buy.stripe.com/4gMcN65Ew9KJbYh4qhabK00',
  'price_1TZZ1cK5nyqAS54Z7Epcfq6E': 'https://buy.stripe.com/dRm14o3wo2ihbYhbSJabK01',
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
