import { createClient } from '@supabase/supabase-js'
import SiteHeader from '../../_components/SiteHeader'
import SiteFooter from '../../_components/SiteFooter'
import IssueHero from './IssueHero'
import IssueArticleFilter from './IssueArticleFilter'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function generateMetadata({ params }) {
  const { id } = await params
  const { data: issue } = await db.from('issues').select('title').eq('id', id).single()
  return { title: issue ? `${issue.title} — The Parlor` : 'Issue — The Parlor' }
}

export default async function IssuePage({ params }) {
  const { id } = await params

  const { data: issue } = await db
    .from('issues')
    .select('id, title, number, publication_date, cover_image_url')
    .eq('id', id)
    .single()

  if (!issue) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', fontFamily: "'Source Serif 4', Georgia, serif", color: '#888' }}>
        Issue not found.
      </div>
    )
  }

  const [{ data: articles }, { data: shopProducts }] = await Promise.all([
    db.from('articles')
      .select('slug, title, subtitle, excerpt, cover_image_url, category, article_category, theme, media_type, author_name, author_photo_url, date_published, sections(title)')
      .eq('published', true)
      .eq('issue_id', id)
      .order('date_published', { ascending: false }),
    db.from('shop_products')
      .select('id, name, variant, price, images, external_url, category')
      .eq('active', true)
      .eq('category', 'Limited Edition')
      .order('sort'),
  ])

  const issued = issue.publication_date
    ? new Date(issue.publication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null

  const isIssue02 = Number(issue.number) === 2

  return (
    <>
    {!isIssue02 && <SiteHeader />}
    <main style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Issue header */}
      {isIssue02 ? (
        <IssueHero issue={issue} issued={issued} />
      ) : (
        <section style={{ background: 'var(--black, #0a0a0a)', color: '#fff', padding: 'clamp(48px,8vh,96px) 24px', textAlign: 'center' }}>
          {issue.number ? (
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--pink, #f2b8c6)', marginBottom: '16px' }}>
              Issue {String(issue.number).padStart(2, '0')}{issued ? ` · ${issued}` : ''}
            </div>
          ) : issued ? (
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--pink, #f2b8c6)', marginBottom: '16px' }}>
              {issued}
            </div>
          ) : null}
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(38px,6vw,76px)', fontWeight: 700, lineHeight: 1.04, margin: 0, letterSpacing: '-0.01em' }}>
            {issue.title}
          </h1>
        </section>
      )}

      {/* Sticky section filter + article grid */}
      {(!articles || articles.length === 0) ? (
        <section style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(40px,6vh,72px) 24px 96px' }}>
          <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '17px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
            Articles from this issue are coming soon.
          </p>
        </section>
      ) : (
        <IssueArticleFilter
          articles={articles}
          sections={[...new Set((articles || []).map(a => a.sections?.title).filter(Boolean))]}
        />
      )}
      {/* Limited edition shop block */}
      {shopProducts?.length > 0 && (
        <section style={{ background: '#fdf0f3', padding: 'clamp(56px,8vh,96px) 24px' }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4364a', marginBottom: '12px' }}>
              From The Shop
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#0a0a0a', margin: '0 0 40px', lineHeight: 1.15 }}>
              Limited Edition — Issue {issue.number ? String(issue.number).padStart(2, '0') : issue.title}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(shopProducts.length, 3)}, 1fr)`, gap: '28px' }}>
              {shopProducts.map(p => {
                const url = p.external_url || `/shop/${p.id}`
                const price = p.price != null ? `$${Number(p.price).toFixed(2)}` : null
                return (
                  <a key={p.id} href={url} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ aspectRatio: '1', background: '#f5ece9', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: '#0a0a0a', marginBottom: '4px', lineHeight: 1.2 }}>
                      {p.name}{p.variant ? ` — ${p.variant}` : ''}
                    </div>
                    {price && <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '14px', color: '#888', marginBottom: '14px' }}>{price}</div>}
                    <div style={{ marginTop: 'auto', display: 'inline-block', background: '#0a0a0a', color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                      Shop now →
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </main>
    <SiteFooter />
    </>
  )
}
