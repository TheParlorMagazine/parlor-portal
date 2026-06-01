'use client'

import PublicAudioPlayer from './PublicAudioPlayer'
import PublicVideoEmbed from './PublicVideoEmbed'

const PROSE_STYLES = `
  .parlor-prose {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 18px;
    line-height: 1.75;
    color: #1a1a1a;
  }
  .parlor-prose p {
    margin: 0 0 1.4em;
  }
  .parlor-prose h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.25;
    color: #0a0a0a;
    margin: 2em 0 0.6em;
    letter-spacing: -0.01em;
  }
  .parlor-prose h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.3;
    color: #0a0a0a;
    margin: 1.75em 0 0.5em;
  }
  .parlor-prose a {
    color: #c4364a;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .parlor-prose a:hover {
    color: #9b2537;
  }
  .parlor-prose blockquote {
    border-left: 3px solid #f2b8c6;
    margin: 1.75em 0;
    padding: 0.25em 0 0.25em 1.25em;
    font-style: italic;
    color: #555;
  }
  .parlor-prose ul, .parlor-prose ol {
    margin: 0 0 1.4em 1.5em;
    padding: 0;
  }
  .parlor-prose li {
    margin-bottom: 0.4em;
  }
  .parlor-prose strong {
    font-weight: 600;
    color: #0a0a0a;
  }
  .parlor-prose em {
    font-style: italic;
  }
  .parlor-prose hr {
    border: none;
    border-top: 1px solid #f0e8e0;
    margin: 2.5em 0;
  }
  .parlor-prose img {
    max-width: 100%;
    border-radius: 4px;
    margin: 1.5em 0;
  }
  .parlor-prose pre {
    background: #f8f4f0;
    border-radius: 6px;
    padding: 1em 1.25em;
    overflow-x: auto;
    font-size: 14px;
    margin: 1.5em 0;
  }
  .parlor-prose code {
    background: #f8f4f0;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 15px;
  }
`

function AlbumRenderer({ layout, images }) {
  const captionStyle = { fontSize: '12px', color: '#888', marginTop: '5px', fontStyle: 'italic', lineHeight: '1.4', fontFamily: "'Source Serif 4', Georgia, serif" }

  if (layout === 'carousel') {
    return (
      <div style={{ margin: '2em 0', overflowX: 'auto', display: 'flex', gap: '12px', paddingBottom: '8px' }}>
        {images.map((img, i) => (
          <figure key={i} style={{ margin: 0, flexShrink: 0 }}>
            <img src={img.src} alt={img.alt || ''} style={{ height: '260px', width: 'auto', borderRadius: '6px', display: 'block' }} />
            {img.caption && <figcaption style={captionStyle}>{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    )
  }

  if (layout === 'masonry') {
    return (
      <div style={{ margin: '2em 0', columnCount: 2, columnGap: '12px' }}>
        {images.map((img, i) => (
          <figure key={i} style={{ margin: '0 0 12px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <img src={img.src} alt={img.alt || ''} style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
            {img.caption && <figcaption style={captionStyle}>{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    )
  }

  const cols = layout === 'grid-3' ? 3 : 2
  return (
    <div style={{ margin: '2em 0', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px' }}>
      {images.map((img, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <img src={img.src} alt={img.alt || ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
          {img.caption && <figcaption style={captionStyle}>{img.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

function truncateHtmlAtParagraphs(html, maxParagraphs) {
  const parts = html.split('</p>')
  if (parts.length <= maxParagraphs + 1) return html
  return parts.slice(0, maxParagraphs).join('</p>') + '</p>'
}

function ArticlePaywallOverlay({ paywallType, price, stripePriceId, articleId, userId }) {
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
    } catch {
      window.location.href = '/plans'
    }
  }

  return (
    <div style={{ position: 'relative', marginTop: '-80px', zIndex: 2 }}>
      {/* Fade gradient */}
      <div style={{
        height: '120px', marginBottom: '-1px',
        background: 'linear-gradient(to bottom, transparent, #fff)',
        pointerEvents: 'none',
      }} />
      {/* Paywall card */}
      <div style={{
        background: '#fff', padding: '36px 32px', textAlign: 'center',
        borderTop: '1px solid #f0e8e0',
        fontFamily: "'Source Serif 4', Georgia, serif",
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', background: '#fdf0f3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="7" width="10" height="7" rx="1.5" fill="#c4364a" />
            <path d="M4 7V5a3 3 0 016 0v2" stroke="#c4364a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
          {paywallType === 'members' ? 'This article is for members' : 'Continue reading'}
        </h3>
        <p style={{ fontSize: '16px', color: '#777', margin: '0 0 24px', lineHeight: '1.55', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
          {paywallType === 'members'
            ? 'Become a member to read this article and everything else in The Parlor.'
            : 'Get a membership for unlimited access, or unlock just this piece.'}
        </p>

        <a
          href="/plans"
          style={{
            display: 'inline-block', padding: '13px 28px', background: '#0a0a0a',
            borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '15px',
            textDecoration: 'none', marginBottom: paywallType === 'paywall' ? '12px' : 0,
          }}
        >
          Become a member — from $10/mo
        </a>

        {paywallType === 'paywall' && price && (
          <>
            <div style={{ fontSize: '13px', color: '#ccc', margin: '12px 0' }}>or</div>
            <button
              onClick={handleUnlock}
              style={{
                display: 'inline-block', padding: '12px 28px', background: 'transparent',
                border: '1px solid #0a0a0a', borderRadius: '6px', color: '#0a0a0a',
                fontWeight: '600', fontSize: '15px', cursor: 'pointer',
                fontFamily: "'Source Serif 4', Georgia, serif",
              }}
            >
              Unlock this article — ${parseFloat(price).toFixed(2)}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ArticleBody({
  segments,
  articleId,
  paywallType,
  paywallPrice,
  stripePriceId,
  articleHasAccess,
  userId,
}) {
  const isGated = (paywallType === 'paywall' || paywallType === 'members') && !articleHasAccess

  // Collect all HTML segments to find the truncation point
  const htmlSegments = segments.filter(s => s.kind === 'html')
  const fullHtml = htmlSegments.map(s => s.content).join('\n')
  const truncatedHtml = isGated ? truncateHtmlAtParagraphs(fullHtml, 3) : null

  // In gated mode, show only truncated html (no audio/video blocks)
  if (isGated) {
    return (
      <>
        <style>{PROSE_STYLES}</style>
        <div
          className="parlor-prose"
          dangerouslySetInnerHTML={{ __html: truncatedHtml }}
        />
        <ArticlePaywallOverlay
          paywallType={paywallType}
          price={paywallPrice}
          stripePriceId={stripePriceId}
          articleId={articleId}
          userId={userId}
        />
      </>
    )
  }

  return (
    <>
      <style>{PROSE_STYLES}</style>
      {segments.map((seg, i) => {
        if (seg.kind === 'html') {
          return (
            <div
              key={i}
              className="parlor-prose"
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          )
        }

        if (seg.kind === 'audio-block') {
          const { url, title, duration, transcript, paywalled, price } = seg.attrs
          const hasAccess = paywalled === 'true' ? (seg.hasAccess ?? false) : true
          return (
            <PublicAudioPlayer
              key={i}
              url={url}
              title={title}
              duration={duration}
              transcript={transcript}
              hasAccess={hasAccess}
              price={price}
            />
          )
        }

        if (seg.kind === 'video-block') {
          const { url, title, duration, paywalled, price } = seg.attrs
          const hasAccess = paywalled === 'true' ? (seg.hasAccess ?? false) : true
          return (
            <PublicVideoEmbed
              key={i}
              url={url}
              title={title}
              duration={duration}
              hasAccess={hasAccess}
              price={price}
            />
          )
        }

        if (seg.kind === 'embed-block') {
          const { html } = seg.attrs
          if (!html?.trim()) return null
          return (
            <div
              key={i}
              style={{ margin: '32px 0' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        }

        if (seg.kind === 'album-block') {
          let images = []
          try { images = JSON.parse(seg.attrs['data-images'] || '[]') } catch {}
          if (!images.length) return null
          return <AlbumRenderer key={i} layout={seg.attrs['data-layout'] || 'grid-2'} images={images} />
        }

        return null
      })}
    </>
  )
}
