import { notFound } from 'next/navigation'
import AboutShell from '../../../_components/AboutShell'
import { getContributingWriters, getWriterArticles } from '../../../../../lib/contributingWriters'
import { biographyParagraphs } from '../../../../../lib/founderBio'

export const dynamic = 'force-dynamic'
async function findWriter(params) {
  const { slug } = await params
  return (await getContributingWriters()).find(w => w.slug === slug)
}
export async function generateMetadata({ params }) {
  const writer = await findWriter(params)
  return writer ? { title: `${writer.name} | The Parlor`, description: `Read work by ${writer.name}, contributing writer at The Parlor.`, alternates: { canonical: `https://theparlormagazine.com/about/people/writers/${encodeURIComponent(writer.slug)}` } } : { title: 'Writer not found | The Parlor' }
}
export default async function WriterProfile({ params }) {
  const writer = await findWriter(params)
  if (!writer) notFound()
  const articles = await getWriterArticles(writer.id)
  return <AboutShell activePage="/about/people">
    <article className="founder-profile">
      <a className="founder-back" href="/about/people#contributing-writers">← Contributing Writers</a>
      <div className="founder-profile-grid">
        {writer.photo_url ? <img className="writer-portrait" src={writer.photo_url} alt={writer.name} /> : <span className="writer-initial" aria-hidden="true">{writer.name.slice(0, 1)}</span>}
        <div><p className="about-label">Contributing Writer</p><h2>{writer.name}</h2>
          <div className="founder-biography">{biographyParagraphs(writer.bio).map((p, i) => <p key={i}>{p}</p>)}</div>
        </div>
      </div>
      <section className="writer-articles" aria-label={`Articles by ${writer.name}`}>
        <h3>Articles by {writer.name}</h3>
        {articles.length ? <div className="writer-directory">{articles.map(a => <a className="writer-card" key={a.slug} href={`/post/${encodeURIComponent(a.slug)}`}>
          {a.cover_image_url && <img src={a.cover_image_url} alt="" loading="lazy" decoding="async" />}
          <h4>{a.title}</h4>
        </a>)}</div> : <p>No published articles are currently listed for this writer.</p>}
      </section>
    </article>
  </AboutShell>
}
