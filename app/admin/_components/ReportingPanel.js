'use client'
import { useEffect, useState } from 'react'
const names = { search: 'Search & SEO', ga4: 'GA4 acquisition', merchant: 'Product visibility', googleAds: 'Google Ads', instagram: 'Instagram / Meta', reddit: 'Reddit Ads', pinterest: 'Pinterest Ads' }
export default function ReportingPanel({ supabase, view, reports, onReport, paidSource = 'googleAds', onSource }) {
  const source = view === 'paid' ? paidSource : view
  const [connections, setConnections] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [start, setStart] = useState(today.slice(0, 8) + '01')
  const [end, setEnd] = useState(today)
  const report = reports[source]
  async function headers() {
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.access_token) throw Error('Sign in again to view reports.')
    return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }
  }
  useEffect(() => { setError('') }, [source])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const response = await fetch('/api/admin/reporting', { headers: await headers() })
        const data = await response.json()
        if (!response.ok) throw Error(data.error || 'Could not check reporting connections.')
        if (active) setConnections(data.connections)
      } catch (err) { if (active) setError(err.message) }
    })()
    return () => { active = false }
  }, [supabase])
  const connection = connections.find(item => item.id === source)
  async function run(event) {
    event.preventDefault(); setBusy(true); setError('')
    const requested = source
    try {
      const response = await fetch('/api/admin/reporting', { method: 'POST', headers: await headers(), body: JSON.stringify({ source: requested, start, end }) })
      let data
      try { data = await response.json() } catch { throw Error('The report did not finish. Try again later.') }
      if (!response.ok) throw Error(data.error || 'Could not load the report.')
      onReport(data.report)
    } catch (err) { setError(`${names[requested]}: ${err.message}`) }
    finally { setBusy(false) }
  }
  return <section style={{ background: 'white', border: '1px solid #e4e4e4', borderRadius: 10, padding: 24, minWidth: 0 }}>
    <h2 style={{ marginTop: 0 }}>{view === 'paid' ? 'Paid marketing campaigns' : names[source]}</h2>
    {view === 'paid' && <label>Platform <select aria-label="Paid marketing platform" value={paidSource} disabled={busy} onChange={e => onSource(e.target.value)}>{['googleAds', 'instagram', 'reddit', 'pinterest'].map(id => <option key={id} value={id}>{names[id]}</option>)}</select></label>}
    <p>{connection ? connection.configured ? report ? 'Last report loaded successfully' : 'Configured · load a report to verify access' : 'Setup required' : 'Checking connection…'}</p>
    {connection && !connection.configured && <div><p>{connection.note}</p>{connection.missing.length > 0 && <p>An administrator needs to configure this account’s reporting credentials and permissions.</p>}</div>}
    <form onSubmit={run} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
      <label>From <input type="date" required disabled={busy} value={start} max={end} onChange={e => setStart(e.target.value)} /></label>
      <label>Through <input type="date" required disabled={busy} value={end} min={start} max={today} onChange={e => setEnd(e.target.value)} /></label>
      <button disabled={busy || !connection?.configured}>{busy ? 'Loading…' : 'Load report'}</button>
    </form>
    {error && <p role="alert" style={{ color: '#a02035' }}>{error}</p>}
    {report && <div><p>{report.name} · {report.start} – {report.end} · retrieved {new Date(report.fetchedAt).toLocaleString()}</p><p>{report.note}</p>
      {report.rows.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{report.columns.map(c => <th key={c} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eadde0' }}>{c}</th>)}</tr></thead><tbody>{report.rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j} style={{ padding: 10, borderBottom: '1px solid #eee', overflowWrap: 'anywhere' }}>{value ?? '—'}</td>)}</tr>)}</tbody></table></div> : <p>No rows returned for this period.</p>}
    </div>}
    {view === 'paid' && <p style={{ color: '#666' }}>Platforms use different attribution windows. Their conversions may overlap; spend and conversions are not combined across platforms or currencies.</p>}
  </section>
}
