import AboutShell from '../_components/AboutShell'
import FoundingTeamCards from '../_components/FoundingTeamCards'

export const metadata = {
  title: 'The People of The Parlor | The Parlor',
  description: 'Meet the founding team behind The Parlor, an independent feminist publication and digital community.',
  alternates: { canonical: 'https://theparlormagazine.com/about/people' },
}
export default function PeoplePage() {
  return <AboutShell activePage="/about/people">
    <section className="people-content">
      <h2>The People of The Parlor</h2>
      <p>The Parlor is made possible by a collective of artists, writers, and nonprofit professionals who volunteer their time and skills to produce the publication and support its community programs.</p>
      <h3>Our Founding Team</h3>
      <FoundingTeamCards />
    </section>
  </AboutShell>
}
