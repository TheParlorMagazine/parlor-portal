'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleHovered, setGoogleHovered] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address above, then click "Forgot password?".')
      return
    }
    setResetLoading(true)
    setError('')
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    setResetLoading(false)
    setResetSent(true)
  }

  async function handleGoogleLogin() {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '48px 40px',
        border: '1px solid #e8d4d8',
        borderRadius: '13px',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '500',
          marginBottom: '6px'
        }}>
          The Parlor
        </div>
        <div style={{
          fontSize: '13px',
          color: '#888',
          marginBottom: '32px'
        }}>
          Sign in to your member account
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
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

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#888',
              marginBottom: '6px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e8d4d8',
                borderRadius: '8px',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{
                fontSize: '10px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#888',
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '11px',
                  color: '#888',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Georgia, serif',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                {resetLoading ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e8d4d8',
                borderRadius: '8px',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: '13px',
              color: '#e07070',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {resetSent && (
            <div style={{
              marginTop: '16px',
              fontSize: '13px',
              color: '#555',
              textAlign: 'center',
            }}>
              Check your inbox — we sent a password reset link to <strong>{email}</strong>.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
