'use client'
import { useEffect, useState } from 'react'
const names = { search: 'Search & SEO', ga4: 'GA4 acquisition', merchant: 'Product visibility', googleAds: 'Google Ads', instagram: 'Instagram / Meta', reddit: 'Reddit Ads', pinterest: 'Pinterest Ads' }
const font = "'Source Serif 4', Georgia, serif"
const headingFont = "'Playfair Display', Georgia, serif"
const providers = { search: 'Google Search Console', ga4: 'Google Analytics 4', merchant: 'Google Merchant Center', googleAds: 'Google Ads', instagram: 'Instagram / Meta', reddit: 'Reddit Ads', pinterest: 'Pinterest Ads' }
const descriptions = {
  search: 'Search visibility, clicks and page performance from Google.',
  ga4: 'Traffic sources, engagement and tracked key events.',
  merchant: 'Free product listings, store links and image performance from Google.',
  paid: 'Campaign performance from your connected advertising accounts.',
}
const control = { width: '100%', minWidth: 0, height: 38, boxSizing: 'border-box', padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6, color: '#333', fontFamily: font, fontSize: 13, lineHeight: '20px' }
const field = { display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 145px', minWidth: 0, maxWidth: 190 }
const label = { fontFamily: font, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: '#999', lineHeight: 1.5 }
const paragraph = { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#777' }

export default function ReportingPanel({ supabase, view, reports, onReport, paidSource = 'googleAds', onSource }) {
  const source = view === 'paid' ? paidSource : view
  const [connections, setConnections] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [registered,setRegistered] = useState(false)
  const [registrationNeeded,setRegistrationNeeded] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [start, setStart] = useState(today.slice(0, 8) + '01')
  const [end, setEnd] = useState(today)
  const report = reports[source]
  async function headers() {
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.access_token) throw Error('Sign in again to view reports.')
    return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }
  }
  useEffect(() => { setError('');setRegistered(false);setRegistrationNeeded(false) }, [source])
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
      if (!response.ok) {if(requested==='merchant' && /requires Merchant API developer registration/.test(data.error || ''))setRegistrationNeeded(true);throw Error(data.error || 'Could not load the report.')}
      setRegistrationNeeded(false)
      onReport(data.report)
    } catch (err) { setError(`${names[requested]}: ${err.message}`) }
    finally { setBusy(false) }
  }
  async function register(event) {
    event.preventDefault()
    // Browser autofill/password managers may not fire React's change event.
    // Read the displayed field before disabling the form for submission.
    const developerEmail=String(new FormData(event.currentTarget).get('developerEmail') || '').trim()
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/reporting/merchant-registration',{method:'POST',headers:await headers(),body:JSON.stringify({developerEmail,confirm:true})})
      const data=await response.json()
      if(!response.ok || !data.registered)throw Error(data.error || 'Registration could not be confirmed. Retry the report before attempting registration again.')
      setRegistered(true);setRegistrationNeeded(false)
    } catch(err){setError(err.message)} finally{setBusy(false)}
  }
  return <section aria-labelledby="connected-report-heading" style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, minWidth: 0, fontFamily: font, fontSize: 13, lineHeight: 1.6, color: '#555', overflow: 'hidden' }}>
    <div style={{ padding: '16px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h2 id="connected-report-heading" style={{ margin: '0 0 4px', fontFamily: headingFont, fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: '#0a0a0a' }}>{view === 'paid' ? 'Paid marketing campaigns' : names[source]}</h2>
        <p style={paragraph}>{descriptions[view]}</p>
      </div>
      <span role="status" style={{ padding: '3px 9px', borderRadius: 20, background: report?.partial ? '#fff6e5' : report ? '#edf7f0' : '#f5f5f5', color: report?.partial ? '#946200' : report ? '#2d8f5a' : '#888', fontSize: 11, lineHeight: '18px', whiteSpace: 'nowrap' }}>
        {connection ? connection.configured ? report ? report.partial ? 'Partial report' : 'Report loaded' : 'Ready to load' : 'Setup required' : 'Checking connection…'}
      </span>
    </div>
    <div style={{ padding: 18 }}>
      {connection && !connection.configured && <div style={{ padding: '12px 14px', marginBottom: 18, background: '#faf8f8', border: '1px solid #f0e5e8', borderRadius: 7 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 4 }}>Connect {providers[source]}</div>
        <p style={paragraph}>Reporting access hasn’t been configured yet. Once connected, choose a date range to load your results.</p>
      </div>}
      <form onSubmit={run} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {view === 'paid' && <label style={{ ...field, flexBasis: 200, maxWidth: 240 }}><span style={label}>Platform</span>
          <select aria-label="Paid marketing platform" value={paidSource} disabled={busy} onChange={e => onSource(e.target.value)} style={control}>{['googleAds', 'instagram', 'reddit', 'pinterest'].map(id => <option key={id} value={id}>{names[id]}</option>)}</select>
        </label>}
        <label style={field}><span style={label}>From</span><input type="date" required disabled={busy} value={start} max={end} onChange={e => setStart(e.target.value)} style={control} /></label>
        <label style={field}><span style={label}>Through</span><input type="date" required disabled={busy} value={end} min={start} max={today} onChange={e => setEnd(e.target.value)} style={control} /></label>
        <button type="submit" disabled={busy || !connection?.configured} style={{ height: 38, padding: '8px 16px', border: '1px solid', borderColor: busy || !connection?.configured ? '#e8e8e8' : '#0a0a0a', borderRadius: 6, background: busy || !connection?.configured ? '#f5f5f5' : '#0a0a0a', color: busy || !connection?.configured ? '#aaa' : '#fff', fontFamily: font, fontSize: 13, fontWeight: 500, lineHeight: '20px', cursor: busy || !connection?.configured ? 'default' : 'pointer' }}>{busy ? 'Loading…' : 'Load report'}</button>
      </form>
      {connection?.configured && !report && !error && <p style={{ ...paragraph, fontSize: 12, marginTop: 12 }}>Load a report to verify account access and see results for your selected dates.</p>}
      {source==='merchant' && registrationNeeded && <form onSubmit={register} style={{marginTop:18,padding:16,border:'1px solid #f0e5e8',borderRadius:7,background:'#faf8f8'}}>
        <h3 style={{fontFamily:headingFont,margin:'0 0 8px',fontSize:16}}>Register Merchant API project</h3>
        <p style={paragraph}>This links the Cloud project behind your saved reporting credentials to the configured Merchant Center account. Google adds the contact email below for API notifications and may grant it API developer access. Use a human Google Account email you control.</p>
        <label style={{...field,maxWidth:360,marginTop:12}}><span style={label}>Developer contact email</span><input type="email" name="developerEmail" autoComplete="email" required maxLength={254} disabled={busy} style={control}/></label>
        <button type="submit" disabled={busy} style={{...control,width:'auto',marginTop:12,background:'#0a0a0a',color:'#fff',cursor:'pointer'}}>{busy?'Registering…':'Register project with Merchant Center'}</button>
      </form>}
      {source==='merchant' && registered && <p role="status" style={{...paragraph,marginTop:14,color:'#2d8f5a'}}>Project registration confirmed. Click Load report to check reporting access.</p>}
      {error && <p role="alert" style={{ ...paragraph, color: '#a02035', marginTop: 14 }}>{error}</p>}
      {report && <div style={{ marginTop: 20, minWidth: 0 }}>
        <p style={{ ...paragraph, fontSize: 12 }}>{report.name} · {report.start} – {report.end} · retrieved {new Date(report.fetchedAt).toLocaleString()}</p>
        <p style={{ ...paragraph, fontSize: 12, margin: '6px 0 14px' }}>{report.note}</p>
        {report.rows.length ? <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 7 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: font, fontSize: 13, lineHeight: 1.6 }}><thead><tr>{report.columns.map(c => <th key={c} style={{ textAlign: 'left', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontFamily: font, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead><tbody>{report.rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j} style={{ padding: '10px 12px', borderBottom: i < report.rows.length - 1 ? '1px solid #f2f2f2' : 'none', color: '#555', overflowWrap: 'anywhere' }}>{value ?? '—'}</td>)}</tr>)}</tbody></table></div> : <p style={{ ...paragraph, padding: 16, background: '#fafafa', borderRadius: 7 }}>{report.partial ? 'No rows from the available sources. Some report data could not be retrieved; retry later.' : 'No rows returned for this period.'}</p>}
      </div>}
      {view === 'paid' && <p style={{ ...paragraph, fontSize: 12, marginTop: 18, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>Platforms use different attribution windows. Their conversions may overlap; spend and conversions are not combined across platforms or currencies.</p>}
    </div>
  </section>
}
