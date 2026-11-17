export default function MissionArticleCards({ articles = [] }) {
  if (!articles.length) return null
  return <ul className="mission-article-cards">
    {articles.map(article => <li key={article.slug}>
      <a href={article.href} className="mission-article-card">
        {article.image && <img src={article.image} alt="" loading="lazy" decoding="async" />}
        <span>{article.slug === 'occupied-minnesota-inside-the-resistance-to-operation-metro-surge' ? 'Occupied Minnesota' : article.title}</span>
      </a>
    </li>)}
  </ul>
}
