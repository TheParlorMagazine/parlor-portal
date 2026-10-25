import SiteHeader from '../../_components/SiteHeader'
import SiteFooter from '../../_components/SiteFooter'

export const metadata = {
  title: 'Our Mission | The Parlor',
  description: 'Independent journalism for a world worth reimagining.',
}

export default function MissionPage() {
  return (
    <>
      <SiteHeader hideOnScroll />

      <main className="mission-page">
        <section className="mission-hero">
          <p className="mission-eyebrow">THE PARLOR · OUR MISSION</p>

          <h1>A Room of Our Own.<br />With Sharp Furniture.</h1>

          <p className="mission-tagline">
            Independent journalism for a world worth reimagining.
          </p>

          <img
            className="mission-illustration"
            src="/mission-illustration.png"
            alt="A Victorian settee and gramophone"
          />
        </section>

        <article className="mission-content">
          <section className="mission-intro">
            <p>The world doesn't need another publication telling us everything is broken.</p>

            <p className="mission-emphasis">We know.</p>

            <p>What we need are better questions, sharper conversations, and a little more imagination about what comes next.</p>

            <p>Welcome to <strong>The Parlor</strong>.</p>

            <p>We're an independent magazine exploring the intersections of culture, politics, identity, labor, and power. Through journalism, essays, criticism, and conversations, we challenge conventional wisdom, question the systems we've inherited, and amplify perspectives too often pushed to the margins.</p>
          </section>

          <section className="mission-section">
            <h2>Beyond the Status Quo</h2>

            <p>We're interested in who holds power, who gets left out, and what happens when people decide to do things differently.</p>

            <p>From grassroots movements and mutual aid networks to cooperative economies and new models of collective care, we're particularly interested in the people building alternatives to systems that no longer serve us.</p>

            <p>Not because we believe every alternative is perfect, but because imagining a different future means taking seriously those already creating one.</p>
          </section>

          <section className="mission-section">
            <h2>Our Perspective</h2>

            <p>Our editorial perspective is feminist, intersectional, anticolonial, and critical of systems that concentrate wealth and power at the expense of people and the planet.</p>

            <p>But we're not interested in ideological purity tests or preaching to the converted.</p>

            <p>We believe in rigorous journalism, intellectual curiosity, thoughtful disagreement, and the occasional well-placed swear word.</p>

            <p>We don't pretend to have all the answers. We'd rather ask better questions.</p>
          </section>

          <section className="mission-section mission-ending">
            <h2>More Than a Seat at the Table</h2>

            <p>For too long, the conversation has been dominated by the same voices, institutions, and assumptions.</p>

            <p>We're here to make space for different perspectives, inconvenient truths, ambitious ideas, and the people imagining something beyond the status quo.</p>

            <p>Because we're not simply interested in who gets a seat at the table.</p>

            <p className="mission-final-statement">We're interested in who's building an entirely different room.</p>

            <p className="mission-invitation">So pull up a chair. There's room for you here.</p>
          </section>
        </article>
      </main>

      <SiteFooter />

      <style>{`
        .mission-page {
          background: #fbf5ef;
          color: #34272b;
          min-height: 100vh;
          padding-bottom: 6rem;
        }

        .mission-hero {
          text-align: center;
          padding: 5rem 1.5rem 2rem;
          background: linear-gradient(180deg, #f8e9e9 0%, #fbf5ef 100%);
        }

        .mission-eyebrow {
          font-family: Arial, sans-serif;
          font-size: .72rem;
          font-weight: 700;
          letter-spacing: .22em;
          color: #762434;
          margin: 0 0 2.5rem;
        }

        .mission-hero h1 {
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.6rem, 8vw, 7.5rem);
          font-weight: 400;
          line-height: 1.05;
          color: #762434;
          margin: 0 auto 1.5rem;
          max-width: 1100px;
        }

        .mission-tagline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1rem, 2.3vw, 1.45rem);
          font-style: italic;
          color: #6a424a;
          margin: 0 auto 2rem;
          max-width: 600px;
        }

        .mission-illustration {
          display: block;
          width: min(100%, 680px);
          height: auto;
          margin: 0 auto;
          object-fit: contain;
        }

        .mission-content {
          max-width: 740px;
          margin: 0 auto;
          padding: 1rem 1.75rem;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: clamp(1.05rem, 1.5vw, 1.2rem);
          line-height: 1.85;
        }

        .mission-content p {
          margin: 0 0 1.45rem;
        }

        .mission-intro {
          text-align: center;
          padding: 2rem 0 3rem;
        }

        .mission-emphasis {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2rem, 5vw, 3rem);
          color: #762434;
          font-weight: 700;
          line-height: 1.3;
        }

        .mission-section {
          padding: 3rem 0;
          border-top: 1px solid #dec5c7;
        }

        .mission-section h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.7rem, 3vw, 2.25rem);
          color: #762434;
          line-height: 1.25;
          margin: 0 0 1.8rem;
          font-weight: 600;
        }

        .mission-final-statement {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.4rem, 3vw, 2rem);
          font-weight: 700;
          line-height: 1.5;
          color: #762434;
          margin: 2rem 0;
        }

        .mission-invitation {
          text-align: center;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-size: 1.45rem;
          color: #762434;
          margin-top: 3rem !important;
        }

        @media (max-width: 640px) {
          .mission-hero {
            padding: 3rem 1.25rem 1rem;
          }

          .mission-hero h1 {
            font-size: clamp(3rem, 12vw, 4.5rem);
          }

          .mission-content {
            padding: 1rem 1.4rem;
            line-height: 1.75;
          }

          .mission-section {
            padding: 2.5rem 0;
          }

          .mission-intro {
            padding-top: 1rem;
          }
        }
      `}</style>
    </>
  )
}
