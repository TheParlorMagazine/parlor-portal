'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'
import PortalShell, { usePortal } from '../_components/PortalShell'
import PostsWall from '../_components/PostsWall'

const profileCss = `
  .prof-wrap { max-width: 1056px; }
  .prof-banner { height: 190px; border-radius: 14px 14px 0 0; background: linear-gradient(120deg, #f2b8c6 0%, #fce8ec 55%, #ecd8f0 100%); position: relative; overflow: hidden; }
  .prof-banner img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .prof-cam { position: absolute; display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.55); color: #fff; border: none; border-radius: 8px; padding: 7px 12px; font-family: 'thermal-variable', Georgia, serif; font-size: 12.5px; cursor: pointer; }
  .prof-cam:hover { background: rgba(0,0,0,0.72); }
  .prof-cam.banner { top: 12px; right: 12px; }
  .prof-card { border: 1px solid var(--border); border-top: none; border-radius: 0 0 14px 14px; background: #fff; padding: 0 24px 24px; }
  .prof-head { display: flex; align-items: flex-end; gap: 18px; margin-top: -50px; position: relative; }
  .prof-avatar { width: 112px; height: 112px; border-radius: 50%; border: 4px solid #fff; background: var(--pink); display: flex; align-items: center; justify-content: center; font-family: 'thermal-variable', Georgia, serif; font-size: 44px; color: #000; flex-shrink: 0; position: relative; }
  .prof-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .prof-av-cam { position: absolute; bottom: 2px; right: 2px; width: 30px; height: 30px; border-radius: 50%; background: #0a0a0a; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .prof-av-cam svg { width: 14px; height: 14px; }
  .prof-idrow { flex: 1; min-width: 0; padding-bottom: 8px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .prof-name { font-family: 'thermal-variable', Georgia, serif; font-size: 24px; font-weight: 600; line-height: 1.15; }
  .prof-headline { font-size: 14px; color: var(--muted); margin-top: 3px; }
  .prof-role { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8a5a00; background: var(--goldlight); border-radius: 20px; padding: 2px 9px; margin-top: 7px; }
  .prof-bio { font-size: 15px; line-height: 1.65; color: #333; margin-top: 18px; white-space: pre-wrap; }
  .prof-bio.empty { color: var(--muted); font-style: italic; }

  .prof-edit-btn { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 8px 16px; font-family: 'thermal-variable', Georgia, serif; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .prof-edit-btn:hover { border-color: var(--pinkborder); }

  .prof-fld { margin-top: 16px; }
  .prof-fld label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; }
  .prof-fld input, .prof-fld textarea { width: 100%; padding: 11px 13px; border: 1px solid var(--border); border-radius: 8px; font-family: 'thermal-variable', Georgia, serif; font-size: 15px; outline: none; box-sizing: border-box; background: #fff; }
  .prof-fld textarea { resize: vertical; }
  .prof-actions { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
  .prof-save { background: #0a0a0a; color: #fff; border: none; border-radius: 8px; padding: 10px 22px; font-family: 'thermal-variable', Georgia, serif; font-size: 14px; font-weight: 500; cursor: pointer; }
  .prof-cancel { background: none; border: none; color: var(--muted); font-family: 'thermal-variable', Georgia, serif; font-size: 13px; cursor: pointer; }
  .prof-ok { color: #2d8f5a; font-size: 13px; }
  .prof-err { color: #c04040; font-size: 13px; }

  .prof-layout { display: grid; grid-template-columns: minmax(0,1fr) 296px; gap: 24px; align-items: start; }
  .pg-groups { border: 1px solid var(--border); border-radius: 14px; background: #fff; padding: 18px 18px 8px; }
  .pg-groups-h { font-family: 'thermal-variable', Georgia, serif; font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .pg-groups-sub { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .pg-group { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 0; border-top: 1px solid var(--border); text-decoration: none; }
  .pg-group:hover .pg-group-name { text-decoration: underline; text-underline-offset: 2px; }
  .pg-group-name { font-family: 'thermal-variable', Georgia, serif; font-size: 14px; font-weight: 500; color: var(--ink); line-height: 1.3; }
  .pg-group-count { font-size: 11.5px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
  .pg-groups-empty { font-size: 13px; color: var(--muted); line-height: 1.5; padding: 4px 0 14px; }
  @media (max-width: 900px) { .prof-layout { grid-template-columns: 1fr; } }
`

const ROLE_LABELS = { admin: 'Master Admin', editor: 'Editor', writer: 'Writer', finance_admin: 'Finance Admin', social_admin: 'Social Admin' }

function ProfileView() {
  const ctx = usePortal()
  const supabase = createClient()
  const m = ctx?.member || {}
  const [form, setForm] = useState({
    full_name: m.full_name || '', headline: m.headline || '', bio: m.bio || '',
    avatar_url: m.avatar_url || '', banner_url: m.banner_url || '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState('')  // '' | 'avatar' | 'banner'
  const avatarRef = useRef(null)
  const bannerRef = useRef(null)
  const dedupeRef = useRef(null)
  const [articles, setArticles] = useState([])
  const [blogPosts, setBlogPosts] = useState([])
  const [groups, setGroups] = useState({ loading: true, items: [] })

  useEffect(() => {
    const uid = ctx?.user?.id
    if (!uid) return
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const auth = { Authorization: `Bearer ${session.access_token}` }
        const res = await fetch(`/api/portal/members/${uid}`, { headers: auth })
        if (res.ok) { const d = await res.json(); setArticles(d.articles || []); setBlogPosts(d.blog_posts || []) }
        try { const r = await fetch('/api/portal/forums', { headers: auth }); const d = await r.json(); setGroups({ loading: false, items: d.forums || [] }) } catch { setGroups({ loading: false, items: [] }) }
      } catch { setGroups({ loading: false, items: [] }) }
    })()
  }, [ctx?.user?.id])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setStatus('') }

  async function upload(file, kind) {
    if (!file || !file.type.startsWith('image/')) return
    if (isDuplicateUpload(dedupeRef, file)) return
    setUploading(kind)
    try {
      const { file: up, ext, contentType } = await prepareImageUpload(file, { maxDim: kind === 'banner' ? 1600 : 512 })
      const path = `${kind === 'banner' ? 'banners' : 'avatars'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
        set(kind === 'banner' ? 'banner_url' : 'avatar_url', publicUrl)
        // Persist image changes immediately so they stick even without hitting Save.
        await patch({ [kind === 'banner' ? 'banner_url' : 'avatar_url']: publicUrl })
      }
    } finally { setUploading('') }
  }

  async function patch(fields) {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(fields),
    })
  }

  async function save() {
    setSaving(true); setStatus('')
    try {
      const res = await patch({ full_name: form.full_name, headline: form.headline, bio: form.bio })
      if (res.ok) { setStatus('saved'); setEditing(false) } else setStatus('error')
    } catch { setStatus('error') }
    setSaving(false)
  }

  const initial = (form.full_name || m.email || 'M').trim().charAt(0).toUpperCase()
  const roleLabel = ROLE_LABELS[m.role]

  return (
    <div className="prof-wrap">
      <style>{profileCss}</style>
      <h1 style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 26, fontWeight: 500, margin: '0 0 4px' }}>My profile</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>How you appear across The Parlor. Members can see this.</p>

      <div className="prof-layout">
        <div className="prof-main">
      {/* Banner */}
      <div className="prof-banner">
        {form.banner_url && <img src={form.banner_url} alt="" />}
        <button className="prof-cam banner" onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'}>
          {uploading === 'banner' ? 'Uploading…' : (form.banner_url ? 'Change banner' : 'Add banner')}
        </button>
        <input ref={bannerRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'banner'); e.target.value = '' }} />
      </div>

      <div className="prof-card">
        <div className="prof-head">
          <div className="prof-avatar">
            {form.avatar_url ? <img src={form.avatar_url} alt="" /> : initial}
            <button className="prof-av-cam" onClick={() => avatarRef.current?.click()} disabled={uploading === 'avatar'} title="Change photo">
              <svg viewBox="0 0 16 16" fill="none"><path d="M2 5h2.5l1-1.5h5L11.5 5H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8.8" r="2.2" stroke="currentColor" strokeWidth="1.4"/></svg>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'avatar'); e.target.value = '' }} />
          </div>
          {!editing && (
            <div className="prof-idrow">
              <div>
                <div className="prof-name">{form.full_name || 'Your name'}</div>
                {form.headline && <div className="prof-headline">{form.headline}</div>}
                {roleLabel && <div className="prof-role">{roleLabel}</div>}
              </div>
              <button className="prof-edit-btn" onClick={() => setEditing(true)}>Edit profile</button>
            </div>
          )}
        </div>

        {editing ? (
          <>
            <div className="prof-fld"><label>Full name</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your name" /></div>
            <div className="prof-fld"><label>Headline</label><input value={form.headline} onChange={e => set('headline', e.target.value)} placeholder="e.g. Writer · Organizer · Perpetually mid-book" maxLength={120} /></div>
            <div className="prof-fld"><label>Bio</label><textarea rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="A sentence or two about you." /></div>
            <div className="prof-actions">
              <button className="prof-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button className="prof-cancel" onClick={() => { setForm(f => ({ ...f, full_name: m.full_name || '', headline: m.headline || '', bio: m.bio || '' })); setEditing(false); setStatus('') }}>Cancel</button>
              {status === 'error' && <span className="prof-err">Couldn’t save — try again.</span>}
            </div>
          </>
        ) : (
          <>
            <div className={`prof-bio${form.bio ? '' : ' empty'}`}>{form.bio || 'No bio yet — tell the community a bit about yourself.'}</div>
            {status === 'saved' && <div className="prof-ok" style={{ marginTop: 12 }}>Saved ✓</div>}
          </>
        )}
      </div>

      {articles.length > 0 && (
        <>
          <div style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 14px' }}>Written for The Parlor</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {articles.map(a => (
              <a key={a.id} href={`/post/${a.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: 8, overflow: 'hidden', background: '#f2ece4', marginBottom: 8 }}>{a.cover_image_url && <img src={a.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                <div style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{a.date_published ? new Date(a.date_published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
              </a>
            ))}
          </div>
        </>
      )}

      {blogPosts.length > 0 && (
        <>
          <div style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 14px' }}>Blog posts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blogPosts.map(bp => (
              <a key={bp.id} href={`/portal/blog/${bp.id}`} style={{ display: 'flex', gap: 14, border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: 14, textDecoration: 'none' }}>
                {bp.cover_image_url && <img src={bp.cover_image_url} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: (bp.status === 'approved' || bp.status === 'published') ? '#c4364a' : '#4a6fd4', fontWeight: 600, marginBottom: 3 }}>{(bp.status === 'approved' || bp.status === 'published') ? 'From the community' : 'Member blog'}</div>
                  <div style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 15.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{bp.title}</div>
                  {bp.subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{bp.subtitle}</div>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {ctx?.user?.id && (
        <>
          <div style={{ fontFamily: "'thermal-variable', Georgia, serif", fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 0' }}>Your posts</div>
          <PostsWall memberId={ctx.user.id} currentUserId={ctx.user.id} />
        </>
      )}
        </div>

        <aside className="prof-rail">
          <div className="pg-groups">
            <div className="pg-groups-h">My forums</div>
            <div className="pg-groups-sub">Forums you’re part of</div>
            {groups.loading ? <div className="pg-groups-empty">Loading…</div>
              : groups.items.length === 0 ? <div className="pg-groups-empty">You’re not in any groups yet.</div>
              : groups.items.map(g => (
                <a key={g.id} className="pg-group" href={`/portal/forums/${g.id}`}>
                  <span className="pg-group-name">{g.name}{g.my_role === 'host' ? ' · host' : ''}</span>
                  <span className="pg-group-count">{g.member_count || 0} member{g.member_count === 1 ? '' : 's'}</span>
                </a>
              ))}
            <a href="/portal/groups" style={{ display: 'block', textAlign: 'center', marginTop: 14, padding: '9px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'thermal-variable', Georgia, serif", fontSize: 13, color: 'var(--ink)', textDecoration: 'none' }}>Browse forums</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return <PortalShell active="profile"><ProfileView /></PortalShell>
}
