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
          One-time access to this audio
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

function AudioBlockView({ node, updateAttributes, selected }) {
  const { url, title, duration: durationLabel, transcript, paywalled, price, plan_access } = node.attrs
  const currentPlanAccess = Array.isArray(plan_access) ? plan_access : ["Reader's Circle", "Printing Press"]
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [markerHovered, setMarkerHovered] = useState(false)
  const audioRef = useRef(null)

  const active = !!url.trim()
  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0
  const markerPct = paywalled && audioDuration > PREVIEW_LIMIT
    ? (PREVIEW_LIMIT / audioDuration) * 100
    : null

  // Auto-detect duration when URL changes
  useEffect(() => {
    if (!url) return
    let aborted = false
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = url
    const onMeta = () => {
      if (aborted || isNaN(audio.duration)) return
      const m = Math.floor(audio.duration / 60)
      const s = Math.floor(audio.duration % 60)
      updateAttributes({ duration: `${m}:${s.toString().padStart(2, '0')}` })
    }
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      aborted = true
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.src = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Reset player when paywall is toggled
  useEffect(() => {
    setShowPaywall(false)
    setPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [paywalled])

  function togglePlay() {
    if (!active || !audioRef.current) return
    if (showPaywall) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      setShowPaywall(false)
      audioRef.current.play()
      setPlaying(true)
      return
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function handleSeek(e) {
    if (!active || !audioRef.current || !audioDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    let t = ((e.clientX - rect.left) / rect.width) * audioDuration
    if (paywalled) t = Math.min(t, PREVIEW_LIMIT)
    audioRef.current.currentTime = t
  }

  function handleTimeUpdate() {
    const t = audioRef.current?.currentTime || 0
    setCurrentTime(t)
    if (paywalled && t >= PREVIEW_LIMIT) {
      audioRef.current.pause()
      setPlaying(false)
      setShowPaywall(true)
    }
  }

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
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ccc', flexShrink: 0 }}>Audio</span>
          <input
            type="text"
            value={url}
            onChange={e => updateAttributes({ url: e.target.value })}
            placeholder="Paste Cloudinary audio URL…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '12px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          />
          {paywalled && (
            <span style={{
              fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
              background: '#0a0a0a', color: '#f2b8c6', padding: '2px 7px', borderRadius: '3px', flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              Paywalled — 10s preview
            </span>
          )}
        </div>

        {/* Title + duration — always editable, outside the active gate */}
        <div style={{ padding: '14px 16px 0' }}>
          <input
            type="text"
            value={title}
            onChange={e => updateAttributes({ title: e.target.value })}
            placeholder="Episode title…"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: '14px', fontWeight: '600', color: '#1a1a1a',
              fontFamily: "'Playfair Display', Georgia, serif",
              marginBottom: '6px', boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            value={durationLabel}
            onChange={e => updateAttributes({ duration: e.target.value })}
            placeholder="Duration (e.g. 42:30)"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: '11px', color: '#bbb', fontFamily: "'Source Serif 4', Georgia, serif",
              marginBottom: '12px', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Player controls — dimmed and non-interactive until a URL is set */}
        <div style={{
          padding: '0 16px 14px',
          opacity: active ? 1 : 0.38,
          pointerEvents: active ? 'auto' : 'none',
          position: 'relative',
        }}>

          {/* Play controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={togglePlay}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#0a0a0a', border: 'none',
                cursor: active ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                  <rect x="1" y="1" width="4" height="10" rx="1" />
                  <rect x="7" y="1" width="4" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                  <polygon points="2,1 11,6 2,11" />
                </svg>
              )}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {/* Progress bar */}
              <div
                onClick={handleSeek}
                style={{
                  height: '3px', background: '#e0e0e0', borderRadius: '2px',
                  cursor: active ? 'pointer' : 'default', position: 'relative',
                }}
              >
                {/* Fill */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${progress}%`, background: '#f2b8c6', borderRadius: '2px',
                }} />
                {/* Paywall marker */}
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
                <span>{durationLabel || fmt(audioDuration)}</span>
              </div>
            </div>
          </div>

          {/* Paywall overlay — covers the player section */}
          {showPaywall && (
            <PaywallOverlay
              price={price}
              onReplay={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0
                  audioRef.current.play()
                }
                setCurrentTime(0)
                setPlaying(true)
                setShowPaywall(false)
              }}
            />
          )}
        </div>

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

        {active && (
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
            onEnded={() => setPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const AudioBlock = Node.create({
  name: 'audioBlock',
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
    return [{ tag: 'div[data-type="audio-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'audio-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioBlockView)
  },

  addCommands() {
    return {
      insertAudioBlock: () => ({ commands }) =>
        commands.insertContent({
          type: 'audioBlock',
          attrs: { url: '', title: '', duration: '', transcript: '', paywalled: false, price: '2.50', plan_access: ["Reader's Circle", 'Printing Press'] },
        }),
    }
  },
})
