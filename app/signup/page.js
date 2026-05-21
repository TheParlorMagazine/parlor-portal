'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
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
