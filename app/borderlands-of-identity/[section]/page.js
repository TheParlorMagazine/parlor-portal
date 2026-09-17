'use client'

import { useParams, notFound } from 'next/navigation'
import SiteHeader from '../../_components/SiteHeader'
import SiteFooter from '../../_components/SiteFooter'
import IssueStyles from '../_components/IssueStyles'
import TopicNav from '../_components/TopicNav'
import TopicCards from '../_components/TopicCards'
import { ISSUE, SECTIONS, getSection, getSectionIndex } from '../_data'

export default function ChapterPage() {
  const params = useParams()
  const slug = params?.section
  const sec = getSection(slug)
  if (!sec) return notFound()

  const idx = getSectionIndex(slug)
  const prev = idx > 0 ? SECTIONS[idx - 1] : null
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null
  const count = sec.articles.length

  return (
    <div className="boi-root">
      <IssueStyles />
      <SiteHeader />
      <TopicNav activeSlug={slug} />

      <section className="boi-chapter-hero">
        <div className="boi-chapter-figure">
          <img src={sec.image} alt={sec.title} decoding="async" />
        </div>
        <div className="boi-chapter-copy">
          <div className="boi-chapter-eyebrow">
            <a href={`/${ISSUE.slug}`}>{ISSUE.title}</a> · Chapter {idx + 1} of {SECTIONS.length}
          </div>
          <h1 className="boi-chapter-title">{sec.title}</h1>
          <p className="boi-chapter-sub">{sec.subtitle}</p>
          <div className="boi-chapter-count">
            {count} {count === 1 ? 'piece' : 'pieces'} in this chapter
          </div>
        </div>
      </section>

      <div className="boi-wrap">
        <TopicCards articles={sec.articles} disableScrollArrows={sec.disableScrollArrows} />
      </div>

      <nav className="boi-chapnav" aria-label="Chapter navigation">
        {prev ? (
          <a className="prev" href={`/${ISSUE.slug}/${prev.slug}`}>
            <span className="boi-chapnav-label">← Previous chapter</span>
            <span className="boi-chapnav-title">{prev.title}</span>
          </a>
        ) : (
          <a className="prev" href={`/${ISSUE.slug}`}>
            <span className="boi-chapnav-label">← Back to</span>
            <span className="boi-chapnav-title">All chapters</span>
          </a>
        )}
        {next && (
          <a className="next" href={`/${ISSUE.slug}/${next.slug}`}>
            <span className="boi-chapnav-label">Next chapter →</span>
            <span className="boi-chapnav-title">{next.title}</span>
          </a>
        )}
      </nav>

      <SiteFooter />
    </div>
  )
}
