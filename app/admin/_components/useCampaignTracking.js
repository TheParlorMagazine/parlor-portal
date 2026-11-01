'use client'
import { useEffect, useState } from 'react'

export default function useCampaignTracking(campaigns, supabase) {
  const [metrics,setMetrics] = useState({})
  const [error,setError] = useState('')
  const [revision,setRevision] = useState(0)
  const signature = campaigns.map(c => `${c.id}:${c.status}:${c.recipient_count || 0}`).join(',')
  useEffect(() => {
    let live = true
    const ids = signature.split(',').filter(Boolean).map(row => row.split(':')[0])
    if (!ids.length) return
    async function refresh() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sign in again to view tracking.')
        const pages = []
        for (let i=0;i<ids.length;i+=100) {
          const res = await fetch(`/api/admin/campaigns/metrics?ids=${ids.slice(i,i+100).join(',')}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Tracking could not be loaded.')
          pages.push(...data.metrics)
        }
        if (live) { setMetrics(Object.fromEntries(pages.map(row => [row.campaign_id,row]))); setError('') }
      } catch (error) { if (live) setError(error.message) }
    }
    refresh()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() },30000)
    return () => { live=false;clearInterval(timer) }
  },[signature,supabase,revision])
  return { metrics,error,refresh:()=>setRevision(n=>n+1) }
}
