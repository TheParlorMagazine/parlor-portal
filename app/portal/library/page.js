'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import { libCss } from './libCss'

function monthKey(s) { return (s || '').slice(0, 7) }
function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function matches(item, q) {
  if (!q) return true
  const hay = [item.title, item.subtitle, item.excerpt, item.category, item.article_category, item.theme, item.author_name, ...(Array.isArray(item.tags) ? item.tags : [])]
    .filter(Boolean).join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay.includes(t))
}

function Card({ a }) {
  const cover = a.cover_image_url
  const paid = a.paywall_type === 'paywall'
  return (
    <a className="lib-card" href={a.slug ? `/portal/library/${a.slug}` : '#'}>
      <div className="card-thumb thumb-essay" style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {!cover && (
          <div className="thumb-lines">
            <div className="thumb-line dark" style={{ width: '65%' }} />
            <div className="thumb-line" style={{ width: '90%' }} />
            <div className="thumb-line" style={{ width: '80%' }} />
            <div className="thumb-line" style={{ width: '70%' }} />
          </div>
        )}
        {a.is_new && <span className="new-badge">New</span>}
        {paid && <span className="new-badge" style={{ background: '#000', color: '#fff', left: 10, right: 'auto' }}>Members</span>}
      </div>
      <div className="card-body">
        <div className="card-type"><div className="type-dot td-essay" /><span className="tc-essay">{a.article_category || 'Article'}</span></div>
        <div className="card-title">{a.title}</div>
        {a.author_name && <div className="card-author">{a.author_name}</div>}
        {a.excerpt && <div className="card-note">{a.excerpt}</div>}
      </div>
    </a>
  )
}

const ICON = {
  book: <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  lines: <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  dot: <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>,
}

export default function PortalLibraryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [state, setState] = useState('loading')
  const [items, setItems] = useState([])
  const [themes, setThemes] = useState([])
  const [filter, setFilter] = useState({ kind: 'all', value: null }) // all | type | month | theme | saved | history
  const [query, setQuery] = useState('')
  const [openAcc, setOpenAcc] = useState('month') // only one section open at a time
  const toggleAcc = k => setOpenAcc(cur => (cur === k ? null : k))

  // Deep-link: /portal/library?theme=<name> pre-selects that theme filter.
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('theme')
      if (t) { setFilter({ kind: 'theme', value: t }); setOpenAcc('theme') }
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push(`/login?returnTo=${encodeURIComponent('/portal/library' + (typeof window !== 'undefined' ? window.location.search : ''))}`); return }
      try {
        const res = await fetch('/api/member-library', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (cancelled) return
        setItems(data.items || []); setThemes(data.themes || []); setState('ready')
      } catch { if (!cancelled) setState('error') }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const types = useMemo(() => {
    const s = new Set(items.map(i => i.article_category).filter(Boolean))
    return Array.from(s).sort()
  }, [items])
  const months = useMemo(() => {
    const s = new Set(items.map(i => monthKey(i.date_published)).filter(Boolean))
    return Array.from(s).sort().reverse()
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (filter.kind === 'type') list = list.filter(i => i.article_category === filter.value)
    else if (filter.kind === 'month') list = list.filter(i => monthKey(i.date_published) === filter.value)
    else if (filter.kind === 'theme') list = list.filter(i => i.theme === filter.value)
    else if (filter.kind === 'saved' || filter.kind === 'history') list = []
    return list.filter(i => matches(i, query))
  }, [items, filter, query])

  const activeTheme = filter.kind === 'theme' ? themes.find(t => t.name === filter.value) : null
  const sbItem = (key, label, active, onClick, icon) => (
    <div key={key} className={`sb-item${active ? ' active' : ''}`} onClick={onClick}>{icon || ICON.dot}<span>{label}</span></div>
  )

  return (
    <>
      <style>{libCss}</style>
      <div className="lib-shell">
        <aside className="sidebar">
          <div className="sb-logo"><div>The Parlor<small>The Archive</small></div>
            <a href="/" title="Parlor home" className="sb-home-btn"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2L2 7v7h4v-4h4v4h4V7L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <a href="/portal" className="sb-item sb-slim"><svg viewBox="0 0 16 16" fill="none"><path d="M6 3L1 8l5 5M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Back to dashboard</a>
          <div className="sb-section">Browse</div>
          {sbItem('all', 'All items', filter.kind === 'all', () => setFilter({ kind: 'all' }), ICON.book)}

          <div className={`sb-section sb-accordion-header${openAcc === 'type' ? ' open' : ''}`} onClick={() => toggleAcc('type')}>By content type</div>
          <div className={`sb-accordion-content${openAcc === 'type' ? ' open' : ''}`}>
            {types.map(t => sbItem(`type-${t}`, t, filter.kind === 'type' && filter.value === t, () => setFilter({ kind: 'type', value: t }), ICON.lines))}
          </div>

          <div className={`sb-section sb-accordion-header${openAcc === 'month' ? ' open' : ''}`} onClick={() => toggleAcc('month')}>By month</div>
          <div className={`sb-accordion-content${openAcc === 'month' ? ' open' : ''}`}>
            {months.map(m => sbItem(`month-${m}`, monthLabel(m), filter.kind === 'month' && filter.value === m, () => setFilter({ kind: 'month', value: m })))}
          </div>

          <div className={`sb-section sb-accordion-header${openAcc === 'theme' ? ' open' : ''}`} onClick={() => toggleAcc('theme')}>By theme</div>
          <div className={`sb-accordion-content${openAcc === 'theme' ? ' open' : ''}`}>
            {themes.map(t => sbItem(`theme-${t.name}`, t.name, filter.kind === 'theme' && filter.value === t.name, () => setFilter({ kind: 'theme', value: t.name }),
              <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.9 4.3 13.4l.8-4.2L2 6.4l4.2-.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            ))}
          </div>
        </aside>

        <div className="library-content">
          <div className="lib-topbar">
            <div className="lib-page-title">The Archive</div>
          </div>

          {activeTheme && (
            <div className="theme-banner">
              <div>
                <div className="theme-label">Theme</div>
                <div className="theme-name">{activeTheme.name}</div>
                {activeTheme.description && <div className="theme-desc">{activeTheme.description}</div>}
              </div>
              {activeTheme.forum_cta_text && <button className="theme-cta">{activeTheme.forum_cta_text} &rsaquo;</button>}
            </div>
          )}

          <div className="filters-bar">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, width: '100%' }}>
              <button className={`filter-btn${filter.kind === 'saved' ? ' active' : ''}`} onClick={() => setFilter(f => f.kind === 'saved' ? { kind: 'all' } : { kind: 'saved' })}>Saved items</button>
              <button className={`filter-btn${filter.kind === 'history' ? ' active' : ''}`} onClick={() => setFilter(f => f.kind === 'history' ? { kind: 'all' } : { kind: 'history' })}>Reading history</button>
            </div>
            <div className="lib-search-wrap">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              <input className="lib-search-input" placeholder="Search library..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>

          {state === 'loading' && <div className="lib-msg">Opening the Library…</div>}
          {state === 'error' && <div className="lib-msg">Couldn’t load the Library.</div>}
          {state === 'ready' && (
            (filter.kind === 'saved' || filter.kind === 'history')
              ? <div className="lib-msg">Saved items and reading history are coming soon.</div>
              : filtered.length === 0
                ? <div className="lib-msg">No items match.</div>
                : <div className="library-grid">{filtered.map(a => <Card key={a.slug} a={a} />)}</div>
          )}
        </div>
      </div>
    </>
  )
}

