'use client'

import { useEffect, useState } from 'react'
import WriterDirectory from './WriterDirectory'
import FoundingTeamCards from './FoundingTeamCards'

const sections = [
  { id: 'founding-team', label: 'Founding Team' },
  { id: 'contributing-writers', label: 'Contributing Writers' },
  { id: 'fellows', label: 'Fellows' },
]

export default function PeopleSections({ writers = [], writersUnavailable = false }) {
  const [selected, setSelected] = useState('founding-team')
  useEffect(() => {
    const sync = () => { if (sections.some(s => '#' + s.id === window.location.hash)) setSelected(window.location.hash.slice(1)) }
    sync(); window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return <>
    <nav className="people-pills" aria-label="People categories">
      {sections.map(section => <button key={section.id} type="button"
        aria-pressed={selected === section.id} aria-controls={`people-${section.id}`}
        onClick={() => { setSelected(section.id); window.history.replaceState(null, '', '#' + section.id) }}>{section.label}</button>)}
    </nav>
    {sections.map(section => <section key={section.id} id={`people-${section.id}`}
      className="people-category" aria-label={section.label} hidden={selected !== section.id}>
      {section.id === 'founding-team' ? <><h3>Our Founding Team</h3><FoundingTeamCards /></>
        : section.id === 'contributing-writers' ? <><h3>{section.label}</h3><WriterDirectory writers={writers} unavailable={writersUnavailable} /></>
        : <><h3>{section.label}</h3><p>Profiles will be added here soon.</p></>}
    </section>)}
  </>
}
