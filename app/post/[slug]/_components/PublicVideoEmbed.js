'use client'

import { useState, useRef, useEffect } from 'react'

const PREVIEW_LIMIT = 10

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function detectType(url) {
  if (!url) return null
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  if (/cloudinary\.com/.test(url)) return 'cloudinary'
  return 'direct'
}

function embedUrl(url, type) {
  if (type === 'youtube') {
    const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    if (m) return `https://www.youtube.com/embed/${m[1]}`
  }
  if (type === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/)
    if (m) return `https://player.vimeo.com/video/${m[1]}`
  }
  return url
}

function VideoPaywallOverlay({ price, onReplay, isControllable, stripePriceId, articleId, userId, pagePath }) {
  async function handleUnlock() {
    if (!stripePriceId) {
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
          itemType: 'video',
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
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(10,10,10,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '12px',
      fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      <svg width="28" height="28" viewBox="0 0 14 14" fill="none" style={{ marginBottom: '4px' }}>
        <rect x="2" y="7" width="10" height="7" rx="1.5" fill="#fff" />
        <path d="M4 7V5a3 3 0 016 0v2" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
      <p style={{
        fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', fontWeight: '700',
        color: '#fff', margin: 0, textAlign: 'center',
      }}>
        {isControllable ? 'Members-only video' : 'This video is for members'}
      </p>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' }}>
        {isControllable
          ? "You've seen the preview. Unlock the full video with a membership."
          : 'Become a member to watch this video.'}
      </p>

      <a
        href={`/plans${pagePath ? `?returnTo=${encodeURIComponent(pagePath)}` : ''}`}
        style={{
          display: 'block', width: '100%', maxWidth: '280px',
          padding: '11px 0', background: '#fff', borderRadius: '6px',
          color: '#0a0a0a', fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '14px', fontWeight: '600', textAlign: 'center', textDecoration: 'none',
          marginTop: '4px',
        }}
      >
        Become a member — from $10/mo
      </a>

      {price && (
        <>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>or</div>
          <button
            onClick={handleUnlock}
            style={{
              display: 'block', width: '100%', maxWidth: '280px',
              padding: '10px 0', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px',
              color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '14px', fontWeight: '600', textAlign: 'center',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            Unlock this video — ${parseFloat(price).toFixed(2)}
          </button>
        </>
      )}

      {isControllable && onReplay && (
        <button
          onClick={onReplay}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px',
            fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '12px',
            color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textUnderlineOffset: '2px',
          }}
        >
          ↺ Replay preview
        </button>
      )}
    </div>
  )
}

export default function PublicVideoEmbed({ url, title, duration, hasAccess, price, stripePriceId, articleId, userId, pagePath }) {
  const paywalled = !hasAccess
  const type = detectType(url)
  const isControllable = type === 'cloudinary' || type === 'direct'

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(parseFloat(duration) || 0)
  const [showPaywall, setShowPaywall] = useState(paywalled && !isControllable)
  const [markerHovered, setMarkerHovered] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!url || !isControllable || videoDuration) return
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => setVideoDuration(v.duration)
    v.src = url
    return () => { v.src = '' }
  }, [url, isControllable])

  useEffect(() => {
    if (!paywalled) return
    setPlaying(false)
    setCurrentTime(0)
    setShowPaywall(paywalled && !isControllable)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [paywalled, isControllable])

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (paywalled && v.currentTime >= PREVIEW_LIMIT) {
      v.pause()
      setPlaying(false)
      setShowPaywall(true)
    }
  }

  function handleSeek(e) {
    const v = videoRef.current
    if (!v || !videoDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - rect.left) / rect.width) * videoDuration
    const clamped = paywalled ? Math.min(t, PREVIEW_LIMIT) : t
    v.currentTime = clamped
    setCurrentTime(clamped)
  }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play(); setPlaying(true) }
  }

  function handleReplay() {
    setShowPaywall(false)
    setCurrentTime(0)
    if (videoRef.current) videoRef.current.currentTime = 0
  }

  const progress = videoDuration ? (currentTime / videoDuration) * 100 : 0
  const markerPct = videoDuration ? (PREVIEW_LIMIT / videoDuration) * 100 : 0

  return (
    <div style={{ margin: '32px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f0e8e0' }}>
      {/* Header */}
      {title && (
        <div style={{
          padding: '12px 16px', background: '#fdf9f7', borderBottom: '1px solid #f0e8e0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '14px', fontWeight: '700', color: '#0a0a0a' }}>
            {title}
          </span>
          {paywalled && (
            <span style={{ fontSize: '11px', background: '#f2b8c6', color: '#7a1a28', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>
              Members only
            </span>
          )}
        </div>
      )}

      {/* Video area */}
      <div style={{ position: 'relative', background: '#0a0a0a', aspectRatio: '16/9' }}>
        {showPaywall && (
          <VideoPaywallOverlay
            price={price}
            onReplay={isControllable ? handleReplay : null}
            isControllable={isControllable}
            stripePriceId={stripePriceId}
            articleId={articleId}
            userId={userId}
            pagePath={pagePath}
          />
        )}

        {isControllable ? (
          <>
            <video
              ref={videoRef}
              src={url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setPlaying(false)}
              onLoadedMetadata={e => { if (!videoDuration) setVideoDuration(e.target.duration) }}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
              preload="metadata"
            />
            {/* Play button overlay when paused */}
            {!playing && !showPaywall && (
              <button
                onClick={togglePlay}
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="#0a0a0a"><path d="M0 0l18 10L0 20V0z"/></svg>
                </div>
              </button>
            )}
            {/* Controls bar */}
            {playing && !showPaywall && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '24px 16px 12px' }}>
                <div
                  onClick={handleSeek}
                  style={{ height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', cursor: 'pointer', position: 'relative', marginBottom: '8px' }}
                >
                  <div style={{ height: '100%', background: '#fff', borderRadius: '2px', width: `${progress}%` }} />
                  {paywalled && videoDuration > 0 && (
                    <div
                      onMouseEnter={() => setMarkerHovered(true)}
                      onMouseLeave={() => setMarkerHovered(false)}
                      style={{ position: 'absolute', top: '-4px', left: `${markerPct}%`, width: '2px', height: '11px', background: '#f2b8c6', transform: 'translateX(-50%)' }}
                    >
                      {markerHovered && (
                        <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: '#fff', fontSize: '10px', padding: '3px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          Preview ends at {fmt(PREVIEW_LIMIT)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#fff' }}>
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="#fff"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
                  </button>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontFamily: "'Source Serif 4', serif" }}>
                    {fmt(currentTime)} / {videoDuration ? fmt(videoDuration) : (duration || '—')}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <iframe
            src={embedUrl(url, type)}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  )
}
