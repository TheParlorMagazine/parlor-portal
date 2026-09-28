'use client'

import { useEffect, useState, useCallback } from 'react'

const ff   = "'Source Serif 4', Georgia, serif"
const ffH  = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

// The newsletter is a LIVING TEMPLATE — it always reflects the latest 3
// articles + featured event + upcoming events. It sends automatically every
// other week (alternating with the Bi-weekly Digest); admins are nudged to
// review + send, and can also send on demand here.
export default function NewsletterTab({ supabase }) {
  const [data, setData] = useState(null)   // preview payload
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('desktop')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [intro, setIntro] = useState('')
  const [issueImg, setIssueImg] = useState('')
  const [savingIntro, setSavingIntro] = useState(false)

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/preview', { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setData(res.ok ? d : { error: d.error })
      if (res.ok) { setIntro(d.issueIntro || ''); setIssueImg(d.issueImage || '') }
    } catch { setData({ error: 'Could not load the preview.' }) }
    setLoading(false)
  }, [token])
  useEffect(() => { load() }, [load])

  async function sendNow() {
    if (!window.confirm(`Send the newsletter to ${data?.recipientCount ?? 'all'} subscribers now?`)) return
    setSending(true); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/send', { method: 'POST', headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setMsg(res.ok ? `Sent to ${d.sent} subscriber${d.sent === 1 ? '' : 's'} ✓` : (d.error || 'Could not send.'))
      if (res.ok) load()
    } catch { setMsg('Could not send.') }
    setSending(false)
  }

  async function saveIntro() {
    if (!data?.issueId) return
    setSavingIntro(true); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/issue-intro', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ issueId: data.issueId, intro, image: issueImg }),
      })
      if (res.ok) { setMsg('Issue section saved ✓'); load() } else setMsg('Could not save.')
    } catch { setMsg('Could not save intro.') }
    setSavingIntro(false)
  }

  const card = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px' }

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
            This is a <strong>living template</strong> — it always shows your latest 3 articles, the featured event, and upcoming events. It goes out <strong>every other week</strong>, alternating with the Bi-weekly Digest; you’ll get a nudge to review &amp; send. You can also send it now.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={load} disabled={loading} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>↻ Refresh</button>
          <button onClick={sendNow} disabled={sending || loading || data?.empty} title={data?.empty ? 'No content to send yet' : ''} style={{ padding: '8px 18px', background: (sending || data?.empty) ? '#ccc' : PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: 600, cursor: (sending || data?.empty) ? 'default' : 'pointer', fontFamily: ff }}>
            {sending ? 'Sending…' : 'Send to subscribers now'}
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {data && !data.error && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, fontSize: '12.5px', color: '#555' }}>
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.recipientCount ?? '—'}</strong> subscribers</span>
          {data.issueTitle && <span style={{ ...card, padding: '6px 12px' }}>Issue: <strong>{data.issueTitle}</strong> ({data.issueArticleCount})</span>}
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.articleCount}</strong> articles total</span>
          <span style={{ ...card, padding: '6px 12px' }}>{data.featured ? `Featured: ${data.featuredTitle}` : 'No featured event'}</span>
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.otherEventCount}</strong> other events</span>
          {msg && <span style={{ padding: '6px 12px', color: msg.includes('✓') ? '#2d8f5a' : DP, fontWeight: 600 }}>{msg}</span>}
        </div>
      )}

      {/* Issue intro editor */}
      {data && data.issueId && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: 6 }}>Issue promo section — {data.issueTitle}</div>
          <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3} placeholder="A short intro to the current issue, shown in the 'Issue is finally here!' promo…" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', fontFamily: ff, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <input value={issueImg} onChange={e => setIssueImg(e.target.value)} placeholder="Promo image URL (a styled photo of the print issue)" style={{ width: '100%', marginTop: 8, padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={saveIntro} disabled={savingIntro} style={{ padding: '7px 16px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12.5px', cursor: 'pointer', fontFamily: ff }}>{savingIntro ? 'Saving…' : 'Save issue section'}</button>
          </div>
        </div>
      )}

      {/* Live preview */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa' }}>Live preview{data?.subject ? ` — ${data.subject}` : ''}</div>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '6px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {['desktop', 'mobile'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: ff, background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0a0a0a' : '#aaa' }}>{m[0].toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
        </div>
        <div style={{ background: '#e8e8e8', padding: '20px', display: 'flex', justifyContent: 'center' }}>
          {loading ? <div style={{ padding: 60, color: '#999', fontStyle: 'italic' }}>Composing…</div>
            : data?.error ? <div style={{ padding: 60, color: DP }}>{data.error}</div>
            : data?.empty ? <div style={{ padding: 60, color: '#999', fontStyle: 'italic' }}>No published articles or events yet — the newsletter will fill in as you publish.</div>
            : <iframe title="Newsletter preview" srcDoc={data?.html || ''} style={{ width: mode === 'mobile' ? '375px' : '640px', maxWidth: '100%', height: '640px', border: 'none', background: '#fff', borderRadius: '6px' }} />}
        </div>
      </div>
    </div>
  )
}
