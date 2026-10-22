'use client'

import { useState } from 'react'

export default function MissionJoinCard() {
  const [joinEmail, setJoinEmail] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinSent, setJoinSent] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function handleJoinSubmit(event) {
    event.preventDefault()
    if (!joinEmail.trim() || joinLoading) return

    setJoinLoading(true)
    setJoinError('')

    try {
      const email = joinEmail.trim()
      const returnTo = window.location.pathname

      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })

      if (!response.ok) throw new Error('Email check failed')

      const data = await response.json()

      if (data.exists) {
        setJoinSent(true)
      } else {
        const params = new URLSearchParams({
          email,
          source: 'mission-page',
          returnTo,
        })
        window.location.href = `/signup?${params}`
      }
    } catch {
      setJoinError('Something went wrong. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }


  return (
        <div className="parlor-join-card">
          <p className="parlor-join-eyebrow">YOU'RE INVITED</p>
          <h2>Pull Up a Chair</h2>
          <p className="parlor-join-description">
            Join The Parlor's newsletter for stories, ideas,
            and conversations worth having.
          </p>
          {joinSent ? (
            <div className="parlor-join-success" role="status">
              <strong>Check your inbox ✉️</strong>
              <p>We've sent a sign-in link to <strong>{joinEmail}</strong>.</p>
            </div>
          ) : (
            <>
              <form className="parlor-join-form" onSubmit={handleJoinSubmit}>
                <label htmlFor="parlor-join-email">Email address</label>
                <div className="parlor-join-fields">
                  <input
                    id="parlor-join-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={joinEmail}
                    onChange={(event) => setJoinEmail(event.target.value)}
                    required
                  />
                  <button type="submit" disabled={joinLoading}>
                    {joinLoading ? 'Please wait…' : 'Join Us →'}
                  </button>
                </div>
                {joinError && (
                  <p className="parlor-join-error" role="alert">{joinError}</p>
                )}
              </form>
              <p className="parlor-join-login">
                Already a subscriber?{' '}
                <a href="/login?returnTo=%2Fabout%2Fmission">Sign in here</a>
              </p>
            </>
          )}
        </div>
  )
}
