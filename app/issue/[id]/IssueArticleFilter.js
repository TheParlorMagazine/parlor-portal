'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const css = `
  .iaf-bar-wrap {
    position: sticky;
    top: 0;
    z-index: 200;
    background: #fff;
    border-bottom: 1px solid #e8e3dd;
    padding: 0 24px;
  }
  .iaf-bar-outer {
    max-width: 1120px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  /* inner wrapper clips the bar and holds the fades */
  .iaf-bar-inner {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .iaf-bar {
    display: flex;
    gap: 10px;
    padding: 16px 0;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .iaf-bar::-webkit-scrollbar { display: none; }
  .iaf-chevron {
    display: none;
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #0a0a0a;
    font-size: 24px;
    line-height: 1;
    padding: 4px 4px;
    opacity: 0.7;
    transition: opacity 0.15s;
    user-select: none;
    z-index: 2;
  }
  .iaf-chevron:hover { opacity: 1; }
  .iaf-chevron.hidden { visibility: hidden; }
  .iaf-fade-left, .iaf-fade-right {
    display: none;
    position: absolute;
    top: 0; bottom: 0;
    width: 48px;
    pointer-events: none;
    z-index: 1;
    transition: opacity 0.2s;
  }
  .iaf-fade-left  { left: 0;  background: linear-gradient(to right, #fff 20%, transparent); }
  .iaf-fade-right { right: 0; background: linear-gradient(to left,  #fff 20%, transparent); }
  .iaf-fade-left.hidden, .iaf-fade-right.hidden { opacity: 0; }
  @media (max-width: 900px) {
    .iaf-bar-wrap { padding: 0 4px; }
    .iaf-chevron { display: flex; align-items: center; }
    .iaf-fade-left, .iaf-fade-right { display: block; }
  }

  .iaf-pill {
    flex-shrink: 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border: 1.5px solid #c89aa5;
    color: #7a2531;
    background: #fff;
    border-radius: 999px;
    padding: 8px 20px;
    cursor: pointer;
    white-space: nowrap;
    outline: none;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, padding 0.22s ease;
  }
  .iaf-pill:hover:not(.active) { background: #7a2531; color: #fff; border-color: #7a2531; }
  .iaf-pill.active {
    background: #0a0a0a;
    color: #fff;
    border-color: #0a0a0a;
    padding: 8px 26px;
  }

  .issue-grid { display: flex; flex-direction: column; gap: 0; }
  .issue-card { text-decoration: none; color: inherit; display: grid; grid-template-columns: 320px 1fr; gap: 36px; align-items: start; padding: 40px 0; border-bottom: 1px solid #e8e3dd; }
  .issue-card:first-child { border-top: 1px solid #e8e3dd; }
  .issue-card:hover .issue-card-title { text-decoration: underline; text-decoration-color: #ccc; }
  .issue-card-img { width: 100%; aspect-ratio: 4/3; overflow: hidden; border-radius: 4px; background: #f2ece4; flex-shrink: 0; }
  .issue-card-img img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; transform: scale(1.15); transform-origin: center; transition: transform 0.3s ease; }
  .issue-card:hover .issue-card-img img { transform: scale(1.19); }
  .issue-card-body { display: flex; flex-direction: column; justify-content: center; }
  .issue-card-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .issue-pill-type { font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: #0a0a0a; color: #fff; border-radius: 999px; padding: 3px 10px; }
  .issue-pill-cat { font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid #c89aa5; color: #7a2531; border-radius: 999px; padding: 3px 10px; background: #fff; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; text-decoration: none; display: inline-block; }
  .issue-pill-cat:hover { background: #7a2531; color: #fff; border-color: #7a2531; }
  .issue-card-byline { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .issue-card-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #e8e2db; }
  .issue-card-author { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #555; }
  .issue-card-date { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #999; }
  .issue-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; line-height: 1.15; margin: 0 0 12px; color: #0a0a0a; }
  .issue-card-desc { font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; line-height: 1.7; color: #555; margin: 0; font-weight: 300; max-width: 60ch; }
  .iaf-fade { animation: iaf-in 0.25s ease both; }
  @keyframes iaf-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (max-width: 700px) { .issue-card { grid-template-columns: 1fr; gap: 16px; } }
`

export default function IssueArticleFilter({ articles, sections }) {
  const [active, setActive] = useState('All')
  const barRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function updateChevrons() {
    const el = barRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    // Run after layout so clientWidth/scrollWidth are correct
    const t = setTimeout(updateChevrons, 50)
    const ro = new ResizeObserver(updateChevrons)
    ro.observe(el)
    window.addEventListener('resize', updateChevrons)
    return () => { clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', updateChevrons) }
  }, [sections])

  function scrollBar(dir) {
    barRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }

  const filtered = active === 'All'
    ? articles
    : articles.filter(a => (a.sections?.title || null) === active)

  function pick(label) {
    setActive(label)
    // Scroll grid into view smoothly
    document.getElementById('issue-article-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <>
      <style>{css}</style>

      {/* Sticky filter bar */}
      <div className="iaf-bar-wrap">
        <div className="iaf-bar-outer">
          <button className={`iaf-chevron${canLeft ? '' : ' hidden'}`} onClick={() => scrollBar(-1)} aria-label="Scroll left">‹</button>
          <div className="iaf-bar-inner">
            <div className={`iaf-fade-left${canLeft ? '' : ' hidden'}`} />
            <div ref={barRef} className="iaf-bar" role="toolbar" aria-label="Filter articles by section" onScroll={updateChevrons}>
              {['All', ...sections].map(s => (
                <button
                  key={s}
                  className={`iaf-pill${active === s ? ' active' : ''}`}
                  onClick={() => pick(s)}
                  aria-pressed={active === s}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className={`iaf-fade-right${canRight ? '' : ' hidden'}`} />
          </div>
          <button className={`iaf-chevron${canRight ? '' : ' hidden'}`} onClick={() => scrollBar(1)} aria-label="Scroll right">›</button>
        </div>
      </div>

      {/* Article grid */}
      <section id="issue-article-grid" style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(40px,6vh,72px) 24px 96px' }}>
        {filtered.length === 0 ? (
          <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '17px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
            No articles in this section yet.
          </p>
        ) : (
          <div key={active} className="issue-grid iaf-fade">
            {filtered.map(a => {
              const typeLabel = a.sections?.title || null
              const catLabel = a.article_category || a.theme || a.category || null
              const desc = a.excerpt || a.subtitle || null
              const dateStr = a.date_published
                ? new Date(a.date_published).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : null
              return (
                <Link key={a.slug} href={`/post/${a.slug}`} className="issue-card">
                  {a.cover_image_url && (
                    <div className="issue-card-img">
                      <img
                        src={a.cover_image_url}
                        alt={a.title || ''}
                        style={a.slug === 'against-the-cloud' ? { objectPosition: '5% 65%' } : undefined}
                      />
                    </div>
                  )}
                  <div className="issue-card-body">
                    {(typeLabel || catLabel) && (
                      <div className="issue-card-pills">
                        {typeLabel && <span className="issue-pill-type">{typeLabel}</span>}
                        {catLabel && (
                          <button
                            className="issue-pill-cat"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `/portal/library?theme=${encodeURIComponent(catLabel)}` }}
                          >
                            {catLabel}
                          </button>
                        )}
                      </div>
                    )}
                    {a.author_name && (
                      <div className="issue-card-byline">
                        {a.author_photo_url
                          ? <img src={a.author_photo_url} alt={a.author_name} className="issue-card-avatar" />
                          : <div className="issue-card-avatar" />
                        }
                        <span className="issue-card-author">{a.author_name}</span>
                        {dateStr && <span className="issue-card-date">· {dateStr}</span>}
                      </div>
                    )}
                    <h2 className="issue-card-title">{a.title}</h2>
                    {desc && <p className="issue-card-desc">{desc}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
