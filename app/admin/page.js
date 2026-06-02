'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Role definitions ──────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: '',             label: 'No role',           desc: 'Standard member, no admin access' },
  { value: 'admin',        label: 'Master Admin',       desc: 'Full access to all sections' },
  { value: 'editor',       label: 'Editor',             desc: 'Articles, Writers, Media' },
  { value: 'writer',       label: 'Writer',             desc: 'Writer dashboard only' },
  { value: 'finance_admin',label: 'Finance Admin',      desc: 'Invoices only' },
  { value: 'social_admin', label: 'Social Admin',       desc: 'Scheduled posts only' },
]

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

// ── Shared style tokens ───────────────────────────────────────
const S = {
  bg:       '#0a0a0a',
  sidebar:  '#0d0d0d',
  card:     '#111',
  border:   'rgba(255,255,255,0.06)',
  pink:     '#f2b8c6',
  muted:    '#555',
  dim:      '#333',
  label:    'rgba(255,255,255,0.35)',
  ff:       "'Source Serif 4', Georgia, serif",
  ffHead:   "'Playfair Display', Georgia, serif",
}

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
    { key: 'members',   label: 'Members' },
    { key: 'pitches',   label: 'Pitches' },
  ]},
  { section: 'Finance', items: [
    { key: 'invoices',  label: 'Invoices' },
  ]},
  { section: 'Social', items: [
    { key: 'social',    label: 'Scheduled Posts' },
  ]},
  { section: 'Settings', items: [
    { key: 'roles',        label: 'Roles & Permissions' },
    { key: 'publication',  label: 'Publication Settings' },
  ]},
]

function Sidebar({ active, setActive, onSignOut }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
      background: S.sidebar, borderRight: `1px solid ${S.border}`,
      display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 50,
      fontFamily: S.ff,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ fontFamily: S.ffHead, fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.01em' }}>
          The Parlor
        </div>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', color: S.pink, marginTop: '4px' }}>
          Admin
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(({ section, items }) => (
          <div key={section || '_root'} style={{ marginBottom: '4px' }}>
            {section && (
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', color: S.dim, padding: '12px 20px 5px', fontFamily: S.ff }}>
                {section}
              </div>
            )}
            {items.map(item => {
              const isActive = active === item.key
              const inner = (
                <div
                  onClick={() => !item.href && setActive(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 20px', fontSize: '13px', cursor: 'pointer',
                    color: isActive ? '#fff' : S.muted,
                    background: isActive ? 'rgba(242,184,198,0.08)' : 'transparent',
                    borderLeft: isActive ? `2px solid ${S.pink}` : '2px solid transparent',
                    transition: 'color 0.12s, background 0.12s',
                    userSelect: 'none',
                    textDecoration: 'none',
                    fontFamily: S.ff,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#bbb' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = S.muted }}
                >
                  {item.label}
                  {item.href && (
                    <span style={{ fontSize: '9px', color: S.dim, marginLeft: 'auto' }}>↗</span>
                  )}
                </div>
              )
              if (item.href) {
                return (
                  <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>
                    {inner}
                  </Link>
                )
              }
              return <div key={item.key}>{inner}</div>
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
        <button
          onClick={onSignOut}
          style={{ background: 'none', border: 'none', color: S.muted, fontSize: '12px', cursor: 'pointer', fontFamily: S.ff, padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Widget shell ──────────────────────────────────────────────
function Widget({ title, action, children, span = 1 }) {
  return (
    <div style={{
      background: S.card, border: `1px solid ${S.border}`,
      borderRadius: '10px', overflow: 'hidden',
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: S.label, fontFamily: S.ff }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: '14px 18px' }}>
        {children}
      </div>
    </div>
  )
}

function EmptyRow({ text }) {
  return <div style={{ fontSize: '12px', color: S.dim, fontStyle: 'italic', fontFamily: S.ff, padding: '8px 0' }}>{text}</div>
}

// ── Dashboard Home ────────────────────────────────────────────
function DashboardHome({ supabase }) {
  const [data, setData] = useState({
    recentArticles: [], scheduledArticles: [],
    newMembers: [], memberCount: 0,
    pitches: [], invoices: [], socialPosts: [],
    loaded: false,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString()
      const now = new Date().toISOString()

      const [artRes, membersRes, pitchRes, invRes, socialRes] = await Promise.allSettled([
        supabase.from('articles').select('id, title, author_name, published_at, scheduled_at, published, slug').order('published_at', { ascending: false }),
        supabase.from('members').select('id, role, created_at').order('created_at', { ascending: false }),
        supabase.from('pitches').select('id, created_at, status, title, author_name').order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, status, amount, created_at').order('created_at', { ascending: false }),
        supabase.from('social_posts').select('id, scheduled_at, status, content').order('scheduled_at', { ascending: false }),
      ])

      if (cancelled) return

      const articles = artRes.status === 'fulfilled' ? (artRes.value.data || []) : []
      const members  = membersRes.status === 'fulfilled' ? (membersRes.value.data || []) : []
      const pitches  = pitchRes.status === 'fulfilled' ? (pitchRes.value.data || []) : []
      const invoices = invRes.status === 'fulfilled' ? (invRes.value.data || []) : []
      const socialPosts = socialRes.status === 'fulfilled' ? (socialRes.value.data || []) : []

      setData({
        recentArticles: articles.filter(a => a.published).slice(0, 5),
        scheduledArticles: articles.filter(a => !a.published && a.scheduled_at && a.scheduled_at > now).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).slice(0, 5),
        newMembers: members.filter(m => m.created_at > sevenDaysAgo).slice(0, 5),
        memberCount: members.length,
        pitches,
        invoices,
        socialPosts,
        loaded: true,
      })
    }
    load()
    return () => { cancelled = true }
  }, [])

  const rowStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${S.border}`, gap: '8px', fontFamily: S.ff }
  const titleStyle = { fontSize: '13px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }
  const metaStyle  = { fontSize: '11px', color: S.muted, flexShrink: 0 }

  const paidInvoices    = data.invoices.filter(i => i.status === 'paid').length
  const pendingInvoices = data.invoices.filter(i => i.status !== 'paid').length
  const pendingPitches  = data.pitches.filter(p => !p.status || p.status === 'pending').length

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: S.ffHead, fontSize: '26px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
          Dashboard
        </h1>
        <div style={{ fontSize: '12px', color: S.muted, marginTop: '4px', fontFamily: S.ff }}>
          Live overview
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Members',    value: data.memberCount },
          { label: 'New (7 days)',      value: data.newMembers.length },
          { label: 'Pending Pitches',  value: pendingPitches },
          { label: 'Unpaid Invoices',  value: pendingInvoices },
        ].map(s => (
          <div key={s.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', fontFamily: S.ffHead, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: S.muted, marginTop: '5px', fontFamily: S.ff, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Widgets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Recent articles */}
        <Widget
          title="Recently Published"
          action={<Link href="/admin/articles" style={{ fontSize: '11px', color: S.pink, textDecoration: 'none' }}>View all →</Link>}
        >
          {data.recentArticles.length === 0 && <EmptyRow text="No published articles yet." />}
          {data.recentArticles.map(a => (
            <div key={a.id} style={{ ...rowStyle }}>
              <span style={titleStyle}>{a.title || 'Untitled'}</span>
              <span style={metaStyle}>{a.author_name || '—'}</span>
              <span style={{ ...metaStyle, minWidth: '72px', textAlign: 'right' }}>{fmtDate(a.published_at)}</span>
            </div>
          ))}
        </Widget>

        {/* Scheduled */}
        <Widget
          title="Scheduled"
          action={<Link href="/admin/articles" style={{ fontSize: '11px', color: S.pink, textDecoration: 'none' }}>Manage →</Link>}
        >
          {data.scheduledArticles.length === 0 && <EmptyRow text="No articles scheduled." />}
          {data.scheduledArticles.map(a => (
            <div key={a.id} style={{ ...rowStyle }}>
              <span style={titleStyle}>{a.title || 'Untitled'}</span>
              <span style={{ ...metaStyle, color: '#a0b4f2', minWidth: '130px', textAlign: 'right' }}>{fmtDateTime(a.scheduled_at)}</span>
            </div>
          ))}
        </Widget>

        {/* Pitches */}
        <Widget title="Pending Pitches">
          {data.pitches.length === 0 && <EmptyRow text="No pitches received yet." />}
          {data.pitches.slice(0, 5).map((p, i) => (
            <div key={p.id || i} style={{ ...rowStyle }}>
              <span style={titleStyle}>{p.title || 'Untitled pitch'}</span>
              <span style={metaStyle}>{p.author_name || '—'}</span>
              <span style={{ ...metaStyle, minWidth: '60px', textAlign: 'right' }}>{timeAgo(p.created_at)}</span>
            </div>
          ))}
        </Widget>

        {/* New members */}
        <Widget title="New Members (7 days)">
          {data.newMembers.length === 0 && <EmptyRow text="No new members this week." />}
          {data.newMembers.map((m, i) => (
            <div key={m.id || i} style={{ ...rowStyle }}>
              <span style={titleStyle}>{m.id?.slice(0, 12)}…</span>
              <span style={{ ...metaStyle, color: S.pink }}>{roleLabel(m.role)}</span>
              <span style={{ ...metaStyle, minWidth: '60px', textAlign: 'right' }}>{timeAgo(m.created_at)}</span>
            </div>
          ))}
        </Widget>

        {/* Invoices */}
        <Widget title="Invoices">
          {data.invoices.length === 0 ? (
            <EmptyRow text="No invoices on record." />
          ) : (
            <>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                {[
                  { label: 'Paid', value: paidInvoices, color: '#6ec99a' },
                  { label: 'Pending', value: pendingInvoices, color: '#f2c46e' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: '#0e0e0e', borderRadius: '7px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: s.color, fontFamily: S.ffHead }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: S.muted, marginTop: '3px', fontFamily: S.ff }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {data.invoices.slice(0, 3).map((inv, i) => (
                <div key={inv.id || i} style={{ ...rowStyle }}>
                  <span style={titleStyle}>Invoice #{String(i + 1).padStart(3, '0')}</span>
                  <span style={{ ...metaStyle, color: inv.status === 'paid' ? '#6ec99a' : '#f2c46e' }}>{inv.status || 'pending'}</span>
                  <span style={metaStyle}>{inv.amount != null ? `$${inv.amount}` : '—'}</span>
                </div>
              ))}
            </>
          )}
        </Widget>

        {/* Social posts */}
        <Widget title="Scheduled Social Posts">
          {data.socialPosts.length === 0 ? (
            <EmptyRow text="No social posts scheduled." />
          ) : (
            data.socialPosts.slice(0, 5).map((p, i) => (
              <div key={p.id || i} style={{ ...rowStyle }}>
                <span style={{ ...titleStyle, maxWidth: '180px' }}>{p.content?.slice(0, 48) || 'Post'}</span>
                <span style={{ ...metaStyle, color: p.status === 'sent' ? '#6ec99a' : S.pink }}>{p.status || 'scheduled'}</span>
                <span style={metaStyle}>{fmtDate(p.scheduled_at)}</span>
              </div>
            ))
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
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  useEffect(() => {
    supabase.from('members').select('id, role, created_at').order('created_at', { ascending: false }).then(({ data }) => {
      setMembers(data || [])
      setLoading(false)
    })
  }, [])

  async function handleSaveRole(id, role) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await supabase.from('members').update({ role: role || null }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    setSaving(prev => ({ ...prev, [id]: false }))
    setSaved(prev => ({ ...prev, [id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
  }

  const selectStyle = {
    background: '#1c1c1c', border: `1px solid rgba(255,255,255,0.07)`,
    borderRadius: '6px', color: '#e0e0e0', fontSize: '12px',
    fontFamily: S.ff, padding: '6px 10px', outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: S.ffHead, fontSize: '26px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
          Roles & Permissions
        </h1>
        <div style={{ fontSize: '12px', color: S.muted, marginTop: '4px', fontFamily: S.ff }}>
          Assign roles to registered site members
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {ROLE_OPTIONS.filter(r => r.value).map(r => (
          <div key={r.value} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#ccc', fontFamily: S.ff, marginBottom: '3px' }}>{r.label}</div>
            <div style={{ fontSize: '11px', color: S.muted, fontFamily: S.ff }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 140px 80px', padding: '10px 18px', background: '#0e0e0e', borderBottom: `1px solid ${S.border}` }}>
          {['Member ID', 'Joined', 'Role', ''].map(h => (
            <div key={h} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: S.dim, fontFamily: S.ff }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '32px 18px', fontSize: '13px', color: S.dim, fontFamily: S.ff, fontStyle: 'italic' }}>Loading members…</div>
        )}

        {!loading && members.length === 0 && (
          <div style={{ padding: '32px 18px', fontSize: '13px', color: S.dim, fontFamily: S.ff, fontStyle: 'italic' }}>No members found.</div>
        )}

        {members.map((m, i) => (
          <MemberRow
            key={m.id}
            member={m}
            isLast={i === members.length - 1}
            saving={!!saving[m.id]}
            saved={!!saved[m.id]}
            onSave={handleSaveRole}
            selectStyle={selectStyle}
          />
        ))}
      </div>
    </div>
  )
}

function MemberRow({ member, isLast, saving, saved, onSave, selectStyle }) {
  const [role, setRole] = useState(member.role || '')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 140px 80px', padding: '13px 18px', borderBottom: isLast ? 'none' : `1px solid rgba(255,255,255,0.03)`, alignItems: 'center' }}>
      <div style={{ fontSize: '12px', color: '#aaa', fontFamily: "'Source Serif 4', monospace, serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '16px' }}>
        {member.id}
      </div>
      <div style={{ fontSize: '12px', color: S.muted, fontFamily: S.ff }}>
        {fmtDate(member.created_at)}
      </div>
      <div>
        <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <button
          onClick={() => onSave(member.id, role)}
          disabled={saving || role === (member.role || '')}
          style={{
            background: saved ? 'rgba(110,201,154,0.15)' : 'rgba(242,184,198,0.12)',
            border: `1px solid ${saved ? 'rgba(110,201,154,0.3)' : 'rgba(242,184,198,0.2)'}`,
            borderRadius: '5px', color: saved ? '#6ec99a' : '#f2b8c6',
            padding: '5px 12px', fontSize: '11px', cursor: saving || role === (member.role || '') ? 'not-allowed' : 'pointer',
            fontFamily: S.ff, opacity: saving || role === (member.role || '') ? 0.4 : 1,
            transition: 'all 0.15s',
          }}
        >
          {saved ? 'Saved ✓' : saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Coming soon stub ──────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div>
      <h1 style={{ fontFamily: S.ffHead, fontSize: '26px', fontWeight: '700', color: '#fff', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        {title}
      </h1>
      <div style={{ fontSize: '13px', color: S.muted, fontFamily: S.ff, marginTop: '48px', textAlign: 'center', padding: '64px 0', border: `1px dashed ${S.border}`, borderRadius: '12px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>◌</div>
        This section is coming soon.
      </div>
    </div>
  )
}

// ── Content router ────────────────────────────────────────────
function MainContent({ section, supabase }) {
  switch (section) {
    case 'dashboard':   return <DashboardHome supabase={supabase} />
    case 'roles':       return <RolesSection supabase={supabase} />
    case 'members':     return <ComingSoon title="Members" />
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

      const { data: member, error: memberError } = await supabase
        .from('members').select('role').eq('id', user.id).single()
      if (cancelled) return

      if (memberError) { router.push('/dashboard'); return }
      if (member?.role !== 'admin') { router.push('/dashboard'); return }

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
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: S.ff, fontSize: '14px' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: '#fff', fontFamily: S.ff }}>
      <Sidebar active={activeSection} setActive={setActiveSection} onSignOut={handleSignOut} />
      <main style={{ marginLeft: '220px', minHeight: '100vh', padding: '40px 48px' }}>
        <MainContent section={activeSection} supabase={supabase} />
      </main>
    </div>
  )
}
