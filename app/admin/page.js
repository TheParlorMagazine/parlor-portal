'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'


export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('role')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (memberError) {
        console.error('Admin check — member query error:', memberError)
        router.push('/dashboard')
        return
      }

      const isAdmin = member?.role === 'admin'
      if (!isAdmin) {
        console.error('Admin check — role is not admin:', member?.role)
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    checkAdmin()
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#444', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '14px',
    }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '56px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '72px' }}>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '32px', fontWeight: '700',
              color: '#fff', letterSpacing: '-0.02em',
            }}>
              The Parlor
            </div>
            <div style={{
              fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.2em', color: '#f2b8c6', marginTop: '7px',
            }}>
              Admin
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#555', padding: '8px 16px', borderRadius: '6px',
              fontSize: '12px', cursor: 'pointer',
              fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          >
            Sign out
          </button>
        </div>

        {/* Section label */}
        <div style={{
          fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.2em', color: '#3a3a3a', marginBottom: '20px',
        }}>
          Content Management
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          <AdminCard
            href="/admin/articles"
            title="Articles"
            description="Create, edit, and publish editorial content"
            count={null}
          />
          <AdminCard
            href="/admin/writers"
            title="Writers"
            description="Manage contributor profiles and bios"
          />
          <AdminCard
            href="/admin/media"
            title="Media"
            description="Upload and manage images and media assets"
          />
          <AdminCard
            href="/admin/settings"
            title="Settings"
            description="Publication settings and configuration"
            disabled
          />
        </div>
      </div>
    </div>
  )
}

function AdminCard({ href, title, description, disabled }) {
  const [hovered, setHovered] = useState(false)

  const inner = (
    <div
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled ? '#0d0d0d' : '#111',
        border: `1px solid ${hovered ? 'rgba(242,184,198,0.35)' : disabled ? 'rgba(255,255,255,0.04)' : 'rgba(242,184,198,0.12)'}`,
        borderRadius: '12px',
        padding: '28px 26px',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 0.2s',
        opacity: disabled ? 0.35 : 1,
        userSelect: 'none',
      }}
    >
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '20px', fontWeight: '600',
        color: '#fff', marginBottom: '8px',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.55' }}>
        {description}
      </div>
      {!disabled && (
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#f2b8c6', letterSpacing: '0.04em' }}>
          {hovered ? 'Open →' : 'View all →'}
        </div>
      )}
    </div>
  )

  if (disabled) return inner

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  )
}
