'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <a href="/" style={styles.logo}>The Parlor</a>
        <div style={{fontSize:'32px',marginBottom:'16px'}}>✉️</div>
        <div style={styles.heading}>Email sent</div>
        <p style={styles.sub}>Check your inbox for a password reset link.</p>
        <a href="/login" style={styles.btn}>Back to login</a>
      </div>
    </div>
  )

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <a href="/" style={styles.logo}>The Parlor</a>
        <div style={styles.heading}>Reset your password</div>
        <p style={styles.sub}>Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={styles.input} />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <div style={styles.footer}><a href="/login" style={styles.link}>← Back to login</a></div>
      </div>
    </div>
  )
}

const styles = {
  wrap: { minHeight:'100vh', background:'#ffffff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia, serif', padding:'20px' },
  card: { width:'100%', maxWidth:'400px', padding:'48px 40px', border:'1px solid #e8d4d8', borderRadius:'13px' },
  logo: { display:'block', fontSize:'22px', fontWeight:'500', marginBottom:'28px', color:'#0a0a0a', textDecoration:'none', fontStyle:'italic' },
  heading: { fontSize:'22px', fontWeight:'500', marginBottom:'6px' },
  sub: { fontSize:'13px', color:'#888', marginBottom:'28px', lineHeight:'1.6' },
  label: { display:'block', fontSize:'10px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.1em', color:'#888', marginBottom:'6px' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #e8d4d8', borderRadius:'8px', fontFamily:'Georgia, serif', fontSize:'14px', outline:'none', marginBottom:'16px', boxSizing:'border-box' },
  error: { fontSize:'13px', color:'#e07070', marginBottom:'16px' },
  btn: { display:'block', width:'100%', padding:'11px', background:'#0a0a0a', color:'#ffffff', border:'none', borderRadius:'8px', fontFamily:'Georgia, serif', fontSize:'14px', fontWeight:'500', cursor:'pointer', textAlign:'center', textDecoration:'none', marginTop:'8px' },
  footer: { marginTop:'20px', fontSize:'13px', textAlign:'center' },
  link: { color:'#0a0a0a', fontWeight:'500' }
}
