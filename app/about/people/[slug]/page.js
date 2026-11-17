import { notFound } from 'next/navigation'
import AboutShell from '../../_components/AboutShell'
import { foundingTeam } from '../../../../lib/foundingTeam'
import { getFounderBiography } from '../../../../lib/founderBio'

export const revalidate = 3600
export function generateStaticParams() { return foundingTeam.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params }) {
  const { slug } = await params
  const person = foundingTeam.find(member => member.slug === slug)
  if (!person) return { title: 'Profile not found | The Parlor' }
  return { title: `${person.name} | The Parlor`, description: `${person.name}, ${person.role} at The Parlor.`, alternates: { canonical: `https://theparlormagazine.com/about/people/${person.slug}` } }
}

export default async function FounderProfilePage({ params }) {
  const { slug } = await params
  const person = foundingTeam.find(member => member.slug === slug)
  if (!person) notFound()
  const paragraphs = await getFounderBiography(person)
  return <AboutShell activePage="/about/people">
    <article className="founder-profile">
      <a className="founder-back" href="/about/people">← The People of The Parlor</a>
      <div className="founder-profile-grid">
        <img src={person.image} alt={person.name} />
        <div><p className="about-label">Our Founding Team</p><h2>{person.name}</h2><p className="founder-role">{person.role}</p>
          <div className="founder-biography">{paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
          {person.linkedin && <a className="founder-linkedin" href={person.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn profile ↗</a>}
        </div>
      </div>
    </article>
  </AboutShell>
}
