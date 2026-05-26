'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleHovered, setGoogleHovered] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

 async function handleSignup(e) {
  e.preventDefault()
  setLoading(true)
  setError('')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  await fetch('/api/send-welcome', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  })

  setSuccess(true)
  setLoading(false)
}

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (success) return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>The Parlor</div>
        <div style={{fontSize:'32px',marginBottom:'16px'}}>✉️</div>
        <div style={styles.heading}>Check your email</div>
        <p style={styles.sub}>
          We sent a confirmation link to <strong>{email}</strong>.
          Click it to activate your account.
        </p>
        <a href="/login" style={styles.btn}>Back to login</a>
      </div>
    </div>
  )

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <a href="/" style={styles.logo}>The Parlor</a>
        <div style={styles.heading}>Create your account</div>
        <p style={styles.sub}>Join The Parlor community</p>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          onMouseEnter={() => setGoogleHovered(true)}
          onMouseLeave={() => setGoogleHovered(false)}
          style={{
            width: '100%',
            padding: '11px',
            background: googleHovered ? '#f9fafb' : '#ffffff',
            border: `1px solid ${googleHovered ? '#d1d5db' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: '14px',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#333',
            opacity: googleLoading ? 0.7 : 1,
            transition: 'background 0.15s, border-color 0.15s',
            boxSizing: 'border-box',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ padding: '0 12px', fontSize: '12px', color: '#888' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>

        <form onSubmit={handleSignup}>
          <label style={styles.label}>Full name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Your name"
            style={styles.input}
          />
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={styles.input}
          />
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="At least 8 characters"
            minLength={8}
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <a href="/login" style={styles.link}>Sign in</a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: { minHeight:'100vh', background:'#ffffff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia, serif', padding:'20px' },
  card: { width:'100%', maxWidth:'400px', padding:'48px 40px', border:'1px solid #e8d4d8', borderRadius:'13px' },
  logo: { display:'block', fontSize:'22px', fontWeight:'500', marginBottom:'28px', color:'#0a0a0a', textDecoration:'none', fontStyle:'italic' },
  heading: { fontSize:'22px', fontWeight:'500', marginBottom:'6px', color:'#0a0a0a' },
  sub: { fontSize:'13px', color:'#888', marginBottom:'28px', lineHeight:'1.6' },
  label: { display:'block', fontSize:'10px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.1em', color:'#888', marginBottom:'6px' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #e8d4d8', borderRadius:'8px', fontFamily:'Georgia, serif', fontSize:'14px', outline:'none', marginBottom:'16px', boxSizing:'border-box' },
  error: { fontSize:'13px', color:'#e07070', marginBottom:'16px' },
  btn: { display:'block', width:'100%', padding:'11px', background:'#0a0a0a', color:'#ffffff', border:'none', borderRadius:'8px', fontFamily:'Georgia, serif', fontSize:'14px', fontWeight:'500', cursor:'pointer', textAlign:'center', textDecoration:'none', marginTop:'8px' },
  footer: { marginTop:'20px', fontSize:'13px', color:'#888', textAlign:'center' },
  link: { color:'#0a0a0a', fontWeight:'500' }
}
