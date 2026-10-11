'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const LABELS = {
  'print-run': 'Fund a Print Run',
  'fellow': 'Sponsor a Fellow',
  'photo-essay': 'Fund a Photo Essay',
  'feature-story': 'Fund a Feature Story',
  'coffee': 'Buy Us a Coffee',
}

export default function ThankYouPage() {
  const params = useSearchParams()
  const gift = params.get('gift')
  const claimed = useRef(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!gift || claimed.current) return
    claimed.current = true
    fetch('/api/donate/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gift_slug: gift }),
    }).finally(() => setDone(true))
  }, [gift])

  const label = LABELS[gift] || 'your gift'

  return (
    <>
      <style>{`
        .ty-page { max-width: 640px; margin: 0 auto; padding: clamp(80px, 12vw, 140px) 24px; font-family: 'Source Serif 4', Georgia, serif; text-align: center; }
        .ty-icon { font-size: 48px; margin-bottom: 24px; }
        .ty-head { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px, 4vw, 44px); font-weight: 700; color: #1a1a1a; line-height: 1.1; margin: 0 0 16px; }
        .ty-sub { font-size: clamp(15px, 1.4vw, 17px); color: #666; line-height: 1.75; margin: 0 0 40px; }
        .ty-gift { display: inline-block; background: #f2b8c6; color: #1a1a1a; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 600; padding: 8px 20px; margin-bottom: 40px; }
        .ty-back { display: inline-block; padding: 13px 28px; background: #1a1a1a; color: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; font-weight: 600; text-decoration: none; transition: background 0.15s, color 0.15s, outline 0.15s; }
        .ty-back:hover { background: #fff; color: #1a1a1a; outline: 2px solid #1a1a1a; }
      `}</style>

      <main className="ty-page">
        <div className="ty-icon">🎂</div>
        <h1 className="ty-head">Thank you for the birthday gift.</h1>
        {gift && <div className="ty-gift">{label}</div>}
        <p className="ty-sub">
          Your generosity helps keep The Parlor independent, ambitious, and in print. We are deeply grateful.
        </p>
        <a href="/" className="ty-back">Back to The Parlor</a>
      </main>
    </>
  )
}
