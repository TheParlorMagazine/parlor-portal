'use client'

import { useState } from 'react'

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
export default function WriterDirectory({ writers = [], unavailable = false }) {
  const [query, setQuery] = useState('')
  const matches = writers.filter(w => normalize(w.name).includes(normalize(query)))
  return <>
    <div className="writer-search">
      <label htmlFor="writer-name-search">Find a contributing writer</label>
      <input id="writer-name-search" type="search" list="writer-name-suggestions" autoComplete="off"
        placeholder="Start typing a name…" value={query} onChange={e => setQuery(e.target.value)} />
      <datalist id="writer-name-suggestions">{matches.map(w => <option key={w.id} value={w.name} />)}</datalist>
    </div>
    <p role="status">{unavailable ? 'Writer profiles are temporarily unavailable. Please try again shortly.' : `${matches.length} ${matches.length === 1 ? 'writer' : 'writers'}${query ? ' found' : ''}`}</p>
    {!unavailable && !matches.length && <p>{query ? 'No writers match that name. Try another name.' : 'No contributing writer profiles are listed yet.'}</p>}
    <div className="writer-directory">{matches.map(w => <a className="writer-card" key={w.id} href={`/about/people/writers/${encodeURIComponent(w.slug)}`}>
      {w.photo_url ? <img src={w.photo_url} alt="" loading="lazy" decoding="async" /> : <span className="writer-initial" aria-hidden="true">{w.name.slice(0, 1)}</span>}
      <h4>{w.name}</h4><span>Read More →</span>
    </a>)}</div>
  </>
}
