'use client'

import { useEffect, useState } from 'react'

const font = "'Source Serif 4', Georgia, serif"
const control = { padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontFamily: font, fontSize: 14, boxSizing: 'border-box', background: '#fff', color: '#222' }
const gradeColor = score => score == null ? '#888' : score >= 90 ? '#237749' : score >= 50 ? '#956000' : '#b42332'

export default function PageSpeedPanel({ supabase, initialReport = null, onReport }) {
  const [url, setUrl] = useState(initialReport?.url || 'https://theparlormagazine.com/')
  const [strategy, setStrategy] = useState(initialReport?.strategy || 'mobile')
  const [configured, setConfigured] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(initialReport)
  useEffect(() => { onReport?.(report) }, [report, onReport])

  async function headers() {
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.access_token) throw new Error('Sign in to your admin account again to run audits.')
    return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }
  }
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const response = await fetch('/api/admin/pagespeed', { headers: await headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not check PageSpeed configuration.')
        if (active) setConfigured(data.configured)
      } catch (err) { if (active) setError(err.message) }
    })()
    return () => { active = false }
  }, [supabase])

  async function run(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/pagespeed', { method: 'POST', headers: await headers(), body: JSON.stringify({ url, strategy }) })
      let data
      try { data = await response.json() } catch { throw new Error('The audit did not finish. Try again later or check the page on pagespeed.web.dev.') }
      if (!response.ok) throw new Error(data.error || 'Could not run this audit.')
      setReport(data.report)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  function changeUrl(value) { setUrl(value); setReport(null); setError('') }

  return <section aria-labelledby="pagespeed-heading" style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: 20, marginBottom: 24, fontFamily: font, color: '#333', overflowWrap: 'anywhere' }}>
    <h2 id="pagespeed-heading" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, margin: '0 0 6px' }}>Page speed &amp; technical SEO</h2>
    <p style={{ color: '#777', fontSize: 14, margin: '0 0 16px' }}>Current page health from Google PageSpeed Insights. Audits are independent of the selected analytics month.</p>
    <form onSubmit={run} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
      <label style={{ flex: '1 1 250px', minWidth: 0, fontSize: 13 }}>Public page URL
        <input aria-label="Public page URL" value={url} disabled={busy} onChange={e => changeUrl(e.target.value)} style={{ ...control, width: '100%', display: 'block', marginTop: 5 }} required />
      </label>
      <label style={{ fontSize: 13 }}>Device
        <select aria-label="Audit device" value={strategy} disabled={busy} onChange={e => { setStrategy(e.target.value); setReport(null); setError('') }} style={{ ...control, display: 'block', marginTop: 5 }}>
          <option value="mobile">Mobile</option><option value="desktop">Desktop</option>
        </select>
      </label>
      <button type="submit" disabled={busy || !configured} style={{ ...control, background: '#0a0a0a', color: '#fff', cursor: busy || !configured ? 'default' : 'pointer', opacity: busy || !configured ? 0.55 : 1 }}>{busy ? 'Running audit…' : 'Run audit'}</button>
    </form>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
      {['/', '/shop'].map(path => <button key={path} type="button" disabled={busy} onClick={() => changeUrl('https://theparlormagazine.com' + path)} style={{ background: 'none', border: 'none', padding: 0, color: '#7A263A', textDecoration: 'underline', cursor: 'pointer', fontFamily: font }}>{path === '/' ? 'Homepage' : 'Shop'}</button>)}
    </div>
    {configured === false && <div role="status" style={{ marginTop: 16, padding: 14, background: '#fff7eb', borderRadius: 6 }}>
      <strong>Connect PageSpeed Insights</strong>
      <p style={{ fontSize: 14, margin: '6px 0' }}>Enable PageSpeed Insights API in your Google Cloud project. Add its API key in Netlify as <code>GOOGLE_PAGESPEED_API_KEY</code> for production Functions, then redeploy.</p>
      <a href="https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com" target="_blank" rel="noopener noreferrer" style={{ color: '#7A263A' }}>Open Google Cloud setup →</a>
    </div>}
    {error && <p role="alert" style={{ color: '#b42332', fontSize: 14 }}>{error}</p>}
    {busy && <p role="status" style={{ color: '#777', fontSize: 14 }}>Google is checking this page. Audits can take around 45 seconds.</p>}
    {!busy && !report && configured && <p style={{ fontSize: 13, color: '#888' }}>Choose a public page, then run an audit. Successful reports are cached for one hour.</p>}
    {report && <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, color: '#777', marginBottom: 14 }}>
        <strong>{report.strategy === 'mobile' ? 'Mobile' : 'Desktop'} report</strong> · {report.url}<br />
        Audited {new Date(report.auditedAt).toLocaleString()} · cached for up to one hour
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 10 }}>
        {report.categories.map(category => <div key={category.id} style={{ background: '#faf8f8', borderRadius: 8, padding: 14 }}>
          <div style={{ color: gradeColor(category.score), fontSize: 30, fontWeight: 700 }}>{category.score ?? '—'}<span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}> / 100</span></div>
          <div style={{ fontSize: 13 }}>{category.title}</div>
        </div>)}
      </div>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Lab measurements</h3>
      <p style={{ fontSize: 13, color: '#777', marginTop: 0 }}>Simulated measurements from this audit. Scores can vary between runs.</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, margin: 0 }}>
        {report.metrics.map(metric => <div key={metric.id} style={{ padding: 10, border: '1px solid #eee', borderRadius: 6 }}><dt style={{ fontSize: 13, color: '#777' }}>{metric.title}</dt><dd style={{ margin: '5px 0 0', fontWeight: 600 }}>{metric.value}</dd></div>)}
      </dl>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Real-user Core Web Vitals</h3>
      {report.fieldData ? <>
        <p style={{ fontSize: 13, color: '#777' }}>{report.fieldData.scope === 'origin' ? 'Website-wide data: Google does not have enough data for this specific page.' : 'Data for this page.'} Google’s rolling field measurements describe real visitors.</p>
        <ul>{report.fieldData.metrics.map(metric => <li key={metric.id}>{metric.title}: <strong>{metric.value}</strong>{metric.rating ? ` · ${{ FAST: 'Good', AVERAGE: 'Needs improvement', SLOW: 'Poor' }[metric.rating] || metric.rating}` : ''}</li>)}</ul>
      </> : <p style={{ color: '#777', fontSize: 14 }}>Google did not return real-user field data for this page or website. The lab results above are still available.</p>}
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Recommended improvements</h3>
      {report.findings.length ? <ol style={{ paddingLeft: 22 }}>{report.findings.map(finding => <li key={finding.id} style={{ marginBottom: 14, fontSize: 14 }}>
        <strong>{finding.title}</strong>{finding.value && <span> · {finding.value}</span>}
        {finding.description && <p style={{ margin: '4px 0 0', color: '#666' }}>{finding.description}</p>}
      </li>)}</ol> : <p style={{ fontSize: 14, color: '#777' }}>No scored audit failures were returned in this report.</p>}
      <a href={report.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7A263A', fontWeight: 600 }}>Open Google PageSpeed Insights →</a>
    </div>}
  </section>
}
