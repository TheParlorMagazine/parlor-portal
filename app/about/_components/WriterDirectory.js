'use client'

import { useState } from 'react'

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
export default function WriterDirectory({ writers = [], unavailable = false }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = writers.filter(w => normalize(w.name).includes(normalize(query)))
  const suggestions = matches.slice(0, 6)
  const open = focused && !!query.trim() && suggestions.length > 0
  function choose(name) { setQuery(name); setFocused(false); setActive(-1) }
  return <>
    <div className="writer-search">
      <label htmlFor="writer-name-search">Find a contributing writer</label>
      <div className="writer-search-field">
        <input id="writer-name-search" type="search" role="combobox" aria-autocomplete="list"
          aria-expanded={open} aria-controls={open ? 'writer-name-suggestions' : undefined}
          aria-activedescendant={open && active >= 0 ? `writer-suggestion-${active}` : undefined}
          autoComplete="off" placeholder="Search contributing writers…" value={query}
          onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setActive(-1) }}
          onChange={e => { setQuery(e.target.value); setFocused(true); setActive(-1) }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setFocused(false); setActive(-1) }
            if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setFocused(true); setActive(i => (i + 1) % suggestions.length) }
            if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setFocused(true); setActive(i => i <= 0 ? suggestions.length - 1 : i - 1) }
            if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(suggestions[active].name) }
          }} />
        <svg className="writer-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        {open && <ul id="writer-name-suggestions" className="writer-suggestions" role="listbox" aria-label="Writer name suggestions">
          {suggestions.map((w, i) => <li key={w.id} id={`writer-suggestion-${i}`} role="option" aria-selected={active === i}
            onMouseDown={e => e.preventDefault()} onClick={() => choose(w.name)}>{w.name}</li>)}
        </ul>}
      </div>
    </div>
    <p role="status">{unavailable ? 'Writer profiles are temporarily unavailable. Please try again shortly.' : `${matches.length} ${matches.length === 1 ? 'writer' : 'writers'}${query ? ' found' : ''}`}</p>
    {!unavailable && !matches.length && <p>{query ? 'No writers match that name. Try another name.' : 'No contributing writer profiles are listed yet.'}</p>}
    <div className="writer-directory">{matches.map(w => <a className="writer-card" key={w.id} href={`/about/people/writers/${encodeURIComponent(w.slug)}`}>
      {w.photo_url ? <img className="writer-portrait" src={w.photo_url} alt="" loading="lazy" decoding="async" /> : <span className="writer-initial" aria-hidden="true">{w.name.slice(0, 1)}</span>}
      <h4>{w.name}</h4><span>Read More →</span>
    </a>)}</div>
  </>
}
