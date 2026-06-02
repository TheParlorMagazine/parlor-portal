'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubscribersSection from './_components/SubscribersSection'
import TeamSection from './_components/TeamSection'

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
    { key: 'team',        label: 'Team' },
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
        supabase.from('members').select('id,role,created_at,plan,status,email,name,onboarding_sent,onboarding_sent_at').order('created_at', { ascending: false }),
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
            date: m.created_at,
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
  const newThisWeek = subscribers.filter(m => m.created_at > weekAgo).length
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
function RolesSection({ supabase }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [localRoles, setLocalRoles] = useState({})

  useEffect(() => {
    supabase.from('members').select('id,role,created_at,email,name,full_name,plan').order('created_at', { ascending: false }).then(({ data }) => {
      setMembers(data || [])
      const init = {}
      ;(data || []).forEach(m => { init[m.id] = m.role || '' })
      setLocalRoles(init)
      setLoading(false)
    })
  }, [])

  async function saveRole(id) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const role = localRoles[id] || null
    await supabase.from('members').update({ role }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    setSaving(prev => ({ ...prev, [id]: false }))
    setSaved(prev => ({ ...prev, [id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return !q || (m.email || '').toLowerCase().includes(q) || (m.name || m.full_name || '').toLowerCase().includes(q) || m.id.includes(q)
  })

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontWeight: '500' }
  const tdStyle = { padding: '12px 16px', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Roles & Permissions</h1>
        <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>Assign roles to any registered subscriber</div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {ROLE_OPTIONS.filter(r => r.value).map(r => (
          <div key={r.value} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', fontFamily: ff, marginBottom: '3px' }}>{r.label}</div>
            <div style={{ fontSize: '11px', color: '#aaa', fontFamily: ff }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, email, or ID…"
        style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', width: '280px', marginBottom: '14px', boxSizing: 'border-box' }}
      />

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No members found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Member</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const displayName = m.name || m.full_name || null
                const displayEmail = m.email || null
                const currentRole = localRoles[m.id] ?? (m.role || '')
                const isDirty = currentRole !== (m.role || '')
                return (
                  <tr key={m.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a' }}>
                        {displayName || <span style={{ color: '#bbb', fontStyle: 'italic', fontWeight: '400' }}>No name</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '1px' }}>{displayEmail || m.id}</div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>{m.plan || 'free'}</td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>{fmtDate(m.created_at)}</td>
                    <td style={{ ...tdStyle, width: '200px' }}>
                      <select
                        value={currentRole}
                        onChange={e => setLocalRoles(prev => ({ ...prev, [m.id]: e.target.value }))}
                        style={{ padding: '6px 10px', background: '#fff', border: `1px solid ${isDirty ? DARK_PINK : '#e0e0e0'}`, borderRadius: '6px', fontSize: '12px', fontFamily: ff, color: '#0a0a0a', outline: 'none', cursor: 'pointer', width: '100%' }}
                      >
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, width: '80px', textAlign: 'right' }}>
                      <button
                        onClick={() => saveRole(m.id)}
                        disabled={!!saving[m.id] || !isDirty}
                        style={{
                          padding: '5px 14px', borderRadius: '5px', fontSize: '12px', cursor: saving[m.id] || !isDirty ? 'not-allowed' : 'pointer', fontFamily: ff,
                          background: saved[m.id] ? 'rgba(110,201,154,0.12)' : isDirty ? PINK : '#f5f5f5',
                          border: `1px solid ${saved[m.id] ? 'rgba(110,201,154,0.3)' : isDirty ? 'rgba(242,184,198,0.4)' : '#e0e0e0'}`,
                          color: saved[m.id] ? '#2d8f5a' : isDirty ? '#0a0a0a' : '#ccc',
                          opacity: saving[m.id] ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {saved[m.id] ? '✓' : saving[m.id] ? '…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
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
    case 'team':        return <TeamSection supabase={supabase} />
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
