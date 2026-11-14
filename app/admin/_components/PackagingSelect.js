'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { PACKAGE_SIZES } from '../../../lib/shopPackaging'

const options = [{ id: '', label: 'Choose packaging size…' }, ...PACKAGE_SIZES]

export default function PackagingSelect({ value, onChange }) {
  const id = useId(), root = useRef(null), trigger = useRef(null), search = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false), [active, setActive] = useState(0)
  const selected = Math.max(0, options.findIndex(option => option.id === value))
  useEffect(() => {
    if (!open) return
    function outside(event) { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, id])
  function choose(index) { onChange(options[index].id); setOpen(false); trigger.current?.focus() }
  function keyDown(event) {
    const key = event.key
    if (key === 'Tab') { setOpen(false); return }
    if (key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false) } return }
    if (key === 'Enter' || key === ' ') { event.preventDefault(); if (open) choose(active); else { setActive(selected); setOpen(true) } return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault()
      setActive(key === 'Home' ? 0 : key === 'End' ? options.length - 1 : !open ? selected : Math.max(0, Math.min(options.length - 1, active + (key === 'ArrowDown' ? 1 : -1))))
      setOpen(true); return
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now(), text = (now - search.current.time < 700 ? search.current.text : '') + key.toLowerCase()
      search.current = { text, time: now }
      const found = options.findIndex(option => option.label.toLowerCase().startsWith(text))
      if (found >= 0) { setActive(found); setOpen(true) }
    }
  }
  return <div ref={root} style={{ position: 'relative' }}>
    <button ref={trigger} id="product-packaging-size" type="button" role="combobox" aria-label="Packaging size" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} onKeyDown={keyDown} onBlur={event => { if (!event.currentTarget.parentElement.contains(event.relatedTarget)) setOpen(false) }} onClick={() => { setActive(selected); setOpen(!open) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: `1px solid ${open ? '#a3324c' : '#e5e0e2'}`, borderRadius: 8, background: '#fff', color: '#0a0a0a', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, textAlign: 'left', cursor: 'pointer', boxShadow: open ? '0 0 0 2px #f9e8ee' : 'none' }}>
      <span>{options[selected].label}</span><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }}><path d="m4 6 4 4 4-4" fill="none" stroke="#666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div id={`${id}-list`} role="listbox" aria-label="Packaging sizes" style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 10, maxHeight: 260, overflowY: 'auto', padding: 5, border: '1px solid #e5e0e2', borderRadius: 8, background: '#fff', boxShadow: '0 8px 24px #30121d1a', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14 }}>
      {options.map((option, index) => <div key={option.id} id={`${id}-option-${index}`} role="option" aria-selected={value === option.id} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '10px 9px', borderRadius: 5, cursor: 'pointer', lineHeight: 1.4, color: index === active ? '#8d2942' : '#222', background: index === active ? '#faf0f3' : '#fff' }}><span aria-hidden="true" style={{ width: 14, flexShrink: 0 }}>{value === option.id ? '✓' : ''}</span><span>{option.label}</span></div>)}
    </div>}
  </div>
}
