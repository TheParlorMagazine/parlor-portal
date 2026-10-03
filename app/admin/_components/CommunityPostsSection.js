'use client'

import { useEffect, useState } from 'react'
import { confirmDialog, alertDialog } from '../../../lib/confirmDialog'

const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP = '#c4364a'

const STATUS = {
  submitted: { label: 'In review', color: '#8a5a00', bg: 'rgba(242,196,110,0.18)' },
  approved: { label: 'In editing', color: '#2d8f5a', bg: 'rgba(110,201,154,0.14)' },
  published: { label: 'Published', color: '#2d8f5a', bg: 'rgba(110,201,154,0.14)' },
  released: { label: 'Community only', color: '#4a6fd4', bg: 'rgba(160,180,242,0.14)' },
  community_only: { label: 'Community only', color: '#4a6fd4', bg: 'rgba(160,180,242,0.14)' },
  rejected: { label: 'Changes asked', color: '#c04040', bg: 'rgba(224,112,112,0.12)' },
  changes_requested: { label: 'Changes asked', color: '#c04040', bg: 'rgba(224,112,112,0.12)' },
  removed: { label: 'Removed', color: '#c04040', bg: 'rgba(224,112,112,0.12)' },
}
function Badge({ status }) { const s = STATUS[status] || STATUS.submitted; return <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.color, background: s.bg, borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontFamily: ff }}>{s.label}</span> }

function ReviewModal({ sub, token, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const bodyIsHtml = /<\w+[\s>/]/.test(sub.body || '')
  const paras = (sub.body || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  async function act(action) {
    if (action === 'changes' && !note.trim()) { alertDialog('Add a note so the author knows what to change.'); return }
    if (action === 'remove' && !(await confirmDialog('Remove this post? The author will be notified.'))) return
    setBusy(action)
    try {
      const res = await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: sub.id, action, editor_note: note }) })
      const d = await res.json()
      if (!res.ok) { alertDialog(d.error || 'Failed'); return }
      if (action === 'approve' && d.article_id) { window.location.href = `/admin/articles/${d.article_id}/edit`; return }
      onDone()
    } finally { setBusy('') }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 13, width: 720, maxWidth: '96vw', padding: 28, fontFamily: ff }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: '#888' }}>Submitted by <strong style={{ color: '#0a0a0a' }}>{sub.author_name}</strong> · {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {sub.cover_image_url && <img src={sub.cover_image_url} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, margin: '10px 0 16px' }} />}
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: DP, marginBottom: 6, fontWeight: 600 }}>{sub.vertical || 'No vertical chosen'}</div>
        <h2 style={{ fontFamily: ffH, fontSize: 26, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.15 }}>{sub.title}</h2>
        {sub.subtitle && <p style={{ fontSize: 16, color: '#555', margin: '0 0 18px' }}>{sub.subtitle}</p>}
        {bodyIsHtml
          ? <div style={{ fontSize: 15.5, lineHeight: 1.7, color: '#222', maxHeight: 340, overflowY: 'auto', paddingRight: 8 }} dangerouslySetInnerHTML={{ __html: sub.body || '<p style="color:#aaa">No body.</p>' }} />
          : <div style={{ fontSize: 15.5, lineHeight: 1.7, color: '#222', maxHeight: 340, overflowY: 'auto', paddingRight: 8 }}>{paras.length ? paras.map((p, i) => <p key={i} style={{ margin: '0 0 14px' }}>{p}</p>) : <p style={{ color: '#aaa', fontStyle: 'italic' }}>No body.</p>}</div>}

        <div style={{ marginTop: 14, fontSize: 12.5, color: '#888', lineHeight: 1.6 }}>
          {sub.byline ? <>Byline: <strong style={{ color: '#0a0a0a' }}>{sub.byline}</strong><br /></> : null}
          {sub.bio ? <>Bio: {sub.bio}<br /></> : null}
          {sub.sources ? <>Sources: <span style={{ whiteSpace: 'pre-line' }}>{sub.sources}</span><br /></> : null}
          Author {sub.share_to_feed ? 'opted to share this to the community feed after review.' : 'chose NOT to share this to the community feed.'}
        </div>

        {sub.status === 'submitted' && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: 6 }}>Note to author <span style={{ textTransform: 'none' }}>(required for “Request changes”)</span></div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Feedback / edits…" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={() => act('remove')} disabled={!!busy} style={{ background: '#fff', border: '1px solid rgba(224,112,112,0.5)', color: '#c04040', borderRadius: 8, padding: '9px 16px', fontFamily: ff, fontSize: 13, cursor: 'pointer', marginRight: 'auto' }}>{busy === 'remove' ? '…' : 'Remove'}</button>
              <button onClick={() => act('changes')} disabled={!!busy} style={{ background: '#fff', border: '1px solid rgba(224,112,112,0.35)', color: '#c04040', borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>{busy === 'changes' ? '…' : 'Request changes'}</button>
              <button onClick={() => act('community')} disabled={!!busy} style={{ background: '#fff', border: `1px solid ${BORDER}`, color: '#333', borderRadius: 8, padding: '9px 18px', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>{busy === 'community' ? '…' : 'Approve as post'}</button>
              <button onClick={() => act('approve')} disabled={!!busy} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{busy === 'approve' ? 'Opening…' : 'Approve for verticals →'}</button>
            </div>
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 10, lineHeight: 1.5 }}>“Approve for verticals” drafts a member-post article (disclaimer auto-inserted) you edit &amp; fact-check; nothing is shown publicly until the author approves and you publish the edited version — which then appears as <em>both</em> a member article and a community post. “Approve as post” publishes it now as a community post only (news feed + author’s profile), not in the verticals or Library.</p>
          </div>
        )}
        {sub.status !== 'submitted' && sub.editor_note && (
          <div style={{ marginTop: 18, fontSize: 13, color: '#888' }}>Your note: “{sub.editor_note}”</div>
        )}
      </div>
    </div>
  )
}

export default function CommunityPostsSection({ supabase }) {
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)

  async function load() {
    try { const res = await fetch('/api/admin/submissions', { headers: { Authorization: `Bearer ${await token()}` } }); const d = await res.json(); setSubs(d.submissions || []) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const pending = subs.filter(s => s.status === 'submitted')

  return (
    <div style={{ fontFamily: ff }}>
      <h1 style={{ fontFamily: ffH, fontSize: 30, fontWeight: 700, margin: 0 }}>Community Posts</h1>
      <p style={{ fontSize: 14, color: '#888', margin: '4px 0 20px', lineHeight: 1.55, maxWidth: 720 }}>Member-submitted posts. Submitted posts are live in the member community space only. Approve to convert a post into an article draft for editing, fact-checking and publication in its vertical; send back with notes to request changes. {pending.length > 0 && <strong style={{ color: DP }}>{pending.length} awaiting review</strong>}</p>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Loading…</div>
          : subs.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No submissions yet.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ textAlign: 'left', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Piece</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Author</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Submitted</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 500 }}></th>
              </tr></thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '14px 18px' }}><strong style={{ color: '#0a0a0a' }}>{s.title}</strong>{s.vertical && <div style={{ color: DP, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.vertical}</div>}{s.subtitle && <div style={{ color: '#aaa', fontSize: 12 }}>{s.subtitle}</div>}</td>
                    <td style={{ padding: '14px 18px', color: '#555' }}>{s.author_name}</td>
                    <td style={{ padding: '14px 18px', color: '#666' }}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td style={{ padding: '14px 18px' }}><Badge status={s.status} /></td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}><button onClick={() => setReviewing(s)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: ff }}>{s.status === 'submitted' ? 'Review' : 'View'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {reviewing && <ReviewModal sub={reviewing} token={token} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load() }} />}
    </div>
  )
}
