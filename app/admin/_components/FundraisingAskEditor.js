'use client'

import { useState } from 'react'

const ff = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'

const input = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  fontFamily: ff,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

const label = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#888',
  margin: '14px 0 6px',
}

export default function FundraisingAskEditor({ ask, onClose, supabase, onSaved }) {
  const [title, setTitle] = useState(ask.title || '')
  const [description, setDescription] = useState(ask.description || '')
  const [amount, setAmount] = useState(String(ask.amount ?? ''))
  const [capacity, setCapacity] = useState(String(ask.capacity ?? ''))
  const [unlimited, setUnlimited] = useState(ask.capacity === null)
  const [url, setUrl] = useState(ask.monkeypod_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function saveChanges() {
    if (saving) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const { data, error: authError } = await supabase.auth.getSession()
      if (authError || !data.session) throw new Error("Please sign in again.")

      const response = await fetch("/api/admin/fundraising/asks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({
          id: ask.id,
          title,
          description,
          amount: amount === "" ? "" : Number(amount),
          capacity: unlimited ? null : capacity === "" ? "" : Number(capacity),
          monkeypod_url: url
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to save changes.")
      setMessage("Changes saved successfully.")
      if (onSaved) await onSaved()
    } catch (err) {
      setError(err.message || "Unable to save changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      marginTop: 16,
      padding: 24,
      background: '#fff',
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      fontFamily: ff,
    }}>
      <h3 style={{
        fontFamily: ffH,
        fontSize: 22,
        fontWeight: 700,
        color: '#0a0a0a',
        margin: '0 0 18px',
      }}>
        Edit Fundraising Ask
      </h3>

      <div style={label}>Title</div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={input}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={label}>Price per unit ($)</div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={input}
          />
        </div>
        <div>
          <div style={label}>Units available</div>
          <input
            type="number"
            min="0"
            step="1"
            disabled={unlimited}
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            style={{
              ...input,
              background: unlimited ? '#f5f5f5' : '#fff',
            }}
          />
        </div>
      </div>

      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        fontSize: 13.5,
        color: '#333',
        cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={e => setUnlimited(e.target.checked)}
        />
        Unlimited availability
      </label>

      <div style={label}>Description</div>
      <textarea
        rows={4}
        value={description}
        onChange={e => setDescription(e.target.value)}
        style={{ ...input, resize: 'vertical' }}
      />

      <div style={label}>MonkeyPod donation URL</div>
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://..."
        style={input}
      />

      {error && <p role="alert" style={{ fontFamily: ff, fontSize: 13, color: "#a22", marginTop: 16 }}>{error}</p>}
      {message && <p role="status" style={{ fontFamily: ff, fontSize: 13, color: "#28764b", marginTop: 16 }}>{message}</p>}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 20,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: '9px 18px',
            fontFamily: ff,
            fontSize: 13,
            color: '#555',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          style={{
            background: "#0a0a0a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 20px",
            fontFamily: ff,
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  )
}
