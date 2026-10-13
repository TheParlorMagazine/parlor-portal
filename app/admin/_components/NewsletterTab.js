'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { confirmDialog } from '../../../lib/confirmDialog'

const ff   = "'Source Serif 4', Georgia, serif"
const ffH  = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

const SECTION_DEFS = [
  { key: 'issuPromo',     label: 'Issue Promo',     desc: 'Current issue highlight with intro text and image' },
  { key: 'articles',      label: 'Latest Articles', desc: 'The 3 most recent standalone articles' },
  { key: 'featuredEvent', label: 'Featured Event',  desc: 'The event flagged as featured in the newsletter' },
  { key: 'otherEvents',   label: 'Upcoming Events', desc: 'Other upcoming events listed below the featured one' },
  { key: 'support',       label: 'Support Block',   desc: 'Subscribe / donate call-to-action at the bottom' },
]

export default function NewsletterTab({ supabase }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('desktop')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [intro, setIntro] = useState('')
  const [issueImg, setIssueImg] = useState('')
  const [savingIntro, setSavingIntro] = useState(false)
  const [sections, setSections] = useState({ issuPromo: true, articles: true, featuredEvent: true, otherEvents: true, support: true })
  const [expanded, setExpanded] = useState({})
  const previewTimer = useRef(null)

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [supabase])

  const load = useCallback(async (secs) => {
    setMsg('')
    const activeSections = secs || sections
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(activeSections)) params.set(k, String(v))
    try {
      const res = await fetch(`/api/admin/newsletter/preview?${params}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setData(res.ok ? d : { error: d.error })
      if (res.ok) { setIntro(d.issueIntro || ''); setIssueImg(d.issueImage || '') }
    } catch { setData({ error: 'Could not load the preview.' }) }
    setLoading(false)
  }, [token, sections])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(key, val) {
    const next = { ...sections, [key]: val }
    setSections(next)
    // Debounce preview refresh so rapid toggles don't hammer the server
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setLoading(true)
    previewTimer.current = setTimeout(() => load(next), 400)
  }

  async function sendNow() {
    if (!(await confirmDialog(`Send the newsletter to ${data?.recipientCount ?? 'all'} subscribers now?`))) return
    setSending(true); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ sections }),
      })
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
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
            This is a <strong>living template</strong> — it always shows your latest 3 articles, the featured event, and upcoming events. It goes out <strong>every other week</strong>, alternating with the Bi-weekly Digest; you'll get a nudge to review &amp; send. You can also send it now.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => load()} disabled={loading} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>↻ Refresh</button>
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

      {/* Section toggles */}
      <div style={{ ...card, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa' }}>Template sections</div>
        </div>
        {SECTION_DEFS.map((sec, i) => {
          const isOn = sections[sec.key] !== false
          const isOpen = !!expanded[sec.key]
          const isIssuePromo = sec.key === 'issuPromo'
          const hasIssue = !!data?.issueId
          const showEdit = isIssuePromo && hasIssue

          return (
            <div key={sec.key} style={{ borderBottom: i < SECTION_DEFS.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: showEdit ? 'pointer' : 'default' }}
                onClick={showEdit ? () => setExpanded(e => ({ ...e, [sec.key]: !e[sec.key] })) : undefined}>
                {/* Toggle switch */}
                <div onClick={e => { e.stopPropagation(); toggleSection(sec.key, !isOn) }}
                  style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, background: isOn ? '#0a0a0a' : '#d0d0d0', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: isOn ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                </div>
                {/* Label + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: isOn ? '#0a0a0a' : '#aaa' }}>{sec.label}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 1 }}>{sec.desc}</div>
                </div>
                {/* Expand chevron for editable sections */}
                {showEdit && (
                  <div style={{ color: '#bbb', fontSize: 12, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</div>
                )}
              </div>

              {/* Expanded edit panel — Issue Promo only */}
              {showEdit && isOpen && (
                <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #f5f5f5' }}>
                  <div style={{ paddingTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#999', marginBottom: 4 }}>Intro text</label>
                    <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3}
                      placeholder="A short intro to the current issue shown in the promo…"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', fontFamily: ff, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#999', margin: '8px 0 4px' }}>Promo image URL</label>
                    <input value={issueImg} onChange={e => setIssueImg(e.target.value)}
                      placeholder="https://… (a styled photo of the print issue)"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ marginTop: 10 }}>
                      <button onClick={saveIntro} disabled={savingIntro}
                        style={{ padding: '7px 16px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12.5px', cursor: 'pointer', fontFamily: ff }}>
                        {savingIntro ? 'Saving…' : 'Save issue section'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
