import { publicationUrl, republicationAuthors } from '../../lib/articleRepublication'

export default function RepublishedAuthorBios({ article }) {
  if (!article?.is_republished) return null
  const authors = republicationAuthors(article).filter(a => a.name && a.bio)
  if (!authors.length) return null
  return <section aria-label={authors.length > 1 ? 'About the authors' : 'About the author'} data-republished-author-bios style={{ borderTop: '1px solid #f0e8e0', borderBottom: '1px solid #f0e8e0', padding: '40px 24px', marginBottom: 64 }}>
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 32 }}>
      {authors.map((author, index) => {
        const photo = publicationUrl(author.photo_url)
        const profile = publicationUrl(author.profile_url)
        const nameStyle = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 8, textDecoration: 'none', display: 'block' }
        return <div key={index} data-republished-author-bio style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {photo ? <img src={photo} alt={author.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, background: '#f2b8c6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#c4364a' }}>{author.name[0]}</div>}
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#999', marginBottom: 6 }}>About the author</div>
            {profile ? <a href={profile} style={nameStyle}>{author.name}</a> : <div style={nameStyle}>{author.name}</div>}
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, lineHeight: 1.65, color: '#555', whiteSpace: 'pre-wrap' }}>{author.bio}</div>
          </div>
        </div>
      })}
    </div>
  </section>
}
