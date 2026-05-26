'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [memberPayload, setMemberPayload] = useState(null)
  const iframeRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single()

      const name =
        member?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Member'

      const badges = []
      if (member?.role === 'admin') badges.push('2324c632-278b-4bf2-a1c0-3c9a45a8ef2b')

      setMemberPayload({
        type: 'PARLOR_MEMBER_DATA',
        memberId: user.id,
        name,
        plan: member?.plan || null,
        planId: member?.plan_id || null,
        role: member?.role || null,
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        bio: member?.bio || null,
        joinDate: member?.created_at || null,
        badges,
        allPlanIds: member?.plan_id ? [member.plan_id] : [],
      })
    }
    load()
  }, [])

  function handleIframeLoad() {
    if (memberPayload && iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(memberPayload, '*')
    }
  }

  if (!memberPayload) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        color: 'rgba(255,255,255,0.45)',
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
      }}>
        Loading…
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      src="/dashboard.html"
      onLoad={handleIframeLoad}
      title="Member Dashboard"
      style={{ display: 'block', width: '100%', height: '100vh', border: 'none' }}
    />
  )
}
