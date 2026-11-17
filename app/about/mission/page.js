import AboutShell from '../_components/AboutShell'
import MissionArticleCards from '../_components/MissionArticleCards'
import { getMissionArticles } from '../../../lib/missionArticles'

export const metadata = {
  title: 'Our Mission | The Parlor',
  description: 'An independent feminist publication and digital community exploring power, grassroots movements, and regenerative futures.',
  alternates: { canonical: 'https://theparlormagazine.com/about/mission' },
}

const chapters = [['purpose', 'Our purpose'], ['focus', 'Our focus'], ['collective', 'Our collective'], ['funding', 'Our funding']]
const tinyNews = <a href="https://tinynewsco.org/" target="_blank" rel="noopener noreferrer">Tiny News Collective</a>

export const revalidate = 3600

export default async function MissionPage() {
  const focusArticles = await getMissionArticles()
  return <AboutShell activePage="/about/mission">
    <div className="mission-chapters">
      <aside className="mission-index" aria-label="On this page">
        <p>ON THIS PAGE</p>
        <nav data-section-index aria-label="Mission sections">{chapters.map(([id, title], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, '0')}</span>{title}</a>)}</nav>
      </aside>
      <div className="mission-body">
        <section className="mission-row" id="purpose"><div data-reveal>
          <p className="about-label">01 / Our purpose</p>
          <h2>Understanding power.<br />Documenting alternatives.</h2>
          <div className="mission-copy">
            <p>We are a digital community and publication that explores how political, economic, and cultural systems shape everyday life—and how communities are organizing to change them.</p>
            <p>Our editorial perspective is feminist, intersectional, anticolonial, and progressive. We examine the structures that concentrate wealth and power, and take seriously the work of people building alternatives rooted in care, ecological regeneration, and collective self-determination.</p>
            <p>We approach this work through rigorous inquiry, thoughtful disagreement, and attention to whose knowledge and experiences are represented.</p>
            <img className="mission-purpose-image" src="https://res.cloudinary.com/dwytmbczs/image/upload/v1794410362/parlor/articles/file_hgptzh.webp" alt="" loading="lazy" decoding="async" />
          </div>
        </div></section>
        <section className="mission-row" id="focus"><div data-reveal>
          <p className="about-label">02 / Our focus</p>
          <h2>The movements and models shaping what comes next.</h2>
          <div className="mission-areas">
            <div><h3>Movements against empire</h3><p>Global movements confronting colonial legacies, imperial power, and extractive systems, and advancing solidarity and self-determination.</p><MissionArticleCards articles={focusArticles[0]} /></div>
            <div><h3>Local and cooperative economies</h3><p>Small businesses, independent commerce, cooperatives, and economic models that sustain local livelihoods and communities.</p><MissionArticleCards articles={focusArticles[1]} /></div>
            <div><h3>Third spaces and collective life</h3><p>The places and practices that make connection possible: gathering spaces, cultural work, mutual aid, and community-led initiatives.</p><MissionArticleCards articles={focusArticles[2]} /></div>
            <div><h3>Regenerative futures</h3><p>How people are restoring relationships with land, resources, and one another while building within, around, and beyond existing systems.</p><MissionArticleCards articles={focusArticles[3]} /></div>
          </div>
        </div></section>
        <section className="mission-row" id="collective"><div data-reveal>
          <p className="about-label">03 / Our collective</p>
          <h2>Built through shared commitment.</h2>
          <div className="mission-copy">
            <p>The Parlor is made possible by a collective of artists, writers, and nonprofit professionals who volunteer their time and skills to produce the publication and support its community programs.</p>
            <p>Our founding team members all work full time, balancing their commitment to The Parlor with caregiving, personal, and other life responsibilities.</p>
            <p>At present, no member of our founding team receives a salary for this work. Building the resources to compensate this labor fairly is an important long-term ambition.</p>
          </div>
        </div></section>
        <section className="mission-row" id="funding"><div data-reveal>
          <p className="about-label">04 / Our funding</p>
          <h2>Independent. Transparent.<br />Working toward sustainability.</h2>
          <div className="mission-copy">
            <p>We are independent and do not receive corporate sponsorships. The Parlor is not a nonprofit organization, but we are proudly fiscally sponsored by {tinyNews}, through which we can receive tax-deductible donations.</p>
            <p>We are experimenting with sustainable revenue streams to keep publishing and running our community programs, while working toward a future in which the people behind this work can be paid.</p>
            <div className="mission-funding-note"><h3>What is fiscal sponsorship?</h3>
              <p>Fiscal sponsorship allows a project that is not itself a nonprofit to receive support through an established nonprofit organization. As our fiscal sponsor, {tinyNews} receives and administers tax-deductible donations in support of our work, with oversight of their charitable use.</p>
              <p>This arrangement is distinct from commercial sponsorship. The Parlor remains responsible for its editorial direction.</p>
            </div>
          </div>
        </div></section>
      </div>
    </div>
    <section className="mission-support" aria-label="Support The Parlor" data-reveal>
      <div><p className="about-label">Help sustain the work</p><h2>Support independent publishing.</h2><p>Paid subscriptions and donations help us continue publishing, maintain our community programs, and build a sustainable future for The Parlor.</p></div>
      <div className="mission-buttons"><a href="/plans">Become a paid subscriber</a><a className="secondary" href="/buy-us-a-birthday-gift">Make a donation</a></div>
    </section>
  </AboutShell>
}
