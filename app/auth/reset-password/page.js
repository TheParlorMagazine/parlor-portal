'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <a href="/" style={styles.logo}>The Parlor</a>
        <div style={styles.heading}>Set a new password</div>
        <p style={styles.sub}>Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" style={styles.input} />
          <label style={styles.label}>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat your password" style={styles.input} />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
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
}
