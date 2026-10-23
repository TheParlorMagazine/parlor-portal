'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase'

// Uses the same authenticated counts as the portal, including notifications
// beyond the most recent 100. Refresh when the menu opens or the tab returns.
export function useUnreadNotifications(memberId, menuOpen) {
  const [value, setValue] = useState({ memberId: null, count: 0 })
  useEffect(() => {
    if (!memberId) return
    let live = true
    let loading = false
    const controller = new AbortController()
    async function refresh() {
      if (loading || document.hidden) return
      loading = true
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session || session.user.id !== memberId) {
          if (live) setValue({ memberId, count: 0 })
          return
        }
        const response = await fetch('/api/portal/unread-counts', { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal, cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (live && Number.isInteger(data.notifications) && data.notifications >= 0) setValue({ memberId, count: data.notifications })
      } catch {} finally { loading = false }
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { live = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [memberId, menuOpen])
  return value.memberId === memberId ? value.count : 0
}
