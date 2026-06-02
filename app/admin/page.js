'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubscribersSection from './_components/SubscribersSection'

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
    { key: 'subscribers', label: 'Subscribers' },
    { key: 'pitches',     label: 'Pitches' },
  ]},
  { section: 'Finance', items: [
    { key: 'invoices',  label: 'Invoices' },
  ]},
  { section: 'Social', items: [
    { key: 'social',    label: 'Scheduled Posts' },
  ]},
  { section: 'Settings', items: [
    { key: 'roles',       label: 'Roles & Permissions' },
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

// ── Widget (light theme) ──────────────────────────────────────
function Widget({ title, action, children, span }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px',
      overflow: 'hidden', gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  )
}

function EmptyRow({ text }) {
  return <div style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic', fontFamily: ff, padding: '6px 0' }}>{text}</div>
}

// ── Dashboard Home ────────────────────────────────────────────
function DashboardHome({ supabase }) {
  const [data, setData] = useState({
    recentArticles: [], scheduledArticles: [],
    allMembers: [], subActivity: [],
    invoices: [], socialPosts: [],
    loaded: false,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const now = new Date().toISOString()
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      const [artRes, membersRes, activityRes, invRes, socialRes] = await Promise.allSettled([
        supabase.from('articles').select('id,title,author_name,published_at,scheduled_at,published').order('published_at', { ascending: false }),
        supabase.from('members').select('id,role,joined_at,plan,status,email,name,onboarding_sent,onboarding_sent_at').order('joined_at', { ascending: false }),
        supabase.from('member_events').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('invoices').select('id,status,amount,created_at').order('created_at', { ascending: false }),
        supabase.from('social_posts').select('id,scheduled_at,status,content').order('scheduled_at', { ascending: false }),
      ])

      if (cancelled) return

      const articles = artRes.status === 'fulfilled' ? (artRes.value.data || []) : []
      const members  = membersRes.status === 'fulfilled' ? (membersRes.value.data || []) : []
      const events   = activityRes.status === 'fulfilled' ? (activityRes.value.data || []) : []
      const invoices = invRes.status === 'fulfilled' ? (invRes.value.data || []) : []
      const socialPosts = socialRes.status === 'fulfilled' ? (socialRes.value.data || []) : []

      // Build subscriber activity feed: use real events if available, else synthesize from recent joins
      const activityFeed = events.length > 0
        ? events.map(e => ({
            id: e.id,
            date: e.created_at,
            label: e.event_type || e.type || 'Event',
            detail: e.detail || e.description || '',
          }))
        : members.slice(0, 8).map(m => ({
            id: m.id,
            date: m.joined_at,
            label: 'Subscribed',
            detail: (m.plan && m.plan !== 'free') ? `${m.plan.charAt(0).toUpperCase() + m.plan.slice(1)} plan` : 'Free plan',
          }))

      setData({
        recentArticles: articles.filter(a => a.published).slice(0, 5),
        scheduledArticles: articles.filter(a => !a.published && a.scheduled_at && a.scheduled_at > now).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).slice(0, 5),
        allMembers: members,
        subActivity: activityFeed,
        invoices,
        socialPosts,
        loaded: true,
      })
    }
    load()
    return () => { cancelled = true }
  }, [])

  const subscribers = data.allMembers.filter(m => !m.role || !TEAM_ROLES.includes(m.role))
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const newThisWeek = subscribers.filter(m => m.joined_at > weekAgo).length
  const paid = subscribers.filter(m => m.plan === 'paid' || m.plan === 'print').length
  const free = subscribers.filter(m => !m.plan || m.plan === 'free').length
  const onboardingSent = data.allMembers.filter(m => m.onboarding_sent || m.onboarding_sent_at).length

  const rowS = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', gap: '8px', fontFamily: ff }
  const titleS = { fontSize: '13px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }
  const metaS  = { fontSize: '11px', color: '#aaa', flexShrink: 0 }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: 0, letterSpacing: '-0.01em' }}>Dashboard</h1>
        <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontFamily: ff }}>Live overview</div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Subscribers', value: subscribers.length },
          { label: 'New This Week',     value: newThisWeek, accent: DARK_PINK },
          { label: 'Paid',              value: paid, accent: '#2d8f5a' },
          { label: 'Free',              value: free },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.accent || '#0a0a0a', fontFamily: ffH, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px', fontFamily: ff, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Onboarding Email Sent', value: onboardingSent },
          { label: 'Pending Invoices', value: data.invoices.filter(i => i.status !== 'paid').length },
          { label: 'Scheduled Posts', value: data.socialPosts.filter(p => p.status !== 'sent').length },
          { label: 'Team Members', value: data.allMembers.filter(m => m.role && TEAM_ROLES.includes(m.role)).length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a0a0a', fontFamily: ffH }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Subscriber Activity */}
        <Widget title="Subscriber Activity">
          {data.subActivity.length === 0 && <EmptyRow text="No recent activity." />}
          {data.subActivity.map((ev, i) => (
            <div key={ev.id || i} style={{ ...rowS }}>
              <span style={titleS}>
                <span style={{ color: '#888', marginRight: '4px' }}>{ev.detail || 'Subscriber'}</span>
                {' '}
                <span style={{ color: DARK_PINK }}>{ev.label}</span>
              </span>
              <span style={metaS}>{timeAgo(ev.date)}</span>
            </div>
          ))}
        </Widget>

        {/* Recent articles */}
        <Widget
          title="Recently Published"
          action={<Link href="/admin/articles" style={{ fontSize: '11px', color: DARK_PINK, textDecoration: 'none' }}>View all →</Link>}
        >
          {data.recentArticles.length === 0 && <EmptyRow text="No published articles yet." />}
          {data.recentArticles.map(a => (
            <div key={a.id} style={{ ...rowS }}>
              <span style={titleS}>{a.title || 'Untitled'}</span>
              <span style={metaS}>{a.author_name || '—'}</span>
              <span style={{ ...metaS, minWidth: '72px', textAlign: 'right' }}>{fmtDate(a.published_at)}</span>
            </div>
          ))}
        </Widget>

        {/* Scheduled */}
        <Widget
          title="Scheduled Articles"
          action={<Link href="/admin/articles" style={{ fontSize: '11px', color: DARK_PINK, textDecoration: 'none' }}>Manage →</Link>}
        >
          {data.scheduledArticles.length === 0 && <EmptyRow text="No articles scheduled." />}
          {data.scheduledArticles.map(a => (
            <div key={a.id} style={{ ...rowS }}>
              <span style={titleS}>{a.title || 'Untitled'}</span>
              <span style={{ ...metaS, color: '#4a6fd4', minWidth: '130px', textAlign: 'right' }}>{fmtDateTime(a.scheduled_at)}</span>
            </div>
          ))}
        </Widget>

        {/* Invoices */}
        <Widget title="Invoices">
          {data.invoices.length === 0 ? <EmptyRow text="No invoices on record." /> : (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {[{ label: 'Paid', val: data.invoices.filter(i => i.status === 'paid').length, color: '#2d8f5a' },
                  { label: 'Pending', val: data.invoices.filter(i => i.status !== 'paid').length, color: '#d4844a' }].map(s => (
                  <div key={s.label} style={{ flex: 1, background: '#f9f9f9', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: s.color, fontFamily: ffH }}>{s.val}</div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px', fontFamily: ff }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Widget>
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

  // Load team members + activity
  useEffect(() => {
    supabase.from('members').select('*').order('joined_at', { ascending: false }).then(({ data }) => {
      const d = data || []
      setMembers(d)
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

            {/* Body: access toggles + activity */}
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
function MainContent({ section, supabase }) {
  switch (section) {
    case 'dashboard':   return <DashboardHome supabase={supabase} />
    case 'subscribers': return <SubscribersSection supabase={supabase} />
    case 'roles':       return <RolesSection supabase={supabase} />
    case 'pitches':     return <ComingSoon title="Pitches" />
    case 'invoices':    return <ComingSoon title="Invoices" />
    case 'social':      return <ComingSoon title="Scheduled Posts" />
    case 'publication': return <ComingSoon title="Publication Settings" />
    default:            return <DashboardHome supabase={supabase} />
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
        <MainContent section={activeSection} supabase={supabase} />
      </main>
    </div>
  )
}
