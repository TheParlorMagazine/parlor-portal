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
    .select('slug, title, subtitle, excerpt, cover_image_url, category, article_category, theme, media_type, author_name, author_photo_url, date_published, sections(title)')
    .eq('published', true)
    .eq('issue_id', id)
    .order('date_published', { ascending: false })

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

      {/* Articles */}
      <style>{`
        .issue-grid { display: flex; flex-direction: column; gap: 0; }
        .issue-card { text-decoration: none; color: inherit; display: grid; grid-template-columns: 320px 1fr; gap: 36px; align-items: start; padding: 40px 0; border-bottom: 1px solid #e8e3dd; }
        .issue-card:first-child { border-top: 1px solid #e8e3dd; }
        .issue-card:hover .issue-card-title { text-decoration: underline; text-decoration-color: #ccc; }
        .issue-card-img { width: 100%; aspect-ratio: 4/3; overflow: hidden; border-radius: 4px; background: #f2ece4; flex-shrink: 0; }
        .issue-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s ease; }
        .issue-card:hover .issue-card-img img { transform: scale(1.03); }
        .issue-card-body { display: flex; flex-direction: column; justify-content: center; }
        .issue-card-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .issue-pill-type { font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: #0a0a0a; color: #fff; border-radius: 999px; padding: 3px 10px; }
        .issue-pill-cat { font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid #c89aa5; color: #7a2531; border-radius: 999px; padding: 3px 10px; }
        .issue-card-byline { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .issue-card-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #e8e2db; }
        .issue-card-author { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #555; }
        .issue-card-date { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: #999; }
        .issue-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; line-height: 1.15; margin: 0 0 12px; color: #0a0a0a; }
        .issue-card-desc { font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; line-height: 1.7; color: #555; margin: 0; font-weight: 300; max-width: 60ch; }
        @media (max-width: 700px) { .issue-card { grid-template-columns: 1fr; gap: 16px; } }
      `}</style>
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(40px,6vh,72px) 24px 96px' }}>
        {(!articles || articles.length === 0) ? (
          <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '17px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
            Articles from this issue are coming soon.
          </p>
        ) : (
          <div className="issue-grid">
            {articles.map(a => {
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
                      <img src={a.cover_image_url} alt={a.title || ''} />
                    </div>
                  )}
                  <div className="issue-card-body">
                    {(typeLabel || catLabel) && (
                      <div className="issue-card-pills">
                        {typeLabel && <span className="issue-pill-type">{typeLabel}</span>}
                        {catLabel && <span className="issue-pill-cat">{catLabel}</span>}
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
    </main>
    <SiteFooter />
    </>
  )
}
