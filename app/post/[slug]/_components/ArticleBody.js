'use client'

import { useState, useEffect, useCallback } from 'react'
import PublicAudioPlayer from './PublicAudioPlayer'
import PublicVideoEmbed from './PublicVideoEmbed'
import UnlockPending from './UnlockPending'

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
    height: auto;
  }
  .parlor-prose img[data-align="center"] {
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .parlor-prose img[data-align="left"] {
    display: block;
    margin-left: 0;
    margin-right: auto;
  }
  .parlor-prose img[data-align="right"] {
    display: block;
    margin-left: auto;
    margin-right: 0;
  }
  .parlor-prose img[data-align="float-left"] {
    float: left;
    margin: 0.25em 1.75em 0.75em 0;
    max-width: 45%;
    border-radius: 4px;
  }
  .parlor-prose img[data-align="float-right"] {
    float: right;
    margin: 0.25em 0 0.75em 1.75em;
    max-width: 45%;
    border-radius: 4px;
  }
  .parlor-prose figure {
    margin: 1.5em 0;
  }
  .parlor-prose figure img {
    margin: 0;
  }
  .parlor-prose figure[data-align="float-left"] {
    float: left;
    margin: 0.25em 1.75em 0.75em 0;
    max-width: 45%;
  }
  .parlor-prose figure[data-align="float-right"] {
    float: right;
    margin: 0.25em 0 0.75em 1.75em;
    max-width: 45%;
  }
  .parlor-prose figcaption {
    font-size: 13px;
    color: #888;
    font-style: italic;
    margin-top: 6px;
    line-height: 1.4;
  }
  .parlor-prose::after {
    content: '';
    display: table;
    clear: both;
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

  /* Album (masonry / grid) — hover captions + click to enlarge */
  .parlor-album-item {
    position: relative;
    overflow: hidden;
    border-radius: 6px;
    cursor: zoom-in;
  }
  .parlor-album-item img {
    width: 100%;
    display: block;
  }
  .parlor-album-cap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 28px 12px 10px;
    background: linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0));
    color: #fff;
    font-size: 12px;
    font-style: italic;
    line-height: 1.4;
    font-family: 'Source Serif 4', Georgia, serif;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
  }
  .parlor-album-item:hover .parlor-album-cap,
  .parlor-album-item:focus-visible .parlor-album-cap {
    opacity: 1;
    transform: translateY(0);
  }

  /* Lightbox modal */
  .parlor-lightbox {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    animation: parlorLbFade 0.18s ease;
  }
  @keyframes parlorLbFade { from { opacity: 0 } to { opacity: 1 } }
  .parlor-lightbox-img {
    max-width: min(1100px, 92vw);
    max-height: 78vh;
    object-fit: contain;
    border-radius: 4px;
    display: block;
  }
  .parlor-lightbox-cap {
    margin: 16px auto 0;
    max-width: min(1100px, 92vw);
    color: rgba(255,255,255,0.82);
    font-size: 13px;
    font-style: italic;
    line-height: 1.5;
    text-align: center;
    font-family: 'Source Serif 4', Georgia, serif;
  }
  .parlor-lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255,255,255,0.12);
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    cursor: pointer;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    line-height: 1;
    transition: background 0.2s ease;
  }
  .parlor-lightbox-nav:hover { background: rgba(255,255,255,0.24); }
  .parlor-lightbox-close {
    position: absolute;
    top: 18px;
    right: 22px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.75);
    font-size: 30px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .parlor-lightbox-close:hover { color: #fff; }
  .parlor-lightbox-counter {
    position: absolute;
    top: 22px;
    left: 24px;
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    font-family: 'Source Serif 4', Georgia, serif;
    letter-spacing: 0.04em;
  }
`

function Carousel({ images }) {
  const [index, setIndex] = useState(0)
  const captionStyle = { fontSize: '12px', color: '#888', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.4', fontFamily: "'Source Serif 4', Georgia, serif", textAlign: 'center' }
  const img = images[index]
  const atStart = index === 0
  const atEnd   = index === images.length - 1

  const chevron = (dir) => (
    <button
      onClick={() => setIndex(i => i + dir)}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [dir === -1 ? 'left' : 'right']: '10px',
        background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
        width: 40, height: 40, cursor: 'pointer', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, lineHeight: 1, transition: 'opacity 0.2s',
        zIndex: 2,
      }}
      aria-label={dir === -1 ? 'Previous' : 'Next'}
    >
      {dir === -1 ? '‹' : '›'}
    </button>
  )

  return (
    <div style={{ margin: '2em 0' }}>
      <div style={{ position: 'relative', userSelect: 'none' }}>
        <img
          src={img.src} alt={img.alt || ''}
          style={{ width: '100%', borderRadius: '8px', display: 'block', maxHeight: '520px', objectFit: 'cover' }}
        />
        {!atStart && chevron(-1)}
        {!atEnd   && chevron(1)}
        {/* Counter */}
        <div style={{ position: 'absolute', bottom: 10, right: 14, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, padding: '3px 8px', borderRadius: 20, fontFamily: "'Source Serif 4', Georgia, serif" }}>
          {index + 1} / {images.length}
        </div>
      </div>
      {img.caption && <p style={captionStyle}>{img.caption}</p>}
    </div>
  )
}

function Lightbox({ images, index, onClose, onNavigate }) {
  const img = images[index]
  const atStart = index === 0
  const atEnd = index === images.length - 1

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && !atStart) onNavigate(-1)
      else if (e.key === 'ArrowRight' && !atEnd) onNavigate(1)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [atStart, atEnd, onClose, onNavigate])

  return (
    <div className="parlor-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      {images.length > 1 && (
        <div className="parlor-lightbox-counter">{index + 1} / {images.length}</div>
      )}
      <button className="parlor-lightbox-close" onClick={onClose} aria-label="Close">×</button>

      {!atStart && (
        <button
          className="parlor-lightbox-nav"
          style={{ left: '18px' }}
          onClick={(e) => { e.stopPropagation(); onNavigate(-1) }}
          aria-label="Previous"
        >‹</button>
      )}
      {!atEnd && (
        <button
          className="parlor-lightbox-nav"
          style={{ right: '18px' }}
          onClick={(e) => { e.stopPropagation(); onNavigate(1) }}
          aria-label="Next"
        >›</button>
      )}

      <img
        className="parlor-lightbox-img"
        src={img.src}
        alt={img.alt || ''}
        onClick={(e) => e.stopPropagation()}
      />
      {img.caption && (
        <p className="parlor-lightbox-cap" onClick={(e) => e.stopPropagation()}>{img.caption}</p>
      )}
    </div>
  )
}

function AlbumRenderer({ layout, images }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const openAt = useCallback((i) => setLightboxIndex(i), [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const navigate = useCallback((dir) => {
    setLightboxIndex(i => {
      if (i === null) return i
      const next = i + dir
      return next >= 0 && next < images.length ? next : i
    })
  }, [images.length])

  if (layout === 'carousel') {
    return <Carousel images={images} />
  }

  const lightbox = lightboxIndex !== null && (
    <Lightbox
      images={images}
      index={lightboxIndex}
      onClose={closeLightbox}
      onNavigate={navigate}
    />
  )

  const albumItem = (img, i) => (
    <figure
      key={i}
      className="parlor-album-item"
      style={{ margin: 0 }}
      onClick={() => openAt(i)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(i) } }}
      tabIndex={0}
      role="button"
      aria-label={img.caption || img.alt || `Open image ${i + 1}`}
    >
      <img
        src={img.src}
        alt={img.alt || ''}
        style={layout === 'masonry'
          ? undefined
          : { aspectRatio: '4/3', objectFit: 'cover' }}
      />
      {img.caption && <figcaption className="parlor-album-cap">{img.caption}</figcaption>}
    </figure>
  )

  if (layout === 'masonry') {
    return (
      <>
        <div style={{ margin: '2em 0', columnCount: 2, columnGap: '12px' }}>
          {images.map((img, i) => (
            <div key={i} style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '12px' }}>
              {albumItem(img, i)}
            </div>
          ))}
        </div>
        {lightbox}
      </>
    )
  }

  const cols = layout === 'grid-3' ? 3 : 2
  return (
    <>
      <div style={{ margin: '2em 0', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px' }}>
        {images.map((img, i) => albumItem(img, i))}
      </div>
      {lightbox}
    </>
  )
}

// Wrap <img data-caption="..."> in <figure> with <figcaption>, hoisting data-align to the figure
function processImageCaptions(html) {
  return html.replace(
    /<img([^>]*?)data-caption="([^"]*)"([^>]*?)>/gi,
    (match, before, caption, after) => {
      if (!caption.trim()) return match
      // Extract data-align from the img attrs to move to figure
      const alignMatch = (before + after).match(/data-align="([^"]*)"/)
      const align = alignMatch ? alignMatch[1] : ''
      const figAttr = align ? ` data-align="${align}"` : ''
      // Remove data-align from img attrs so it doesn't double-apply
      const imgAttrs = (before + after).replace(/\s*data-align="[^"]*"/g, '')
      return `<figure${figAttr}><img${imgAttrs}><figcaption>${caption}</figcaption></figure>`
    }
  )
}

function truncateHtmlAtParagraphs(html, maxParagraphs) {
  const parts = html.split('</p>')
  if (parts.length <= maxParagraphs + 1) return html
  return parts.slice(0, maxParagraphs).join('</p>') + '</p>'
}

function ArticlePaywallOverlay({ paywallType, price, stripePriceId, articleId, userId, pagePath }) {
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
          href={`/plans${pagePath ? `?returnTo=${encodeURIComponent(pagePath)}` : ''}`}
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
  pagePath,
  justUnlocked,
}) {
  const isGated = (paywallType === 'paywall' || paywallType === 'members') && !articleHasAccess
  const anyBlockGated = segments.some(seg =>
    (seg.kind === 'audio-block' || seg.kind === 'video-block') &&
    seg.attrs?.paywalled === 'true' && !seg.hasAccess
  )

  // Right after a Stripe redirect, give the access-granting webhook a moment
  // to land instead of flashing the paywall while it's still catching up.
  if (justUnlocked && (isGated || anyBlockGated)) {
    return <UnlockPending />
  }

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
          dangerouslySetInnerHTML={{ __html: processImageCaptions(truncatedHtml) }}
        />
        <ArticlePaywallOverlay
          paywallType={paywallType}
          price={paywallPrice}
          stripePriceId={stripePriceId}
          articleId={articleId}
          userId={userId}
          pagePath={pagePath}
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
              dangerouslySetInnerHTML={{ __html: processImageCaptions(seg.content) }}
            />
          )
        }

        if (seg.kind === 'audio-block') {
          const { url, title, duration, transcript, paywalled, price, stripe_price_id } = seg.attrs
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
              stripePriceId={stripe_price_id}
              articleId={articleId}
              userId={userId}
              pagePath={pagePath}
            />
          )
        }

        if (seg.kind === 'video-block') {
          const { url, title, duration, paywalled, price, stripe_price_id } = seg.attrs
          const hasAccess = paywalled === 'true' ? (seg.hasAccess ?? false) : true
          return (
            <PublicVideoEmbed
              key={i}
              url={url}
              title={title}
              duration={duration}
              hasAccess={hasAccess}
              price={price}
              stripePriceId={stripe_price_id}
              articleId={articleId}
              userId={userId}
              pagePath={pagePath}
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
