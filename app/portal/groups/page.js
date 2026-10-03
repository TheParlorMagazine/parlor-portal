'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import PortalShell, { usePortal } from '../_components/PortalShell'
import PostGuidelines, { FORUM_GUIDELINES } from '../_components/PostGuidelines'
import { confirmDialog } from '../../../lib/confirmDialog'

const SERIF = "'thermal-variable', Georgia, serif"

const POLICY = {
  open: { label: 'Public', color: '#2d8f5a', bg: '#eaf6ef' },
  request: { label: 'Private', color: '#8a5a00', bg: 'var(--goldlight)' },
  paid: { label: 'Paid', color: '#c4364a', bg: '#fbeaee' },
}

// Pull an average color from a thumbnail so each forum card can wear its own tint.
function useDominantColor(src) {
  const [rgb, setRgb] = useState(null)
  useEffect(() => {
    if (!src) { setRgb(null); return }
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 20; c.height = 20
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 20, 20)
        const d = ctx.getImageData(0, 0, 20, 20).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
        if (n && !cancelled) setRgb([Math.round(r / n), Math.round(g / n), Math.round(b / n)])
      } catch {}
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])
  return rgb
}

function GroupCard({ g, onJoin, busy }) {
  const p = POLICY[g.join_policy] || POLICY.request
  const thumb = g.avatar_url || g.cover_image_url
  const rgb = useDominantColor(thumb)
  const tint = rgb ? `linear-gradient(90deg, rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16), rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.05))` : '#fff'
  const accent = rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.6)` : 'var(--border)'
  return (
    <div style={{ border: '1px solid var(--border)', borderLeft: `4px solid ${accent}`, borderRadius: 14, background: tint, padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 3px rgba(255,255,255,0.75)' }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 20, color: 'var(--muted)' }}>{(g.name || 'F')[0]}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 500, color: 'var(--ink)' }}>{g.name}</span>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: p.color, background: p.bg, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{p.label}</span>
          </div>
          {g.description && <div style={{ fontSize: 13, color: '#555', marginTop: 3, lineHeight: 1.4 }}>{g.description}</div>}
          <div style={{ fontSize: 11.5, color: '#777', marginTop: 5 }}>{g.member_count || 0} member{g.member_count === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {g.my_role
          ? <a href={`/portal/forums/${g.id}`} style={{ display: 'inline-block', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontFamily: SERIF, fontSize: 13, color: 'var(--ink)', textDecoration: 'none' }}>Open ›</a>
          : g.requested
            ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>Requested</span>
            : <button onClick={() => onJoin(g)} disabled={busy} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: SERIF, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{busy ? '…' : (g.join_policy === 'request' ? 'Request' : g.join_policy === 'paid' ? 'Upgrade to join' : 'Join')}</button>}
      </div>
    </div>
  )
}

function ProposeModal({ token, onClose, onDone }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [policy, setPolicy] = useState('request')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function submit() {
    if (!name.trim()) { setMsg('Give your forum a name.'); return }
    if (!agreed) { setMsg('Please agree to the community guidelines.'); return }
    setBusy(true); setMsg('')
    const res = await fetch('/api/portal/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await token()) }, body: JSON.stringify({ name, description: desc, join_policy: policy }) })
    setBusy(false)
    if (res.ok) onDone(); else { const d = await res.json(); setMsg(d.error || 'Could not submit') }
  }
  const input = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: SERIF, fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const label = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '14px 0 6px' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '94vw', padding: 26, fontFamily: SERIF }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Propose a forum</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 14px' }}>A Master Admin reviews new forums. Once approved, you’re the moderator and can invite members.</p>

        <PostGuidelines heading="Before you create a forum…" items={FORUM_GUIDELINES} note="You’re responsible for the space you create. Forums that don’t follow these guidelines may be removed." agreeLabel="I’ll moderate this forum and follow The Parlor’s community guidelines." agreed={agreed} onAgree={setAgreed} />

        <div style={label}>Forum name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Climate Writers Circle" style={input} />
        <div style={label}>What’s it about?</div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="A sentence or two" style={{ ...input, resize: 'vertical' }} />
        <div style={label}>Who can join?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['open', 'Public — anyone joins'], ['request', 'Private — you approve requests']].map(([v, l]) => (
            <button key={v} onClick={() => setPolicy(v)} style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: `1px solid ${policy === v ? '#0a0a0a' : 'var(--border)'}`, background: policy === v ? '#0a0a0a' : '#fff', color: policy === v ? '#fff' : 'var(--ink)', fontFamily: SERIF, fontSize: 13, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {msg && <p style={{ color: '#c04040', fontSize: 13, marginTop: 10 }}>{msg}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 18px', fontFamily: SERIF, fontSize: 13, cursor: 'pointer', color: '#555' }}>Cancel</button>
          <button onClick={submit} disabled={busy || !agreed} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontFamily: SERIF, fontSize: 13, fontWeight: 600, cursor: (busy || !agreed) ? 'default' : 'pointer', opacity: agreed ? 1 : 0.6 }}>{busy ? 'Sending…' : 'Submit proposal'}</button>
        </div>
      </div>
    </div>
  )
}

function Groups() {
  const supabase = useMemo(() => createClient(), [])
  const ctx = usePortal()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [propose, setPropose] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [proposed, setProposed] = useState(false)

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/portal/groups', { headers: await auth() }); const d = await res.json(); setGroups(d.groups || []) } catch {} finally { setLoading(false) }
  }, [auth])
  useEffect(() => { load() }, [load])

  async function join(g) {
    setBusyId(g.id)
    try {
      const res = await fetch(`/api/portal/groups/${g.id}`, { method: 'POST', headers: await auth() })
      const d = await res.json()
      if (d.state === 'upgrade') { if (await confirmDialog('This forum is for paid members. Go to subscriptions?')) window.location.href = '/portal/subscriptions'; return }
      if (res.ok) setGroups(gs => gs.map(x => x.id === g.id ? { ...x, my_role: d.state === 'member' ? 'member' : x.my_role, requested: d.state === 'requested', member_count: d.state === 'member' ? (x.member_count || 0) + 1 : x.member_count } : x))
    } finally { setBusyId(null) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: '0 0 4px' }}>Forums</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Discussion forums across The Parlor. Join one, or propose your own.</p>
        </div>
        <button onClick={() => setPropose(true)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: SERIF, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>+ Propose a forum</button>
      </div>

      {proposed && <div style={{ border: '1px solid #b7e0c8', background: '#eaf6ef', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13.5, color: '#2d8f5a' }}>Proposal sent — a Master Admin will review it. You’ll be notified.</div>}

      {/* Book club (Reading Room) — upgrade to join */}
      <a href="/portal/reading-room" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: '16px 18px', textDecoration: 'none', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 16.5, fontWeight: 500, color: 'var(--ink)' }}>The Book Club</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Monthly reads + discussions in the Reading Room</div>
        </div>
        <span style={{ fontSize: 11.5, color: '#c4364a', background: '#fbeaee', borderRadius: 20, padding: '4px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>Upgrade to join</span>
      </a>

      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p>
        : groups.length === 0 ? <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream)', padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No forums yet — propose the first one.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map(g => <GroupCard key={g.id} g={g} onJoin={join} busy={busyId === g.id} />)}
          </div>
        )}

      {propose && <ProposeModal token={auth} onClose={() => setPropose(false)} onDone={() => { setPropose(false); setProposed(true) }} />}
    </div>
  )
}

export default function GroupsPage() {
  return <PortalShell active="groups"><Groups /></PortalShell>
}
