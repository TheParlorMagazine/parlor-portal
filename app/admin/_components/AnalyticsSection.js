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

// ── Date helpers ─────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getAvailableYears() {
  const now = new Date()
  const years = []
  for (let y = now.getFullYear(); y >= 2024; y--) years.push(y)
  return years
}

function monthRange(ym) {
  const [year, month] = ym.split('-').map(Number)
  const start = new Date(year, month - 1, 1).toISOString()
  const end   = new Date(year, month, 1).toISOString()
  return { start, end }
}

function yearRange(year) {
  return {
    start: new Date(year, 0, 1).toISOString(),
    end:   new Date(year + 1, 0, 1).toISOString(),
  }
}

// ── PDF Report Generator ──────────────────────────────────────
function generateReport({ year, yearData, memberCount, paidCount }) {
  const totalViews     = yearData.reduce((s, m) => s + (m.totalViews || 0), 0)
  const totalVisitors  = yearData.reduce((s, m) => s + (m.uniqueVisitors || 0), 0)
  const peakMonth      = yearData.reduce((best, m) => (!best || m.totalViews > best.totalViews) ? m : best, null)
  const topArticles    = {}
  yearData.forEach(m => m.topArticles?.forEach(a => { topArticles[a.title] = (topArticles[a.title] || 0) + a.views }))
  const topArts        = Object.entries(topArticles).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topCountries   = {}
  yearData.forEach(m => m.byCountry?.forEach(c => { topCountries[c.country] = (topCountries[c.country] || 0) + c.count }))
  const topC           = Object.entries(topCountries).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const monthlyViews   = yearData.map((m, i) => ({ month: MONTHS[i], views: m.totalViews || 0 }))
  const maxBar         = Math.max(...monthlyViews.map(m => m.views), 1)

  const barSVG = monthlyViews.map((m, i) => {
    const h = Math.max(2, (m.views / maxBar) * 80)
    const x = i * 38 + 4
    return `<rect x="${x}" y="${88 - h}" width="30" height="${h}" fill="#c4364a" rx="3" opacity="0.85"/>
            <text x="${x + 15}" y="106" text-anchor="middle" font-size="9" fill="#aaa" font-family="Georgia,serif">${m.month}</text>
            ${m.views > 0 ? `<text x="${x + 15}" y="${84 - h}" text-anchor="middle" font-size="8" fill="#c4364a" font-family="Georgia,serif">${m.views}</text>` : ''}`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>The Parlor — ${year} Analytics Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; background: #fff; color: #0a0a0a; padding: 60px; max-width: 900px; margin: 0 auto; }
  @media print { body { padding: 40px; } .no-print { display: none; } }
  h1 { font-size: 42px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; color: #aaa; margin-bottom: 24px; font-weight: 400; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #aaa; margin-bottom: 14px; font-weight: 400; }
  .header { border-bottom: 2px solid #c4364a; padding-bottom: 28px; margin-bottom: 40px; }
  .logo { font-size: 14px; color: #c4364a; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 32px; font-style: italic; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 48px; }
  .stat { border: 1px solid #f0e8e0; border-radius: 10px; padding: 20px; }
  .stat-val { font-size: 36px; font-weight: 700; color: #0a0a0a; line-height: 1; margin-bottom: 6px; }
  .stat-val.pink { color: #c4364a; }
  .stat-val.green { color: #2d8f5a; }
  .stat-val.blue { color: #4a6fd4; }
  .stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; }
  .section { margin-bottom: 48px; }
  .chart-wrap { background: #fafafa; border-radius: 10px; padding: 20px 16px 8px; margin-bottom: 8px; }
  .bar-list { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: flex; align-items: center; gap: 12px; }
  .bar-label { font-size: 12px; color: #555; width: 180px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 6px; background: #f0ebe8; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; background: #c4364a; }
  .bar-fill.blue { background: #4a6fd4; }
  .bar-num { font-size: 11px; color: #aaa; width: 40px; text-align: right; flex-shrink: 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .footer { border-top: 1px solid #f0e8e0; padding-top: 20px; margin-top: 48px; font-size: 11px; color: #ccc; display: flex; justify-content: space-between; }
  .peak-badge { display: inline-block; background: #fce8ed; color: #c4364a; padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-left: 8px; }
  .btn { display: inline-block; margin-bottom: 32px; padding: 10px 24px; background: #0a0a0a; color: #fff; border: none; border-radius: 6px; font-family: Georgia,serif; font-size: 13px; cursor: pointer; }
</style></head><body>
<button class="btn no-print" onclick="window.print()">⬇ Save as PDF</button>
<div class="header">
  <div class="logo">The Parlor Magazine</div>
  <h1>${year} Annual Report</h1>
  <h2>Analytics & Growth Overview</h2>
</div>

<div class="stats-grid">
  <div class="stat"><div class="stat-val pink">${totalViews.toLocaleString()}</div><div class="stat-lbl">Total Page Views</div></div>
  <div class="stat"><div class="stat-val">${totalVisitors.toLocaleString()}</div><div class="stat-lbl">Unique Visitors</div></div>
  <div class="stat"><div class="stat-val green">${memberCount || '—'}</div><div class="stat-lbl">Site Members</div></div>
  <div class="stat"><div class="stat-val blue">${paidCount || '—'}</div><div class="stat-lbl">Paid Subscribers</div></div>
</div>

<div class="section">
  <h3>Monthly Page Views ${peakMonth?.totalViews ? `<span class="peak-badge">Peak: ${MONTHS_FULL[yearData.indexOf(peakMonth)]} (${peakMonth.totalViews.toLocaleString()} views)</span>` : ''}</h3>
  <div class="chart-wrap">
    <svg viewBox="0 0 ${12 * 38 + 8} 115" style="width:100%;display:block">
      ${barSVG}
    </svg>
  </div>
</div>

<div class="two-col">
  <div class="section">
    <h3>Top Articles</h3>
    <div class="bar-list">
      ${topArts.length ? topArts.map(([title, views]) => `
        <div class="bar-row">
          <span class="bar-label" title="${title}">${title}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((views/topArts[0][1])*100)}%"></div></div>
          <span class="bar-num">${views}</span>
        </div>`).join('') : '<p style="font-size:12px;color:#ccc;font-style:italic">No article data</p>'}
    </div>
  </div>
  <div class="section">
    <h3>Top Countries</h3>
    <div class="bar-list">
      ${topC.length ? topC.map(([country, count]) => `
        <div class="bar-row">
          <span class="bar-label">${country}</span>
          <div class="bar-track"><div class="bar-fill blue" style="width:${Math.round((count/topC[0][1])*100)}%"></div></div>
          <span class="bar-num">${count}</span>
        </div>`).join('') : '<p style="font-size:12px;color:#ccc;font-style:italic">No country data</p>'}
    </div>
  </div>
</div>

<div class="footer">
  <span>The Parlor Magazine · ${year} Annual Report</span>
  <span>Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
</div>
</body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalyticsSection({ supabase }) {
  const now          = new Date()
  const years        = getAvailableYears()
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed
  const [contextMenu, setContextMenu]     = useState(null)
  const [yearDataCache, setYearDataCache] = useState({}) // year → [monthData x12]
  const [memberStats, setMemberStats]     = useState({ total: 0, paid: 0 })
  const [data, setData] = useState({
    totalViews: null, uniqueVisitors: null,
    dailySessions: [], topArticles: [], topReferrers: [],
    byDevice: [], byCountry: [], newVsReturning: { new: 0, returning: 0 },
    loaded: false,
  })

  // Load member stats once
  useEffect(() => {
    supabase.from('members').select('id, plan', { count: 'exact' }).then(({ data: members }) => {
      const total = (members || []).filter(m => m.role !== 'admin' && !((m.email||'').endsWith('@theparlormagazine.com'))).length
      const paid  = (members || []).filter(m => ["Reader's Circle",'Printing Press','circle','press'].includes(m.plan)).length
      setMemberStats({ total, paid })
    })
  }, [supabase])

  const processViews = useCallback((views, articles, ym) => {
    if (!views?.length) return { totalViews: 0, uniqueVisitors: 0, dailySessions: [], topArticles: [], topReferrers: [], byDevice: [], byCountry: [], newVsReturning: { new: 0, returning: 0 }, loaded: true }
    const slugToTitle    = Object.fromEntries((articles || []).map(a => [a.slug, a.title]))
    const uniqueVisitors = new Set(views.map(v => v.visitor_id)).size
    const totalViews     = views.length
    const dayCounts      = {}
    views.forEach(v => { const day = v.created_at?.slice(0, 10); if (day) dayCounts[day] = (dayCounts[day] || 0) + 1 })
    const [year, month]  = ym.split('-').map(Number)
    const daysInMonth    = new Date(year, month, 0).getDate()
    const dailySessions  = []
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${ym}-${String(d).padStart(2, '0')}`
      dailySessions.push({ label: `${month}/${d}`, value: dayCounts[key] || 0 })
    }
    const pathCounts = {}
    views.forEach(v => { if (v.page_path?.startsWith('/post/')) pathCounts[v.page_path] = (pathCounts[v.page_path] || 0) + 1 })
    const topArticles = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, views]) => ({ path, title: slugToTitle[path.replace('/post/', '')] || path.replace('/post/', ''), views }))
    const refCounts = {}
    views.forEach(v => { try { const src = v.referrer ? (new URL(v.referrer).hostname || 'Direct') : 'Direct'; refCounts[src] = (refCounts[src] || 0) + 1 } catch { refCounts['Direct'] = (refCounts['Direct'] || 0) + 1 } })
    const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, visits]) => ({ source, visits }))
    const devCounts = {}
    views.forEach(v => { const d = v.device_type || 'Unknown'; devCounts[d] = (devCounts[d] || 0) + 1 })
    const byDevice = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).map(([device, count]) => ({ device, count }))
    const countryCounts = {}
    views.forEach(v => { if (v.country && v.country !== 'Unknown') countryCounts[v.country] = (countryCounts[v.country] || 0) + 1 })
    const byCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count }))
    const visitorCounts = {}
    views.forEach(v => { if (v.visitor_id) visitorCounts[v.visitor_id] = (visitorCounts[v.visitor_id] || 0) + 1 })
    const returning = Object.values(visitorCounts).filter(c => c > 1).length
    return { totalViews, uniqueVisitors, dailySessions, topArticles, topReferrers, byDevice, byCountry, newVsReturning: { new: uniqueVisitors - returning, returning }, loaded: true }
  }, [])

  const load = useCallback((year, month) => {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`
    const { start, end } = monthRange(ym)
    Promise.all([
      supabase.from('page_views').select('id,page_path,visitor_id,created_at,referrer,device_type,country,session_id').gte('created_at', start).lt('created_at', end).order('created_at', { ascending: false }).limit(20000),
      supabase.from('articles').select('slug,title').eq('published', true),
    ]).then(([{ data: views }, { data: articles }]) => {
      setData(processViews(views || [], articles || [], ym))
    })
  }, [supabase, processViews])

  // Load year data for report (all 12 months)
  const loadYearForReport = useCallback(async (year) => {
    if (yearDataCache[year]) return yearDataCache[year]
    const { start, end } = yearRange(year)
    const [{ data: views }, { data: articles }] = await Promise.all([
      supabase.from('page_views').select('id,page_path,visitor_id,created_at,referrer,device_type,country').gte('created_at', start).lt('created_at', end).limit(100000),
      supabase.from('articles').select('slug,title').eq('published', true),
    ])
    const yearData = Array.from({ length: 12 }, (_, i) => {
      const ym = `${year}-${String(i + 1).padStart(2, '0')}`
      const monthViews = (views || []).filter(v => v.created_at?.startsWith(ym))
      return processViews(monthViews, articles || [], ym)
    })
    setYearDataCache(prev => ({ ...prev, [year]: yearData }))
    return yearData
  }, [supabase, processViews, yearDataCache])

  useEffect(() => { load(selectedYear, selectedMonth) }, [selectedYear, selectedMonth, load])

  const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const noData = data.loaded && data.totalViews === 0

  const handleRightClick = (e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleDownloadReport = async () => {
    setContextMenu(null)
    const yearData = await loadYearForReport(selectedYear)
    generateReport({ year: selectedYear, yearData, memberCount: memberStats.total, paidCount: memberStats.paid })
  }

  return (
    <div onContextMenu={handleRightClick} onClick={() => contextMenu && setContextMenu(null)}>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'hidden', minWidth: '200px' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleDownloadReport}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: ff, fontSize: '13px', color: '#0a0a0a', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span>📄</span> Download {selectedYear} Annual Report
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Analytics</h1>
            <div style={{ fontSize: '13px', color: '#aaa', fontFamily: ff }}>
              {MONTHS_FULL[selectedMonth]} {selectedYear} · right-click to download annual report
            </div>
          </div>

          {/* Year pills — clicking expands months below */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {years.filter(y => y >= 2025).map(y => (
              <button key={y}
                onClick={() => {
                  if (selectedYear === y) return // already selected, do nothing
                  setSelectedYear(y)
                  setSelectedMonth(y === now.getFullYear() ? now.getMonth() : 0)
                }}
                style={{ padding: '6px 16px', border: '1px solid', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, fontWeight: '600',
                  background: selectedYear === y ? '#0a0a0a' : '#fff',
                  color:      selectedYear === y ? '#fff'    : '#888',
                  borderColor: selectedYear === y ? '#0a0a0a' : '#e8e8e8' }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Month pills — shown below, attached to selected year */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
          {MONTHS.map((m, i) => {
            // Don't show future months
            if (selectedYear === now.getFullYear() && i > now.getMonth()) return null
            return (
              <button key={i} onClick={() => setSelectedMonth(i)}
                style={{ padding: '4px 12px', border: '1px solid', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontFamily: ff,
                  background: selectedMonth === i ? '#c4364a' : '#fff',
                  color:      selectedMonth === i ? '#fff'    : '#aaa',
                  borderColor: selectedMonth === i ? '#c4364a' : '#e8e8e8' }}>
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {noData && (
        <div style={{ background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '20px', textAlign: 'center', fontSize: '13px', color: '#aaa', fontFamily: ff, fontStyle: 'italic', marginBottom: '20px' }}>
          No data for {MONTHS_FULL[selectedMonth]} {selectedYear}.
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
      <SectionBox title={`Sessions — ${MONTHS_FULL[selectedMonth]} ${selectedYear}`}>
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
            : data.topArticles.map((a, i) => <HBar key={i} label={a.title} value={a.views} max={data.topArticles[0].views} color={DARK_PINK} />)
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
      <SectionBox title="Visitors by Country" action={data.byCountry.length > 0 && <span style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>{data.byCountry.length} countr{data.byCountry.length === 1 ? 'y' : 'ies'}</span>}>
        {data.byCountry.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No country data yet.</div>
        ) : (
          <>
            <ChoroplethMap byCountry={data.byCountry} />
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {data.byCountry.slice(0, 10).map((c, i) => <HBar key={i} label={c.country} value={c.count} max={data.byCountry[0].count} color="#8a4ad4" />)}
            </div>
          </>
        )}
      </SectionBox>
    </div>
  )
}
