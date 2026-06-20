'use client'

import { useEffect, useState, useRef } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const STALE_MS = 90000 // 90s — 3 missed pings = gone

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

function pageName(path) {
  if (!path || path === '/') return 'Home'
  return path.replace('/post/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40)
}

function DeviceIcon({ type }) {
  if (type === 'mobile') return <span title="Mobile">📱</span>
  if (type === 'tablet') return <span title="Tablet">📲</span>
  return <span title="Desktop">🖥️</span>
}

// ── Journey modal ─────────────────────────────────────────────
function JourneyModal({ visitor, pageViews, onClose }) {
  const views = pageViews
    .filter(v => v.visitor_id === visitor.visitor_id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  // Calculate time spent per page
  const withTime = views.map((v, i) => {
    const next = views[i + 1]
    const ms   = next ? new Date(next.created_at) - new Date(v.created_at) : null
    const mins = ms ? Math.round(ms / 60000) : null
    const secs = ms ? Math.round((ms % 60000) / 1000) : null
    return { ...v, timeSpent: ms === null ? null : ms < 60000 ? `${secs}s` : `${mins}m ${secs % 60}s` }
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: ffH, fontSize: '16px', fontWeight: '700', color: '#0a0a0a' }}>
              Visitor Journey
            </div>
            <div style={{ fontSize: '12px', color: '#aaa', fontFamily: ff, marginTop: '2px' }}>
              {visitor.country || 'Unknown'} · <DeviceIcon type={visitor.device_type} /> {visitor.device_type} · {views.length} page{views.length !== 1 ? 's' : ''} visited
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {withTime.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#aaa', fontFamily: ff, fontStyle: 'italic' }}>No page history yet for this session.</div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: '#f0e8e0' }} />
              {withTime.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px', position: 'relative' }}>
                  {/* Dot */}
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: i === withTime.length - 1 ? '#c4364a' : '#f2b8c6', border: '2px solid #fff', flexShrink: 0, marginTop: '2px', zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', fontFamily: ff }}>
                      {pageName(v.page_path)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff, marginTop: '2px' }}>
                      {new Date(v.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      {v.timeSpent && <span style={{ marginLeft: '8px', color: '#c4364a' }}>· {v.timeSpent} on page</span>}
                      {i === withTime.length - 1 && <span style={{ marginLeft: '8px', background: '#fce8ed', color: '#c4364a', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>current</span>}
                    </div>
                    {v.page_path?.startsWith('/post/') && (
                      <div style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, marginTop: '1px' }}>{v.page_path}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referrer */}
        {visitor.referrer && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f5f5f5', fontSize: '11px', color: '#aaa', fontFamily: ff }}>
            Arrived from: <span style={{ color: '#555' }}>{visitor.referrer}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main live visitors component ──────────────────────────────
export default function LiveVisitors({ supabase }) {
  const [visitors, setVisitors]   = useState([])
  const [pageViews, setPageViews] = useState([])
  const [selected, setSelected]   = useState(null)
  const [expanded, setExpanded]   = useState(true)
  const channelRef = useRef(null)

  // Filter stale visitors (no ping in 90s)
  function filterActive(rows) {
    const cutoff = Date.now() - STALE_MS
    return (rows || []).filter(r => new Date(r.last_seen) > cutoff)
  }

  useEffect(() => {
    // Initial load
    supabase.from('active_sessions').select('*').then(({ data }) => {
      setVisitors(filterActive(data))
    })

    // Load recent page views for journey modal (last 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString()
    supabase.from('page_views').select('visitor_id, page_path, created_at')
      .gte('created_at', sixHoursAgo).order('created_at', { ascending: true })
      .then(({ data }) => setPageViews(data || []))

    // Subscribe to realtime changes
    channelRef.current = supabase
      .channel('active_sessions_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => {
        // Re-fetch on any change
        supabase.from('active_sessions').select('*').then(({ data }) => {
          setVisitors(filterActive(data))
        })
      })
      .subscribe()

    // Prune stale visitors every 30s client-side
    const pruneInterval = setInterval(() => {
      setVisitors(prev => filterActive(prev))
    }, 30000)

    return () => {
      supabase.removeChannel(channelRef.current)
      clearInterval(pruneInterval)
    }
  }, [supabase])

  const count = visitors.length

  return (
    <>
      {/* Live strip */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', marginBottom: '14px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: ff }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pulse dot */}
            <div style={{ position: 'relative', width: '10px', height: '10px', flexShrink: 0 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: count > 0 ? '#2d8f5a' : '#ddd' }} />
              {count > 0 && (
                <div style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', border: '2px solid #2d8f5a', animation: 'pulse 2s infinite', opacity: 0.6 }} />
              )}
            </div>
            <span style={{ fontFamily: ffH, fontSize: '20px', fontWeight: '700', color: '#0a0a0a' }}>{count}</span>
            <span style={{ fontSize: '13px', color: '#888' }}>
              {count === 1 ? 'Visitor Online Now' : 'Visitors Online Now'}
            </span>
          </div>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
            <path d="M1 1l4 4 4-4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {expanded && (
          <div style={{ borderTop: '1px solid #f5f5f5' }}>
            {count === 0 ? (
              <div style={{ padding: '20px 18px', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>
                No active visitors right now.
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px 80px', gap: '8px', padding: '8px 18px', borderBottom: '1px solid #f5f5f5' }}>
                  {['Current Page', 'Country', 'Device', 'Active', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bbb', fontFamily: ff }}>{h}</div>
                  ))}
                </div>
                {visitors.map(v => (
                  <div
                    key={v.visitor_id}
                    onClick={() => setSelected(v)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px 80px', gap: '8px', padding: '10px 18px', borderBottom: '1px solid #fafafa', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ fontSize: '13px', color: '#0a0a0a', fontFamily: ff, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pageName(v.current_page)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', fontFamily: ff }}>{v.country || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#555', fontFamily: ff }}><DeviceIcon type={v.device_type} /> {v.device_type || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>{timeAgo(v.last_seen)}</div>
                    <div style={{ fontSize: '11px', color: '#c4364a', fontFamily: ff, textAlign: 'right' }}>View →</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>

      {/* Journey modal */}
      {selected && (
        <JourneyModal
          visitor={selected}
          pageViews={pageViews}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
