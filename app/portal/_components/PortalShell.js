'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import NotifPanel from './NotifPanel'
import InboxModal from './InboxModal'

const PortalCtx = createContext(null)
export function usePortal() { return useContext(PortalCtx) }

// Admin/team roles show their role label (matching the admin dashboard) instead
// of a membership plan.
export const ROLE_LABELS = {
  admin: 'Master Admin', editor: 'Editor', writer: 'Writer',
  finance_admin: 'Finance Admin', social_admin: 'Social Admin',
}

// ── Icons (copied from the static portal for visual parity) ─────────────
const I = {
  home: <svg viewBox="0 0 16 16" fill="none"><path d="M8 2L2 7v7h4v-4h4v4h4V7L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dashboard: <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  forum: <svg viewBox="0 0 20 14" fill="none"><circle cx="3" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M0 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="10" cy="3.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/><path d="M5.8 13c0-2.3 1.9-4.2 4.2-4.2s4.2 1.9 4.2 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="17" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M14 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  library: <svg viewBox="0 0 16 16" fill="none"><path d="M8 13V4M8 4C8 4 6 3 3 3v10c3 0 5 1 5 1M8 4c0 0 2-1 5-1v10c-3 0-5 1-5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  archive: <svg viewBox="0 0 16 20" fill="none"><rect x="1" y="1" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.2"/><line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.2"/><rect x="3" y="2.2" width="1.1" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="4.9" y="2.2" width="1.4" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="7.1" y="2.2" width="1" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="8.9" y="2.2" width="1.2" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="3" y="8.2" width="1.2" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="5" y="8.2" width="1" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="6.8" y="8.2" width="1.3" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="9" y="10.5" width="3.2" height="1" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="9" y="11.7" width="3.2" height="0.8" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="5" y="14.2" width="1.1" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="6.9" y="14.2" width="1.4" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="9.1" y="14.2" width="1" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/><rect x="11" y="14.2" width="1.2" height="4" rx="0.3" stroke="currentColor" strokeWidth="0.7"/></svg>,
  events: <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  inbox: <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5"/><path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  notifications: <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 2.5-1 3.5-1.5 4h12c-.5-.5-1.5-1.5-1.5-4A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  profile: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  settings: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  subscriptions: <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  orders: <svg viewBox="0 0 16 16" fill="none"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
}

// key, label, icon, href (native route) or soon:true (not built yet)
const NAV = [
  { section: 'Personal Space', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/portal' },
    { key: 'inbox', label: 'Inbox', icon: 'inbox', action: 'inbox', badgeKey: 'inbox' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications', action: 'notif', badgeKey: 'notifications' },
  ]},
  { section: 'Explore', items: [
    { key: 'groups', label: 'Forums', icon: 'forum', href: '/portal/groups' },
    { key: 'library', label: 'The Archive', icon: 'archive', href: '/portal/library' },
    { key: 'readingroom', label: 'Reading Room', icon: 'library', href: '/portal/reading-room' },
    { key: 'events', label: 'Events', icon: 'events', href: '/portal/events' },
  ]},
  { section: 'Account', items: [
    { key: 'profile', label: 'My profile', icon: 'profile', href: '/portal/profile' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/portal/settings' },
    { key: 'orders', label: 'Orders', icon: 'orders', href: '/portal/orders' },
    { key: 'subscriptions', label: 'Manage subscription', icon: 'subscriptions', href: '/portal/subscriptions' },
  ]},
]

export default function PortalShell({ active = 'dashboard', children }) {
  const supabase = createClient()
  const router = useRouter()
  const [ctx, setCtx] = useState(null) // { user, member }
  const [gate, setGate] = useState('loading') // loading | ok
  const [counts, setCounts] = useState({ notifications: 0, inbox: 0 })
  const [forumCount, setForumCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const bump = (key, delta) => setCounts(c => ({ ...c, [key]: Math.max(0, (c[key] || 0) + delta) }))

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login?returnTo=/portal'); return }
      const { data: member } = await supabase
        .from('members').select('*').eq('id', session.user.id).single()
      if (cancelled) return
      setCtx({ user: session.user, member: member || null })
      setGate('ok')
      try {
        const res = await fetch('/api/portal/unread-counts', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (res.ok) { const c = await res.json(); if (!cancelled) setCounts(c) }
      } catch {}
      try {
        const res = await fetch('/api/portal/forums', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (res.ok) { const d = await res.json(); if (!cancelled) setForumCount((d.forums || []).length) }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const member = ctx?.member
  const user = ctx?.user
  const name =
    member?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Member'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const initial = (name || 'M').trim().charAt(0).toUpperCase()

  return (
    <PortalCtx.Provider value={ctx ? { ...ctx, counts, openInbox: () => setInboxOpen(true), openNotifications: () => setNotifOpen(true) } : null}>
      <style>{`
        @import url("https://use.typekit.net/azq6zbr.css");
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --ink:#000; --paper:#fff; --cream:#fdf5f6; --border:#e8d4d8;
          --muted:#888; --pink:#F1B7C0; --pinkborder:#e8a0b0; --goldlight:#fce8ec;
        }
        html, body { height: 100%; }
        body { margin:0; font-family:'thermal-variable', Georgia, serif; background:var(--paper); color:var(--ink); font-size:15px; }
        a { text-decoration:none; color:inherit; }

        .portal-shell { display:flex; height:100vh; overflow:hidden; }
        .portal-sidebar {
          background:#000; display:flex; flex-direction:column;
          width:260px; flex-shrink:0; height:100vh; overflow-y:auto; z-index:50;
        }
        .psb-logo {
          font-family:'thermal-variable', Georgia, serif; font-size:18px; font-weight:600; letter-spacing:0.02em;
          padding:22px 20px 16px; border-bottom:1px solid rgba(255,255,255,0.12); color:#fff;
          display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
        }
        .psb-logo small { display:block; font-size:10px; color:rgba(255,255,255,0.45); font-weight:400; letter-spacing:0.05em; margin-top:2px; }
        .psb-home { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:7px; background:rgba(255,255,255,0.08); flex-shrink:0; transition:background 0.15s; margin-top:1px; }
        .psb-home:hover { background:rgba(255,255,255,0.18); }
        .psb-home svg { width:14px; height:14px; color:#fff; }

        .psb-profile { padding:18px 20px 16px; border-bottom:1px solid rgba(255,255,255,0.12); text-align:center; }
        .psb-av { width:64px; height:64px; border-radius:50%; background:var(--pink); border:2px solid rgba(255,255,255,0.2); margin:0 auto 10px; display:flex; align-items:center; justify-content:center; font-size:24px; color:#000; overflow:hidden; }
        .psb-av img { width:100%; height:100%; object-fit:cover; }
        .psb-name { color:#fff; font-size:14.5px; font-weight:600; }
        .psb-plan { color:rgba(255,255,255,0.5); font-size:11px; margin-top:2px; }

        .psb-nav { padding:8px 0 20px; flex:1; }
        .psb-section { font-size:9.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.13em; color:rgba(255,255,255,0.35); padding:13px 20px 4px; }
        .psb-item { display:flex; align-items:center; gap:9px; padding:7px 14px 7px 20px; margin-right:10px; border-radius:0 7px 7px 0; font-size:13px; color:rgba(255,255,255,0.55); cursor:pointer; transition:all 0.15s; border-left:2px solid transparent; }
        .psb-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
        .psb-item.active { background:rgba(241,183,192,0.15); color:#fff; font-weight:500; border-left:2px solid var(--pink); }
        .psb-item svg { width:13px; height:13px; flex-shrink:0; opacity:0.55; }
        [data-nav="library"] svg { width:11px; height:16px; }
        .psb-item.active svg, .psb-item:hover svg { opacity:1; }
        .psb-item.soon { cursor:default; color:rgba(255,255,255,0.3); }
        .psb-item.soon:hover { background:transparent; color:rgba(255,255,255,0.3); }
        .psb-item.soon svg { opacity:0.3; }
        .psb-soon { margin-left:auto; font-size:8.5px; letter-spacing:0.08em; text-transform:uppercase; color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.18); border-radius:20px; padding:1px 7px; }
        .psb-notif { margin-left:auto; background:var(--pink); color:#000; font-size:9.5px; font-weight:600; padding:1px 7px; border-radius:20px; min-width:18px; text-align:center; }

        .portal-main { flex:1; min-width:0; height:100vh; overflow-y:auto; padding:30px 38px; }

        @media (max-width: 820px) {
          .portal-shell { flex-direction:column; height:auto; overflow:visible; }
          .portal-sidebar { width:100%; height:auto; position:static; }
          .psb-nav { display:flex; flex-wrap:wrap; gap:2px 0; padding:6px 8px 12px; }
          .psb-section { width:100%; padding:8px 12px 2px; }
          .psb-item { margin-right:0; border-radius:7px; border-left:none; }
          .psb-item.active { border-left:none; }
          .portal-main { height:auto; padding:24px 18px 60px; }
        }
      `}</style>

      {gate === 'loading' ? (
        <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color:'#888', fontFamily:"'thermal-variable', Georgia, serif" }}>
          Opening your portal…
        </div>
      ) : (
        <div className="portal-shell">
          <aside className="portal-sidebar">
            <div className="psb-logo">
              <div>The Parlor<small>Member portal</small></div>
              <a href="/" title="Parlor home" className="psb-home">{I.home}</a>
            </div>
            <div className="psb-profile">
              <div className="psb-av">{avatarUrl ? <img src={avatarUrl} alt="" /> : initial}</div>
              <div className="psb-name">{name}</div>
              {(ROLE_LABELS[member?.role] || member?.plan) && <div className="psb-plan">{ROLE_LABELS[member?.role] || member?.plan}</div>}
            </div>
            <nav className="psb-nav">
              {NAV.map((grp, gi) => (
                <div key={gi}>
                  {grp.section && <div className="psb-section">{grp.section}</div>}
                  {grp.items.map(it => {
                    if (it.requiresForums && forumCount === 0) return null
                    const cls = `psb-item${it.key === active ? ' active' : ''}${it.soon ? ' soon' : ''}`
                    const badge = it.badgeKey ? (counts[it.badgeKey] || 0) : 0
                    const inner = <>
                      {I[it.icon]}<span>{it.label}</span>
                      {!it.soon && badge > 0 && <span className="psb-notif">{badge}</span>}
                      {it.soon && <span className="psb-soon">soon</span>}
                    </>
                    if (it.soon) return <div key={it.key} className={cls}>{inner}</div>
                    if (it.action) return <button key={it.key} type="button" className={cls} style={{ width: '100%', background: 'none', textAlign: 'left', fontFamily: 'inherit', fontSize: '13px', border: 'none', borderLeft: '2px solid transparent', cursor: 'pointer' }} onClick={() => it.action === 'notif' ? setNotifOpen(true) : setInboxOpen(true)}>{inner}</button>
                    return <a key={it.key} href={it.href} className={cls} data-nav={it.key}>{inner}</a>
                  })}
                </div>
              ))}
            </nav>
          </aside>
          <main className="portal-main">{children}</main>
          <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} onChange={d => bump('notifications', d)} />
          <InboxModal open={inboxOpen} onClose={() => setInboxOpen(false)} onChange={d => bump('inbox', d)} />
        </div>
      )}
    </PortalCtx.Provider>
  )
}
