'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SiteHeader from '../_components/SiteHeader'
import SiteFooter from '../_components/SiteFooter'

const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"

const PLANS = [
  {
    id: 'fccb348a-7433-4080-8699-9ef8c0e7a519',
    label: "Reader's Circle",
    price: '$10 / month',
    color: '#4a6fd4',
    desc: 'Full digital access — all articles, audio, and exclusive member content.',
    perks: ['Unlimited article access', 'Audio & video content', 'Early access to new issues', 'Member-only newsletter'],
  },
  {
    id: 'c666f321-47e5-40c1-bc2a-565a2f52f64d',
    label: 'Printing Press',
    price: '$25 / month',
    color: '#c4364a',
    desc: "Everything in Reader's Circle, plus the quarterly print magazine mailed to your door.",
    perks: ["Everything in Reader's Circle", 'Quarterly print magazine', 'Free shipping', 'Inaugural subscriber gift'],
  },
]

function PlansPageInner() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <SiteHeader />

      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '80px 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#c4364a', marginBottom: '14px', fontFamily: ff }}>
            Become a member
          </div>
          <h1 style={{ fontFamily: ffH, fontSize: '40px', color: '#0a0a0a', marginBottom: '14px' }}>
            Support the work you read
          </h1>
          <p style={{ fontFamily: ff, fontSize: '16px', color: '#555', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
            Sustain independent writing and get full access to everything The Parlor publishes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              border: '1px solid #e8e8e8', borderRadius: '14px', padding: '32px',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontFamily: ffH, fontSize: '22px', color: '#0a0a0a', marginBottom: '6px' }}>
                {plan.label}
              </div>
              <div style={{ fontFamily: ff, fontSize: '20px', fontWeight: '600', color: plan.color, marginBottom: '16px' }}>
                {plan.price}
              </div>
              <p style={{ fontFamily: ff, fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
                {plan.desc}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                {plan.perks.map(perk => (
                  <li key={perk} style={{ fontFamily: ff, fontSize: '13.5px', color: '#333', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ color: plan.color }}>—</span>
                    {perk}
                  </li>
                ))}
              </ul>
              <a
                href={`/checkout-relay?planId=${plan.id}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                style={{
                  display: 'block', textAlign: 'center', padding: '13px', borderRadius: '8px',
                  background: '#0a0a0a', color: '#fff', textDecoration: 'none',
                  fontFamily: ff, fontSize: '14px', fontWeight: '600', letterSpacing: '0.02em',
                }}
              >
                Subscribe to {plan.label}
              </a>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense fallback={null}>
      <PlansPageInner />
    </Suspense>
  )
}
