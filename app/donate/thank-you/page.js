'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const LABELS = {
  'print-run': 'Fund a Print Run',
  'fellow': 'Sponsor a Fellow',
  'photo-essay': 'Fund a Photo Essay',
  'feature-story': 'Fund a Feature Story',
  'coffee': 'Buy Us a Coffee',
}

function ThankYouInner() {
  const params = useSearchParams()
  const gift = params.get('gift')
  const label = LABELS[gift] || 'your gift'

  return (
    <>
      <style>{`
        .ty-page { max-width: 640px; margin: 0 auto; padding: clamp(80px, 12vw, 140px) 24px; font-family: 'Source Serif 4', Georgia, serif; text-align: center; }
        .ty-icon { display: block; width: 180px; max-width: 65%; height: auto; margin: 0 auto 24px; }
        .ty-head { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px, 4vw, 44px); font-weight: 700; color: #1a1a1a; line-height: 1.1; margin: 0 0 16px; }
        .ty-sub { font-size: clamp(15px, 1.4vw, 17px); color: #666; line-height: 1.75; margin: 0 0 40px; }
        .ty-gift {
  display: block;
  width: fit-content;
  margin: 0 auto 36px;
  padding: 0;
  background: transparent;
  color: #7A263A;
  font-family: 'Alex Brush', cursive;
  font-size: clamp(30px, 4vw, 42px);
  font-weight: 400;
  line-height: 1.2;
}
       
        .ty-back { display: inline-block; padding: 13px 28px; background: #1a1a1a; color: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; font-weight: 600; text-decoration: none; transition: background 0.15s, color 0.15s, outline 0.15s; }
        .ty-back:hover { background: #fff; color: #1a1a1a; outline: 2px solid #1a1a1a; }
      `}</style>

      <main className="ty-page">
        <img
  src="/images/donation-gift.png"
  alt="A Victorian floral gift box wrapped with a sage-green ribbon"
  className="ty-icon"
/>
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

export default function ThankYouPage() {
  return <Suspense><ThankYouInner /></Suspense>
}
