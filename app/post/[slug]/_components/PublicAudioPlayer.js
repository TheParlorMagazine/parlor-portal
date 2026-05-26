'use client'

import { useState, useRef, useEffect } from 'react'

const PREVIEW_LIMIT = 10

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioPaywallOverlay({ price, onReplay }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(255,255,255,0.96)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '12px',
      fontFamily: "'Source Serif 4', Georgia, serif",
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="7" width="10" height="7" rx="1.5" fill="#0a0a0a" />
          <path d="M4 7V5a3 3 0 016 0v2" stroke="#0a0a0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#0a0a0a' }}>
          Members-only audio
        </span>
      </div>
      <p style={{ fontSize: '13px', color: '#777', margin: 0, textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' }}>
        You've heard the preview. Unlock the full episode with a membership.
      </p>

      <a
        href="/plans"
        style={{
          display: 'block', width: '100%', maxWidth: '280px',
          padding: '11px 0', background: '#0a0a0a', borderRadius: '6px',
          color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '14px', fontWeight: '600', textAlign: 'center', textDecoration: 'none',
        }}
      >
        Become a member — from $10/mo
      </a>

      {price && (
        <>
          <div style={{ fontSize: '12px', color: '#bbb' }}>or</div>
          <a
            href="/plans"
            style={{
              display: 'block', width: '100%', maxWidth: '280px',
              padding: '10px 0', border: '1px solid #0a0a0a', borderRadius: '6px',
              color: '#0a0a0a', fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '14px', fontWeight: '600', textAlign: 'center', textDecoration: 'none',
              background: 'transparent',
            }}
          >
            Unlock this episode — ${parseFloat(price).toFixed(2)}
          </a>
        </>
      )}

      <button
        onClick={onReplay}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px',
          fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '12px', color: '#bbb',
          textDecoration: 'underline', textUnderlineOffset: '2px',
        }}
      >
        ↺ Replay preview
      </button>
    </div>
  )
}

export default function PublicAudioPlayer({ url, title, duration, transcript, hasAccess, price }) {
  const paywalled = !hasAccess
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(parseFloat(duration) || 0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [markerHovered, setMarkerHovered] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!url || audioDuration) return
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => setAudioDuration(a.duration)
    a.src = url
    return () => { a.src = '' }
  }, [url])

  useEffect(() => {
    if (!paywalled) return
    setPlaying(false)
    setCurrentTime(0)
    setShowPaywall(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [paywalled])

  function handleTimeUpdate() {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)
    if (paywalled && a.currentTime >= PREVIEW_LIMIT) {
      a.pause()
      setPlaying(false)
      setShowPaywall(true)
    }
  }

  function handleSeek(e) {
    const a = audioRef.current
    if (!a || !audioDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - rect.left) / rect.width) * audioDuration
    const clamped = paywalled ? Math.min(t, PREVIEW_LIMIT) : t
    a.currentTime = clamped
    setCurrentTime(clamped)
  }

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  function handleReplay() {
    setShowPaywall(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0
  const markerPct = audioDuration ? (PREVIEW_LIMIT / audioDuration) * 100 : 0

  return (
    <div style={{
      border: '1px solid #f0e8e0', borderRadius: '12px', overflow: 'hidden',
      margin: '32px 0', background: '#fdf9f7',
      fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0e8e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#c4364a" strokeWidth="1.5"/>
          <path d="M8 7l6 3-6 3V7z" fill="#c4364a"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#0a0a0a', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || 'Audio'}
          </div>
          {duration && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{duration}</div>
          )}
        </div>
        {paywalled && (
          <span style={{ fontSize: '11px', background: '#f2b8c6', color: '#7a1a28', padding: '3px 8px', borderRadius: '20px', fontWeight: '600', flexShrink: 0 }}>
            Members only
          </span>
        )}
      </div>

      {/* Player */}
      <div style={{ padding: '16px 20px', position: 'relative' }}>
        {showPaywall && (
          <AudioPaywallOverlay price={price} onReplay={handleReplay} />
        )}

        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={togglePlay}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none',
              background: '#0a0a0a', color: '#fff', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {playing
              ? <svg width="12" height="14" viewBox="0 0 12 14" fill="#fff"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
              : <svg width="12" height="14" viewBox="0 0 12 14" fill="#fff"><path d="M0 0l12 7-12 7V0z"/></svg>
            }
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Progress bar */}
            <div
              onClick={handleSeek}
              style={{ height: '4px', background: '#e8ddd8', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ height: '100%', background: '#c4364a', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.1s linear' }} />
              {paywalled && audioDuration > 0 && (
                <div
                  onMouseEnter={() => setMarkerHovered(true)}
                  onMouseLeave={() => setMarkerHovered(false)}
                  style={{
                    position: 'absolute', top: '-4px', left: `${markerPct}%`,
                    width: '2px', height: '12px', background: '#0a0a0a',
                    borderRadius: '1px', transform: 'translateX(-50%)',
                    boxShadow: '0 0 0 2px #fdf9f7',
                  }}
                >
                  {markerHovered && (
                    <div style={{
                      position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                      background: '#0a0a0a', color: '#fff', fontSize: '10px', padding: '3px 6px',
                      borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>
                      Preview ends at {fmt(PREVIEW_LIMIT)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Times */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
              <span>{fmt(currentTime)}</span>
              <span>{audioDuration ? fmt(audioDuration) : (duration || '—')}</span>
            </div>
          </div>
        </div>

        {/* Transcript */}
        {transcript && (
          <div style={{ marginTop: '14px', borderTop: '1px solid #f0e8e0', paddingTop: '12px' }}>
            <button
              onClick={() => setShowTranscript(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '12px',
                color: '#999', display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <span style={{ transform: showTranscript ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
              Transcript
            </button>
            {showTranscript && (
              <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.7', color: '#555', whiteSpace: 'pre-wrap' }}>
                {transcript}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
