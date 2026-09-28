'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import PortalShell from '../../_components/PortalShell'

const SERIF = "'thermal-variable', Georgia, serif"

function Reader() {
  const { id } = useParams()
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState({ loading: true, post: null })

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch(`/api/portal/blog/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) { setState({ loading: false, post: null }); return }
        const d = await res.json(); setState({ loading: false, post: d.post })
      } catch { setState({ loading: false, post: null }) }
    })()
  }, [id, supabase])

  if (state.loading) return <div style={{ maxWidth: 680 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (!state.post) return <div style={{ maxWidth: 680 }}><a href="/portal" style={{ fontSize: 12.5, color: 'var(--muted)' }}>← Dashboard</a><div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream)', padding: 28, textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>This post isn’t available.</div></div>

  const p = state.post
  const paras = (p.body || '').split(/\n{2,}/).map(x => x.trim()).filter(Boolean)
  const isCommunity = p.status === 'approved' || p.status === 'published'

  return (
    <div style={{ maxWidth: 680 }}>
      <a href={`/portal/members/${p.author_id}`} style={{ fontSize: 12.5, color: 'var(--muted)', display: 'inline-block', marginBottom: 16 }}>← Profile</a>

      <span style={{ display: 'inline-block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, borderRadius: 20, padding: '3px 10px', marginBottom: 14, color: isCommunity ? '#c4364a' : '#4a6fd4', background: isCommunity ? '#fbeaee' : '#eef1fb' }}>
        {isCommunity ? 'From the community' : 'Member blog'}{p.is_self && p.status !== 'released' && p.status !== 'published' && p.status !== 'approved' ? ' · preview' : ''}
      </span>

      <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, lineHeight: 1.15, margin: '0 0 8px' }}>{p.title}</h1>
      {p.subtitle && <p style={{ fontSize: 18, color: '#555', margin: '0 0 12px', lineHeight: 1.4 }}>{p.subtitle}</p>}
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 22 }}>By {p.byline}{p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</div>

      {p.cover_image_url && <img src={p.cover_image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 24, display: 'block' }} />}

      <div style={{ fontSize: 17, lineHeight: 1.75, color: '#1a1a1a', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        {paras.length ? paras.map((x, i) => <p key={i} style={{ margin: '0 0 20px' }}>{x}</p>) : <p style={{ color: '#aaa', fontStyle: 'italic' }}>No content.</p>}
      </div>

      {p.article_slug && (
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <a href={`/post/${p.article_slug}`} style={{ fontFamily: SERIF, fontSize: 15, color: '#c4364a', fontWeight: 500 }}>Read the published version in The Parlor →</a>
        </div>
      )}
    </div>
  )
}

export default function BlogPostPage() {
  return <PortalShell active=""><Reader /></PortalShell>
}
