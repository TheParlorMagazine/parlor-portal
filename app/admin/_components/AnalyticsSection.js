'use client'

import { useEffect, useState } from 'react'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DARK_PINK = '#c4364a'

// ── Simple SVG bar chart ──────────────────────────────────────
function BarChart({ data, color = PINK, height = 80 }) {
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: '12px', fontFamily: ff, fontStyle: 'italic' }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 16
  const gap  = 4
  const w    = data.length * (barW + gap)
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 6))
          return <rect key={i} x={i * (barW + gap)} y={height - h} width={barW} height={h} fill={color} rx={2} opacity={0.8} />
        })}
      </svg>
    </div>
  )
}

// ── Horizontal bar (for breakdowns) ──────────────────────────
function HBar({ label, value, max, color = PINK }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '12px', color: '#555', fontFamily: ff, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#aaa', fontFamily: ff, flexShrink: 0 }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: '5px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function SectionBox({ title, children, action }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ fontSize: '26px', fontWeight: '700', color: color || '#0a0a0a', fontFamily: ffH, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px', fontFamily: ff, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}

export default function AnalyticsSection({ supabase }) {
  const [data, setData] = useState({
    totalViews: null, uniqueVisitors: null, avgSession: null, bounceRate: null,
    dailySessions: [],    // [{ label: 'Jun 1', value: N }]
    topArticles: [],      // [{ path, views }]
    topReferrers: [],     // [{ source, visits }]
    byDevice: [],         // [{ device, count }]
    byCountry: [],        // [{ country, count }]
    newVsReturning: { new: 0, returning: 0 },
    loaded: false,
  })

  useEffect(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const today         = new Date().toISOString().slice(0, 10)

    Promise.allSettled([
      supabase.from('page_views').select('id, page_path, visitor_id, created_at, referrer, device_type, country, session_id')
        .gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10000),
    ]).then(([pvRes]) => {
      const views = pvRes.status === 'fulfilled' ? (pvRes.value.data || []) : []

      if (!views.length) {
        setData(prev => ({ ...prev, loaded: true }))
        return
      }

      // Aggregate
      const uniqueVisitors = new Set(views.map(v => v.visitor_id)).size
      const totalViews     = views.length
      const todayViews     = views.filter(v => v.created_at?.slice(0, 10) === today).length

      // Daily sessions over 30 days
      const dayCounts = {}
      views.forEach(v => {
        const day = v.created_at?.slice(0, 10)
        if (day) dayCounts[day] = (dayCounts[day] || 0) + 1
      })
      const dailySessions = []
      for (let i = 29; i >= 0; i--) {
        const d   = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailySessions.push({ label: lbl, value: dayCounts[key] || 0 })
      }

      // Top articles
      const pathCounts = {}
      views.forEach(v => { if (v.page_path) pathCounts[v.page_path] = (pathCounts[v.page_path] || 0) + 1 })
      const topArticles = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, views]) => ({ path, views }))

      // Top referrers
      const refCounts = {}
      views.forEach(v => {
        const src = v.referrer ? (new URL(v.referrer).hostname || v.referrer) : 'Direct'
        refCounts[src] = (refCounts[src] || 0) + 1
      })
      const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, visits]) => ({ source, visits }))

      // By device
      const devCounts = {}
      views.forEach(v => { const d = v.device_type || 'Unknown'; devCounts[d] = (devCounts[d] || 0) + 1 })
      const byDevice = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).map(([device, count]) => ({ device, count }))

      // By country
      const countryCounts = {}
      views.forEach(v => { const c = v.country || 'Unknown'; countryCounts[c] = (countryCounts[c] || 0) + 1 })
      const byCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([country, count]) => ({ country, count }))

      // New vs returning (rough: visitor_id seen > 1 time = returning)
      const visitorCounts = {}
      views.forEach(v => { if (v.visitor_id) visitorCounts[v.visitor_id] = (visitorCounts[v.visitor_id] || 0) + 1 })
      const returning = Object.values(visitorCounts).filter(c => c > 1).length
      const newV = uniqueVisitors - returning

      setData({
        totalViews, uniqueVisitors, avgSession: null, bounceRate: null,
        dailySessions, topArticles, topReferrers, byDevice, byCountry,
        newVsReturning: { new: newV, returning },
        loaded: true,
      })
    })
  }, [])

  const noData = data.loaded && data.totalViews === null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Analytics</h1>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>Last 30 days · sourced from <code style={{ fontSize: '12px', background: '#f5f5f5', padding: '1px 5px', borderRadius: '3px' }}>page_views</code> table</div>
        </div>
        {noData && (
          <div style={{ background: '#fffbe6', border: '1px solid #f0e06a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#7a6000', fontFamily: ff, maxWidth: '340px' }}>
            No data yet. Create a <code style={{ fontSize: '11px' }}>page_views</code> table in Supabase with columns: <code style={{ fontSize: '11px' }}>id, page_path, visitor_id, session_id, referrer, device_type, country, created_at</code>.
          </div>
        )}
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatPill label="Total Page Views" value={data.totalViews?.toLocaleString() ?? '—'} color={DARK_PINK} />
        <StatPill label="Unique Visitors"  value={data.uniqueVisitors?.toLocaleString() ?? '—'} />
        <StatPill label="New Visitors"     value={data.newVsReturning.new?.toLocaleString() || '—'} color="#2d8f5a" />
        <StatPill label="Returning"        value={data.newVsReturning.returning?.toLocaleString() || '—'} color="#4a6fd4" />
      </div>

      {/* Sessions over time chart */}
      <SectionBox title="Sessions Over Time (30 days)">
        {data.dailySessions.length > 0 ? (
          <>
            <BarChart data={data.dailySessions} color={PINK} height={100} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff }}>{data.dailySessions[0]?.label}</span>
              <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff }}>{data.dailySessions[data.dailySessions.length - 1]?.label}</span>
            </div>
          </>
        ) : (
          <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: '12px', fontFamily: ff, fontStyle: 'italic' }}>
            No session data yet.
          </div>
        )}
      </SectionBox>

      {/* Two-column: top articles + referrers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <SectionBox title="Top Articles by Views">
          {data.topArticles.length === 0
            ? <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No data yet.</div>
            : data.topArticles.map((a, i) => <HBar key={i} label={a.path} value={a.views} max={data.topArticles[0].views} color={DARK_PINK} />)
          }
        </SectionBox>
        <SectionBox title="Top Referral Sources">
          {data.topReferrers.length === 0
            ? <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No data yet.</div>
            : data.topReferrers.map((r, i) => <HBar key={i} label={r.source} value={r.visits} max={data.topReferrers[0].visits} color="#4a6fd4" />)
          }
        </SectionBox>
      </div>

      {/* Two-column: device + country */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <SectionBox title="Sessions by Device">
          {data.byDevice.length === 0
            ? <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No data yet.</div>
            : data.byDevice.map((d, i) => <HBar key={i} label={d.device} value={d.count} max={data.byDevice[0].count} color="#d4844a" />)
          }
        </SectionBox>
        <SectionBox title="Sessions by Country">
          {data.byCountry.length === 0
            ? <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No data yet.</div>
            : data.byCountry.map((c, i) => <HBar key={i} label={c.country} value={c.count} max={data.byCountry[0].count} color="#8a4ad4" />)
          }
        </SectionBox>
      </div>
    </div>
  )
}
