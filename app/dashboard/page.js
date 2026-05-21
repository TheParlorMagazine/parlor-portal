'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setMember(user)
      setLoading(false)
    }

    getUser()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      color: '#888'
    }}>
      Loading...
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: 'Georgia, serif',
      padding: '48px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '48px'
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '500' }}>
              The Parlor
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              Member dashboard
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: '1px solid #e8d4d8',
              padding: '8px 16px',
              borderRadius: '8px',
              fontFamily: 'Georgia, serif',
              fontSize: '13px',
              cursor: 'pointer',
              color: '#888'
            }}
          >
            Sign out
          </button>
        </div>

        <div style={{
          padding: '24px',
          border: '1px solid #e8d4d8',
          borderRadius: '11px',
        }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>
            Signed in as
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {member?.email}
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '24px',
          border: '1px solid #e8d4d8',
          borderRadius: '11px',
          color: '#888',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          Full dashboard coming soon — this is your foundation.
        </div>
      </div>
    </div>
  )
}
