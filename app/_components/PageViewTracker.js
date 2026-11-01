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


export default function PageViewTracker() {
  const pathname    = usePathname()
  const lastPath    = useRef(null)
  const visitorRef  = useRef(null)
  const sessionRef  = useRef(null)
  const countryRef  = useRef(null)
  const supabase    = createClient()

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) return

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


      } catch {}
    }

    init()

  }, [pathname])

  return null
}
