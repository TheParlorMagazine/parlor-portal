import { foundingTeam } from '../../../lib/foundingTeam'

export default function FoundingTeamCards() {
  return <div className="founding-team-cards">
    {foundingTeam.map(person => <article className="founding-team-card" key={person.slug}>
      <img src={person.image} alt={person.name} loading="lazy" decoding="async" />
      <div className="founding-team-card-copy">
        <h4>{person.name}</h4>
        <p>{person.role}</p>
        <a href={`/about/people/${person.slug}`} aria-label={`Read more about ${person.name}`}>Read More <span aria-hidden="true">→</span></a>
      </div>
    </article>)}
  </div>
}
