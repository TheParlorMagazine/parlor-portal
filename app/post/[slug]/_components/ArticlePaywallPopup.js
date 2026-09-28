'use client'

import { useState, useEffect, useRef } from 'react'

// Reader's Circle membership plan — routed through /checkout-relay, which
// creates the Stripe subscription session (and gates on login first).
const READERS_CIRCLE_PLAN_ID = 'fccb348a-7433-4080-8699-9ef8c0e7a519'

// Membership paywall shown as a pop-up (like the newsletter SubscribeWall) on
// paywalled articles. Frosted backdrop + fixed bottom card, revealed after the
// reader scrolls into the piece, with body scroll locked while it's up.
export default function ArticlePaywallPopup({ paywallType, price, stripePriceId, articleId, userId, pagePath }) {
  const [visible, setVisible] = useState(false)

  // Reveal the paywall on a timer: the reader gets ~10s with the article,
  // then the wall pops up and locks scroll.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10000)
    return () => clearTimeout(t)
  }, [])

  // Lock body scroll while the wall is up — overflow only (NOT position:fixed),
  // so a lock that outlives this page (e.g. on Back/bfcache) can never shift or
  // collapse the destination page's layout; at worst scrolling is briefly off.
  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [visible])

  function handleBack() {
    if (typeof window === 'undefined') return
    document.body.style.overflow = ''
    if (window.history.length > 1) window.history.back()
    else window.location.href = '/'
  }

  async function handleUnlock() {
    if (!stripePriceId || !articleId) {
      window.location.href = '/plans'
      return
    }
    try {
      const res = await fetch('/api/create-paywall-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePriceId,
          articleId,
          itemType: 'article',
          userId: userId || undefined,
          successUrl: window.location.href + '?unlocked=1',
          cancelUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else window.location.href = '/plans'
    } catch {
      window.location.href = '/plans'
    }
  }

  if (!visible) return null

  const showUnlock = paywallType === 'paywall' && price
  const divider = (
    <span className="pw-div" aria-hidden="true" style={{ width: '1px', alignSelf: 'stretch', minHeight: '44px', background: 'rgba(60,30,40,0.18)' }} />
  )

  return (
    <div className="parlor-paywall-popup">
      <style>{`
        .parlor-paywall-popup .pw-join { transition: transform 0.16s ease; transform-origin: left center; }
        .parlor-paywall-popup .pw-join:hover { transform: scale(1.05); }
        .parlor-paywall-popup .pw-arrow { display: inline-block; transition: transform 0.16s ease; }
        .parlor-paywall-popup .pw-join:hover .pw-arrow { transform: translateX(5px) scale(1.3); }
        .parlor-paywall-popup .pw-unlock { transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease; }
        .parlor-paywall-popup .pw-unlock:hover { background: #1c1c1c !important; color: #fff !important; border-color: #1c1c1c !important; }
        @media (max-width: 720px) {
          .parlor-paywall-popup .pw-div { display: none; }
          .parlor-paywall-popup .pw-actions { flex-direction: column; align-items: stretch; gap: 18px; }
          .parlor-paywall-popup .pw-join { transform-origin: center; }
          .parlor-paywall-popup .pw-join,
          .parlor-paywall-popup .pw-unlock { width: 100%; justify-content: center; text-align: center; }
        }
      `}</style>

      {/* Frosted backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }} />

      {/* Wall card */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'linear-gradient(160deg, #fdf3f6 0%, #fbeaef 55%, #f6dde4 100%)',
        borderTop: '1px solid rgba(194,100,120,0.18)',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.10)',
        padding: 'clamp(20px,3vw,32px) clamp(20px,5vw,64px) clamp(38px,6vw,60px)',
        fontFamily: "'Source Serif 4', Georgia, serif",
      }}>
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            marginBottom: 'clamp(14px,2vw,24px)',
            fontFamily: "'Playfair Display', Georgia, serif", fontSize: '17px',
            letterSpacing: '0.14em', color: '#2a1a20',
          }}
        >
          Back
          <svg width="42" height="10" viewBox="0 0 42 10" fill="none" aria-hidden="true">
            <path d="M41 5H2M2 5l5-4M2 5l5 4" stroke="#2a1a20" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 'clamp(20px,2.4vw,29px)', lineHeight: '1.45',
            color: '#241016', margin: '0 auto clamp(26px,3.5vw,38px)', fontWeight: '400', maxWidth: '780px',
          }}>
            Full access is available to members of <strong style={{ fontWeight: '700' }}>The Reader&rsquo;s Circle</strong>, who support the writers, editors, and work that make The Parlor possible.
          </p>

          <div className="pw-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', gap: 'clamp(18px,2.4vw,32px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <a
                className="pw-join"
                href={`/checkout-relay?planId=${READERS_CIRCLE_PLAN_ID}${pagePath ? `&returnTo=${encodeURIComponent(pagePath)}` : ''}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '15px 30px', background: '#1c1c1c', border: '1px solid #1c1c1c',
                  color: '#fff', fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '18px', fontWeight: '700', textDecoration: 'none',
                }}
              >
                Join the Reader&rsquo;s Circle <span className="pw-arrow" aria-hidden="true" style={{ fontSize: '15px' }}>›</span>
              </a>
              <p style={{ fontSize: '12.5px', color: '#8a6d74', margin: '10px 0 0', lineHeight: '1.5', textAlign: 'center' }}>
                *Unlimited access to all current and future articles, plus additional perks.
              </p>
            </div>

            {showUnlock && (
              <>
                {divider}
                <button
                  className="pw-unlock"
                  onClick={handleUnlock}
                  style={{
                    padding: '14px 26px', background: 'transparent',
                    border: '1px solid #3f5c46', color: '#3f5c46',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontSize: '16px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Unlock for ${parseFloat(price).toFixed(2)}
                </button>
              </>
            )}

            {divider}
            <span style={{ fontSize: '16px', color: '#3a2a2f' }}>
              Already a member?{' '}
              <a
                href={`/login${pagePath ? `?returnTo=${encodeURIComponent(pagePath)}` : ''}`}
                style={{ color: '#241016', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Sign in here
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
