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

async function getCountry() {
  try {
    const cached = sessionStorage.getItem('parlor_country')
    if (cached) return cached
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
    const data = await res.json()
    const country = data.country_name || null
    if (country) sessionStorage.setItem('parlor_country', country)
    return country
  } catch {
    return null
  }
}

const PING_INTERVAL = 30000 // 30 seconds

export default function PageViewTracker() {
  const pathname    = usePathname()
  const lastPath    = useRef(null)
  const pingRef     = useRef(null)
  const visitorRef  = useRef(null)
  const sessionRef  = useRef(null)
  const countryRef  = useRef(null)
  const supabase    = createClient()

  // Upsert active session (called on load + every 30s)
  async function pingSession(page, country) {
    if (!visitorRef.current) return
    try {
      await supabase.from('active_sessions').upsert({
        visitor_id:   visitorRef.current,
        session_id:   sessionRef.current,
        current_page: page,
        country:      country,
        device_type:  getDeviceType(),
        referrer:     document.referrer || null,
        last_seen:    new Date().toISOString(),
      }, { onConflict: 'visitor_id' })
    } catch {}
  }

  // Remove session when visitor leaves
  async function removeSession() {
    if (!visitorRef.current) return
    try {
      await supabase.from('active_sessions').delete().eq('visitor_id', visitorRef.current)
    } catch {}
  }

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return

    async function init() {
      try {
        visitorRef.current = getOrCreate('parlor_visitor_id', uuid)
        sessionRef.current = getOrCreate('parlor_session_id', uuid)
        countryRef.current = await getCountry()

        // Log page view
        if (pathname !== lastPath.current) {
          lastPath.current = pathname
          supabase.from('page_views').insert({
            page_path:   pathname,
            visitor_id:  visitorRef.current,
            session_id:  sessionRef.current,
            referrer:    document.referrer || null,
            device_type: getDeviceType(),
            country:     countryRef.current,
            created_at:  new Date().toISOString(),
          }).then(({ error }) => {
            if (error) console.warn('Page view tracking error:', error.message)
          })
        }

        // Upsert active session immediately
        await pingSession(pathname, countryRef.current)

        // Keep session alive every 30s
        clearInterval(pingRef.current)
        pingRef.current = setInterval(() => {
          pingSession(pathname, countryRef.current)
        }, PING_INTERVAL)

      } catch {}
    }

    init()

    // Clean up on unmount / tab close
    const handleUnload = () => removeSession()
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(pingRef.current)
    }
  }, [pathname])

  return null
}
