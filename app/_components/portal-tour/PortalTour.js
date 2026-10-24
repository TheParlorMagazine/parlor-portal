'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import { TOUR_STEPS, TOUR_VERSION, validTourState, shouldOfferTour } from '../../../lib/portalTour'
import styles from './PortalTour.module.css'

const read = (storage, key) => { try { return JSON.parse(storage.getItem(key)) } catch { return null } }
const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)) } catch {} }
const keyFor = id => `parlor-portal-tour:${TOUR_VERSION}:${id}`

export default function PortalTour() {
  const pathname = usePathname()
  const router = useRouter()
  const isPortal = (pathname === '/portal' || pathname.startsWith('/portal/')) && !pathname.startsWith('/portal/setup') && !pathname.startsWith('/portal/join/')
  const [user, setUser] = useState(null)
  const [progress, setProgress] = useState(null)
  const [mode, setMode] = useState('closed')
  const [step, setStep] = useState(0)
  const [activated, setActivated] = useState(false)
  const [rect, setRect] = useState(null)
  const [mobile, setMobile] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [offer, setOffer] = useState(false)
  const dialog = useRef(null)
  const panel = useRef(null)
  const target = useRef(null)
  const dirty = useRef(false)
  const saveChain = useRef(Promise.resolve())
  const currentUser = useRef(null)
  const navigation = useRef(0)
  const config = TOUR_STEPS[step]
  // Do not initialize another auth client on public pages or auth callbacks.
  const supabase = useMemo(() => isPortal ? createClient() : null, [isPortal])

  useEffect(() => {
    if (!supabase) { setUser(null); setMode('closed'); return }
    let live = true
    supabase.auth.getSession().then(({ data }) => { if (live) setUser(data.session?.user || null) }).catch(() => {})
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) { setUser(session?.user || null); if (!session) setMode('closed') }
    })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [supabase])

  const persist = useCallback(async (status, index = step) => {
    if (!user) return
    const state = { version: TOUR_VERSION, status, step: index }
    const key = keyFor(user.id)
    setProgress(state)
    write(localStorage, key, { state, pending: true })
    // Serialize saves so an older in-progress request cannot overwrite Skip/Finish.
    const operation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || session.user.id !== user.id) throw new Error('Session changed')
        const response = await fetch('/api/portal/tour', { method: 'PATCH', signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(state) })
        if (!response.ok) throw new Error('Progress not saved')
        const result = await response.json()
        // A more recent local choice may already be waiting to save.
        const cached = read(localStorage, key)
        if (JSON.stringify(cached?.state) === JSON.stringify(state)) write(localStorage, key, { state: result.state, pending: false })
        if (currentUser.current === user.id) setSyncError(false)
      } catch { if (currentUser.current === user.id) setSyncError(true) }
    }
    saveChain.current = saveChain.current.then(operation, operation)
    await saveChain.current
  }, [user, supabase, step])

  useEffect(() => {
    currentUser.current = user?.id || null
    if (!user || !supabase) return
    let live = true
    setProgress(null); setMode('closed'); setSyncError(false); setOffer(false)
    const key = keyFor(user.id)
    const cached = read(localStorage, key)
    const active = read(sessionStorage, `${key}:active`)
    if (validTourState(cached?.state)) setProgress(cached.state)
    // Running tours resume in this tab, including native-link page transitions.
    if (active && validTourState(cached?.state) && cached.state.status === 'in_progress') {
      setStep(cached.state.step); setActivated(false); setMode('tour')
    }
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || session.user.id !== user.id) return
        const response = await fetch('/api/portal/tour', { signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
        if (!response.ok) throw new Error('Progress unavailable')
        const result = await response.json()
        if (!live) return
        if (cached?.pending && validTourState(cached.state)) {
          await persist(cached.state.status, cached.state.step)
          return
        }
        // Do not replace a choice made while this GET was in flight.
        const latest = read(localStorage, key)
        if (latest?.pending) return
        setProgress(result.state)
        write(localStorage, key, { state: result.state, pending: false })
        if (shouldOfferTour({ ...result.state, eligible: result.eligible }, window.location.pathname) && !active) setOffer(true)
        if (['completed','skipped','postponed'].includes(result.state.status)) {
          write(sessionStorage, `${key}:active`, false)
          if (active) setMode('closed')
        }
      } catch { if (live) setSyncError(true) }
    })()
    return () => { live = false }
    // A step change must not reinitialize the tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase])

  useEffect(() => {
    if (!offer || pathname !== '/portal' || mode !== 'closed') return
    const ready = () => { if (document.querySelector('[data-tour="dashboard-ready"]')) { setOffer(false); setMode('invite') } }
    ready()
    const observer = new MutationObserver(ready)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [offer, pathname, mode])

  useEffect(() => {
    const query = matchMedia('(max-width: 820px)')
    const update = () => setMobile(query.matches)
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const dismiss = useCallback((status = 'postponed') => {
    if (user) write(sessionStorage, `${keyFor(user.id)}:active`, false)
    setOffer(false)
    navigation.current += 1
    setMode('closed'); setRect(null)
    void persist(status)
  }, [user, persist])

  useEffect(() => {
    const element = dialog.current
    if (!element || !['invite','menu'].includes(mode)) return
    const previous = document.activeElement
    element.showModal()
    return () => { element.close(); if (previous?.isConnected) previous.focus() }
  }, [mode])

  useEffect(() => { if (mode === 'tour') panel.current?.focus({ preventScroll: true }) }, [mode, step])

  useEffect(() => {
    if (mode !== 'tour') { setRect(null); return }
    let last = ''
    let scrolled = false
    let highlighted = null
    let spaced = null
    let archiveTools = null
    const measure = () => {
      const candidates = [...document.querySelectorAll(config.selector)]
      const element = candidates.find(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
      target.current = element || null
      if (highlighted && (highlighted !== element || activated)) { highlighted.classList.remove('parlor-tour-highlight', 'parlor-tour-section-highlight'); highlighted = null }
      if (!element || activated) { if (last !== 'none') { last = 'none'; setRect(null) } return }
      if (highlighted !== element) {
        spaced?.classList.remove('parlor-tour-space')
        archiveTools?.classList.remove('parlor-tour-archive-tools')
        if (!config.informational && config.id !== 'archive') {
          spaced = element.parentElement
          spaced?.classList.add('parlor-tour-space')
        }
        if (config.id === 'archive') {
          archiveTools = document.querySelector('[data-tour="archive-tools"]')
          archiveTools?.classList.add('parlor-tour-archive-tools')
        }
        element.classList.add(config.informational ? 'parlor-tour-section-highlight' : 'parlor-tour-highlight'); highlighted = element
      }
      if (!scrolled) {
        element.scrollIntoView({ block: mobile ? 'start' : 'center', behavior: 'instant' })
        scrolled = true
      }
      const bounds = element.getBoundingClientRect()
      const panelBounds = panel.current?.getBoundingClientRect()
      // Measure the whole target. Never turn a clipped rectangle into a thin outline.
      const visible = bounds.top >= (mobile ? 72 : 0) && bounds.bottom <= innerHeight && bounds.left >= 0 && bounds.right <= innerWidth
      const cueWidth = 154, cueHeight = 50, gap = 18
      const toolsBounds = archiveTools?.getBoundingClientRect()
      const positions = config.informational ? [] : [
        { top: toolsBounds ? toolsBounds.top + 4 : bounds.top - cueHeight - gap, left: toolsBounds ? toolsBounds.right - cueWidth - 8 : bounds.left, above: true },
      ]
      const position = positions.map(value => ({ ...value, left: Math.max(24, Math.min(value.left, innerWidth - cueWidth - 24)) })).find(value => {
        if (value.top < (mobile ? 80 : 24) || value.top + cueHeight > innerHeight - 24) return false
        return !panelBounds || value.left + cueWidth < panelBounds.left - 12 || value.left > panelBounds.right + 12 || value.top + cueHeight < panelBounds.top - 12 || value.top > panelBounds.bottom + 12
      })
      const next = visible && position ? position : null
      const signature = JSON.stringify(next)
      if (signature !== last) { last = signature; setRect(next) }
    }
    const clicked = event => { if (!config.informational && target.current && (target.current === event.target || target.current.contains(event.target))) setActivated(true) }
    const changed = () => { if (activated && step < 3) dirty.current = true }
    const escape = event => { if (event.key === 'Escape') { event.preventDefault(); dismiss() } }
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = setInterval(measure, 350)
    measure()
    document.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    document.addEventListener('click', clicked, true)
    document.addEventListener('input', changed, true)
    document.addEventListener('keydown', escape)
    return () => {
      highlighted?.classList.remove('parlor-tour-highlight', 'parlor-tour-section-highlight')
      spaced?.classList.remove('parlor-tour-space')
      archiveTools?.classList.remove('parlor-tour-archive-tools')
      clearInterval(timer); observer.disconnect()
      document.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure)
      document.removeEventListener('click', clicked, true); document.removeEventListener('input', changed, true); document.removeEventListener('keydown', escape)
      target.current = null
    }
  }, [mode, step, pathname, activated, mobile, config, dismiss])

  async function go(index) {
    if (dirty.current && !window.confirm('Continue the tour? Finish or save anything you are writing before leaving this page.')) return
    setOffer(false)
    const request = ++navigation.current
    dirty.current = false
    setStep(index); setActivated(false); setMinimized(false); setMode('tour')
    if (user) write(sessionStorage, `${keyFor(user.id)}:active`, true)
    setBusy(true)
    await persist('in_progress', index)
    setBusy(false)
    if (request !== navigation.current) return
    if (window.location.pathname !== TOUR_STEPS[index].path) router.push(TOUR_STEPS[index].path)
  }
  function activate() {
    const element = target.current
    if (!element) { router.push(config.path); return }
    setActivated(true)
    if (element.matches('input')) element.focus()
    else if (element.matches('a,button')) element.click()
    else { element.setAttribute('tabindex', '-1'); element.focus({ preventScroll: true }) }
  }

  if (!isPortal || !user) return null
  const dashboard = pathname === '/portal'
  return <>
    {dashboard && mode === 'closed' && <>
      <button className={styles.help} aria-label="Open your Parlor tour and help" title="Explore The Parlor" onClick={() => { setOffer(false); setMode('menu') }}>?</button>
      {progress?.status === 'postponed' && <button className={styles.reminder} onClick={() => { setOffer(false); setMode('menu') }}>Your tour is here when you’re ready</button>}
    </>}
    {['invite','menu'].includes(mode) && <dialog ref={dialog} className={styles.dialog} aria-labelledby="parlor-tour-title" onCancel={event => { event.preventDefault(); if (mode === 'invite') dismiss(); else setMode('closed') }}>
      <p className={styles.eyebrow}>A little introduction</p>
      <h2 className={styles.title} id="parlor-tour-title">Make yourself at home</h2>
      <p className={styles.copy}>There’s more to The Parlor than reading. Discover how to share your work, find your people, bring a conversation to life—and explore the Archive.</p>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy} onClick={() => go(0)}>{mode === 'menu' && ['completed','skipped'].includes(progress?.status) ? 'Restart Tour' : 'Start Tour'}</button>
        {mode === 'invite' ? <>
          <button className={styles.secondary} onClick={() => dismiss()}>Maybe Later</button>
          <button className={styles.link} onClick={() => dismiss('skipped')}>Skip Tour</button>
        </> : <button className={styles.link} onClick={() => setMode('closed')}>Close</button>}
      </div>
      {mode === 'menu' && <div className={styles.topics}>
        {['in_progress','postponed'].includes(progress?.status) && <button className={styles.secondary} disabled={busy} onClick={() => go(progress.step)}>Resume your tour</button>}
        {TOUR_STEPS.map((item, index) => <button className={styles.secondary} disabled={busy} key={item.id} onClick={() => go(index)}>{index + 1}. {item.title}</button>)}
      </div>}
      {syncError && <p className={styles.notice} role="status">Account sync is unavailable. Choices stay in this browser until they can be saved.</p>}
    </dialog>}
    {mode === 'tour' && <>
      {rect && !activated && <>
        <button className={styles.cue} style={{ top: rect.top, left: rect.left }} aria-label={config.action} onClick={activate}>
          {config.cue || (mobile ? 'Tap here' : 'Click here')}
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={rect.above ? { transform: 'scale(-1, -1)' } : undefined}><path d="M3 28C18 28 23 19 24 5M16 12l8-8 6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </>}
      <section ref={panel} tabIndex={-1} className={`${styles.panel} ${mobile && minimized ? styles.minimized : ''}`} role="region" aria-labelledby="parlor-tour-step">
        <div className={styles.header}><p className={styles.eyebrow}>Explore The Parlor · {step + 1} of {TOUR_STEPS.length}</p><div className={styles.headerActions}><button className={styles.link} onClick={() => dismiss()}>Pause</button>
          {mobile && <button type="button" className={styles.toggle} aria-label={minimized ? 'Expand tour' : 'Minimize tour'} aria-expanded={!minimized} aria-controls="parlor-tour-content" onClick={() => setMinimized(value => !value)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={minimized ? { transform: 'rotate(180deg)' } : undefined}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
        </div></div>
        <div id="parlor-tour-content" hidden={mobile && minimized}>
        <div className={styles.progress} aria-hidden="true">{TOUR_STEPS.map((item,index) => <span key={item.id} className={`${styles.dot} ${index <= step ? styles.current : ''}`} />)}</div>
        <h2 id="parlor-tour-step" className={styles.title}>{config.title}</h2>
        <p className={styles.copy} aria-live="polite">{activated ? config.after : config.text}</p>
        {!activated && !config.informational && <button className={styles.secondary} disabled={busy} onClick={activate}>{rect ? config.action : `Open ${config.id === 'writing' ? 'article drafts' : config.id === 'archive' ? 'the Archive' : config.id}`}</button>}
        <div className={styles.actions} style={{ marginTop: 16 }}>
          {step > 0 && <button className={styles.link} disabled={busy} onClick={() => go(step - 1)}>Back</button>}
          {step < TOUR_STEPS.length - 1 ? <button className={styles.primary} disabled={busy} onClick={() => go(step + 1)}>Next</button> : <button className={styles.primary} disabled={busy} onClick={() => dismiss('completed')}>Finish & explore</button>}
          <button className={styles.link} disabled={busy} onClick={() => dismiss('skipped')}>Skip Tour</button>
        </div>
        {syncError && <p className={styles.notice} role="status">Progress is saved in this browser; account sync will retry on your next visit.</p>}
        </div>
      </section>
    </>}
  </>
}
