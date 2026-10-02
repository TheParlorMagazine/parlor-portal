'use client'

import { useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'

// Stripe's Payment Method Messaging Element — shows accurate "4 payments of $X
// with Afterpay/Klarna" messaging for the exact amount, and only for methods
// actually enabled on the account. Needs NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
// until that's set we render a plain, truthful fallback line.
const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = PK ? loadStripe(PK) : null

export default function BnplMessage({ amount, currency = 'usd', country = 'US', fontFamily }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!stripePromise || !amount || !ref.current) return
    let element
    let cancelled = false
    stripePromise.then(stripe => {
      if (!stripe || cancelled || !ref.current) return
      const elements = stripe.elements()
      element = elements.create('paymentMethodMessaging', {
        amount: Math.round(Number(amount) * 100),
        currency: (currency || 'usd').toUpperCase(),
        paymentMethodTypes: ['klarna', 'afterpay_clearpay'],
        countryCode: (country || 'US').toUpperCase(),
      })
      element.mount(ref.current)
    }).catch(() => {})
    return () => { cancelled = true; try { element && element.unmount() } catch {} }
  }, [amount, currency, country])

  if (!PK) {
    return <div style={{ fontFamily, fontSize: 13, color: '#8a6b72' }}>Pay over time with Klarna or Afterpay at checkout.</div>
  }
  return <div ref={ref} style={{ minHeight: 22 }} />
}
