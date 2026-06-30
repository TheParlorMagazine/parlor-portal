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
  const supabase = createClient()

  useEffect(() => {
    if (!category) return
    async function loadArticles() {
      setLoading(true)
      const { data, error } = await supabase
        .from('articles')
        .select('slug, title, excerpt, cover_image_url, author_name, author_photo_url, author_profile_url, category, article_category, date_published')
        .eq('published', true)
        .eq('category', category)
        .order('date_published', { ascending: false })
      if (!error && data) setArticles(data)
      setLoading(false)
    }
    loadArticles()
  }, [category])

  if (!category) notFound()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #ffffff; font-family: 'Source Serif 4', Georgia, serif; }
        a { text-decoration: none; color: inherit; }

        .vertical-hero {
          background: #0a0a0a;
          padding: 64px 40px 48px;
          text-align: center;
        }
        .vertical-eyebrow {
          font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #f2b8c6; margin-bottom: 16px;
        }
        .vertical-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 56px); font-weight: 700;
          color: #ffffff; line-height: 1.08;
        }

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
        .strip-media { position: relative; display: flex; align-items: center; height: 100%; max-height: 220px; align-self: center; }
        .strip-cover { width: 100%; height: 100%; max-height: 220px; object-fit: cover; object-position: top; display: block; }
        .strip-pill {
          position: absolute; top: 10px; left: 10px;
          background: rgba(10,10,10,0.82); color: #ffffff;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 10px;
        }
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
        }
      `}</style>

      <SiteHeader activeCategory={category} />

      <section className="vertical-hero">
        <div className="vertical-eyebrow">Section</div>
        <h1 className="vertical-title">{category}</h1>
      </section>

      <section className="vertical-grid-section">
        {!loading && articles.length === 0 && (
          <div className="vertical-empty">No articles published in this section yet.</div>
        )}
        <div className="vertical-list">
          {articles.map(a => {
            const avatarOriginal = a.author_photo_url || ''
            const href = a.slug ? `/post/${a.slug}` : '#'
            return (
              <div className="strip" key={a.slug}>
                <a className="strip-media" href={href}>
                  {a.cover_image_url && (
                    <img className="strip-cover" src={wixCover(a.cover_image_url)} alt="" loading="lazy" decoding="async" />
                  )}
                  {a.article_category && <span className="strip-pill">{esc(a.article_category)}</span>}
                </a>
                <div className="strip-meta">
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
      </section>

      <SiteFooter />
    </>
  )
}
