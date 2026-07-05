'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
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

function LightToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '32px', height: '18px', borderRadius: '9px',
        border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        background: checked ? '#0a0a0a' : '#d8d8d8',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: checked ? '16px' : '2px',
        width: '14px', height: '14px', borderRadius: '50%',
        background: checked ? '#f2b8c6' : '#fff',
        transition: 'left 0.18s',
      }} />
    </button>
  )
}

function PaywallOverlay({ price, onReplay }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(255,255,255,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '14px 16px', gap: '8px',
      fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="7" width="10" height="7" rx="1.5" fill="#1a1a1a" />
          <path d="M4 7V5a3 3 0 016 0v2" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a', fontFamily: "'Playfair Display', Georgia, serif" }}>
          This content is restricted
        </span>
      </div>

      {/* Option A: Membership */}
      <div style={{ width: '100%', background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: '8px', padding: '10px 12px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>
          Unlock with a membership
        </div>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', lineHeight: '1.45' }}>
          Get unlimited access to all articles, audio, and video — starting at $10/month
        </div>
        <button type="button" style={{
          width: '100%', padding: '7px 10px', background: '#0a0a0a', border: 'none',
          borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: '600',
          cursor: 'default', fontFamily: "'Source Serif 4', Georgia, serif",
          textAlign: 'center',
        }}>
          Become a member →
        </button>
      </div>

      <div style={{ fontSize: '10px', color: '#ccc' }}>or</div>

      {/* Option B: One-time */}
      <div style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '8px', padding: '10px 12px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>
          Just this piece
        </div>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', lineHeight: '1.45' }}>
          One-time access to this video
        </div>
        <button type="button" style={{
          width: '100%', padding: '7px 10px', background: 'transparent',
          border: '1px solid #d8d8d8', borderRadius: '6px', color: '#1a1a1a',
          fontSize: '12px', fontWeight: '600', cursor: 'default',
          fontFamily: "'Source Serif 4', Georgia, serif",
          textAlign: 'center',
        }}>
          Unlock for ${price || '2.50'}
        </button>
      </div>

      {onReplay && (
        <button type="button" onClick={onReplay} style={{
          background: 'none', border: 'none', fontSize: '10px', color: '#ccc',
          cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", marginTop: '2px',
        }}>
          ↺ replay preview
        </button>
      )}
    </div>
  )
}

function VideoBlockView({ node, updateAttributes, selected }) {
  const { url, title, duration: durationLabel, transcript, paywalled, price, stripe_price_id, plan_access } = node.attrs
  const currentPlanAccess = Array.isArray(plan_access) ? plan_access : ["Reader's Circle", "Printing Press"]
  const type = detectType(url)
  const active = !!url.trim()
  const isControllable = type === 'cloudinary' || type === 'direct'

  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [markerHovered, setMarkerHovered] = useState(false)
  const [stripeStatus, setStripeStatus] = useState('')
  const [stripeError, setStripeError] = useState('')
  const creatingRef = useRef(false)
  const videoRef = useRef(null)

  // Create a Stripe product/price for this block once it's restricted with a
  // price set — covers both newly-restricted blocks and ones marked paywalled
  // before this ever had checkout wiring.
  useEffect(() => {
    const amount = parseFloat(price)
    if (!paywalled || !amount || amount <= 0 || stripe_price_id || creatingRef.current) return
    creatingRef.current = true
    setStripeStatus('creating')
    setStripeError('')
    fetch('/api/create-paywall-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Video', itemType: 'video', price: amount }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        creatingRef.current = false
        if (ok && data.stripe_price_id) {
          updateAttributes({ stripe_product_id: data.stripe_product_id, stripe_price_id: data.stripe_price_id })
          setStripeStatus('done')
        } else {
          setStripeStatus('error')
          setStripeError(data.error || 'Unknown error')
        }
      })
      .catch(err => {
        creatingRef.current = false
        setStripeStatus('error')
        setStripeError(err.message || 'Network error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywalled, price, stripe_price_id])

  const progress = videoDuration ? (currentTime / videoDuration) * 100 : 0
  const markerPct = paywalled && videoDuration > PREVIEW_LIMIT
    ? (PREVIEW_LIMIT / videoDuration) * 100
    : null

  // Auto-detect title and duration from URL
  useEffect(() => {
    if (!url) return
    let aborted = false
    const vtype = detectType(url)

    if (vtype === 'youtube') {
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        .then(r => r.json())
        .then(data => {
          if (aborted) return
          if (data.title) updateAttributes({ title: data.title })
        })
        .catch(() => {})
    } else if (vtype === 'vimeo') {
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`)
        .then(r => r.json())
        .then(data => {
          if (aborted) return
          if (data.title) updateAttributes({ title: data.title })
          if (data.duration) {
            const m = Math.floor(data.duration / 60)
            const s = data.duration % 60
            updateAttributes({ duration: `${m}:${s.toString().padStart(2, '0')}` })
          }
        })
        .catch(() => {})
    } else if (vtype === 'cloudinary' || vtype === 'direct') {
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.src = url
      vid.addEventListener('loadedmetadata', () => {
        if (aborted || isNaN(vid.duration)) return
        const m = Math.floor(vid.duration / 60)
        const s = Math.floor(vid.duration % 60)
        updateAttributes({ duration: `${m}:${s.toString().padStart(2, '0')}` })
      })
      return () => { aborted = true; vid.src = '' }
    }

    return () => { aborted = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Reset player when paywall is toggled
  useEffect(() => {
    setShowPaywall(false)
    setPlaying(false)
    setCurrentTime(0)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [paywalled])

  function toggleVideoPlay() {
    if (!videoRef.current) return
    if (showPaywall) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
      setShowPaywall(false)
      videoRef.current.play()
      setPlaying(true)
      return
    }
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { videoRef.current.play(); setPlaying(true) }
  }

  function handleVideoSeek(e) {
    if (!videoRef.current || !videoDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    let t = ((e.clientX - rect.left) / rect.width) * videoDuration
    if (paywalled) t = Math.min(t, PREVIEW_LIMIT)
    videoRef.current.currentTime = t
    setCurrentTime(t)
  }

  function handleTimeUpdate() {
    const t = videoRef.current?.currentTime || 0
    setCurrentTime(t)
    if (paywalled && t >= PREVIEW_LIMIT) {
      videoRef.current.pause()
      setPlaying(false)
      setShowPaywall(true)
    }
  }

  // Controlled video player (Cloudinary/direct + paywalled)
  const ControlledPlayer = (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        src={url}
        style={{ width: '100%', display: 'block', maxHeight: '240px', objectFit: 'contain', background: '#111' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      {/* Custom controls bar */}
      <div style={{
        padding: '10px 14px', background: '#f5f5f5',
        borderTop: '1px solid #e8e8e8',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <button
          type="button"
          onClick={toggleVideoPlay}
          style={{
            width: '30px', height: '30px', borderRadius: '50%', border: 'none',
            background: '#0a0a0a', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <rect x="1" y="1" width="3" height="8" rx="1" />
              <rect x="6" y="1" width="3" height="8" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          )}
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={handleVideoSeek}
            style={{ height: '3px', background: '#e0e0e0', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
          >
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${progress}%`, background: '#f2b8c6', borderRadius: '2px',
            }} />
            {markerPct !== null && (
              <div
                style={{
                  position: 'absolute', top: '-1px', height: '5px', width: '2px',
                  left: `${markerPct}%`, transform: 'translateX(-50%)',
                  background: '#f2b8c6',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                  borderRadius: '1px', cursor: 'default',
                }}
                onMouseEnter={() => setMarkerHovered(true)}
                onMouseLeave={() => setMarkerHovered(false)}
              >
                {markerHovered && (
                  <div style={{
                    position: 'absolute', bottom: '9px', left: '50%', transform: 'translateX(-50%)',
                    background: '#222', color: '#fff', fontSize: '10px', padding: '3px 7px',
                    borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    Preview ends here
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#aaa' }}>
            <span>{fmt(currentTime)}</span>
            <span>{durationLabel || fmt(videoDuration)}</span>
          </div>
        </div>
      </div>
      {showPaywall && (
        <PaywallOverlay
          price={price}
          onReplay={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0
              videoRef.current.play()
            }
            setCurrentTime(0)
            setPlaying(true)
            setShowPaywall(false)
          }}
        />
      )}
    </div>
  )

  // Lock placeholder (YouTube/Vimeo paywalled, or inactive)
  const LockPlaceholder = (
    <div style={{
      height: '180px', background: '#f5f5f5',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="8" width="12" height="8" rx="1.5" fill="#f2b8c6" />
          <path d="M5 8V6a3 3 0 016 0v2" stroke="#f2b8c6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{ fontSize: '13px', color: '#555', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        {title || 'Paywalled video'}
      </span>
      <span style={{ fontSize: '11px', color: '#aaa', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        Unlock for ${price || '2.50'}
      </span>
    </div>
  )

  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{
        border: `1px solid ${selected ? '#f2b8c6' : '#e8e8e8'}`,
        borderRadius: '10px', overflow: 'hidden', margin: '1.2em 0',
        background: '#fafafa', fontFamily: "'Source Serif 4', Georgia, serif",
        transition: 'border-color 0.15s',
      }}>

        {/* URL input header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ccc', flexShrink: 0 }}>Video</span>
          <input
            type="text"
            value={url}
            onChange={e => updateAttributes({ url: e.target.value })}
            placeholder="Paste Cloudinary, YouTube or Vimeo URL…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '12px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          />
          {active && type && !paywalled && (
            <span style={{ fontSize: '10px', color: '#f2b8c6', textTransform: 'capitalize', flexShrink: 0 }}>
              {type}
            </span>
          )}
          {paywalled && (
            <span style={{
              fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
              background: '#0a0a0a', color: '#f2b8c6', padding: '2px 7px', borderRadius: '3px', flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {isControllable ? 'Paywalled — 10s preview' : 'Paywalled'}
            </span>
          )}
        </div>

        {/* Title + duration inputs */}
        <div style={{ padding: '10px 16px 8px' }}>
          <input
            type="text"
            value={title}
            onChange={e => updateAttributes({ title: e.target.value })}
            placeholder="Video title…"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: '14px', fontWeight: '600', color: '#1a1a1a',
              fontFamily: "'Playfair Display', Georgia, serif",
              marginBottom: '4px', boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            value={durationLabel}
            onChange={e => updateAttributes({ duration: e.target.value })}
            placeholder="Duration (e.g. 12:30)"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: '11px', color: '#bbb', fontFamily: "'Source Serif 4', Georgia, serif",
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Video area */}
        {!active ? (
          <div style={{
            height: '180px', background: '#f2f2f2',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#e4e4e4', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#bbb">
                <polygon points="4,2 14,8 4,14" />
              </svg>
            </div>
            <span style={{ fontSize: '12px', color: '#ccc' }}>Paste a video URL above</span>
          </div>
        ) : paywalled && isControllable ? (
          ControlledPlayer
        ) : paywalled ? (
          LockPlaceholder
        ) : isControllable ? (
          <video src={url} controls style={{ width: '100%', display: 'block', maxHeight: '360px' }} />
        ) : (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={embedUrl(url, type)}
              title="Video embed"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: paywalled ? '#1a1a1a' : '#888', fontFamily: "'Source Serif 4', Georgia, serif" }}>
              Restrict access
            </span>
            <LightToggle checked={!!paywalled} onChange={v => updateAttributes({ paywalled: v })} />
          </div>

          {paywalled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: '5px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  Single Use Access Price
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>$</span>
                  <input
                    type="text"
                    value={price}
                    onChange={e => updateAttributes({ price: e.target.value })}
                    placeholder="2.50"
                    style={{
                      width: '60px', border: 'none', borderBottom: '1px solid #e0e0e0',
                      outline: 'none', background: 'transparent',
                      fontSize: '12px', color: '#1a1a1a', fontFamily: "'Source Serif 4', Georgia, serif",
                      textAlign: 'right', padding: '2px 0',
                    }}
                  />
                </div>
                {stripeStatus && (
                  <div style={{
                    fontSize: '10px', marginTop: '5px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    color: stripeStatus === 'done' ? '#4a7a4a' : stripeStatus === 'error' ? '#c05050' : '#999',
                  }}>
                    {stripeStatus === 'creating' && 'Setting up payment…'}
                    {stripeStatus === 'done' && 'Payment set up ✓'}
                    {stripeStatus === 'error' && `Payment setup failed — ${stripeError}`}
                  </div>
                )}
              </div>
              <div style={{ paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: '7px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  Included in plans
                </div>
                {["Reader's Circle", 'Printing Press'].map(plan => {
                  const checked = currentPlanAccess.includes(plan)
                  return (
                    <label key={plan} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => updateAttributes({
                          plan_access: checked
                            ? currentPlanAccess.filter(p => p !== plan)
                            : [...currentPlanAccess, plan]
                        })}
                        style={{ width: '12px', height: '12px', accentColor: '#f2b8c6', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '11px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                        {plan}
                      </span>
                    </label>
                  )
                })}
                <div style={{ fontSize: '10px', color: '#bbb', fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: '1.45', marginTop: '4px' }}>
                  Members with these plans get free access to this content
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setTranscriptOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '12px', color: '#aaa', fontFamily: "'Source Serif 4', Georgia, serif",
              }}
            >
              <span style={{ fontSize: '9px' }}>{transcriptOpen ? '▾' : '▸'}</span>
              Transcript (optional)
            </button>
            {transcriptOpen && (
              <textarea
                value={transcript}
                onChange={e => updateAttributes({ transcript: e.target.value })}
                placeholder="Full transcript…"
                rows={4}
                style={{
                  marginTop: '8px', width: '100%',
                  border: '1px solid #e8e8e8', borderRadius: '6px',
                  padding: '8px 10px', outline: 'none',
                  background: '#fff', fontSize: '12px', color: '#555',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const VideoBlock = Node.create({
  name: 'videoBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: '' },
      duration: { default: '' },
      transcript: { default: '' },
      paywalled: { default: false },
      price: { default: '2.50' },
      stripe_product_id: { default: '' },
      stripe_price_id: { default: '' },
      plan_access: {
        default: ["Reader's Circle", 'Printing Press'],
        parseHTML: element => {
          const raw = element.getAttribute('plan_access')
          if (!raw) return ["Reader's Circle", 'Printing Press']
          try { return JSON.parse(raw) } catch { return ["Reader's Circle", 'Printing Press'] }
        },
        renderHTML: attrs => ({
          plan_access: JSON.stringify(attrs.plan_access ?? ["Reader's Circle", 'Printing Press'])
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'video-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView)
  },

  addCommands() {
    return {
      insertVideoBlock: () => ({ commands }) =>
        commands.insertContent({
          type: 'videoBlock',
          attrs: { url: '', title: '', duration: '', transcript: '', paywalled: false, price: '2.50', stripe_product_id: '', stripe_price_id: '', plan_access: ["Reader's Circle", 'Printing Press'] },
        }),
    }
  },
})
