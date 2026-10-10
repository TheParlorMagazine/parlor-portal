import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import SiteHeader from '../../_components/SiteHeader'
import SiteFooter from '../../_components/SiteFooter'
import IssueHero from './IssueHero'

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

  const { data: articles } = await db
    .from('articles')
    .select('slug, title, subtitle, cover_image_url, category, author_name, date_published')
    .eq('published', true)
    .eq('issue_id', id)
    .order('date_published', { ascending: false })

  const issued = issue.publication_date
    ? new Date(issue.publication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null

  const isIssue02 = issue.number === 2

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

      {/* Articles */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(40px,6vh,72px) 24px 96px' }}>
        {(!articles || articles.length === 0) ? (
          <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '17px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
            Articles from this issue are coming soon.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '40px' }}>
            {articles.map(a => (
              <Link key={a.slug} href={`/post/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {a.cover_image_url && (
                  <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', borderRadius: '4px', marginBottom: '16px', background: '#f2ece4' }}>
                    <img src={a.cover_image_url} alt={a.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                {a.category && (
                  <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a7580', marginBottom: '8px' }}>
                    {a.category}
                  </div>
                )}
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.2, margin: '0 0 8px', color: '#0a0a0a' }}>
                  {a.title}
                </h2>
                {a.subtitle && (
                  <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '16px', lineHeight: 1.5, color: '#666', margin: '0 0 10px', fontWeight: 300 }}>
                    {a.subtitle}
                  </p>
                )}
                {a.author_name && (
                  <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', color: '#999' }}>
                    By {a.author_name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
    <SiteFooter />
    </>
  )
}
