'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'

export default function JoinPage() {
  const { token } = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState({ loading: true, invite: null, signedIn: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      try {
        const res = await fetch(`/api/portal/invites/${token}`)
        const d = await res.json()
        setState({ loading: false, invite: res.ok ? d : null, signedIn: !!session })
      } catch { setState({ loading: false, invite: null, signedIn: !!session }) }
    })()
  }, [token, supabase])

  async function accept() {
    setBusy(true); setErr('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = `/signup?returnTo=${encodeURIComponent(`/portal/join/${token}`)}`; return }
    const res = await fetch(`/api/portal/invites/${token}`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const d = await res.json()
    setBusy(false)
    if (res.ok) router.push(`/portal/forums/${d.forum_id}`)
    else setErr(d.error || 'Could not accept the invite')
  }

  const wrap = { minHeight: '100vh', background: '#fdf5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'thermal-variable', Georgia, serif" }
  const card = { background: '#fff', border: '1px solid #e8d4d8', borderRadius: 16, padding: '36px 34px', width: 440, maxWidth: '94vw', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }

  return (
    <div style={wrap}>
      <style>{`@import url("https://use.typekit.net/azq6zbr.css");`}</style>
      <div style={card}>
        <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" width="52" height="52" style={{ borderRadius: '50%', marginBottom: 18 }} alt="" />
        {state.loading ? (
          <p style={{ color: '#888' }}>Loading…</p>
        ) : !state.invite || !state.invite.forum ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Invite not found</h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>This invite link is invalid or has been removed.</p>
          </>
        ) : state.invite.status === 'revoked' ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Invite no longer valid</h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Ask the moderator for a new one.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c47080', fontWeight: 600, marginBottom: 8 }}>You’re invited to join</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.2 }}>{state.invite.forum.name}</h1>
            {state.invite.forum.description && <p style={{ fontSize: 14.5, color: '#666', lineHeight: 1.55, margin: '0 0 6px' }}>{state.invite.forum.description}</p>}
            <p style={{ fontSize: 12.5, color: '#aaa', margin: '0 0 24px' }}>{state.invite.forum.member_count || 0} member{state.invite.forum.member_count === 1 ? '' : 's'} on The Parlor</p>

            {state.signedIn ? (
              <button onClick={accept} disabled={busy} style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontFamily: "'thermal-variable', Georgia, serif", fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>{busy ? 'Joining…' : 'Accept & join'}</button>
            ) : (
              <>
                <a href={`/signup?returnTo=${encodeURIComponent(`/portal/join/${token}`)}`} style={{ display: 'block', background: '#0a0a0a', color: '#fff', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 500, textDecoration: 'none', marginBottom: 10 }}>Create a free account to join</a>
                <a href={`/login?returnTo=${encodeURIComponent(`/portal/join/${token}`)}`} style={{ fontSize: 13.5, color: '#c47080', textDecoration: 'underline', textUnderlineOffset: 2 }}>Already a member? Sign in</a>
              </>
            )}
            {err && <p style={{ color: '#c04040', fontSize: 13, marginTop: 12 }}>{err}</p>}
          </>
        )}
      </div>
    </div>
  )
}
