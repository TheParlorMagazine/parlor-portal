import { existsSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import ArticleBody from '../../post/[slug]/_components/ArticleBody'
import PreviewBanner from './PreviewBanner'
import ScrollToTop from '../../_components/ScrollToTop'

// Use service role key to bypass RLS so drafts are visible in preview
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

export default async function PreviewPage({ params }) {
  const { slug } = await params

  // Custom React component takes priority
  const customPath = path.join(process.cwd(), 'app', 'post', '_custom', `${slug}.jsx`)
  if (existsSync(customPath)) {
    try {
      const mod = await import(/* webpackIgnore: true */ `../../post/_custom/${slug}.jsx`)
      const CustomComponent = mod.default
      if (CustomComponent) return <CustomComponent />
    } catch {
      return (
        <div style={{ padding: '48px', fontFamily: 'Georgia, serif', color: '#888', fontSize: '15px' }}>
          Failed to load component for <code>{slug}</code>. Check the file for syntax errors.
        </div>
      )
    }
  }

  // Fall back to standard article template — fetch draft or published
  const { data: article } = await db
    .from('articles')
    .select('*, writers(name, bio, photo_url, profile_url)')
    .eq('slug', slug)
    .single()

  if (!article) {
    return (
      <div style={{ padding: '48px', fontFamily: 'Georgia, serif', color: '#888', fontSize: '15px' }}>
        No article found for slug <code>{slug}</code>.
      </div>
    )
  }

  // Always use live writer profile data when available, fall back to article snapshot
  if (article.writers) {
    article.author_name        = article.writers.name        || article.author_name
    article.author_bio         = article.writers.bio         || article.author_bio
    article.author_photo_url   = article.writers.photo_url   || article.author_photo_url
    article.author_profile_url = article.writers.profile_url || article.author_profile_url
  }

  const segments = parseBodySegments(article.body || '').map(seg => ({ ...seg, hasAccess: true }))

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <>
      <ScrollToTop />
      <PreviewBanner />

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

        {/* Article body — full access in preview */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 80px' }}>
          <ArticleBody
            segments={segments}
            articleId={article.id}
            paywallType="free"
            paywallPrice={article.paywall_price}
            stripePriceId={article.stripe_price_id}
            articleHasAccess={true}
            userId={null}
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
                  <p style={{
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontSize: '15px', lineHeight: '1.65', color: '#555', margin: 0,
                  }}>
                    {article.author_bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
