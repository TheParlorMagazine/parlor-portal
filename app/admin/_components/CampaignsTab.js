'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

const CAMPAIGN_STATUS = {
  draft:     { label: 'Draft',     color: '#888',    bg: '#f5f5f5' },
  scheduled: { label: 'Scheduled', color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  sending:   { label: 'Sending',   color: '#d4844a', bg: 'rgba(242,196,110,0.12)' },
  sent:      { label: 'Sent',      color: '#2d8f5a', bg: 'rgba(110,201,154,0.1)' },
}

// ── Inline body editor ────────────────────────────────────────
const editorCSS = `
.cp { outline:none;min-height:240px;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#1a1a1a;caret-color:#c4364a }
.cp>*+*{margin-top:.8em}.cp p{margin:0 0 .85em}.cp h1{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;color:#0a0a0a;margin:1.4em 0 .4em}
.cp h2{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#0a0a0a;margin:1.2em 0 .35em}
.cp a{color:#c4364a;text-decoration:underline}.cp ul,.cp ol{padding-left:1.6em;margin:.7em 0}
.cp img{max-width:100%;border-radius:6px;display:block;margin:1em 0}.cp strong{font-weight:600}
`

function BodyEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline, Link.configure({ openOnClick: false }), Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'cp' } },
  })
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', false)
    }
  }, [editor])
  if (!editor) return null

  const btn = (label, active, fn, children) => (
    <button type="button" title={label} onMouseDown={e => { e.preventDefault(); fn() }}
      style={{ padding: '4px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: active ? 'rgba(196,54,74,0.1)' : 'transparent', color: active ? DP : '#666', display: 'inline-flex', alignItems: 'center' }}>
      {children}
    </button>
  )
  const sep = <span style={{ display: 'inline-block', width: '1px', height: '16px', background: '#e0e0e0', margin: '0 3px', verticalAlign: 'middle' }} />

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      <style dangerouslySetInnerHTML={{ __html: editorCSS }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', padding: '6px 10px', background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
        {btn('Bold',   editor.isActive('bold'),   () => editor.chain().focus().toggleBold().run(),   <b style={{ fontSize: '13px' }}>B</b>)}
        {btn('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <i style={{ fontSize: '13px' }}>I</i>)}
        {sep}
        {[1,2,3].map(l => btn(`H${l}`, editor.isActive('heading',{level:l}), () => editor.chain().focus().toggleHeading({level:l}).run(), <span style={{ fontSize: '11px', fontWeight: '600' }}>H{l}</span>))}
        {sep}
        {btn('Link', editor.isActive('link'), () => { const url = window.prompt('URL:', editor.getAttributes('link').href||''); if (url !== null) { url.trim() ? editor.chain().focus().setLink({href:url.trim()}).run() : editor.chain().focus().unsetLink().run() } },
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>)}
      </div>
      <div style={{ padding: '14px 16px' }}><EditorContent editor={editor} /></div>
    </div>
  )
}

// ── Campaign builder (full-screen overlay) ────────────────────
function CampaignBuilder({ campaign, segments, onSave, onSend, onClose }) {
  const [name,        setName]        = useState(campaign?.name || '')
  const [subject,     setSubject]     = useState(campaign?.subject || '')
  const [preview,     setPreview]     = useState(campaign?.preview_text || '')
  const [bodyHtml,    setBodyHtml]    = useState(campaign?.body_html || '')
  const [sendTo,      setSendTo]      = useState(campaign?.segment_id || 'all')
  const [sendMode,    setSendMode]    = useState(campaign?.scheduled_at ? 'scheduled' : 'now')
  const [scheduledAt, setScheduledAt] = useState(campaign?.scheduled_at ? toLocalInput(campaign.scheduled_at) : '')
  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)

  function toLocalInput(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function handleSave(statusOverride) {
    setSaving(true)
    await onSave({
      ...(campaign || {}),
      name, subject, preview_text: preview, body_html: bodyHtml,
      segment_id: sendTo === 'all' ? null : sendTo,
      scheduled_at: sendMode === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: statusOverride || campaign?.status || 'draft',
    })
    setSaving(false)
  }

  async function handleSend() {
    if (!window.confirm(`Send "${name || subject}" now to ${sendTo === 'all' ? 'all subscribers' : 'selected segment'}?`)) return
    setSending(true)
    const saved = await onSave({
      ...(campaign || {}), name, subject, preview_text: preview, body_html: bodyHtml,
      segment_id: sendTo === 'all' ? null : sendTo, status: 'sending',
    })
    if (saved?.id) await onSend(saved.id)
    setSending(false)
    onClose()
  }

  const inp = { padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', width: '100%', background: '#fff' }
  const label = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '6px', display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#f5f5f5', display: 'flex', flexDirection: 'column', fontFamily: ff }}>
      <div style={{ height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e8e8e8', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: ff }}>← Back</button>
          <span style={{ fontSize: '13px', color: '#333', fontWeight: '500' }}>{name || 'New Campaign'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleSave()} disabled={saving} style={{ padding: '7px 16px', background: 'none', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          {sendMode === 'scheduled' && scheduledAt && (
            <button onClick={() => handleSave('scheduled')} disabled={saving} style={{ padding: '7px 16px', background: 'none', border: `1px solid rgba(160,180,242,0.4)`, borderRadius: '6px', color: '#4a6fd4', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
              Schedule
            </button>
          )}
          <button onClick={handleSend} disabled={sending || !subject} style={{ padding: '7px 20px', background: sending || !subject ? '#f5f5f5' : PINK, border: 'none', borderRadius: '6px', color: sending || !subject ? '#bbb' : '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: sending || !subject ? 'not-allowed' : 'pointer', fontFamily: ff }}>
            {sending ? 'Sending…' : 'Send Now'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <span style={label}>Campaign Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Internal name…" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <span style={label}>Subject Line</span>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…" style={inp} />
            </div>
            <div>
              <span style={label}>Preview Text</span>
              <input value={preview} onChange={e => setPreview(e.target.value)} placeholder="Short preview shown in inbox…" style={inp} />
            </div>
          </div>
          <div>
            <span style={label}>Send To</span>
            <select value={sendTo} onChange={e => setSendTo(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="all">All Subscribers</option>
              {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.member_count || 0})</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Send Time</span>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {[['now','Send immediately'],['scheduled','Schedule for later']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setSendMode(v)} style={{ padding: '6px 16px', border: `1px solid ${sendMode === v ? DP : '#e0e0e0'}`, borderRadius: '20px', background: sendMode === v ? 'rgba(196,54,74,0.08)' : '#fff', color: sendMode === v ? DP : '#888', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>{l}</button>
              ))}
            </div>
            {sendMode === 'scheduled' && (
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={toLocalInput(new Date().toISOString())} style={{ ...inp, width: '260px', accentColor: PINK }} />
            )}
          </div>
          <div>
            <span style={label}>Email Body</span>
            <BodyEditor content={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main CampaignsTab ─────────────────────────────────────────
export default function CampaignsTab({ supabase }) {
  const [campaigns, setCampaigns] = useState([])
  const [segments,  setSegments]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [building,  setBuilding]  = useState(null)   // null | campaign object (empty = new)
  const [sending,   setSending]   = useState({})
  const [deleting,  setDeleting]  = useState({})

  useEffect(() => {
    Promise.allSettled([
      supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('email_segments').select('id,name,member_count').order('name'),
    ]).then(([cRes, sRes]) => {
      setCampaigns(cRes.status === 'fulfilled' ? (cRes.value.data || []) : [])
      setSegments(sRes.status === 'fulfilled' ? (sRes.value.data || []) : [])
      setLoading(false)
    })
  }, [])

  async function saveCampaign(data) {
    const now = new Date().toISOString()
    const payload = { ...data, updated_at: now }
    let saved
    if (data.id) {
      const { data: d } = await supabase.from('email_campaigns').update(payload).eq('id', data.id).select().single()
      saved = d
      setCampaigns(prev => prev.map(c => c.id === data.id ? { ...c, ...payload } : c))
    } else {
      const { data: d } = await supabase.from('email_campaigns').insert({ ...payload, created_at: now }).select().single()
      saved = d
      if (d) setCampaigns(prev => [d, ...prev])
    }
    return saved
  }

  async function sendCampaign(id) {
    setSending(prev => ({ ...prev, [id]: true }))
    const res = await fetch('/api/emails/send-campaign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id }),
    })
    const json = await res.json()
    if (res.ok) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'sent', sent_at: new Date().toISOString(), recipient_count: json.sent } : c))
    } else {
      alert('Send failed: ' + (json.error || 'Unknown error'))
    }
    setSending(prev => ({ ...prev, [id]: false }))
  }

  async function deleteCampaign(id) {
    if (!window.confirm('Delete this campaign?')) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    await supabase.from('email_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
    setDeleting(prev => ({ ...prev, [id]: false }))
  }

  function openRate(c) { return c.recipient_count > 0 ? `${Math.round((c.open_count / c.recipient_count) * 100)}%` : '—' }
  function clickRate(c) { return c.recipient_count > 0 ? `${Math.round((c.click_count / c.recipient_count) * 100)}%` : '—' }

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 14px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '12px 14px', fontFamily: ff, verticalAlign: 'middle' }

  return (
    <>
      {building !== null && (
        <CampaignBuilder
          campaign={building}
          segments={segments}
          onSave={saveCampaign}
          onSend={sendCampaign}
          onClose={() => setBuilding(null)}
        />
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <button onClick={() => setBuilding({})} style={{ padding: '8px 18px', background: PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
            + New Campaign
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No campaigns yet. Create your first one.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Campaign</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Send Date</th>
                  <th style={thStyle}>Recipients</th>
                  <th style={thStyle}>Open Rate</th>
                  <th style={thStyle}>Click Rate</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const sc = CAMPAIGN_STATUS[c.status] || CAMPAIGN_STATUS.draft
                  return (
                    <tr key={c.id} style={{ borderBottom: i === campaigns.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>{c.name || 'Untitled'}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '1px' }}>{c.subject}</div>
                      </td>
                      <td style={tdStyle}><span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontFamily: ff, background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>
                        {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                         c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: '#333' }}>{c.recipient_count > 0 ? c.recipient_count.toLocaleString() : '—'}</td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: '#333' }}>{openRate(c)}</td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: '#333' }}>{clickRate(c)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {c.status !== 'sent' && (
                            <button onClick={() => setBuilding(c)} style={{ padding: '5px 12px', background: 'none', border: `1px solid ${PINK}`, borderRadius: '5px', color: DP, fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>Edit</button>
                          )}
                          {(c.status === 'draft' || c.status === 'scheduled') && (
                            <button onClick={() => sendCampaign(c.id)} disabled={!!sending[c.id]} style={{ padding: '5px 12px', background: 'none', border: '1px solid rgba(110,201,154,0.4)', borderRadius: '5px', color: '#2d8f5a', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
                              {sending[c.id] ? '…' : 'Send'}
                            </button>
                          )}
                          <button onClick={() => deleteCampaign(c.id)} disabled={!!deleting[c.id]} style={{ padding: '5px 10px', background: 'none', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '5px', color: '#c04040', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>
                            {deleting[c.id] ? '…' : '✕'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
