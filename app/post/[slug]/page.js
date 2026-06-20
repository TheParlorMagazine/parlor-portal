import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import { checkItemAccess } from '../../../lib/checkAccess'
import ArticleBody from './_components/ArticleBody'
import { createClient } from '../../../lib/supabase'
import { existsSync } from 'fs'
import path from 'path'
import SiteHeader from '../../_components/SiteHeader'
import SiteFooter from '../../_components/SiteFooter'
import ScrollToTop from '../../_components/ScrollToTop'
import SubscribeWall from './_components/SubscribeWall'

const db = createClient()

function parseHtmlAttrs(str) {
  const attrs = {}
  const re = /([\w-]+)="([^"]*)"/g
  let m
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
  }
  return attrs
}

function parseBodySegments(html) {
  if (!html) return []
  const segments = []
  const pat = /<div\s+data-type="(audio-block|video-block|embed-block|album-block)"([^>]*)>\s*<\/div>/gi
  let last = 0
  let m
  while ((m = pat.exec(html)) !== null) {
    if (m.index > last) {
      const chunk = html.slice(last, m.index).trim()
      if (chunk) segments.push({ kind: 'html', content: chunk })
    }
    segments.push({ kind: m[1], attrs: parseHtmlAttrs(m[2]) })
    last = pat.lastIndex
  }
  if (last < html.length) {
    const chunk = html.slice(last).trim()
    if (chunk) segments.push({ kind: 'html', content: chunk })
  }
  return segments
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data: article } = await db
    .from('articles')
    .select('title, subtitle, cover_image_url, published_at, author_name')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!article) return { title: 'Not Found — The Parlor' }

  const title = `${article.title} — The Parlor`
  const description = article.subtitle || 'An article from The Parlor Magazine.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.published_at || undefined,
      authors: article.author_name ? [article.author_name] : [],
      images: article.cover_image_url
        ? [{ url: article.cover_image_url, width: 1200, height: 630, alt: article.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  }
}

export default async function ArticlePage({ params }) {
  const { slug } = await params

  const { data: article } = await db
    .from('articles')
    .select('*, writers(name, bio, photo_url, profile_url)')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!article) notFound()

  // Always use live writer profile data when available, fall back to article snapshot
  if (article.writers) {
    article.author_name     = article.writers.name        || article.author_name
    article.author_bio      = article.writers.bio         || article.author_bio
    article.author_photo_url   = article.writers.photo_url    || article.author_photo_url
    article.author_profile_url = article.writers.profile_url  || article.author_profile_url
  }

  // Authenticated user
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  )
  const { data: { user } } = await authClient.auth.getUser()
  const userId = user?.id || null

  // Article-level access check
  let articleHasAccess = true
  if (article.paywall_type === 'paywall' || article.paywall_type === 'members') {
    const result = await checkItemAccess(userId, article.id, 'article')
    articleHasAccess = result.hasAccess
  }

  // Parse body and resolve per-block access
  const rawSegments = parseBodySegments(article.body || '')
  const segments = await Promise.all(
    rawSegments.map(async (seg) => {
      if (seg.kind === 'audio-block' && seg.attrs?.paywalled === 'true') {
        const { hasAccess } = await checkItemAccess(userId, article.id, 'audio')
        return { ...seg, hasAccess }
      }
      if (seg.kind === 'video-block' && seg.attrs?.paywalled === 'true') {
        const { hasAccess } = await checkItemAccess(userId, article.id, 'video')
        return { ...seg, hasAccess }
      }
      return seg
    })
  )

  // Related articles — same category first, fallback to recents
  let related = []
  if (article.category) {
    const { data } = await db
      .from('articles')
      .select('id, slug, title, cover_image_url, category, published_at, author_name')
      .eq('published', true)
      .eq('category', article.category)
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(3)
    related = data || []
  }
  if (related.length === 0) {
    const { data } = await db
      .from('articles')
      .select('id, slug, title, cover_image_url, category, published_at, author_name')
      .eq('published', true)
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(3)
    related = data || []
  }

  // Custom template
  if (article.template === 'custom') {
    const customPath = path.join(process.cwd(), 'app', 'post', '_custom', `${slug}.jsx`)
    if (existsSync(customPath)) {
      try {
        const mod = await import(/* webpackIgnore: true */ `../../_custom/${slug}.jsx`)
        const CustomComponent = mod.default
        if (CustomComponent) {
          return <CustomComponent article={article} userId={userId} segments={segments} articleHasAccess={articleHasAccess} />
        }
      } catch {
        // fall through to standard template
      }
    }
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.subtitle || '',
    image: article.cover_image_url || undefined,
    datePublished: article.published_at || undefined,
    author: article.author_name
      ? { '@type': 'Person', name: article.author_name }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'The Parlor Magazine',
    },
  }

  return (
    <>
      <ScrollToTop />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader hideOnScroll activeCategory={article.category} />

      <main style={{ background: '#fff', minHeight: '100vh' }}>

        {/* Article header */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 24px 0' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: '1.15',
            fontWeight: '700', color: '#0a0a0a',
            margin: '0 0 18px', letterSpacing: '-0.02em',
          }}>
            {article.title}
          </h1>

          {article.subtitle && (
            <p style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '20px', lineHeight: '1.5', color: '#555',
              margin: '0 0 28px', fontWeight: '300',
            }}>
              {article.subtitle}
            </p>
          )}

          {/* Byline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            {article.author_photo_url ? (
              <img
                src={article.author_photo_url}
                alt={article.author_name || ''}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : article.author_name ? (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#f2b8c6', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Playfair Display', serif", fontSize: '14px',
                fontWeight: '600', color: '#c4364a',
              }}>
                {article.author_name[0]}
              </div>
            ) : null}

            <div>
              {article.author_name && (
                <div style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '14px', color: '#0a0a0a',
                }}>
                  {article.author_profile_url ? (
                    <a href={article.author_profile_url} style={{ color: '#0a0a0a', textDecoration: 'none' }}>
                      {article.author_name}
                    </a>
                  ) : article.author_name}
                </div>
              )}
              {publishedDate && (
                <div style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '12px', color: '#999',
                  marginTop: article.author_name ? '2px' : 0,
                }}>
                  {publishedDate}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cover image */}
        {article.cover_image_url && (
          <div style={{ maxWidth: '900px', margin: '0 auto 48px', padding: '0 24px' }}>
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt || article.title}
              style={{
                width: '100%', aspectRatio: '16/9', objectFit: 'cover',
                borderRadius: '4px', display: 'block',
              }}
            />
            {article.cover_image_caption && (
              <p style={{
                margin: '10px 0 0', fontSize: '13px', lineHeight: '1.5',
                color: '#888', fontStyle: 'italic',
                fontFamily: "'Source Serif 4', Georgia, serif",
              }}>
                {article.cover_image_caption}
              </p>
            )}
          </div>
        )}

        {/* Subscribe wall — only for guests */}
        {!userId && <SubscribeWall />}

        {/* Article body */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>
          <ArticleBody
            segments={segments}
            articleId={article.id}
            paywallType={article.paywall_type || 'free'}
            paywallPrice={article.paywall_price}
            stripePriceId={article.stripe_price_id}
            articleHasAccess={articleHasAccess}
            userId={userId}
          />
        </div>

        {/* Author box */}
        {article.author_name && (
          <div style={{ borderTop: '1px solid #f0e8e0', borderBottom: '1px solid #f0e8e0', padding: '40px 24px', marginBottom: '64px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {article.author_photo_url ? (
                <img
                  src={article.author_photo_url}
                  alt={article.author_name}
                  style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                  background: '#f2b8c6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '700', color: '#c4364a',
                }}>
                  {article.author_name[0]}
                </div>
              )}
              <div>
                <div style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#999', marginBottom: '6px',
                }}>
                  About the author
                </div>
                {article.author_profile_url ? (
                  <a
                    href={article.author_profile_url}
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '18px', fontWeight: '700', color: '#0a0a0a',
                      textDecoration: 'none', display: 'block', marginBottom: '8px',
                    }}
                  >
                    {article.author_name}
                  </a>
                ) : (
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '18px', fontWeight: '700', color: '#0a0a0a', marginBottom: '8px',
                  }}>
                    {article.author_name}
                  </div>
                )}
                {article.author_bio && (
                  <div
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '15px', lineHeight: '1.65', color: '#555', margin: 0 }}
                    dangerouslySetInnerHTML={{ __html: article.author_bio }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '22px', fontWeight: '700', color: '#0a0a0a',
              marginBottom: '28px', letterSpacing: '-0.01em',
            }}>
              More from The Parlor
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '28px',
            }}>
              {related.map(r => (
                <a
                  key={r.id}
                  href={`/post/${r.slug}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  {r.cover_image_url && (
                    <img
                      src={r.cover_image_url}
                      alt={r.title}
                      style={{
                        width: '100%', aspectRatio: '3/2', objectFit: 'cover',
                        borderRadius: '4px', display: 'block', marginBottom: '12px',
                      }}
                    />
                  )}
                  {r.category && (
                    <div style={{
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontSize: '11px', textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: '#c4364a', marginBottom: '6px',
                    }}>
                      {r.category}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '17px', fontWeight: '700', color: '#0a0a0a', lineHeight: '1.3',
                  }}>
                    {r.title}
                  </div>
                  {r.author_name && (
                    <div style={{
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontSize: '13px', color: '#999', marginTop: '6px',
                    }}>
                      {r.author_name}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

      </main>

      <SiteFooter />
    </>
  )
}
