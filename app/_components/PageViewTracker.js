'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function getOrCreate(key, fn) {
  let val = localStorage.getItem(key)
  if (!val) { val = fn(); localStorage.setItem(key, val) }
  return val
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function getDeviceType() {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export default function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    // Don't track admin pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return
    // Don't double-track the same path
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    try {
      const visitorId  = getOrCreate('parlor_visitor_id', uuid)
      const sessionId  = getOrCreate('parlor_session_id', uuid)
      const referrer   = document.referrer || null
      const deviceType = getDeviceType()

      supabase.from('page_views').insert({
        page_path:   pathname,
        visitor_id:  visitorId,
        session_id:  sessionId,
        referrer,
        device_type: deviceType,
        created_at:  new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn('Page view tracking error:', error.message)
      })
    } catch (e) {
      // Never let tracking errors break the page
    }
  }, [pathname])

  return null
}
