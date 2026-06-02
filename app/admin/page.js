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

// ── Roles & Permissions (merged with Team) ────────────────────

const ROLE_STYLES = {
  admin:         { color: '#c4364a', bg: 'rgba(196,54,74,0.1)' },
  editor:        { color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  writer:        { color: '#2d8f5a', bg: 'rgba(110,201,154,0.12)' },
  finance_admin: { color: '#d4844a', bg: 'rgba(242,196,110,0.12)' },
  social_admin:  { color: '#8a4ad4', bg: 'rgba(200,160,242,0.12)' },
}

const ROLE_ACCESS = {
  admin:         ['Dashboard', 'Articles', 'Writers', 'Media', 'Subscribers', 'Invoices', 'Social', 'Settings'],
  editor:        ['Articles', 'Writers', 'Media'],
  writer:        ['Writer Dashboard'],
  finance_admin: ['Invoices'],
  social_admin:  ['Scheduled Posts'],
}

function RoleBadge({ role }) {
  const s = ROLE_STYLES[role]
  const label = ROLE_OPTIONS.find(r => r.value === role)?.label || role
  if (!s) return null
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', fontFamily: ff, background: s.bg, color: s.color }}>{label}</span>
}

function RolesSection({ supabase }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityMap, setActivityMap] = useState({})  // { [memberId]: { lastLogin, actions: [] } }
  const [search, setSearch] = useState('')
  const [addRoles, setAddRoles] = useState({})        // pending role selections in "Add" section
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [deactivating, setDeactivating] = useState({})

  useEffect(() => {
    supabase.from('members').select('*').order('joined_at', { ascending: false }).then(({ data }) => {
      setMembers(data || [])
      setLoading(false)
    })

    // Load activity: try activity_logs, synthesize from articles as fallback
    Promise.allSettled([
      supabase.from('activity_logs').select('user_id,action,target,description,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('articles').select('id,title,published_at,updated_at,author_name,user_id').order('updated_at', { ascending: false }).limit(100),
      supabase.from('writers').select('id,name,updated_at,user_id').order('updated_at', { ascending: false }).limit(50),
    ]).then(([logRes, artRes, writersRes]) => {
      const logs    = logRes.status === 'fulfilled'     ? (logRes.value.data || [])     : []
      const articles = artRes.status === 'fulfilled'    ? (artRes.value.data || [])     : []
      const writers  = writersRes.status === 'fulfilled' ? (writersRes.value.data || []) : []

      // Build activity map keyed by user_id / member id
      const map = {}

      // From explicit activity log
      logs.forEach(l => {
        if (!l.user_id) return
        if (!map[l.user_id]) map[l.user_id] = { lastLogin: null, actions: [] }
        map[l.user_id].actions.push({ date: l.created_at, text: l.description || l.action || 'Action' })
      })

      // Synthesize from articles (match by user_id if available)
      articles.forEach(a => {
        const uid = a.user_id
        if (!uid) return
        if (!map[uid]) map[uid] = { lastLogin: null, actions: [] }
        const verb = a.published_at ? 'Published article' : 'Updated article'
        map[uid].actions.push({ date: a.updated_at || a.published_at, text: `${verb}: ${a.title || 'Untitled'}` })
      })

      // Synthesize from writers
      writers.forEach(w => {
        const uid = w.user_id
        if (!uid) return
        if (!map[uid]) map[uid] = { lastLogin: null, actions: [] }
        map[uid].actions.push({ date: w.updated_at, text: `Updated writer profile: ${w.name || ''}` })
      })

      // Sort each member's actions by date desc, keep 3
      Object.keys(map).forEach(id => {
        map[id].actions.sort((a, b) => new Date(b.date) - new Date(a.date))
        map[id].actions = map[id].actions.slice(0, 3)
      })

      setActivityMap(map)
    })
  }, [])

  async function saveRole(id, role) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await supabase.from('members').update({ role: role || null }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: role || null } : m))
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

  const teamMembers = members.filter(m => m.role && TEAM_ROLES.includes(m.role))
  const subscribers = members.filter(m => !m.role || !TEAM_ROLES.includes(m.role))
  const q = search.toLowerCase()
  const filteredSubs = q ? subscribers.filter(m =>
    (m.email || '').toLowerCase().includes(q) ||
    (m.name || m.full_name || '').toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q)
  ) : []

  const sectionLabel = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#aaa', fontFamily: ff, marginBottom: '14px', display: 'block' }
  const tdStyle = { padding: '14px 16px', fontFamily: ff, verticalAlign: 'top' }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Roles & Permissions</h1>
        <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>Manage team access and assign roles to subscribers</div>
      </div>

      {/* ── Current Team ── */}
      <span style={sectionLabel}>Current Team ({loading ? '…' : teamMembers.length})</span>
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden', marginBottom: '40px' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : teamMembers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No team members yet. Use "Add Team Member" below.</div>
        ) : teamMembers.map((m, i) => {
          const displayName  = m.name || m.full_name || m.display_name || null
          const displayEmail = m.email || null
          const isInactive   = m.status === 'inactive' || m.deactivated
          const activity     = activityMap[m.id]
          const lastLogin    = m.last_active || m.last_login || m.last_sign_in_at
          const access       = ROLE_ACCESS[m.role] || []
          return (
            <div key={m.id} style={{ borderBottom: i === teamMembers.length - 1 ? 'none' : '1px solid #f5f5f5', padding: '16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', opacity: isInactive ? 0.55 : 1 }}>
              {/* Left: identity + role + access + activity */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0e8e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ffH, fontSize: '13px', fontWeight: '700', color: DARK_PINK, flexShrink: 0 }}>
                    {(displayName || displayEmail || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}
                      {isInactive && <span style={{ fontSize: '10px', color: '#c04040', background: 'rgba(224,112,112,0.1)', padding: '1px 6px', borderRadius: '3px' }}>Inactive</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{displayEmail || m.id.slice(0, 20) + '…'}</div>
                  </div>
                  <RoleBadge role={m.role} />
                </div>

                {/* Access chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {access.map(a => (
                    <span key={a} style={{ display: 'inline-block', padding: '2px 7px', background: '#f5f5f5', borderRadius: '3px', fontSize: '11px', color: '#666', fontFamily: ff }}>{a}</span>
                  ))}
                </div>

                {/* Activity summary */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>
                    Last login: {lastLogin ? timeAgo(lastLogin) : '—'}
                  </span>
                  {activity?.actions?.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {activity.actions.map((act, j) => (
                        <span key={j} style={{ fontSize: '11px', color: '#bbb', fontFamily: ff }}>
                          {act.text}
                          <span style={{ color: '#ddd', marginLeft: '4px' }}>· {timeAgo(act.date)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={() => toggleDeactivate(m.id)}
                  disabled={!!deactivating[m.id]}
                  style={{ padding: '5px 12px', background: 'none', border: `1px solid ${isInactive ? 'rgba(110,201,154,0.3)' : 'rgba(224,112,112,0.2)'}`, borderRadius: '5px', color: isInactive ? '#2d8f5a' : '#c04040', fontSize: '11px', cursor: 'pointer', fontFamily: ff }}
                >
                  {deactivating[m.id] ? '…' : isInactive ? 'Reactivate' : 'Deactivate'}
                </button>
                <button
                  onClick={() => { if (window.confirm('Remove this member\'s role? They will become a regular subscriber.')) saveRole(m.id, '') }}
                  disabled={!!saving[m.id]}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '5px', color: '#aaa', fontSize: '11px', cursor: 'pointer', fontFamily: ff }}
                >
                  {saved[m.id] ? 'Removed ✓' : saving[m.id] ? '…' : 'Remove role'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add Team Member ── */}
      <span style={sectionLabel}>Add Team Member</span>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search subscribers by name, email, or ID…"
        style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', width: '320px', marginBottom: '12px', boxSizing: 'border-box' }}
      />
      {!q && (
        <div style={{ fontSize: '12px', color: '#ccc', fontFamily: ff, fontStyle: 'italic', marginBottom: '12px' }}>
          Type to search subscribers and assign them a role.
        </div>
      )}
      {q && filteredSubs.length === 0 && (
        <div style={{ fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic', padding: '16px 0' }}>No subscribers found.</div>
      )}
      {filteredSubs.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
          {filteredSubs.slice(0, 10).map((m, i) => {
            const displayName  = m.name || m.full_name || null
            const displayEmail = m.email || null
            const pendingRole  = addRoles[m.id] || ''
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i === Math.min(filteredSubs.length, 10) - 1 ? 'none' : '1px solid #f5f5f5' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>
                    {displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{displayEmail || m.id.slice(0, 20) + '…'}</div>
                </div>
                <select
                  value={pendingRole}
                  onChange={e => setAddRoles(prev => ({ ...prev, [m.id]: e.target.value }))}
                  style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px', fontFamily: ff, color: '#0a0a0a', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button
                  onClick={() => { if (pendingRole) { saveRole(m.id, pendingRole); setAddRoles(prev => ({ ...prev, [m.id]: '' })); setSearch('') } }}
                  disabled={!pendingRole || !!saving[m.id]}
                  style={{ padding: '6px 16px', background: pendingRole ? PINK : '#f5f5f5', border: `1px solid ${pendingRole ? 'rgba(242,184,198,0.4)' : '#e0e0e0'}`, borderRadius: '6px', color: pendingRole ? '#0a0a0a' : '#ccc', fontSize: '12px', fontWeight: '600', cursor: pendingRole ? 'pointer' : 'not-allowed', fontFamily: ff }}
                >
                  {saving[m.id] ? '…' : saved[m.id] ? 'Added ✓' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
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
