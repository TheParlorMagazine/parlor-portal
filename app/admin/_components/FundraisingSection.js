'use client'

import { useEffect, useState } from 'react'
import FundraisingDonations from './FundraisingDonations'
import FundraisingAskEditor from './FundraisingAskEditor'

const money = n => '$' + Number(n || 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

export default function FundraisingSection({ supabase }) {
  const [campaigns, setCampaigns] = useState([])
  const [tab, setTab] = useState('campaigns')
  const [selectedAskId, setSelectedAskId] = useState('')
  const [editingAsk, setEditingAsk] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { data, error: authError } = await supabase.auth.getSession()
        if (authError || !data.session) throw new Error('Please sign in again.')

        const response = await fetch('/api/admin/fundraising', {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load campaigns.')

        if (active) setCampaigns(result.campaigns || [])
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [supabase, refreshKey])

  const card = {
    background: '#fff',
    border: '1px solid #e8e2e3',
    borderRadius: 10,
    padding: 24,
    marginBottom: 18
  }

  if (loading) return <div style={{ padding: 30 }}>Loading fundraising campaigns…</div>
  if (error) return <div style={{ padding: 30, color: '#a22' }}>{error}</div>

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: '#a65e74', textTransform: 'uppercase' }}>
          Fundraising
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, margin: '8px 0' }}>
          Campaigns
        </h1>
        <p style={{ color: '#777', margin: 0 }}>
          Manage fundraising campaigns and track confirmed contributions.
        </p>
      </div>

      {campaigns.length === 0 && <div style={card}>No campaigns found.</div>}

      {campaigns.map(campaign => {
        const raised = campaign.asks.reduce((sum, ask) => sum + ask.raised, 0)

        return (
          <div key={campaign.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: '#a65e74', textTransform: 'uppercase' }}>
                  {campaign.eyebrow || 'Campaign'}
                </div>
                <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', margin: '8px 0', fontSize: 25 }}>
                  {campaign.title}
                </h2>
                <p style={{ color: '#777', fontSize: 13 }}>
                  {campaign.slug === 'birthday' ? 'Public page: /buy-us-a-birthday-gift (connection pending)' : 'No public page connected'}
                </p>
              </div>
              <span style={{ fontSize: 12, color: '#7a263a', textTransform: 'capitalize' }}>
                {campaign.status}
              </span>
            </div>

            <div style={{ padding: '18px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', margin: '16px 0 22px' }}>
              <div style={{ fontSize: 12, color: '#777' }}>Confirmed contributions</div>
              <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{money(raised)}</div>
            </div>

            {campaign.asks.map(ask => {
              const goal = ask.capacity !== null && ask.amount !== null
                ? Number(ask.amount) * ask.capacity
                : null
              const percent = goal ? Math.min(100, ask.raised / goal * 100) : 0

              return (
                <div key={ask.id} style={{ padding: '16px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{ask.title}</strong>
                    <span>{ask.amount_label || money(ask.amount)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#777', marginTop: 6 }}>
                    {money(ask.raised)} confirmed
                    {goal !== null ? ` of ${money(goal)} goal` : ''}
                    {ask.remaining !== null ? ` · ${ask.remaining} of ${ask.capacity} remaining` : ''}
                  </div>
                  {goal !== null && (
                    <div style={{ height: 7, background: '#f2e8eb', borderRadius: 10, marginTop: 12, overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: '#a65e74' }} />
                    </div>
                  )}
                  <div style={{
                    display: 'flex', gap: 10, marginTop: 16,
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAskId(current => current === ask.id ? "" : ask.id)
                        setEditingAsk(null)
                      }}
                      style={{
                        padding: '9px 15px', borderRadius: 6,
                        border: 'none', background: selectedAskId === ask.id ? '#f2b8c6' : '#111',
                        color: selectedAskId === ask.id ? '#111' : '#fff', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 13, fontWeight: 600
                      }}>
                      + Record Donation
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingAsk(current => current?.id === ask.id ? null : ask); setSelectedAskId("") }}
                      style={{
                        padding: '9px 15px', borderRadius: 6,
                        border: editingAsk?.id === ask.id ? '2px solid #a94f69' : '2px solid transparent', background: editingAsk?.id === ask.id ? '#f2b8c6' : '#f7dce4',
                        color: '#111', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 13, fontWeight: 600
                      }}>
                      Edit Ask
                    </button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                  {selectedAskId === ask.id && (
                    <FundraisingDonations
                      key={ask.id}
                      supabase={supabase}
                      campaigns={campaigns}
                      selectedAskId={ask.id}
                      locked={true}
                      onSaved={() => setRefreshKey(k => k + 1)}
                    />
                  )}
                  {editingAsk?.id === ask.id && (
                    <FundraisingAskEditor
                      ask={ask}
                      supabase={supabase}
                      onSaved={() => setRefreshKey(k => k + 1)}
                      supabase={supabase}
                      onSaved={() => setRefreshKey(k => k + 1)}
                      onClose={() => setEditingAsk(null)}
                    />
                  )}
                  </div>
                  {ask.manually_fulfilled && (
                    <div style={{ fontSize: 12, color: '#7a263a', marginTop: 8 }}>
                      Manually marked fulfilled
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
