import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

async function getGifts() {
  const supabase = admin()

  const [{ data: items }, { data: claims }] = await Promise.all([
    supabase.from('gift_items').select('*').order('display_order'),
    supabase.from('gift_claims').select('gift_slug'),
  ])

  const claimCounts = {}
  for (const c of claims || []) {
    claimCounts[c.gift_slug] = (claimCounts[c.gift_slug] || 0) + 1
  }

  return (items || []).map(item => ({
    ...item,
    claimed: claimCounts[item.slug] || 0,
    remaining: item.capacity !== null ? item.capacity - (claimCounts[item.slug] || 0) : null,
  }))
}

export default async function DonatePage() {
  const gifts = await getGifts()

  return (
    <>
      <style>{`
        .donate-page { max-width: 760px; margin: 0 auto; padding: clamp(48px, 8vw, 96px) 24px; font-family: 'Source Serif 4', Georgia, serif; }
        .donate-eyebrow { font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #c47080; margin-bottom: 16px; }
        .donate-head { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(32px, 5vw, 56px); font-weight: 700; color: #1a1a1a; line-height: 1.08; margin: 0 0 20px; }
        .donate-sub { font-size: clamp(15px, 1.5vw, 18px); color: #555; line-height: 1.75; margin: 0 0 56px; max-width: 580px; }
        .donate-list { display: flex; flex-direction: column; gap: 2px; }
        .gift-item { display: flex; align-items: center; gap: 24px; padding: 28px 0; border-top: 1px solid #e8e0e3; }
        .gift-item:last-child { border-bottom: 1px solid #e8e0e3; }
        .gift-item--soldout { opacity: 0.45; pointer-events: none; }
        .gift-amount { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(18px, 2vw, 22px); font-weight: 700; color: #1a1a1a; min-width: 90px; flex-shrink: 0; }
        .gift-body { flex: 1; }
        .gift-label { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(16px, 1.8vw, 20px); font-weight: 600; color: #1a1a1a; margin: 0 0 6px; }
        .gift-desc { font-size: 14px; color: #777; line-height: 1.6; margin: 0; }
        .gift-remaining { font-size: 12px; color: #c47080; letter-spacing: 0.06em; margin-top: 6px; }
        .gift-soldout-badge { font-size: 12px; color: #aaa; letter-spacing: 0.06em; margin-top: 6px; }
        .gift-btn { display: inline-block; padding: 12px 22px; background: #1a1a1a; color: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; font-weight: 600; text-decoration: none; flex-shrink: 0; transition: background 0.15s, color 0.15s, outline 0.15s; }
        .gift-btn:hover { background: #fff; color: #1a1a1a; outline: 2px solid #1a1a1a; }
        .gift-btn--soldout { background: #ccc; cursor: not-allowed; }
        @media (max-width: 560px) {
          .gift-item { flex-wrap: wrap; }
          .gift-amount { min-width: unset; }
          .gift-btn { width: 100%; text-align: center; }
        }
      `}</style>

      <main className="donate-page">
        <div className="donate-eyebrow">Birthday Gifts</div>
        <h1 className="donate-head">Give The Parlor<br />a birthday gift.</h1>
        <p className="donate-sub">
          The Parlor turns one this year. If our work has meant something to you, here are a few ways to help us keep going — from a cup of coffee to funding the next print run.
        </p>

        <div className="donate-list">
          {gifts.map(gift => {
            const soldOut = gift.remaining !== null && gift.remaining <= 0
            return (
              <div key={gift.slug} className={`gift-item${soldOut ? ' gift-item--soldout' : ''}`}>
                <div className="gift-amount">{gift.amount_label}</div>
                <div className="gift-body">
                  <div className="gift-label">{gift.label}</div>
                  {gift.description && <p className="gift-desc">{gift.description}</p>}
                  {gift.remaining !== null && !soldOut && (
                    <div className="gift-remaining">{gift.remaining} of {gift.capacity} remaining</div>
                  )}
                  {soldOut && (
                    <div className="gift-soldout-badge">Fully funded — thank you</div>
                  )}
                </div>
                <a
                  href={soldOut ? undefined : gift.monkeypod_url}
                  className={`gift-btn${soldOut ? ' gift-btn--soldout' : ''}`}
                  target={soldOut ? undefined : '_blank'}
                  rel="noreferrer"
                >
                  {soldOut ? 'Funded' : 'Give this gift'}
                </a>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}
