'use client'

import { useState, useEffect, use } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import SiteHeader from '../_components/SiteHeader'
import SiteFooter from '../_components/SiteFooter'

const VERTICALS = {
  'work-wealth': 'Work & Wealth',
  'society-culture': 'Society & Culture',
  'world-politics': 'World & Politics',
  'perspectives-identity': 'Perspectives & Identity',
}

function esc(s) { return (s ?? '').toString() }

function formatDate(s) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function wixCover(url, w = 720, q = 85) {
  try {
    const u = new URL(url)
    if (!/static\.wixstatic\.com$/.test(u.hostname) || !/\/media\//.test(u.pathname)) return url
    if (/\/v1\//.test(u.pathname)) return url
    const ext = (u.pathname.match(/\.(jpe?g|png|webp)$/i) || ['', '.jpg'])[1].toLowerCase()
    return `${u.origin}${u.pathname}/v1/fill/w_${w},q_${q},al_c,usm_0.66_1.00_0.01/${encodeURIComponent('image.' + ext)}`
  } catch (e) { return url }
}

function wixAvatar(url, size = 96, q = 80) {
  try {
    const u = new URL(url)
    if (!/static\.wixstatic\.com$/.test(u.hostname) || !/\/media\//.test(u.pathname)) return url
    if (/\/v1\//.test(u.pathname)) return url
    const ext = (u.pathname.match(/\.(jpe?g|png|webp)$/i) || ['', '.jpg'])[1]
    return `${u.origin}${u.pathname}/v1/fill/w_${size},h_${size},q_${q},al_c,usm_0.66_1.00_0.01/${encodeURIComponent('avatar.' + ext)}`
  } catch (e) { return url }
}

export default function VerticalPage({ params }) {
  const { vertical } = use(params)
  const category = VERTICALS[vertical]
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll) }
  }, [])

  useEffect(() => {
    if (!category) return
    async function loadArticles() {
      setLoading(true)
      const { data, error } = await supabase
        .from('articles')
        .select('slug, title, excerpt, cover_image_url, author_name, author_photo_url, author_profile_url, category, article_category, theme, date_published, media_type, featured')
        .eq('published', true)
        .eq('category', category)
        .order('date_published', { ascending: false })
      if (!error && data) setArticles(data)
      setLoading(false)
    }
    loadArticles()
  }, [category])

  if (!category) notFound()

  // The featured article for this vertical anchors a full-width hero. Only one can
  // be featured per vertical (enforced at save time), so pick the first if present.
  const featured = articles.find(a => a.featured && a.media_type !== 'member_post')
  const editorial = articles.filter(a => a.media_type !== 'member_post' && a.slug !== featured?.slug)
  const memberPosts = articles.filter(a => a.media_type === 'member_post')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #ffffff; font-family: 'Source Serif 4', Georgia, serif; }
        a { text-decoration: none; color: inherit; }

        .vertical-hero {
          background: #0a0a0a;
          padding: 64px 40px 0;
          text-align: center;
          overflow: hidden;
        }
        .vertical-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 56px); font-weight: 700;
          color: #ffffff; line-height: 1.08; margin: 0;
        }
        .vertical-hero-img {
          display: block; width: 100%; max-width: 820px;
          margin: 0 auto -4px; height: auto;
        }

        /* Full-width featured hero — the vertical's featured article. */
        .feat-hero {
          position: relative;
          min-height: 520px;
          display: flex;
          align-items: flex-end;
          background: #0a0a0a center/cover no-repeat;
          overflow: hidden;
        }
        .feat-hero-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.35) 45%, rgba(10,10,10,0.9) 100%);
        }
        .feat-hero-inner {
          position: relative; z-index: 1;
          max-width: 900px; margin: 0 auto; width: 100%;
          padding: 0 40px 56px;
        }
        .feat-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #f2b8c6; margin-bottom: 18px;
        }
        .feat-hero-badge {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #0a0a0a; background: #f2b8c6; border-radius: 999px; padding: 3px 10px;
        }
        .feat-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 5vw, 60px); font-weight: 700;
          color: #ffffff; line-height: 1.06; margin: 0 0 16px; max-width: 20ch;
        }
        .feat-hero-title a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .feat-hero-excerpt {
          font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.82);
          max-width: 62ch; margin: 0 0 20px;
        }
        .feat-hero-byline {
          display: flex; align-items: center; gap: 10px;
          font-size: 14px; color: rgba(255,255,255,0.7);
        }
        .feat-hero-byline .avatarWrap { width: 34px; height: 34px; }
        .feat-hero-author { color: #ffffff; font-weight: 600; }
        .feat-hero-cta {
          display: inline-block; margin-top: 22px;
          font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
          color: #0a0a0a; background: #f2b8c6; padding: 12px 26px; border-radius: 999px;
          transition: background 0.15s;
        }
        .feat-hero-cta:hover { background: #ffffff; }

        .vertical-grid-section { padding: 48px 40px 72px; max-width: 980px; margin: 0 auto; }
        .vertical-list {
          display: flex;
          flex-direction: column;
        }
        .vertical-empty {
          text-align: center; padding: 80px 20px;
          color: #6b7280; font-size: 16px; font-style: italic;
        }

        .strip {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          padding: 32px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .strip:first-child { padding-top: 0; }
        .strip-media { position: relative; display: block; height: 100%; align-self: stretch; }
        .strip-cover { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
        .strip-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .strip-chip {
          display: inline-block;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 12px; border-radius: 999px; line-height: 1.4;
        }
        .strip-chip-type { background: #1a1a1a; color: #ffffff; }
        .strip-chip-theme { background: transparent; color: #7a2531; border: 1px solid #7a2531; transition: background 0.15s, color 0.15s; }
        a.strip-chip-theme:hover { background: #7a2531; color: #ffffff; }
        .strip-meta { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
        .byline { display: flex; align-items: center; gap: 10px; font-size: 13px; line-height: 1.2; color: #6b7280; }
        .avatarWrap { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex: 0 0 32px; }
        .avatar { width: 100%; height: 100%; object-fit: cover; display: block; }
        .authorLink { color: #374151; font-weight: 600; }
        .articleDate { color: #9ca3af; font-size: 12px; }
        .titleLink { display: block; color: #111827; }
        .titleLink:hover { text-decoration: underline; text-underline-offset: 2px; }
        .title { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; color: #111827; line-height: 1.28; }
        .excerpt { margin: 0; font-size: 15px; line-height: 1.6; color: #4b5563; }

        @media (max-width: 700px) {
          .strip { grid-template-columns: 1fr; gap: 16px; padding: 24px 0; }
          .strip-media, .strip-cover { height: auto; }
          .strip-cover { aspect-ratio: 16/10; }
          .title { font-size: 21px; }
          .vertical-hero { padding: 48px 24px 36px; }
          .vertical-grid-section { padding: 36px 20px 56px; }
          .feat-hero { min-height: 420px; }
          .feat-hero-inner { padding: 0 24px 40px; }
          .feat-hero-excerpt { font-size: 16px; }
        }
      `}</style>

      <SiteHeader activeCategory={category} />

      {featured ? (
        <section
          className="feat-hero"
          style={featured.cover_image_url ? { backgroundImage: `url(${wixCover(featured.cover_image_url, 1600, 82)})` } : undefined}
        >
          <div className="feat-hero-scrim" />
          <div className="feat-hero-inner">
            <div className="feat-hero-eyebrow">
              <span>{category}</span>
              <span className="feat-hero-badge">Featured</span>
            </div>
            <h1 className="feat-hero-title">
              <a href={featured.slug ? `/post/${featured.slug}` : '#'}>{esc(featured.title)}</a>
            </h1>
            {featured.excerpt && <p className="feat-hero-excerpt">{esc(featured.excerpt)}</p>}
            <div className="feat-hero-byline">
              {featured.author_photo_url && (
                <span className="avatarWrap">
                  <img className="avatar" src={wixAvatar(featured.author_photo_url)} alt="" loading="lazy" decoding="async" />
                </span>
              )}
              {featured.author_profile_url ? (
                <a className="feat-hero-author" href={featured.author_profile_url} target="_top">{esc(featured.author_name)}</a>
              ) : (
                <span className="feat-hero-author">{esc(featured.author_name)}</span>
              )}
              {featured.date_published && <span>· {formatDate(featured.date_published)}</span>}
            </div>
            <a className="feat-hero-cta" href={featured.slug ? `/post/${featured.slug}` : '#'}>Read the story</a>
          </div>
        </section>
      ) : (vertical === 'work-wealth' || vertical === 'society-culture' || vertical === 'world-politics' || vertical === 'perspectives-identity') ? (
        <div style={{ position: 'relative', background: '#0a0a0a', lineHeight: 0, overflow: 'hidden' }}>
          {/* Illustration — shifted up to crop transparent top area */}
          <img
            src={
              vertical === 'work-wealth' ? '/hero-work-wealth.png'
              : vertical === 'society-culture' ? '/hero-society-culture.png'
              : vertical === 'world-politics' ? '/hero-world-politics.png'
              : '/hero-perspectives-identity.png'
            }
            alt=""
            style={{
              display: 'block', width: '100%', height: 'auto',
              marginTop: vertical === 'society-culture' ? '-8%' : '-14%',
              marginBottom: vertical === 'society-culture' ? '-14%' : '-14%',
              opacity: ready ? 1 : 0,
              filter: ready ? 'blur(0px)' : 'blur(12px)',
              transition: 'opacity 0.9s ease, filter 0.9s ease',
            }}
          />
          {/* Vignette gradient — fades all four edges to black */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: `
              linear-gradient(to bottom, #0a0a0a 0%, transparent 25%, transparent 65%, #0a0a0a 100%),
              linear-gradient(to right, #0a0a0a 0%, transparent 15%, transparent 85%, #0a0a0a 100%)
            `,
          }} />
          {/* Title — fades in on load, centered */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 4, padding: '0 24px',
            paddingTop: vertical === 'perspectives-identity' ? '12%' : '0',
            background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 100%)',
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1s 0.2s ease, transform 1.2s 0.2s cubic-bezier(.22,1,.36,1)',
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700, fontSize: 'clamp(42px, 7vw, 88px)', lineHeight: 1.02,
              color: '#fff', margin: 0, letterSpacing: '-0.01em', textAlign: 'center',
              textShadow: '0 2px 32px rgba(0,0,0,0.5)',
            }}>
              {category}
            </h1>
          </div>
        </div>
      ) : (
        <section className="vertical-hero">
          <h1 className="vertical-title">{category}</h1>
        </section>
      )}

      <section className="vertical-grid-section">
        {!loading && articles.length === 0 && (
          <div className="vertical-empty">No articles published in this section yet.</div>
        )}
        <div className="vertical-list">
          {editorial.map(a => {
            const avatarOriginal = a.author_photo_url || ''
            const href = a.slug ? `/post/${a.slug}` : '#'
            return (
              <div className="strip" key={a.slug}>
                <a className="strip-media" href={href}>
                  {a.cover_image_url && (
                    <img className="strip-cover" src={wixCover(a.cover_image_url)} alt="" loading="lazy" decoding="async" />
                  )}
                </a>
                <div className="strip-meta">
                  {(a.article_category || a.theme) && (
                    <div className="strip-chips">
                      {a.article_category && <span className="strip-chip strip-chip-type">{esc(a.article_category)}</span>}
                      {a.theme && <a className="strip-chip strip-chip-theme" href={`/portal/library?theme=${encodeURIComponent(a.theme)}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>{esc(a.theme)}</a>}
                    </div>
                  )}
                  <div className="byline">
                    {avatarOriginal && (
                      <span className="avatarWrap">
                        <img className="avatar" src={wixAvatar(avatarOriginal)} alt="" loading="lazy" decoding="async" />
                      </span>
                    )}
                    {a.author_profile_url ? (
                      <a className="authorLink" href={a.author_profile_url} target="_top">{esc(a.author_name)}</a>
                    ) : (
                      <span className="authorLink">{esc(a.author_name)}</span>
                    )}
                    {a.date_published && <span className="articleDate">· {formatDate(a.date_published)}</span>}
                  </div>
                  <a className="titleLink" href={href}>
                    <h3 className="title">{esc(a.title)}</h3>
                  </a>
                  {a.excerpt && <p className="excerpt">{esc(a.excerpt)}</p>}
                </div>
              </div>
            )
          })}
        </div>

        {memberPosts.length > 0 && (
          <div style={{ marginTop: 56, paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>From our members</h2>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a2531', border: '1px solid #7a2531', borderRadius: 999, padding: '3px 10px' }}>Member posts</span>
            </div>
            <div className="vertical-list">
              {memberPosts.map(a => {
                const href = a.slug ? `/post/${a.slug}` : '#'
                return (
                  <div className="strip" key={a.slug} style={{ background: '#fdf5f6', borderRadius: 12, padding: '20px 20px', border: '1px solid #f0e0e4' }}>
                    <a className="strip-media" href={href}>
                      {a.cover_image_url && <img className="strip-cover" src={wixCover(a.cover_image_url)} alt="" loading="lazy" decoding="async" />}
                    </a>
                    <div className="strip-meta">
                      <div className="strip-chips"><span className="strip-chip" style={{ background: '#7a2531', color: '#fff' }}>Member post</span></div>
                      <div className="byline">
                        <span className="authorLink">{esc(a.author_name)}<span style={{ color: '#9a7680' }}> · Parlor member</span></span>
                        {a.date_published && <span className="articleDate">· {formatDate(a.date_published)}</span>}
                      </div>
                      <a className="titleLink" href={href}><h3 className="title">{esc(a.title)}</h3></a>
                      {a.excerpt && <p className="excerpt">{esc(a.excerpt)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </>
  )
}
