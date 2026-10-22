'use client'

import { useEffect, useState } from 'react'
const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = "#e5e0e2"


const label = { fontFamily: ff, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", margin: "14px 0 6px" }

export default function FundraisingDonations({ supabase, campaigns, onSaved, selectedAskId, locked = false }) {
  const asks = campaigns.flatMap(c =>
    (c.asks || []).map(a => ({ ...a, campaignTitle: c.title }))
  )

  const [askId, setAskId] = useState('')
  useEffect(() => {
    if (selectedAskId) setAskId(selectedAskId)
  }, [selectedAskId])

  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [verified, setVerified] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')



  const field = {
    display: 'block', width: '100%',
    padding: '10px 12px',
    border: `1px solid ${BORDER}`,
    borderRadius: 8, boxSizing: 'border-box',
    fontFamily: ff, fontSize: 14, background: '#fff'
  }

  async function recordDonation(e) {
    e.preventDefault()
    if (saving) return

    setError('')
    setMessage('')

    const value = Number(amount)

    if (!askId || !Number.isFinite(value) || value <= 0) {
      setError('Select a donation ask and enter a valid amount.')
      return
    }

    if (!verified) {
      setError('Please verify the payment in MonkeyPod first.')
      return
    }

    setSaving(true)

    try {
      const { data, error: authError } = await supabase.auth.getSession()
      if (authError || !data.session) {
        throw new Error('Please sign in again.')
      }

      const response = await fetch('/api/admin/fundraising/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({
          ask_id: askId,
          amount: value,
          units: 1,
          external_reference: reference.trim(),
          verified: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to record donation.')
      }

      setMessage('Donation recorded successfully.')
      setAmount('')
      setReference('')
      setVerified(false)

      if (onSaved) await onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e2e3',
      borderRadius: 10, padding: 26 }}>
      <h3 style={{ fontFamily: ffH, fontSize: 20, fontWeight: 700, margin: 0, color: '#0a0a0a' }}>Record a confirmed donation</h3>
      <p style={{ fontFamily: ff, fontSize: 13, color: '#888', margin: '8px 0 18px' }}>
        Enter donations only after verifying payment in MonkeyPod.
      </p>

      <form onSubmit={recordDonation}>
        <div style={label}>Donation ask</div>
        <div style={{ fontFamily: ff, fontSize: 14, color: "#0a0a0a", padding: "9px 0" }}>
          {asks.find(a => a.id === askId)?.title || "Loading donation ask…"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
        <div style={label}>Amount received (USD)</div>
            <input type="number" min="0.01" step="0.01" required
              value={amount} onChange={e => setAmount(e.target.value)}
              style={field} />

          </div>
          <div>
            <div style={label}>MonkeyPod transaction reference</div>
            <input value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Optional transaction ID" style={field} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontFamily: ff, fontSize: 13.5, color: '#333', cursor: 'pointer' }}>
          <input type="checkbox" checked={verified}
            onChange={e => setVerified(e.target.checked)} />
          I have verified this contribution in MonkeyPod.
        </label>

        {error && <p style={{ color: '#a22' }}>{error}</p>}
        {message && <p style={{ color: '#28764b' }}>{message}</p>}

        <button type="submit" disabled={saving || !verified}
          style={{ marginTop: 20, padding: '9px 20px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'block', marginLeft: 'auto' }}>
          {saving ? 'Recording…' : 'Record confirmed donation'}
        </button>
      </form>
    </div>
  )

}
