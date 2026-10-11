'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function SetupForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/portal'
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If user already has a name, skip this page
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace(`/login?returnTo=${encodeURIComponent(next)}`); return }
      fetch('/api/portal/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => { if (d.member?.full_name?.trim()) router.replace(next) })
        .catch(() => {})
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace(`/login?returnTo=/portal/setup?next=${encodeURIComponent(next)}`); return }
    const res = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ full_name: name.trim() }),
    })
    if (res.ok) {
      router.replace(next)
    } else {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'thermal-variable', Georgia, serif", padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c47080', marginBottom: 24, textAlign: 'center' }}>The Parlor</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>Welcome — what's your name?</h1>
        <p style={{ fontSize: 14.5, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
          This is how you'll appear to other members in the community.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', fontSize: 15, border: '1px solid #d8c8cc', borderRadius: 8, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
          />
          {error && <div style={{ fontSize: 13, color: '#c04040', marginBottom: 10 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return <Suspense><SetupForm /></Suspense>
}
