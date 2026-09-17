import { AUTHOR_HEADSHOTS, initials } from '../_data'

export default function ArticleCard({ a }) {
  const headshot = AUTHOR_HEADSHOTS[a.author]
  return (
    <article className="boi-card" role="listitem">
      <div className="boi-avatar">
        {headshot ? (
          <img src={headshot} alt={a.author} loading="lazy" decoding="async" />
        ) : (
          initials(a.author)
        )}
      </div>
      <div className="boi-meta">
        <h3 className="boi-a-title">{a.title}</h3>
        {a.author && <div className="boi-byline">{a.author}</div>}
        {a.dek && <div className="boi-dek">{a.dek}</div>}
        {a.isLive ? (
          <a className="boi-cta" href={a.url} target="_top" rel="noopener">
            Read more <span aria-hidden="true">→</span>
          </a>
        ) : (
          <span className="boi-soon">Coming soon</span>
        )}
      </div>
    </article>
  )
}
