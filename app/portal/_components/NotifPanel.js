'use client'

import { useState, useEffect, useRef } from 'react'
import NotificationIcon from './NotificationIcon'
import { createClient } from '../../../lib/supabase'

const DEST = { library: '/portal/library', 'library-detail': '/portal/library', dashboard: '/portal', forum: '/portal', events: '/portal', inbox: '/portal' }

function timeAgo(s) {
  const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (sec < 60) return 'just now'
  const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotifPanel({ open, onClose, onChange }) {
  const supabase = createClient()
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [pendingIds, setPendingIds] = useState([])
  const pendingRef = useRef(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  async function token() { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/portal/notifications', { headers: { Authorization: `Bearer ${await token()}` } })
        if (!res.ok) throw new Error('Could not load notifications.')
        const data = await res.json()
        if (!cancelled) { setItems(data.notifications || []); setLoaded(true) }
      } catch { if (!cancelled) setLoaded(true) }
    }
    load()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { cancelled = true; document.removeEventListener('keydown', onKey) }
  }, [open])

  async function openNotif(n) {
    if (!n.read) {
      setItems(list => list.map(x => x.id === n.id ? { ...x, read: true } : x))
      onChange && onChange(-1)
      fetch('/api/portal/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
    }
    // Comment replies link straight to the public article (where the thread lives).
    if (n.link_to === 'article' && n.link_ref) { window.location.href = `/post/${n.link_ref}`; return }
    // Forum notifications carry `${forumId}/${threadId}` (or just a forum id).
    if (n.link_to === 'forum' && n.link_ref) { window.location.href = `/portal/forums/${n.link_ref}`; return }
    // Book club notifications carry `${bookId}/${promptId}`.
    if (n.link_to === 'bookclub' && n.link_ref) { window.location.href = `/portal/reading-room/${n.link_ref}`; return }
    // Event notifications carry the event id.
    if (n.link_to === 'event' && n.link_ref) { window.location.href = `/portal/events/${n.link_ref}`; return }
    // Submission feedback → the Write page.
    if (n.link_to === 'write') { window.location.href = '/portal/write'; return }
    // A released blog post.
    if (n.link_to === 'blog' && n.link_ref) { window.location.href = `/portal/blog/${n.link_ref}`; return }
    // Groups directory.
    if (n.link_to === 'groups') { window.location.href = '/portal/groups'; return }
    window.location.href = DEST[n.link_to] || '/portal'
  }

  async function clearAll() {
    if (markingAll) return
    setMarkingAll(true); setError('')
    try {
      const response = await fetch('/api/portal/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ all: true }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.cleared_all) throw new Error(result.error || 'Could not clear notifications. Please try again.')
      setItems([])
      onChange && onChange(null)
    } catch (error) { setError(error.message || 'Could not update notifications.') }
    finally { setMarkingAll(false) }
  }

  async function dismiss(e, n) {
    e.stopPropagation()
    if (pendingRef.current.has(n.id)) return
    pendingRef.current.add(n.id); setPendingIds([...pendingRef.current]); setError('')
    try {
      const response = await fetch('/api/portal/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: n.id }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.deleted_id !== n.id) throw new Error(result.error || 'Could not dismiss this notification. Please try again.')
      setItems(list => list.filter(x => x.id !== n.id))
      if (!n.read) onChange && onChange(-1)
    } catch (error) { setError(error.message || 'Could not dismiss this notification. Please try again.') }
    finally { pendingRef.current.delete(n.id); setPendingIds([...pendingRef.current]) }
  }

  if (!open) return null

  return (
    <>
      <style>{`
        .np-backdrop{position:fixed;inset:0;z-index:9998}
        .notif-panel{position:fixed;top:0;left:260px;height:100vh;width:320px;background:var(--paper);border-right:1px solid var(--border);box-shadow:4px 0 24px rgba(0,0,0,0.10);overflow-y:auto;z-index:9999;display:flex;flex-direction:column}
        .np-head{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--paper);z-index:1}
        .np-title{font-size:16px;font-weight:600;color:var(--ink)}
        .np-mark{font-size:11.5px;color:var(--muted);background:none;border:none;font-family:'thermal-variable',Georgia,serif;cursor:pointer;padding:0}
        .np-mark:hover{color:var(--ink)}
        .notif-row{display:flex;align-items:stretch;border-bottom:1px solid var(--border)}
        .notif-row.unread{background:#fef9fa}
        .notif-row:hover,.notif-row:focus-within{background:var(--cream)}
        .notif-item{display:flex;gap:10px;padding:13px 18px;border-bottom:none;cursor:pointer;align-items:flex-start;transition:background 0.12s;width:100%;text-align:left;background:none;border-left:none;border-right:none;border-top:none;font-family:'thermal-variable',Georgia,serif}
        .notif-icon{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:1px}
        .ni-reply{background:#fce8ec}.ni-inbox{background:#e8f0f8}.ni-library{background:#ede8f5}.ni-event{background:#e8f5ec}
        .notif-icon svg{width:13px;height:13px;color:#555}
        .notif-body{flex:1;min-width:0}
        .notif-msg{font-size:12.5px;color:var(--ink);line-height:1.45;margin-bottom:2px}
        .notif-time{font-size:10.5px;color:var(--muted)}
        .notif-unread-dot{width:6px;height:6px;border-radius:50%;background:var(--pink);flex-shrink:0;margin-top:5px}
        .notif-dismiss{opacity:0;background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;line-height:1;padding:0 2px;flex-shrink:0;transition:opacity 0.15s,color 0.15s;margin-top:1px}
        .notif-dismiss:hover{color:var(--ink)}
        .notif-row:hover .notif-dismiss,.notif-row:focus-within .notif-dismiss{opacity:1}
        @media(hover:none){.notif-dismiss{opacity:1}}
        .np-foot{padding:12px 18px;border-top:1px solid var(--border);text-align:center;margin-top:auto}
        .np-foot a{font-size:12px;color:var(--ink);text-decoration:underline;text-underline-offset:3px}
        .np-empty{padding:40px 18px;text-align:center;color:var(--muted);font-style:italic;font-size:13px}
        @media(max-width:820px){.notif-panel{left:0;width:100%}}
      `}</style>
      <div className="np-backdrop" onClick={onClose} />
      <div className="notif-panel">
        <div className="np-head">
          <div className="np-title">Notifications</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="np-mark" onClick={clearAll} disabled={markingAll || pendingIds.length > 0}>Clear all</button>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:20,lineHeight:1,padding:'0 2px',display:'flex',alignItems:'center'}} aria-label="Close">×</button>
          </div>
        </div>
        {error && <p role="alert" style={{ color: '#a52f3d', padding: '0 18px' }}>{error}</p>}
        {loaded && items.length === 0 && <div className="np-empty">You’re all caught up.</div>}
        {items.map(n => (
          <div key={n.id} className={`notif-row${n.read ? '' : ' unread'}`}>
          <button type="button" className="notif-item" onClick={() => openNotif(n)}>
            <NotificationIcon notification={n} />
            <span className="notif-body">
              <span className="notif-msg">{n.message}</span>
              <span className="notif-time">{timeAgo(n.created_at)}</span>
            </span>
          </button>
            <span style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0,padding:'13px 12px 13px 0'}}>
              {!n.read && <span className="notif-unread-dot" />}
              <button type="button" aria-label={`Dismiss notification: ${n.message}`} className="notif-dismiss" disabled={markingAll || pendingIds.includes(n.id)} onClick={e => dismiss(e, n)} title="Dismiss">×</button>
            </span>
          </div>
        ))}
        <div className="np-foot"><a href="/portal/notifications">See all notifications →</a></div>
      </div>
    </>
  )
}
