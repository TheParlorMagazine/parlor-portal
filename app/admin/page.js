'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubscribersSection from './_components/SubscribersSection'
import PlansSection from './_components/PlansSection'
import AnalyticsSection from './_components/AnalyticsSection'

// ── Role definitions ──────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: '',             label: 'No role',           desc: 'Subscriber — no admin access' },
  { value: 'admin',        label: 'Master Admin',       desc: 'Full access to all sections' },
  { value: 'editor',       label: 'Editor',             desc: 'Articles, Writers, Media' },
  { value: 'writer',       label: 'Writer',             desc: 'Writer dashboard only' },
  { value: 'finance_admin',label: 'Finance Admin',      desc: 'Invoices only' },
  { value: 'social_admin', label: 'Social Admin',       desc: 'Scheduled posts only' },
]

const TEAM_ROLES = ['admin', 'editor', 'writer', 'finance_admin', 'social_admin']

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function timeAgo(iso) {
  if (!iso) return ''
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}
function roleLabel(val) {
  return ROLE_OPTIONS.find(r => r.value === val)?.label || 'No role'
}

// ── Style tokens ──────────────────────────────────────────────
const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DARK_PINK = '#c4364a'

// ── Sidebar ───────────────────────────────────────────────────
const NAV = [
  { section: null, items: [
    { key: 'dashboard', label: 'Dashboard' },
  ]},
  { section: 'Content Management', items: [
    { key: 'articles',  label: 'Articles',    href: '/admin/articles' },
    { key: 'writers',   label: 'Writers',     href: '/admin/writers' },
    { key: 'media',     label: 'Media',       href: '/admin/media' },
  ]},
  { section: 'Community', items: [
    { key: 'subscribers',  label: 'Subscribers' },
    { key: 'pitches',      label: 'Pitches' },
  ]},
  { section: 'Plans', items: [
    { key: 'plan-circle', label: "Reader's Circle" },
    { key: 'plan-press',  label: 'Printing Press' },
  ]},
  { section: 'Finance', items: [
    { key: 'invoices',  label: 'Invoices' },
  ]},
  { section: 'Social', items: [
    { key: 'social',    label: 'Scheduled Posts' },
  ]},
  { section: 'Settings', items: [
    { key: 'roles',       label: 'Roles & Permissions' },
    { key: 'analytics',   label: 'Analytics' },
    { key: 'publication', label: 'Publication Settings' },
  ]},
]

function Sidebar({ active, setActive, onSignOut }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
      background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 50,
      fontFamily: ff,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ fontFamily: ffH, fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.01em' }}>
          The Parlor
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: PINK, marginTop: '4px' }}>
          Admin
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0' }}>
        {NAV.map(({ section, items }) => (
          <div key={section || '_root'} style={{ marginBottom: '2px' }}>
            {section && (
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', padding: '12px 20px 5px', fontFamily: ff }}>
                {section}
              </div>
            )}
            {items.map(item => {
              const isActive = active === item.key
              const inner = (
                <div
                  onClick={() => !item.href && setActive(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 20px', fontSize: '13px', cursor: 'pointer',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'rgba(242,184,198,0.1)' : 'transparent',
                    borderLeft: isActive ? `2px solid ${PINK}` : '2px solid transparent',
                    transition: 'color 0.12s, background 0.12s',
                    userSelect: 'none', textDecoration: 'none', fontFamily: ff,
                  }}
                >
                  <span>{item.label}</span>
                  {item.href && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>↗</span>}
                </div>
              )
              if (item.href) {
                return <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>{inner}</Link>
              }
              return <div key={item.key}>{inner}</div>
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button
          onClick={onSignOut}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: ff, padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Activity feed icons (inline SVG) ─────────────────────────
function FeedIcon({ type }) {
  const iconStyle = { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  const icons = {
    article:    { bg: 'rgba(196,54,74,0.1)',   el: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={DARK_PINK} strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="7.5" x2="10" y2="7.5"/><line x1="4" y1="10" x2="7" y2="10"/></svg> },
    subscriber: { bg: 'rgba(110,201,154,0.15)', el: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#2d8f5a" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-4 10-4 10 0"/></svg> },
    invoice:    { bg: 'rgba(212,132,74,0.12)',  el: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#d4844a" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="8" x2="8" y2="8"/></svg> },
    pitch:      { bg: 'rgba(160,180,242,0.15)', el: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#4a6fd4" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="12" height="9" rx="1"/><path d="M1 5l6 4 6-4"/></svg> },
    scheduled:  { bg: 'rgba(138,74,212,0.1)',   el: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8a4ad4" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="12" height="11" rx="1"/><line x1="4" y1="1" x2="4" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="1" y1="6" x2="13" y2="6"/></svg> },
  }
  const { bg, el } = icons[type] || icons.article
  return <div style={{ ...iconStyle, background: bg }}>{el}</div>
}

// ── Dashboard Home ────────────────────────────────────────────
function DashboardHome({ supabase, setActiveSection }) {
  const [subExpanded, setSubExpanded] = useState(false)
  const [pvStats, setPvStats] = useState({ pageViews: null, sessions: null, topPath: null, topSource: null })
  const [data, setData] = useState({
    recentArticles: [], scheduledArticles: [],
    allMembers: [], invoices: [], pitches: [],
    loaded: false,
  })

  useEffect(() => {
    let cancelled = false
    const now     = new Date().toISOString()
    const today   = now.slice(0, 10)

    Promise.allSettled([
      supabase.from('articles').select('id,title,author_name,published_at,scheduled_at,published,slug').order('published_at', { ascending: false }),
      supabase.from('members').select('id,role,joined_at,plan,status,email,name,onboarding_sent,onboarding_sent_at').order('joined_at', { ascending: false }),
      supabase.from('invoices').select('id,status,amount,created_at').order('created_at', { ascending: false }),
      supabase.from('pitches').select('id,title,author_name,created_at,status').order('created_at', { ascending: false }),
      supabase.from('page_views').select('page_path,visitor_id,referrer,created_at').gte('created_at', today + 'T00:00:00').order('created_at', { ascending: false }).limit(2000),
    ]).then(([artRes, memRes, invRes, pitchRes, pvRes]) => {
      if (cancelled) return
      const articles = artRes.status === 'fulfilled'  ? (artRes.value.data  || []) : []
      const members  = memRes.status === 'fulfilled'  ? (memRes.value.data  || []) : []
      const invoices = invRes.status === 'fulfilled'  ? (invRes.value.data  || []) : []
      const pitches  = pitchRes.status === 'fulfilled'? (pitchRes.value.data|| []) : []
      const pv       = pvRes.status === 'fulfilled'   ? (pvRes.value.data   || []) : []

      setData({
        recentArticles: articles.filter(a => a.published).slice(0, 8),
        scheduledArticles: articles.filter(a => !a.published && a.scheduled_at && a.scheduled_at > now).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).slice(0, 5),
        allMembers: members,
        invoices,
        pitches,
        loaded: true,
      })

      // Analytics strip
      if (pv.length) {
        const fiveMinAgo = new Date(Date.now() - 300000).toISOString()
        const sessions   = pv.filter(v => v.created_at > fiveMinAgo).length
        const pathCounts = {}
        pv.forEach(v => { if (v.page_path) pathCounts[v.page_path] = (pathCounts[v.page_path] || 0) + 1 })
        const topPath   = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
        const refCounts = {}
        pv.forEach(v => { if (v.referrer) { try { const h = new URL(v.referrer).hostname; refCounts[h] = (refCounts[h] || 0) + 1 } catch {} } })
        const topSource = Object.entries(refCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct'
        setPvStats({ pageViews: pv.length, sessions, topPath, topSource })
      }
    })
    return () => { cancelled = true }
  }, [])

  const subscribers  = data.allMembers.filter(m => !m.role || !TEAM_ROLES.includes(m.role))
  const weekAgo      = new Date(Date.now() - 7 * 86400000).toISOString()
  const newThisWeek  = subscribers.filter(m => m.joined_at > weekAgo).length
  const circleCount  = subscribers.filter(m => ["Reader's Circle",'readers_circle','circle'].includes(m.plan)).length
  const pressCount   = subscribers.filter(m => ['Printing Press','printing_press','press','print'].includes(m.plan)).length
  const freeCount    = subscribers.filter(m => !m.plan || m.plan === 'free').length
  const onboarding   = subscribers.filter(m => m.onboarding_sent || m.onboarding_sent_at).length

  // ── Build unified activity feed ──
  const feed = []
  data.recentArticles.forEach(a => feed.push({
    type: 'article', icon: 'article',
    text: `Article published: ${a.title || 'Untitled'}`,
    meta: a.author_name,
    date: a.published_at,
    href: `/admin/articles/${a.id}/edit`,
  }))
  data.scheduledArticles.forEach(a => feed.push({
    type: 'scheduled', icon: 'scheduled',
    text: `Article scheduled: ${a.title || 'Untitled'}`,
    meta: `for ${fmtDate(a.scheduled_at)}`,
    date: a.scheduled_at,
    href: `/admin/articles/${a.id}/edit`,
  }))
  data.allMembers.slice(0, 8).forEach(m => feed.push({
    type: 'subscriber', icon: 'subscriber',
    text: `New subscriber: ${m.email || m.name || m.id.slice(0, 12)}`,
    meta: m.plan || 'free',
    date: m.joined_at,
  }))
  data.invoices.slice(0, 5).forEach(inv => feed.push({
    type: 'invoice', icon: 'invoice',
    text: `Invoice ${inv.status === 'paid' ? 'paid' : 'created'}${inv.amount ? `: $${inv.amount}` : ''}`,
    meta: inv.status,
    date: inv.created_at,
  }))
  data.pitches.slice(0, 5).forEach(p => feed.push({
    type: 'pitch', icon: 'pitch',
    text: `New pitch received${p.title ? `: ${p.title}` : ''}`,
    meta: p.author_name || '',
    date: p.created_at,
  }))
  feed.sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: 0, letterSpacing: '-0.01em' }}>Dashboard</h1>
        <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontFamily: ff }}>Live overview</div>
      </div>

      {/* ── 1. Subscriber Overview (collapsible) ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', marginBottom: '14px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setSubExpanded(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: ff }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontFamily: ffH, fontSize: '20px', fontWeight: '700', color: '#0a0a0a' }}>{subscribers.length}</span>
            <span style={{ fontSize: '13px', color: '#888' }}>Total Subscribers</span>
            {newThisWeek > 0 && <span style={{ fontSize: '11px', background: 'rgba(110,201,154,0.12)', color: '#2d8f5a', padding: '2px 8px', borderRadius: '20px', fontFamily: ff }}>+{newThisWeek} this week</span>}
          </div>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.2s', transform: subExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
            <path d="M1 1l4 4 4-4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {subExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: '1px solid #f5f5f5' }}>
            {[
              { label: 'Total',            value: subscribers.length },
              { label: 'New This Week',    value: newThisWeek, color: '#2d8f5a' },
              { label: "Reader's Circle",  value: circleCount, sub: '$10/mo', color: '#4a6fd4' },
              { label: 'Printing Press',   value: pressCount,  sub: '$25/mo', color: DARK_PINK },
              { label: 'Free',             value: freeCount },
              { label: 'Onboarding Sent',  value: onboarding },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '16px 14px', borderRight: i < 5 ? '1px solid #f5f5f5' : 'none' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color || '#0a0a0a', fontFamily: ffH, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', fontFamily: ff }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: '11px', color: s.color, marginTop: '2px', fontFamily: ff }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Analytics Strip ── */}
      <div style={{ display: 'flex', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', marginBottom: '24px', overflow: 'hidden' }}>
        {[
          { label: 'Active Sessions',   value: pvStats.sessions ?? '—', tag: pvStats.sessions !== null ? 'live' : null, tagColor: '#2d8f5a', tagBg: 'rgba(110,201,154,0.12)' },
          { label: 'Page Views Today',  value: pvStats.pageViews ?? '—' },
          { label: 'Top Article Today', value: pvStats.topPath ? pvStats.topPath.split('/').filter(Boolean).pop() || pvStats.topPath : '—' },
          { label: 'Top Traffic Source',value: pvStats.topSource || '—' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid #f5f5f5' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#0a0a0a', fontFamily: ffH, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</span>
              {s.tag && <span style={{ fontSize: '9px', background: s.tagBg, color: s.tagColor, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{s.tag}</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px', fontFamily: ff }}>{s.label}</div>
          </div>
        ))}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setActiveSection('analytics')} style={{ padding: '7px 14px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px', color: '#555', cursor: 'pointer', fontFamily: ff, whiteSpace: 'nowrap' }}>
            View Full Analytics →
          </button>
        </div>
      </div>

      {/* ── 3. Recent Activity Feed ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff }}>Recent Activity</span>
          <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff }}>All areas · chronological</span>
        </div>
        {!data.loaded ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : feed.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No recent activity yet.</div>
        ) : (
          <div>
            {feed.slice(0, 25).map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', borderBottom: i < Math.min(feed.length, 25) - 1 ? '1px solid #f9f9f9' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FeedIcon type={item.icon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#0a0a0a', fontFamily: ff, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.href
                      ? <Link href={item.href} style={{ color: '#0a0a0a', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = DARK_PINK} onMouseLeave={e => e.target.style.color = '#0a0a0a'}>{item.text}</Link>
                      : item.text
                    }
                  </div>
                  {item.meta && <div style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, marginTop: '1px' }}>{item.meta}</div>}
                </div>
                <span style={{ fontSize: '11px', color: '#ccc', fontFamily: ff, flexShrink: 0 }}>{timeAgo(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Roles & Permissions ───────────────────────────────────────

const ROLE_STYLES = {
  admin:         { color: '#c4364a', bg: 'rgba(196,54,74,0.1)' },
  editor:        { color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  writer:        { color: '#2d8f5a', bg: 'rgba(110,201,154,0.12)' },
  finance_admin: { color: '#d4844a', bg: 'rgba(242,196,110,0.12)' },
  social_admin:  { color: '#8a4ad4', bg: 'rgba(200,160,242,0.12)' },
}

const ACCESS_SECTIONS = ['Dashboard', 'Articles', 'Writers', 'Media', 'Subscribers', 'Invoices', 'Social Posts', 'Roles', 'Settings']

const ROLE_ACCESS_DEFAULTS = {
  admin:         ['Dashboard', 'Articles', 'Writers', 'Media', 'Subscribers', 'Invoices', 'Social Posts', 'Roles', 'Settings'],
  editor:        ['Articles', 'Writers', 'Media'],
  writer:        ['Articles'],
  finance_admin: ['Invoices'],
  social_admin:  ['Social Posts'],
}

function RoleBadge({ role }) {
  const s = ROLE_STYLES[role]
  const label = ROLE_OPTIONS.find(r => r.value === role)?.label || role
  if (!s) return null
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', fontFamily: ff, background: s.bg, color: s.color }}>{label}</span>
}

function AccessToggle({ enabled, onChange }) {
  return (
    <button type="button" onClick={onChange} style={{ width: '28px', height: '16px', borderRadius: '8px', background: enabled ? '#f2b8c6' : '#e0e0e0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '2px', left: enabled ? '14px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: enabled ? '#c4364a' : '#aaa', transition: 'left 0.15s' }} />
    </button>
  )
}

function RolesSection({ supabase }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityMap, setActivityMap] = useState({})
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [accessState, setAccessState] = useState({})   // { [id]: Set<string> }
  const [roleState, setRoleState] = useState({})        // { [id]: string } local role dropdowns
  const [showAdd, setShowAdd] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState([])
  const [addSearching, setAddSearching] = useState(false)
  const [addRoleState, setAddRoleState] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [deactivating, setDeactivating] = useState({})
  const [expanded, setExpanded] = useState({})

  // Load team members + activity
  useEffect(() => {
    supabase.from('members').select('*').order('joined_at', { ascending: false }).then(({ data }) => {
      const d = data || []
      setMembers(d)
      // Fetch emails for members missing them via service-role API route
      const missing = d.filter(m => !m.email)
      if (missing.length > 0) {
        fetch('/api/admin/user-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: missing.map(m => m.id) }),
        }).then(r => r.json()).then(({ emails }) => {
          if (emails) setMembers(prev => prev.map(m => ({ ...m, email: m.email || emails[m.id] || null })))
        }).catch(() => {})
      }
      const rs = {}, as = {}
      d.forEach(m => {
        rs[m.id] = m.role || ''
        const defaults = new Set(ROLE_ACCESS_DEFAULTS[m.role] || [])
        if (m.custom_access && typeof m.custom_access === 'object') {
          ACCESS_SECTIONS.forEach(s => { if (s in m.custom_access) { m.custom_access[s] ? defaults.add(s) : defaults.delete(s) } })
        }
        as[m.id] = defaults
      })
      setRoleState(rs)
      setAccessState(as)
      setLoading(false)
    })

    Promise.allSettled([
      supabase.from('activity_logs').select('user_id,action,description,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('articles').select('id,title,published_at,updated_at,user_id').order('updated_at', { ascending: false }).limit(100),
      supabase.from('writers').select('id,name,updated_at,user_id').order('updated_at', { ascending: false }).limit(50),
    ]).then(([logRes, artRes, writersRes]) => {
      const logs    = logRes.status === 'fulfilled'     ? (logRes.value.data || []) : []
      const articles = artRes.status === 'fulfilled'    ? (artRes.value.data || []) : []
      const writers  = writersRes.status === 'fulfilled' ? (writersRes.value.data || []) : []
      const map = {}
      logs.forEach(l => {
        if (!l.user_id) return
        if (!map[l.user_id]) map[l.user_id] = []
        map[l.user_id].push({ date: l.created_at, text: l.description || l.action || 'Action' })
      })
      articles.forEach(a => {
        if (!a.user_id) return
        if (!map[a.user_id]) map[a.user_id] = []
        map[a.user_id].push({ date: a.updated_at || a.published_at, text: `${a.published_at ? 'Published' : 'Updated'} article: ${a.title || 'Untitled'}` })
      })
      writers.forEach(w => {
        if (!w.user_id) return
        if (!map[w.user_id]) map[w.user_id] = []
        map[w.user_id].push({ date: w.updated_at, text: `Edited writer profile: ${w.name || ''}` })
      })
      Object.keys(map).forEach(id => { map[id].sort((a, b) => new Date(b.date) - new Date(a.date)); map[id] = map[id].slice(0, 5) })
      setActivityMap(map)
    })
  }, [])

  // Live search for add panel — queries members table by email/name
  useEffect(() => {
    if (!addSearch.trim()) { setAddResults([]); return }
    const timeout = setTimeout(async () => {
      setAddSearching(true)
      const q = addSearch.trim()
      const { data } = await supabase.from('members')
        .select('id,name,full_name,email,role,joined_at')
        .or(`email.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(10)
      setAddResults((data || []).filter(m => !m.role || !TEAM_ROLES.includes(m.role)))
      setAddSearching(false)
    }, 220)
    return () => clearTimeout(timeout)
  }, [addSearch])

  async function saveRole(id, role) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const newRole = role || null
    await supabase.from('members').update({ role: newRole }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m))
    setSaving(prev => ({ ...prev, [id]: false }))
    setSaved(prev => ({ ...prev, [id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
  }

  async function toggleDeactivate(id) {
    const m = members.find(m => m.id === id)
    const isInactive = m?.status === 'inactive' || m?.deactivated
    setDeactivating(prev => ({ ...prev, [id]: true }))
    const update = isInactive ? { status: 'active', deactivated: false } : { status: 'inactive', deactivated: true }
    await supabase.from('members').update(update).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...update } : m))
    setDeactivating(prev => ({ ...prev, [id]: false }))
  }

  async function toggleAccess(id, section) {
    setAccessState(prev => {
      const next = new Set(prev[id] || [])
      next.has(section) ? next.delete(section) : next.add(section)
      const customAccess = Object.fromEntries(ACCESS_SECTIONS.map(s => [s, next.has(s)]))
      supabase.from('members').update({ custom_access: customAccess }).eq('id', id).then(() => {})
      return { ...prev, [id]: next }
    })
  }

  const teamMembers = members.filter(m => m.role && TEAM_ROLES.includes(m.role))
  const q = search.toLowerCase()
  const filtered = teamMembers.filter(m => {
    const matchSearch = !q || (m.email || '').toLowerCase().includes(q) || (m.name || m.full_name || '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchRole
  })

  const inputStyle = { padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Roles & Permissions</h1>
        <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>Manage team access and assign roles to subscribers</div>
      </div>

      {/* ── Top bar: search + add ── */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search team by name or email…"
          style={{ ...inputStyle, width: '280px' }}
        />
        <button
          onClick={() => { setShowAdd(v => !v); setAddSearch(''); setAddResults([]) }}
          style={{ padding: '8px 16px', background: showAdd ? '#0a0a0a' : PINK, border: 'none', borderRadius: '6px', color: showAdd ? '#fff' : '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff, flexShrink: 0 }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Member'}
        </button>
      </div>

      {/* ── Add member panel ── */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', fontFamily: ff, marginBottom: '10px' }}>Search subscribers by name or email to assign a role:</div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ ...inputStyle, width: '280px' }}
              autoFocus
            />
            {addSearching && <span style={{ fontSize: '12px', color: '#aaa', fontFamily: ff, alignSelf: 'center' }}>Searching…</span>}
          </div>
          {addResults.length === 0 && addSearch && !addSearching && (
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No subscribers found.</div>
          )}
          {addResults.map((m, i) => {
            const name = m.name || m.full_name || null
            const email = m.email || null
            const pending = addRoleState[m.id] || ''
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0e8e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ffH, fontSize: '12px', fontWeight: '700', color: DARK_PINK, flexShrink: 0 }}>
                  {(name || email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>{name || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{email || m.id.slice(0, 20) + '…'}</div>
                </div>
                <select value={pending} onChange={e => setAddRoleState(prev => ({ ...prev, [m.id]: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button
                  onClick={() => {
                    if (!pending) return
                    saveRole(m.id, pending)
                    setAddRoleState(prev => ({ ...prev, [m.id]: '' }))
                    setAddResults(prev => prev.filter(r => r.id !== m.id))
                    if (addResults.length <= 1) { setShowAdd(false); setAddSearch('') }
                  }}
                  disabled={!pending || !!saving[m.id]}
                  style={{ padding: '7px 16px', background: pending ? PINK : '#f5f5f5', border: `1px solid ${pending ? 'rgba(242,184,198,0.4)' : '#e0e0e0'}`, borderRadius: '6px', color: pending ? '#0a0a0a' : '#ccc', fontSize: '12px', fontWeight: '600', cursor: pending ? 'pointer' : 'not-allowed', fontFamily: ff, flexShrink: 0 }}
                >
                  {saving[m.id] ? '…' : saved[m.id] ? 'Added ✓' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Role filter chips ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All' }, ...ROLE_OPTIONS.filter(r => r.value)].map(r => {
          const active = roleFilter === (r.key || r.value)
          const rs = ROLE_STYLES[r.value]
          return (
            <button
              key={r.key || r.value}
              onClick={() => setRoleFilter(r.key || r.value)}
              style={{
                padding: '5px 14px', border: `1px solid ${active && rs ? rs.color : active ? '#0a0a0a' : '#e0e0e0'}`,
                borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontFamily: ff,
                background: active && rs ? rs.bg : active ? '#0a0a0a' : '#fff',
                color: active && rs ? rs.color : active ? '#fff' : '#888',
                transition: 'all 0.12s',
              }}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {/* ── Team list ── */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>
          {teamMembers.length === 0 ? 'No team members yet. Use "+ Add Member" above.' : 'No team members match your search.'}
        </div>
      ) : filtered.map(m => {
        const displayName  = m.name || m.full_name || m.display_name || null
        const displayEmail = m.email || null
        const isInactive   = m.status === 'inactive' || m.deactivated
        const activity     = activityMap[m.id] || []
        const lastLogin    = m.last_active || m.last_login || m.last_sign_in_at
        const access       = accessState[m.id] || new Set()
        const currentRole  = roleState[m.id] ?? (m.role || '')
        const roleDirty    = currentRole !== (m.role || '')

        return (
          <div key={m.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden', opacity: isInactive ? 0.6 : 1 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0e8e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ffH, fontSize: '14px', fontWeight: '700', color: DARK_PINK, flexShrink: 0 }}>
                {(displayName || displayEmail || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a' }}>{displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}</span>
                  {isInactive && <span style={{ fontSize: '10px', color: '#c04040', background: 'rgba(224,112,112,0.1)', padding: '1px 6px', borderRadius: '3px', fontFamily: ff }}>Inactive</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '1px', fontFamily: ff }}>{displayEmail || m.id.slice(0, 24) + '…'}</div>
              </div>
              {/* Role dropdown */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={currentRole}
                  onChange={e => setRoleState(prev => ({ ...prev, [m.id]: e.target.value }))}
                  style={{ padding: '6px 10px', background: '#fff', border: `1px solid ${roleDirty ? DARK_PINK : '#e0e0e0'}`, borderRadius: '6px', fontSize: '12px', fontFamily: ff, color: '#0a0a0a', outline: 'none', cursor: 'pointer' }}
                >
                  {ROLE_OPTIONS.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {roleDirty && (
                  <button onClick={() => saveRole(m.id, currentRole)} disabled={!!saving[m.id]} style={{ padding: '6px 12px', background: PINK, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
                    {saving[m.id] ? '…' : saved[m.id] ? '✓' : 'Save'}
                  </button>
                )}
              </div>
              {/* Deactivate */}
              <button onClick={() => toggleDeactivate(m.id)} disabled={!!deactivating[m.id]} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${isInactive ? 'rgba(110,201,154,0.3)' : 'rgba(224,112,112,0.2)'}`, borderRadius: '6px', color: isInactive ? '#2d8f5a' : '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff, flexShrink: 0 }}>
                {deactivating[m.id] ? '…' : isInactive ? 'Reactivate' : 'Deactivate'}
              </button>
              {/* Remove role */}
              <button onClick={() => { if (window.confirm('Remove role? They will become a regular subscriber.')) saveRole(m.id, '') }} style={{ padding: '6px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '6px', color: '#aaa', fontSize: '12px', cursor: 'pointer', fontFamily: ff, flexShrink: 0 }}>
                Remove role
              </button>
            </div>

            {/* Collapse toggle bar */}
            <button
              type="button"
              onClick={() => setExpanded(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 16px', background: '#fafafa', border: 'none', borderTop: '1px solid #f5f5f5', cursor: 'pointer', fontFamily: ff, textAlign: 'left' }}
            >
              <div style={{ display: 'flex', gap: '24px' }}>
                <span style={{ fontSize: '12px', color: '#aaa' }}>{access.size}/{ACCESS_SECTIONS.length} permissions enabled</span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>Last login: {lastLogin ? timeAgo(lastLogin) : '—'}</span>
              </div>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.2s', transform: expanded[m.id] ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                <path d="M1 1l4 4 4-4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Body: access toggles + activity (collapsible) */}
            {expanded[m.id] && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: '1px solid #f5f5f5' }}>
              {/* Access toggles */}
              <div style={{ padding: '14px 16px', borderRight: '1px solid #f5f5f5' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>Access Permissions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ACCESS_SECTIONS.map(section => (
                    <label key={section} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <AccessToggle enabled={access.has(section)} onChange={() => toggleAccess(m.id, section)} />
                      <span style={{ fontSize: '12px', color: access.has(section) ? '#0a0a0a' : '#bbb', fontFamily: ff, transition: 'color 0.15s' }}>{section}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '10px' }}>Last Activity</div>
                <div style={{ fontSize: '12px', color: '#888', fontFamily: ff, marginBottom: '8px' }}>
                  Last login: <span style={{ color: '#555' }}>{lastLogin ? fmtDate(lastLogin) + ' · ' + timeAgo(lastLogin) : '—'}</span>
                </div>
                {activity.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No activity recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activity.map((act, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#555', fontFamily: ff, flex: 1 }}>{act.text}</span>
                        <span style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, flexShrink: 0 }}>{timeAgo(act.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Coming soon ───────────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div>
      <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{title}</h1>
      <div style={{ marginTop: '48px', textAlign: 'center', padding: '64px 0', border: '1px dashed #e0e0e0', borderRadius: '12px', color: '#ccc', fontFamily: ff, fontSize: '13px' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.25 }}>◌</div>
        This section is coming soon.
      </div>
    </div>
  )
}

// ── Content router ────────────────────────────────────────────
function MainContent({ section, supabase, setActiveSection }) {
  switch (section) {
    case 'dashboard':    return <DashboardHome supabase={supabase} setActiveSection={setActiveSection} />
    case 'subscribers':  return <SubscribersSection supabase={supabase} />
    case 'roles':        return <RolesSection supabase={supabase} />
    case 'analytics':    return <AnalyticsSection supabase={supabase} />
    case 'plan-circle':  return <PlansSection supabase={supabase} plan="circle" />
    case 'plan-press':   return <PlansSection supabase={supabase} plan="press" />
    case 'pitches':      return <ComingSoon title="Pitches" />
    case 'invoices':     return <ComingSoon title="Invoices" />
    case 'social':       return <ComingSoon title="Scheduled Posts" />
    case 'publication':  return <ComingSoon title="Publication Settings" />
    default:             return <DashboardHome supabase={supabase} setActiveSection={setActiveSection} />
  }
}

// ── Main ──────────────────────────────────────────────────────
export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function checkAdmin() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }
      const { data: member, error } = await supabase.from('members').select('role').eq('id', user.id).single()
      if (cancelled) return
      if (error || member?.role !== 'admin') { router.push('/dashboard'); return }
      setLoading(false)
    }
    checkAdmin()
    return () => { cancelled = true }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: ff, fontSize: '14px' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: ff }}>
      <Sidebar active={activeSection} setActive={setActiveSection} onSignOut={handleSignOut} />
      <main style={{ marginLeft: '220px', minHeight: '100vh', padding: '40px 48px', color: '#0a0a0a' }}>
        <MainContent section={activeSection} supabase={supabase} setActiveSection={setActiveSection} />
      </main>
    </div>
  )
}
