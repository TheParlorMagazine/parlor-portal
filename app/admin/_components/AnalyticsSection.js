'use client'

import { useEffect, useState, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'

const ff   = "'Source Serif 4', Georgia, serif"
const ffH  = "'Playfair Display', Georgia, serif"
const PINK      = '#f2b8c6'
const DARK_PINK = '#c4364a'
const GEO_URL   = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Country name → ISO-3166 numeric (used by world-atlas topojson)
// We store country names from ipapi, so we need to match by name
const COUNTRY_NAME_MAP = {
  'United States': '840', 'United Kingdom': '826', 'Canada': '124',
  'Australia': '036', 'Germany': '276', 'France': '250', 'Spain': '724',
  'Italy': '380', 'Netherlands': '528', 'Brazil': '076', 'Mexico': '484',
  'India': '356', 'Japan': '392', 'China': '156', 'South Korea': '410',
  'Argentina': '032', 'Colombia': '170', 'Chile': '152', 'Peru': '604',
  'Portugal': '620', 'Sweden': '752', 'Norway': '578', 'Denmark': '208',
  'Finland': '246', 'Poland': '616', 'Russia': '643', 'Turkey': '792',
  'South Africa': '710', 'Nigeria': '566', 'Kenya': '404', 'Egypt': '818',
  'Israel': '376', 'UAE': '784', 'Saudi Arabia': '682', 'Pakistan': '586',
  'Bangladesh': '050', 'Indonesia': '360', 'Philippines': '608',
  'Vietnam': '704', 'Thailand': '764', 'Malaysia': '458', 'Singapore': '702',
  'New Zealand': '554', 'Ireland': '372', 'Belgium': '056', 'Switzerland': '756',
  'Austria': '040', 'Czech Republic': '203', 'Romania': '642', 'Hungary': '348',
  'Greece': '300', 'Ukraine': '804', 'Morocco': '504', 'Ghana': '288',
}

// ── Choropleth Map ────────────────────────────────────────────
function ChoroplethMap({ byCountry }) {
  const [tooltip, setTooltip] = useState(null)
  const total = byCountry.reduce((s, c) => s + c.count, 0)
  const countMap = Object.fromEntries(byCountry.map(c => [c.country, c.count]))
  const max = byCountry[0]?.count || 1

  const colorScale = scaleLinear()
    .domain([0, max])
    .range(['#fce8ed', '#c4364a'])

  // Build a lookup from numeric id to country name
  const numericToName = Object.fromEntries(
    Object.entries(COUNTRY_NAME_MAP).map(([name, id]) => [id, name])
  )

  return (
    <div style={{ position: 'relative', background: '#fafafa', borderRadius: '8px', overflow: 'hidden' }}>
      <ComposableMap
        projectionConfig={{ scale: 147 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const numId   = String(geo.id)
                const name    = numericToName[numId]
                const count   = name ? (countMap[name] || 0) : 0
                const pct     = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                const fill    = count > 0 ? colorScale(count) : '#e8e8e8'
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={0.4}
                    onMouseEnter={(e) => {
                      if (!name) return
                      setTooltip({ name, count, pct, x: e.clientX, y: e.clientY })
                    }}
                    onMouseMove={(e) => {
                      if (tooltip) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { outline: 'none' },
                      hover:   { fill: count > 0 ? '#8a2030' : '#d0d0d0', outline: 'none', cursor: count > 0 ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 36,
          background: '#0a0a0a', color: '#fff', padding: '6px 10px',
          borderRadius: '6px', fontSize: '12px', fontFamily: ff,
          pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <strong>{tooltip.name}</strong> · {tooltip.count.toLocaleString()} view{tooltip.count !== 1 ? 's' : ''} ({tooltip.pct}%)
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '10px', color: '#aaa', fontFamily: ff }}>
        <span>0</span>
        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'linear-gradient(to right, #fce8ed, #c4364a)' }} />
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  )
}

// ── Simple SVG bar chart ──────────────────────────────────────
function BarChart({ data, color = PINK, height = 80 }) {
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: '12px', fontFamily: ff, fontStyle: 'italic' }}>No data</div>
  const max  = Math.max(...data.map(d => d.value), 1)
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

// ── Horizontal bar ────────────────────────────────────────────
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

// ── Month picker helpers ──────────────────────────────────────
function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const value = d.toISOString().slice(0, 7) // YYYY-MM
    options.push({ label, value })
  }
  return options
}

function monthRange(ym) {
  const [year, month] = ym.split('-').map(Number)
  const start = new Date(year, month - 1, 1).toISOString()
  const end   = new Date(year, month, 1).toISOString()
  return { start, end }
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalyticsSection({ supabase }) {
  const monthOptions = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [data, setData] = useState({
    totalViews: null, uniqueVisitors: null,
    dailySessions: [], topArticles: [], topReferrers: [],
    byDevice: [], byCountry: [], newVsReturning: { new: 0, returning: 0 },
    loaded: false,
  })

  const load = useCallback((ym) => {
    const { start, end } = monthRange(ym)
    supabase
      .from('page_views')
      .select('id, page_path, visitor_id, created_at, referrer, device_type, country, session_id')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .limit(20000)
      .then(({ data: views = [] }) => {
        if (!views?.length) {
          setData({ totalViews: 0, uniqueVisitors: 0, dailySessions: [], topArticles: [], topReferrers: [], byDevice: [], byCountry: [], newVsReturning: { new: 0, returning: 0 }, loaded: true })
          return
        }

        const uniqueVisitors = new Set(views.map(v => v.visitor_id)).size
        const totalViews     = views.length

        // Daily sessions
        const dayCounts = {}
        views.forEach(v => {
          const day = v.created_at?.slice(0, 10)
          if (day) dayCounts[day] = (dayCounts[day] || 0) + 1
        })
        const [year, month] = ym.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()
        const dailySessions = []
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${ym}-${String(d).padStart(2, '0')}`
          const lbl = `${month}/${d}`
          dailySessions.push({ label: lbl, value: dayCounts[key] || 0 })
        }

        // Top articles
        const pathCounts = {}
        views.forEach(v => { if (v.page_path) pathCounts[v.page_path] = (pathCounts[v.page_path] || 0) + 1 })
        const topArticles = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, views]) => ({ path, views }))

        // Referrers
        const refCounts = {}
        views.forEach(v => {
          try {
            const src = v.referrer ? (new URL(v.referrer).hostname || 'Direct') : 'Direct'
            refCounts[src] = (refCounts[src] || 0) + 1
          } catch { refCounts['Direct'] = (refCounts['Direct'] || 0) + 1 }
        })
        const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, visits]) => ({ source, visits }))

        // Device
        const devCounts = {}
        views.forEach(v => { const d = v.device_type || 'Unknown'; devCounts[d] = (devCounts[d] || 0) + 1 })
        const byDevice = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).map(([device, count]) => ({ device, count }))

        // Country — all countries, not just top 8, for the map
        const countryCounts = {}
        views.forEach(v => { if (v.country && v.country !== 'Unknown') { countryCounts[v.country] = (countryCounts[v.country] || 0) + 1 } })
        const byCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count }))

        // New vs returning
        const visitorCounts = {}
        views.forEach(v => { if (v.visitor_id) visitorCounts[v.visitor_id] = (visitorCounts[v.visitor_id] || 0) + 1 })
        const returning = Object.values(visitorCounts).filter(c => c > 1).length
        const newV = uniqueVisitors - returning

        setData({ totalViews, uniqueVisitors, dailySessions, topArticles, topReferrers, byDevice, byCountry, newVsReturning: { new: newV, returning }, loaded: true })
      })
  }, [supabase])

  useEffect(() => { load(selectedMonth) }, [selectedMonth, load])

  const noData = data.loaded && data.totalViews === 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Analytics</h1>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>
            Sourced from <code style={{ fontSize: '12px', background: '#f5f5f5', padding: '1px 5px', borderRadius: '3px' }}>page_views</code> table
          </div>
        </div>
        {/* Month picker */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {monthOptions.slice(0, 6).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedMonth(opt.value)}
              style={{
                padding: '5px 12px', border: '1px solid', borderRadius: '20px',
                fontSize: '11px', cursor: 'pointer', fontFamily: ff,
                background: selectedMonth === opt.value ? '#0a0a0a' : '#fff',
                color:      selectedMonth === opt.value ? '#fff'    : '#888',
                borderColor: selectedMonth === opt.value ? '#0a0a0a' : '#e8e8e8',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {noData && (
        <div style={{ background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '20px', textAlign: 'center', fontSize: '13px', color: '#aaa', fontFamily: ff, fontStyle: 'italic', marginBottom: '20px' }}>
          No data for {monthOptions.find(o => o.value === selectedMonth)?.label}.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatPill label="Total Page Views" value={data.totalViews?.toLocaleString() ?? '—'} color={DARK_PINK} />
        <StatPill label="Unique Visitors"  value={data.uniqueVisitors?.toLocaleString() ?? '—'} />
        <StatPill label="New Visitors"     value={data.newVsReturning.new?.toLocaleString() || '0'} color="#2d8f5a" />
        <StatPill label="Returning"        value={data.newVsReturning.returning?.toLocaleString() || '0'} color="#4a6fd4" />
      </div>

      {/* Sessions chart */}
      <SectionBox title={`Sessions — ${monthOptions.find(o => o.value === selectedMonth)?.label}`}>
        {data.dailySessions.length > 0 ? (
          <>
            <BarChart data={data.dailySessions} color={PINK} height={100} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff }}>{data.dailySessions[0]?.label}</span>
              <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff }}>{data.dailySessions[data.dailySessions.length - 1]?.label}</span>
            </div>
          </>
        ) : (
          <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: '12px', fontFamily: ff, fontStyle: 'italic' }}>No session data yet.</div>
        )}
      </SectionBox>

      {/* Articles + referrers */}
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

      {/* Device */}
      <SectionBox title="Sessions by Device">
        {data.byDevice.length === 0
          ? <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No data yet.</div>
          : data.byDevice.map((d, i) => <HBar key={i} label={d.device} value={d.count} max={data.byDevice[0].count} color="#d4844a" />)
        }
      </SectionBox>

      {/* Choropleth map */}
      <SectionBox
        title="Visitors by Country"
        action={
          data.byCountry.length > 0 && (
            <span style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>
              {data.byCountry.length} countr{data.byCountry.length === 1 ? 'y' : 'ies'}
            </span>
          )
        }
      >
        {data.byCountry.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No country data yet.</div>
        ) : (
          <>
            <ChoroplethMap byCountry={data.byCountry} />
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {data.byCountry.slice(0, 10).map((c, i) => (
                <HBar key={i} label={c.country} value={c.count} max={data.byCountry[0].count} color="#8a4ad4" />
              ))}
            </div>
          </>
        )}
      </SectionBox>
    </div>
  )
}
