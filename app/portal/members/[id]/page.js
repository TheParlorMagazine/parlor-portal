'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell, { usePortal } from '../../_components/PortalShell'
import PostsWall from '../../_components/PostsWall'

const SERIF = "'thermal-variable', Georgia, serif"
const ROLE_LABELS = { admin: 'Master Admin', editor: 'Editor', writer: 'Writer', finance_admin: 'Finance Admin', social_admin: 'Social Admin' }

function View() {
  const { id } = useParams()
  const ctx = usePortal()
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState({ loading: true, member: null, articles: [], blog_posts: [] })

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch(`/api/portal/members/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) { setState({ loading: false, member: null, articles: [], blog_posts: [] }); return }
        const d = await res.json(); setState({ loading: false, member: d.member, articles: d.articles || [], blog_posts: d.blog_posts || [] })
      } catch { setState({ loading: false, member: null, articles: [], blog_posts: [] }) }
    })()
  }, [id, supabase])

  if (state.loading) return <div style={{ maxWidth: 720 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!state.member) return <div style={{ maxWidth: 720 }}><a href="/portal" style={{ fontSize: 12.5, color: 'var(--muted)' }}>← Dashboard</a><div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream)', padding: 28, textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>This member isn’t available.</div></div>

  const m = state.member
  const initial = (m.full_name || 'M').trim().charAt(0).toUpperCase()
  const roleLabel = ROLE_LABELS[m.role]
  const currentUserId = ctx?.user?.id

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Banner */}
      <div style={{ height: 190, borderRadius: '14px 14px 0 0', overflow: 'hidden', background: 'linear-gradient(120deg, #f2b8c6 0%, #fce8ec 55%, #ecd8f0 100%)' }}>
        {m.banner_url && <img src={m.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 14px 14px', background: '#fff', padding: '0 24px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: -50 }}>
          <div style={{ width: 112, height: 112, borderRadius: '50%', border: '4px solid #fff', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 44, color: '#000', overflow: 'hidden', flexShrink: 0 }}>
            {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
          </div>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{m.full_name || 'Member'}</div>
            {m.headline && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 3 }}>{m.headline}</div>}
            {roleLabel && <div style={{ display: 'inline-block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8a5a00', background: 'var(--goldlight)', borderRadius: 20, padding: '2px 9px', marginTop: 7 }}>{roleLabel}</div>}
          </div>
        </div>
        {m.bio && <div style={{ fontSize: 15, lineHeight: 1.65, color: '#333', marginTop: 18, whiteSpace: 'pre-wrap' }}>{m.bio}</div>}
      </div>

      {state.articles.length > 0 && (
        <>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 14px' }}>Written for The Parlor</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {state.articles.map(a => (
              <a key={a.id} href={`/post/${a.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: 8, overflow: 'hidden', background: '#f2ece4', marginBottom: 8 }}>{a.cover_image_url && <img src={a.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                <div style={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{a.date_published ? new Date(a.date_published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
              </a>
            ))}
          </div>
        </>
      )}

      {state.blog_posts.length > 0 && (
        <>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 14px' }}>Blog posts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.blog_posts.map(bp => (
              <a key={bp.id} href={`/portal/blog/${bp.id}`} style={{ display: 'flex', gap: 14, border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: 14, textDecoration: 'none' }}>
                {bp.cover_image_url && <img src={bp.cover_image_url} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: (bp.status === 'approved' || bp.status === 'published') ? '#c4364a' : '#4a6fd4', fontWeight: 600, marginBottom: 3 }}>{(bp.status === 'approved' || bp.status === 'published') ? 'From the community' : 'Member blog'}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{bp.title}</div>
                  {bp.subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{bp.subtitle}</div>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      <div style={{ fontFamily: SERIF, fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', margin: '26px 0 0' }}>Posts</div>
      <PostsWall memberId={id} currentUserId={currentUserId} />
    </div>
  )
}

export default function MemberProfilePage() {
  return <PortalShell active=""><View /></PortalShell>
}
