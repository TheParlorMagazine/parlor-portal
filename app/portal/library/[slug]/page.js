'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { libCss } from '../libCss'

function monthYear(s) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Short teaser: first couple paragraphs of the body (or the excerpt).
function previewHtml(body, excerpt, n = 2) {
  if (body) {
    const paras = body.match(/<p[\s\S]*?<\/p>/gi)
    if (paras && paras.length) return paras.slice(0, n).join('')
    return `<p>${body.replace(/<[^>]+>/g, ' ').trim().slice(0, 600)}…</p>`
  }
  return excerpt ? `<p>${excerpt}</p>` : '<p>Preview coming soon.</p>'
}

export default function LibraryDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('preview')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push(`/login?returnTo=/portal/library/${slug}`); return }
      try {
        const res = await fetch(`/api/portal/library/${slug}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) throw new Error()
        const d = await res.json()
        if (!cancelled) { setData(d); setState('ready') }
      } catch { if (!cancelled) setState('error') }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const item = data?.item
  const themes = data?.themes || []
  const related = data?.related || []
  const readTime = item?.reading_time_minutes ? `${item.reading_time_minutes} min read` : null

  return (
    <>
      <style>{libCss}</style>
      <div className="lib-shell">
        <aside className="sidebar">
          <div className="sb-logo"><div>The Parlor<small>The Library</small></div>
            <a href="/" title="Parlor home" className="sb-home-btn"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2L2 7v7h4v-4h4v4h4V7L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <a href="/portal" className="sb-item sb-slim sb-border"><svg viewBox="0 0 16 16" fill="none"><path d="M6 3L1 8l5 5M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Back to dashboard</a>
          <div className="sb-section">Browse</div>
          <a href="/portal/library" className="sb-item"><svg viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>All items</a>
          <a href="/portal/library" className="sb-section sb-accordion-header" style={{ textDecoration: 'none' }}>By content type</a>
          <a href="/portal/library" className="sb-section sb-accordion-header" style={{ textDecoration: 'none' }}>By month</a>
          <div className="sb-section sb-accordion-header open">By theme</div>
          <div className="sb-accordion-content open">
            {themes.map(t => (
              <a key={t.name} href="/portal/library" className={`sb-item${item?.theme === t.name ? ' active' : ''}`}>
                <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.9 4.3 13.4l.8-4.2L2 6.4l4.2-.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                <span>{t.name}</span>
              </a>
            ))}
          </div>
        </aside>

        <div className="lib-detail-wrap">
          {state === 'loading' && <div className="lib-msg">Opening…</div>}
          {state === 'error' && <div className="lib-msg">Couldn’t load this piece.</div>}
          {state === 'ready' && item && (
            <>
              <div style={{ padding: '28px 48px 0' }}>
                <a href="/portal/library" className="lib-detail-back"><svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Back to library</a>
              </div>

              <div className="lib-detail-hero" style={{ marginTop: 14 }}>
                {item.cover_image_url && <div className="lib-detail-hero-bg" style={{ backgroundImage: `url(${item.cover_image_url})` }} />}
                <div className="lib-detail-hero-content">
                  <div className="lib-eyebrow"><div className="lib-eyebrow-dot" />{[item.article_category || 'Article', monthYear(item.date_published)].filter(Boolean).join(' · ')}</div>
                  {item.theme && <div className="theme-tag"><svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>{item.theme}</div>}
                  <div className="lib-detail-title">{item.title}</div>
                  <div className="lib-detail-author">{[item.author_name, readTime].filter(Boolean).join(' · ')}</div>
                  {item.editor_note && (
                    <div className="editorial-note">
                      <div className="editorial-label">Editor's note</div>
                      <div className="editorial-text">{item.editor_note}</div>
                      <div className="editorial-sig">— Parlor Editors{monthYear(item.date_published) ? `, ${monthYear(item.date_published)}` : ''}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-actions">
                <button className={`btn-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Preview
                </button>
                <button className={`btn-tab${tab === 'discuss' ? ' active' : ''}`} onClick={() => setTab('discuss')}>
                  <svg viewBox="0 0 20 14" fill="none"><circle cx="3" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M0 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="10" cy="3.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/><path d="M5.8 13c0-2.3 1.9-4.2 4.2-4.2s4.2 1.9 4.2 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="17" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M14 13c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Discuss
                </button>
                <button className={`btn-tab${saved ? ' active' : ''}`} onClick={() => setSaved(s => !s)}>
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v11l-5-3-5 3V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {saved ? 'Saved' : 'Save'}
                </button>
              </div>

              <div className="lib-detail-body">
                {tab === 'preview' ? (
                  <div className="content-area">
                    <div className="content-reader" dangerouslySetInnerHTML={{ __html: previewHtml(item.body, item.excerpt) }} />
                    <div className="content-footer">
                      <span className="content-footer-note">Continue reading on The Parlor Magazine</span>
                      <a className="read-full-btn" href={`/post/${slug}`}>Read full piece →</a>
                    </div>
                  </div>
                ) : (
                  <>
                    {item.discussion_prompt ? (
                      <div className="disc-prompt">
                        <div className="disc-prompt-label">Discussion prompt</div>
                        <div className="disc-prompt-q">{item.discussion_prompt}</div>
                        <button className="disc-join-btn" onClick={() => router.push('/portal')}>Join the discussion &rsaquo;</button>
                      </div>
                    ) : (
                      <div className="disc-prompt">
                        <div className="disc-prompt-label">Start the conversation</div>
                        <div className="disc-prompt-q" style={{ fontSize: 15, color: 'var(--muted)' }}>No one has written about this piece yet. The Reading Room is coming to the portal soon.</div>
                        <div style={{ height: 16 }} />
                      </div>
                    )}
                    {related.length > 0 && (
                      <>
                        <div className="lib-related-head">Also in this theme</div>
                        <div className="lib-related-grid">
                          {related.map(r => (
                            <a key={r.slug} href={`/portal/library/${r.slug}`} className="lib-related-card">
                              <div className="lib-related-thumb">{r.cover_image_url && <img src={r.cover_image_url} alt="" loading="lazy" />}</div>
                              <div className="lib-related-body">
                                <div className="lib-related-type">{r.article_category || 'Article'}</div>
                                <div className="lib-related-title">{r.title}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
