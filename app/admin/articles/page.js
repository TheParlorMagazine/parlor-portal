'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'


export default function AdminArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('role')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (memberError) {
        console.error('Admin check — member query error:', memberError)
        router.push('/dashboard')
        return
      }

      const isAdmin = member?.role === 'admin'
      if (!isAdmin) {
        console.error('Admin check — role is not admin:', member?.role)
        router.push('/dashboard')
        return
      }

      const { data } = await supabase
        .from('articles')
        .select('id, title, author_name, category, created_at, published')
        .order('created_at', { ascending: false })

      if (cancelled) return
      setArticles(data || [])
      setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [])

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title || 'this article'}"? This cannot be undone.`)) return
    setDeletingId(id)
    await supabase.from('articles').delete().eq('id', id)
    setArticles(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#444', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '14px',
    }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '48px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/admin" style={{ color: '#444', textDecoration: 'none', fontSize: '12px' }}>
              ← Admin
            </Link>
            <h1 style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px', fontWeight: '600', color: '#fff',
            }}>
              Articles
            </h1>
            <span style={{
              fontSize: '12px', color: '#444',
              background: '#1a1a1a', padding: '3px 10px', borderRadius: '20px',
            }}>
              {articles.length}
            </span>
          </div>
          <Link href="/admin/articles/new" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#f2b8c6', color: '#0a0a0a',
              border: 'none', padding: '10px 20px', borderRadius: '7px',
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              letterSpacing: '0.01em',
            }}>
              + New Article
            </button>
          </Link>
        </div>

        {/* Table */}
        {articles.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '100px 0',
            color: '#2a2a2a', fontSize: '15px', fontStyle: 'italic',
          }}>
            No articles yet. Create your first one.
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(242,184,198,0.1)', borderRadius: '10px', overflow: 'hidden' }}>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '3fr 1.5fr 1.8fr 1fr 96px 130px',
              padding: '11px 20px',
              background: '#0e0e0e',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {['Title', 'Author', 'Category', 'Date', 'Status', ''].map(h => (
                <div key={h} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3a3a3a' }}>
                  {h}
                </div>
              ))}
            </div>

            {articles.map((article, i) => (
              <ArticleRow
                key={article.id}
                article={article}
                isLast={i === articles.length - 1}
                deleting={deletingId === article.id}
                onDelete={() => handleDelete(article.id, article.title)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArticleRow({ article, isLast, deleting, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1.5fr 1.8fr 1fr 96px 130px',
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)',
        alignItems: 'center',
        background: hovered ? '#0f0f0f' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ paddingRight: '16px', overflow: 'hidden' }}>
        <div style={{ fontSize: '14px', color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.title || <span style={{ color: '#444', fontStyle: 'italic' }}>Untitled</span>}
        </div>
      </div>
      <div style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
        {article.author_name || '—'}
      </div>
      <div style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
        {article.category || '—'}
      </div>
      <div style={{ fontSize: '12px', color: '#444' }}>
        {article.created_at
          ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : '—'}
      </div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '11px',
          padding: '3px 9px', borderRadius: '20px',
          background: article.published ? 'rgba(242,184,198,0.12)' : 'rgba(255,255,255,0.04)',
          color: article.published ? '#f2b8c6' : '#444',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: article.published ? '#f2b8c6' : '#333', flexShrink: 0 }} />
          {article.published ? 'Live' : 'Draft'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
        <Link href={`/admin/articles/${article.id}/edit`} style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'none',
            border: '1px solid rgba(242,184,198,0.2)',
            color: '#f2b8c6',
            padding: '5px 13px', borderRadius: '5px',
            fontSize: '12px', cursor: 'pointer',
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}>
            Edit
          </button>
        </Link>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#3a3a3a',
            padding: '5px 13px', borderRadius: '5px',
            fontSize: '12px', cursor: deleting ? 'not-allowed' : 'pointer',
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}
        >
          {deleting ? '…' : 'Del'}
        </button>
      </div>
    </div>
  )
}
