export default function ArticleShareCard({ article, cover }) {
  const title = (article.title || 'The Parlor').slice(0, 180)
  return <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f2b8c6', color: '#151114', fontFamily: 'ParlorSerif' }}>
    <div style={{ display: 'flex', flexDirection: 'column', width: cover ? 660 : 1200, padding: '48px 52px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>The Parlor</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {article.category && <div style={{ display: 'flex', color: '#744555', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>{article.category}</div>}
        <div style={{ display: 'flex', fontSize: title.length > 110 ? 34 : title.length > 65 ? 42 : 52, lineHeight: 1.12, fontWeight: 700 }}>{title}{(article.title || '').length > 180 ? '…' : ''}</div>
        {article.subtitle && <div style={{ display: 'flex', fontSize: 23, lineHeight: 1.25, color: '#563c46', marginTop: 18 }}>{article.subtitle.length > 150 ? `${article.subtitle.slice(0, 147)}…` : article.subtitle}</div>}
        {article.author_name && <div style={{ display: 'flex', fontSize: 23, color: '#563c46', marginTop: 26 }}>By {article.author_name.slice(0, 100)}</div>}
      </div>
      <div style={{ display: 'flex', fontSize: 18, color: '#563c46' }}>theparlormagazine.com</div>
    </div>
    {cover && <div style={{ display: 'flex', width: 540, height: 630, background: '#fdf8f5' }}><img src={cover} width={540} height={630} style={{ objectFit: 'cover' }} /></div>}
  </div>
}
