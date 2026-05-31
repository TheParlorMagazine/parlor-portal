'use client'

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MediaLibraryModal from './MediaLibraryModal'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div style={{
      border: '1px solid #e8e8e8', borderRadius: '10px',
      minHeight: '300px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#bbb', fontSize: '13px',
      fontStyle: 'italic', background: '#fff',
    }}>
      Loading editor…
    </div>
  ),
})

const VERTICALS = [
  'Society & Culture',
  'World & Politics',
  'Work & Wealth',
  'Perspectives & Identity',
]

const ARTICLE_CATEGORIES = [
  'Reported',
  'Essay',
  'Op-Ed',
  'Interview',
  'Investigation',
]

function slugify(str) {
  return str.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getTextStats(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').filter(Boolean).length : 0
  const chars = text.length
  const mins = Math.max(1, Math.ceil(words / 200))
  return { words, chars, mins }
}

function relativeTime(date) {
  if (!date) return null
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 10) return 'Saved just now'
  if (sec < 60) return `Saved ${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `Saved ${min}m ago`
  return 'Saved'
}

function initForm(data) {
  if (!data) return {
    title: '', slug: '', subtitle: '', excerpt: '',
    cover_image_url: '',
    author_id: null,
    author_name: '', author_photo_url: '', author_profile_url: '', author_bio: '',
    vertical: '', article_category: '', tags: '',
    issue_id: null,
    body: '',
    audio_url: '', audio_title: '', audio_duration: '',
    video_url: '', video_type: '',
    transcript: '',
    featured: false, published: false,
    template: 'standard',
    paywall_type: 'free', paywall_price: '2.50',
    plan_access: ["Reader's Circle", 'Printing Press'],
    stripe_product_id: null, stripe_price_id: null,
    meta_title: '', meta_description: '',
  }
  return {
    ...data,
    author_id: data.author_id || null,
    body: data.body || '',
    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
    vertical: data.category || '',
    article_category: data.article_category || '',
    issue_id: data.issue_id || null,
    template: data.template || 'standard',
    paywall_type: (data.paywall_type === 'members' || !data.paywall_type) ? 'free' : data.paywall_type,
    paywall_price: data.paywall_price != null ? String(data.paywall_price) : '2.50',
    plan_access: Array.isArray(data.plan_access) ? data.plan_access : ["Reader's Circle", 'Printing Press'],
  }
}

function buildPayload(form, overrides = {}) {
  return {
    title: form.title || null,
    slug: form.slug || null,
    subtitle: form.subtitle || null,
    excerpt: form.excerpt || null,
    cover_image_url: form.cover_image_url || null,
    author_id: form.author_id || null,
    author_name: form.author_name || null,
    author_photo_url: form.author_photo_url || null,
    author_profile_url: form.author_profile_url || null,
    author_bio: form.author_bio || null,
    category: form.vertical || null,
    article_category: form.article_category || null,
    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    issue_id: form.issue_id || null,
    body: form.body || null,
    audio_url: form.audio_url || null,
    audio_title: form.audio_title || null,
    audio_duration: form.audio_duration || null,
    video_url: form.video_url || null,
    video_type: form.video_type || null,
    transcript: form.transcript || null,
    featured: !!form.featured,
    published: !!form.published,
    template: form.template || 'standard',
    paywall_type: form.paywall_type || 'free',
    paywall_price: form.paywall_price ? parseFloat(form.paywall_price) : 2.50,
    plan_access: Array.isArray(form.plan_access) ? form.plan_access : [],
    stripe_product_id: form.stripe_product_id || null,
    stripe_price_id: form.stripe_price_id || null,
    meta_title: form.meta_title || null,
    meta_description: form.meta_description || null,
    ...overrides,
  }
}

// ── Sub-components ─────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        background: checked ? '#f2b8c6' : '#2e2e2e',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: checked ? '18px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#0a0a0a' : '#666',
        transition: 'left 0.18s',
      }} />
    </button>
  )
}

function SideSection({ title, children }) {
  return (
    <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {title && (
        <div style={{
          fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em',
          color: '#444', marginBottom: '14px', fontFamily: "'Source Serif 4', Georgia, serif",
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function SideLabel({ children }) {
  return (
    <div style={{
      fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
      color: '#4a4a4a', marginBottom: '5px', fontFamily: "'Source Serif 4', Georgia, serif",
    }}>
      {children}
    </div>
  )
}

const sideInput = {
  width: '100%',
  padding: '8px 11px',
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '6px',
  color: '#e0e0e0',
  fontSize: '13px',
  fontFamily: "'Source Serif 4', Georgia, serif",
  outline: 'none',
  boxSizing: 'border-box',
}

function SideInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && <SideLabel>{label}</SideLabel>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={sideInput} />
    </div>
  )
}

function SideTextarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && <SideLabel>{label}</SideLabel>}
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...sideInput, resize: 'vertical' }} />
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '32px 0 18px' }}>
      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#bbb', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: '#eee' }} />
    </div>
  )
}

const AutoTextarea = forwardRef(function AutoTextarea({ value, onChange, placeholder, style }, forwardedRef) {
  const innerRef = useRef(null)

  // Merge the forwarded ref with our internal ref so auto-resize always works
  const setRef = useCallback(node => {
    innerRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef != null) forwardedRef.current = node
  }, [forwardedRef])

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  })

  return (
    <textarea ref={setRef} value={value ?? ''} onChange={onChange}
      placeholder={placeholder} rows={1}
      style={{ display: 'block', width: '100%', resize: 'none', overflow: 'hidden', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', ...style }}
    />
  )
})

function PostStat({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
      <span style={{ fontSize: '10px', color: '#444', fontFamily: "'Source Serif 4', Georgia, serif", textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: '12px', color: '#888', fontFamily: mono ? 'monospace' : "'Source Serif 4', Georgia, serif", textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

// ── Cover Image Picker ─────────────────────────────────────

function CoverImagePicker({ value, onChange }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
        setUrlMode(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function uploadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    setOpen(false)
    const ext = file.name.split('.').pop()
    const storagePath = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Media').upload(storagePath, file, {
      cacheControl: '3600', contentType: file.type,
    })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(storagePath)
      onChange(publicUrl)
    }
    setUploading(false)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const menuStyle = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }
  const menuItemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '10px 14px', border: 'none', background: 'none',
    color: '#ccc', fontSize: '13px', cursor: 'pointer',
    fontFamily: "'Source Serif 4', Georgia, serif",
  }

  const Menu = () => (
    <div style={menuStyle}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {!urlMode ? (
        <>
          <button type="button" onMouseDown={e => { e.preventDefault(); fileRef.current?.click(); setOpen(false) }} style={menuItemStyle}>
            Upload image
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); setUrlMode(true) }} style={{ ...menuItemStyle, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            Paste URL
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowLibrary(true); setOpen(false) }} style={{ ...menuItemStyle, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            Choose from library
          </button>
        </>
      ) : (
        <div style={{ padding: '10px' }}>
          <input
            autoFocus
            type="text"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && urlDraft.trim()) { onChange(urlDraft.trim()); setUrlDraft(''); setUrlMode(false); setOpen(false) }
              if (e.key === 'Escape') { setUrlMode(false) }
            }}
            placeholder="https://…"
            style={{ ...sideInput, marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); if (urlDraft.trim()) { onChange(urlDraft.trim()); setUrlDraft(''); setUrlMode(false); setOpen(false) } }}
              style={{ flex: 1, padding: '7px', background: '#f2b8c6', border: 'none', borderRadius: '5px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Use URL
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); setUrlMode(false) }} style={{ padding: '7px 10px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: '#666', fontSize: '12px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
              ←
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {value ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px', border: `1.5px ${dragOver ? 'dashed #f2b8c6' : 'solid rgba(255,255,255,0.06)'}`, transition: 'border-color 0.15s' }}>
            <img
              src={value}
              alt="Cover"
              style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }}
            />
            {dragOver && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(242,184,198,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#f2b8c6', fontFamily: "'Source Serif 4', Georgia, serif", pointerEvents: 'none' }}>
                Drop image here
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div ref={menuRef} style={{ position: 'relative', flex: 1 }}>
              <button
                type="button"
                onClick={() => { setUrlMode(false); setOpen(v => !v) }}
                style={{ width: '100%', padding: '7px', background: 'rgba(242,184,198,0.12)', border: '1px solid rgba(242,184,198,0.2)', borderRadius: '6px', color: '#f2b8c6', fontSize: '12px', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Uploading…' : 'Change'}
              </button>
              {open && <Menu />}
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ padding: '7px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={menuRef}
          style={{ position: 'relative' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={() => { setUrlMode(false); setOpen(v => !v) }}
            style={{
              width: '100%', padding: '28px 0',
              border: `1.5px dashed ${dragOver ? '#f2b8c6' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              background: dragOver ? 'rgba(242,184,198,0.06)' : 'transparent',
              color: dragOver ? '#f2b8c6' : '#444', fontSize: '13px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: "'Source Serif 4', Georgia, serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              opacity: uploading ? 0.6 : 1,
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
              pointerEvents: dragOver ? 'none' : 'auto',
            }}
          >
            {uploading ? 'Uploading…' : dragOver ? 'Drop image here' : '+ Add cover image'}
          </button>
          {dragOver && (
            <div
              style={{ position: 'absolute', inset: 0, borderRadius: '8px' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            />
          )}
          {open && <Menu />}
        </div>
      )}

      {showLibrary && (
        <MediaLibraryModal
          defaultFolder="covers"
          onSelect={url => { onChange(url); setShowLibrary(false) }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </>
  )
}

// ── Add Writer Modal ────────────────────────────────────────

function AddWriterModal({ supabase, onSave, onClose }) {
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [bio, setBio] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const photoFileRef = useRef(null)

  async function uploadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const filePath = `authors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('Media').upload(filePath, file, {
      cacheControl: '3600', contentType: file.type,
    })
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(filePath)
      setPhotoUrl(publicUrl)
    }
    setUploading(false)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    e.target.value = ''
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const slug = slugify(name)
    const { data, error: saveError } = await supabase
      .from('writers')
      .insert([{ name: name.trim(), slug, photo_url: photoUrl || null, bio: bio || null, profile_url: profileUrl || null }])
      .select()
      .single()
    if (saveError) { setError(saveError.message); setSaving(false); return }
    onSave(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '440px', background: '#111', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e0e0e0', fontFamily: "'Playfair Display', Georgia, serif" }}>Add writer</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {/* Photo */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Drag an image here to upload"
            style={{
              width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden',
              background: dragging ? 'rgba(242,184,198,0.12)' : '#1c1c1c',
              border: `1.5px ${dragging ? 'dashed #f2b8c6' : 'solid rgba(255,255,255,0.07)'}`,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s, background 0.15s',
              cursor: 'copy',
            }}
          >
            {uploading
              ? <span style={{ fontSize: '10px', color: '#f2b8c6' }}>…</span>
              : photoUrl
                ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '20px', color: dragging ? '#f2b8c6' : '#333' }}>👤</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <SideLabel>Photo</SideLabel>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="Photo URL…"
                style={{ ...sideInput, flex: 1, marginBottom: 0 }}
              />
              <input ref={photoFileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <button type="button" onClick={() => photoFileRef.current?.click()} disabled={uploading} style={{ padding: '0 12px', background: 'rgba(242,184,198,0.15)', border: '1px solid rgba(242,184,198,0.25)', borderRadius: '6px', color: '#f2b8c6', fontSize: '12px', cursor: 'pointer', opacity: uploading ? 0.6 : 1, fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {uploading ? '…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: '12px' }}>
          <SideLabel>Name *</SideLabel>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={sideInput} autoFocus />
        </div>

        {/* Bio */}
        <div style={{ marginBottom: '12px' }}>
          <SideLabel>Bio</SideLabel>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Short bio…" rows={2} style={{ ...sideInput, resize: 'vertical' }} />
        </div>

        {/* Profile URL */}
        <div style={{ marginBottom: '20px' }}>
          <SideLabel>Profile URL</SideLabel>
          <input type="text" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://…" style={sideInput} />
        </div>

        {error && <div style={{ color: '#e07070', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: '#f2b8c6', border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Add writer'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#666', fontSize: '13px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Writer Selector ─────────────────────────────────────────

function WriterSelector({ supabase, authorId, onSelect }) {
  const [writers, setWriters] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    supabase.from('writers').select('*').order('name').then(({ data }) => {
      setWriters(data || [])
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = writers.find(w => w.id === authorId)

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '8px' }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{
            width: '100%', padding: '8px 11px',
            background: '#1c1c1c', border: `1px solid ${open ? 'rgba(242,184,198,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}
        >
          {selected ? (
            <>
              {selected.photo_url
                ? <img src={selected.photo_url} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2e2e2e', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '13px', color: '#e0e0e0', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: '#555', flex: 1, textAlign: 'left' }}>
              {loaded ? 'Select author…' : 'Loading…'}
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 3.5l3 3 3-3" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxHeight: '240px', overflowY: 'auto',
          }}>
            {writers.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '13px', color: '#555', fontFamily: "'Source Serif 4', Georgia, serif", textAlign: 'center', fontStyle: 'italic' }}>
                No writers yet
              </div>
            ) : (
              writers.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => { onSelect(w); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 14px', border: 'none',
                    background: w.id === authorId ? 'rgba(242,184,198,0.1)' : 'transparent',
                    cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {w.photo_url
                    ? <img src={w.photo_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2e2e2e', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', color: '#e0e0e0' }}>{w.name}</div>
                    {w.bio && <div style={{ fontSize: '11px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{w.bio}</div>}
                  </div>
                  {w.id === authorId && <span style={{ color: '#f2b8c6', fontSize: '11px' }}>✓</span>}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setShowAdd(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#f2b8c6', fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              + Add new writer
            </button>
          </div>
        )}
      </div>

      {/* Clear + Manage link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', color: '#444', fontSize: '11px', cursor: 'pointer', padding: 0, fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Clear
          </button>
        )}
        <Link href="/admin/writers" style={{ marginLeft: 'auto', fontSize: '11px', color: '#444', textDecoration: 'none' }}>
          Manage writers →
        </Link>
      </div>

      {showAdd && (
        <AddWriterModal
          supabase={supabase}
          onSave={writer => {
            setWriters(prev => [...prev, writer].sort((a, b) => a.name.localeCompare(b.name)))
            onSelect(writer)
            setShowAdd(false)
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

// ── Issue Picker ────────────────────────────────────────────

function IssuePicker({ supabase, issueId, onSelect }) {
  const [enabled, setEnabled] = useState(!!issueId)
  const [issues, setIssues] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [newDate, setNewDate] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!enabled || loaded) return
    supabase.from('issues').select('*').order('number', { ascending: false }).then(({ data }) => {
      setIssues(data || [])
      setLoaded(true)
    })
  }, [enabled])

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setShowAdd(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = issues.find(i => i.id === issueId)

  async function handleSaveNewIssue() {
    if (!newTitle.trim()) { setAddError('Title is required'); return }
    setAddSaving(true)
    setAddError('')
    const { data, error } = await supabase
      .from('issues')
      .insert([{
        title: newTitle.trim(),
        number: newNumber ? parseInt(newNumber, 10) : null,
        publication_date: newDate || null,
      }])
      .select()
      .single()
    if (error) { setAddError(error.message); setAddSaving(false); return }
    setIssues(prev => [data, ...prev])
    onSelect(data.id)
    setOpen(false)
    setShowAdd(false)
    setNewTitle('')
    setNewNumber('')
    setNewDate('')
    setAddSaving(false)
  }

  function handleToggle(checked) {
    setEnabled(checked)
    if (!checked) {
      onSelect(null)
      setOpen(false)
      setShowAdd(false)
    } else if (!loaded) {
      supabase.from('issues').select('*').order('number', { ascending: false }).then(({ data }) => {
        setIssues(data || [])
        setLoaded(true)
      })
    }
  }

  const labelText = selected
    ? (selected.number ? `Issue #${selected.number} — ${selected.title}` : selected.title)
    : 'Select issue…'

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: enabled ? '12px' : 0 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => handleToggle(e.target.checked)}
          style={{ width: '14px', height: '14px', accentColor: '#f2b8c6', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: '13px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Appears in quarterly issue
        </span>
      </label>

      {enabled && (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setOpen(v => !v); setShowAdd(false) }}
            style={{
              width: '100%', padding: '8px 11px',
              background: '#1c1c1c', border: `1px solid ${open ? 'rgba(242,184,198,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          >
            <span style={{ fontSize: '13px', color: selected ? '#e0e0e0' : '#555', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {selected ? labelText : (loaded ? 'Select issue…' : 'Loading…')}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: '6px' }}>
              <path d="M2 3.5l3 3 3-3" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              maxHeight: '280px', overflowY: 'auto',
            }}>
              {!showAdd ? (
                <>
                  {!loaded ? (
                    <div style={{ padding: '14px', fontSize: '12px', color: '#555', textAlign: 'center', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      Loading…
                    </div>
                  ) : issues.length === 0 ? (
                    <div style={{ padding: '14px', fontSize: '12px', color: '#555', textAlign: 'center', fontStyle: 'italic', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      No issues yet
                    </div>
                  ) : (
                    issues.map(issue => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => { onSelect(issue.id); setOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px',
                          width: '100%', padding: '10px 14px', border: 'none',
                          background: issue.id === issueId ? 'rgba(242,184,198,0.1)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif",
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {issue.number ? `#${issue.number} — ` : ''}{issue.title}
                        </span>
                        <span style={{ fontSize: '11px', color: '#555', flexShrink: 0 }}>
                          {issue.publication_date
                            ? new Date(issue.publication_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : ''}
                          {issue.id === issueId && <span style={{ color: '#f2b8c6', marginLeft: '6px' }}>✓</span>}
                        </span>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      width: '100%', padding: '10px 14px', border: 'none',
                      borderTop: issues.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      background: 'transparent', cursor: 'pointer',
                      fontSize: '12px', color: '#f2b8c6',
                      fontFamily: "'Source Serif 4', Georgia, serif",
                    }}
                  >
                    + Add new issue
                  </button>
                </>
              ) : (
                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: '12px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                    New issue
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <SideLabel>Title</SideLabel>
                    <input
                      autoFocus
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveNewIssue()}
                      placeholder="Borderlands of Identity"
                      style={sideInput}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    <div>
                      <SideLabel>Number</SideLabel>
                      <input type="number" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="1" style={sideInput} />
                    </div>
                    <div>
                      <SideLabel>Pub date</SideLabel>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={sideInput} />
                    </div>
                  </div>
                  {addError && (
                    <div style={{ fontSize: '11px', color: '#e07070', marginBottom: '8px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      {addError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSaveNewIssue}
                      disabled={addSaving || !newTitle.trim()}
                      style={{
                        flex: 1, padding: '8px', background: '#f2b8c6', border: 'none',
                        borderRadius: '5px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600',
                        cursor: addSaving ? 'not-allowed' : 'pointer',
                        fontFamily: "'Source Serif 4', Georgia, serif",
                        opacity: addSaving ? 0.7 : 1,
                      }}
                    >
                      {addSaving ? 'Creating…' : 'Create issue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAdd(false); setAddError('') }}
                      style={{
                        padding: '8px 10px', background: 'none',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px',
                        color: '#666', fontSize: '12px', cursor: 'pointer',
                        fontFamily: "'Source Serif 4', Georgia, serif",
                      }}
                    >
                      ←
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clear selection */}
          {selected && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              style={{ background: 'none', border: 'none', color: '#444', fontSize: '11px', cursor: 'pointer', padding: '4px 0 0', fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────

export default function ArticleEditor({ initialData = null, articleId = null }) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState(() => initForm(initialData))
  const [savedId, setSavedId] = useState(articleId)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [savedDisplay, setSavedDisplay] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [postInfoOpen, setPostInfoOpen] = useState(false)
  const [stripeStatus, setStripeStatus] = useState(
    () => initialData?.stripe_product_id ? 'done' : ''
  )
  const saveDraftRef = useRef(null)

  const formRef = useRef(form)
  const savedIdRef = useRef(articleId)
  const isDirtyRef = useRef(false)
  const slugTouchedRef = useRef(!!articleId)

  useEffect(() => { formRef.current = form }, [form])
  useEffect(() => {
    savedIdRef.current = savedId
    setSavedId(savedId)
  }, [savedId])

  useEffect(() => {
    setSavedDisplay(relativeTime(lastSavedAt))
    const t = setInterval(() => setSavedDisplay(relativeTime(lastSavedAt)), 15000)
    return () => clearInterval(t)
  }, [lastSavedAt])

  const update = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    isDirtyRef.current = true
    setIsDirty(true)
  }, [])

  const batchUpdate = useCallback((updates) => {
    setForm(prev => ({ ...prev, ...updates }))
    isDirtyRef.current = true
    setIsDirty(true)
  }, [])

  useEffect(() => {
    if (!slugTouchedRef.current && form.title) {
      setForm(prev => ({ ...prev, slug: slugify(prev.title) }))
    }
  }, [form.title])

  // Autosave every 30s — skip if no title (prevents "null value in column title" error)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isDirtyRef.current) return
      if (!formRef.current.title?.trim()) return
      const payload = buildPayload(formRef.current)
      const id = savedIdRef.current

      if (id) {
        const { error } = await supabase.from('articles').update(payload).eq('id', id)
        if (!error) {
          setLastSavedAt(new Date())
          isDirtyRef.current = false
          setIsDirty(false)
        }
      } else {
        const { data: art, error } = await supabase
          .from('articles').insert([{ ...payload, published: false }]).select().single()
        if (!error && art) {
          savedIdRef.current = art.id
          setSavedId(art.id)
          setLastSavedAt(new Date())
          isDirtyRef.current = false
          setIsDirty(false)
          window.history.replaceState({}, '', `/admin/articles/${art.id}/edit`)
        }
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function performSave(overrides = {}) {
    setSaving(true)
    setSaveError('')
    const payload = buildPayload(formRef.current, overrides)
    const id = savedIdRef.current

    let newId = id
    if (id) {
      const { error } = await supabase.from('articles').update(payload).eq('id', id)
      if (error) { setSaveError(error.message); setSaving(false); return false }
    } else {
      const { data: art, error } = await supabase
        .from('articles').insert([payload]).select().single()
      if (error) { setSaveError(error.message); setSaving(false); return false }
      newId = art.id
      savedIdRef.current = art.id
      setSavedId(art.id)
      window.history.replaceState({}, '', `/admin/articles/${art.id}/edit`)
    }

    setLastSavedAt(new Date())
    setSavedDisplay('Saved just now')
    isDirtyRef.current = false
    setIsDirty(false)
    setSaving(false)
    return newId
  }

  async function handleSaveDraft() {
    await performSave({ published: false })
  }

  async function handlePublish() {
    const ok = await performSave({ published: true })
    if (ok) setForm(prev => ({ ...prev, published: true }))
  }

  saveDraftRef.current = handleSaveDraft

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveDraftRef.current?.()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onMessage(e) {
      if (e.data === 'close-preview') setPreviewUrl(null)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function handlePreview() {
    const slug = formRef.current.slug
    if (!slug || slug === 'article-slug') {
      setSaveError('A slug is required before previewing.')
      return
    }
    const saved = await performSave({ published: false })
    if (!saved) return
    if (formRef.current.template === 'custom') {
      try {
        await fetch('/api/save-custom-component', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, code: formRef.current.body || '' }),
        })
      } catch {}
    }
    setPreviewUrl(`/preview/${slug}`)
  }

  async function handleDelete() {
    const title = formRef.current.title || 'this article'
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    if (savedIdRef.current) {
      await supabase.from('articles').delete().eq('id', savedIdRef.current)
    }
    router.push('/admin/articles')
  }

  async function handlePaywallTypeChange(value) {
    update('paywall_type', value)

    if (value !== 'paywall') return

    // Already has a Stripe product
    if (formRef.current.stripe_product_id) {
      setStripeStatus('done')
      return
    }

    // Need a title to name the product
    if (!formRef.current.title?.trim()) {
      setSaveError('Add a title before enabling paywall pricing')
      return
    }

    setStripeStatus('creating')

    // Ensure the article is saved so we have an ID
    let id = savedIdRef.current
    if (!id) {
      const result = await performSave({ published: false })
      if (!result) { setStripeStatus('error'); return }
      id = result
    }

    try {
      const res = await fetch('/api/create-paywall-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: id,
          title: formRef.current.title,
          itemType: 'article',
          price: parseFloat(formRef.current.paywall_price) || 2.50,
        }),
      })
      const data = await res.json()
      if (data.stripe_product_id) {
        setForm(prev => ({
          ...prev,
          stripe_product_id: data.stripe_product_id,
          stripe_price_id: data.stripe_price_id,
        }))
        formRef.current = {
          ...formRef.current,
          stripe_product_id: data.stripe_product_id,
          stripe_price_id: data.stripe_price_id,
        }
        setStripeStatus('done')
      } else {
        setStripeStatus('error')
      }
    } catch {
      setStripeStatus('error')
    }
  }

  function handleSelectWriter(writer) {
    if (!writer) {
      batchUpdate({ author_id: null, author_name: '', author_photo_url: '', author_profile_url: '', author_bio: '' })
    } else {
      batchUpdate({
        author_id: writer.id,
        author_name: writer.name || '',
        author_photo_url: writer.photo_url || '',
        author_profile_url: writer.profile_url || '',
        author_bio: writer.bio || '',
      })
    }
  }

  const { words, chars, mins } = getTextStats(form.body)

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>

      {/* ─── Top bar ─────────────────────────────────────────── */}
      <div style={{
        height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid rgba(242,184,198,0.1)',
        background: '#0a0a0a',
        gap: '16px',
      }}>
        {/* Left: breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <Link href="/admin/articles" style={{ color: '#555', textDecoration: 'none', fontSize: '12px', letterSpacing: '0.02em' }}>
            ← Articles
          </Link>
          {form.title && (
            <>
              <span style={{ color: '#2a2a2a', fontSize: '12px' }}>/</span>
              <span style={{ fontSize: '12px', color: '#777', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.title}
              </span>
            </>
          )}
        </div>

        {/* Center: word count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#444' }}>
          {words > 0 && (
            <span style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {words.toLocaleString()} words · {mins} min read
            </span>
          )}
          {saveError && (
            <span style={{ color: '#e07070', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {saveError}
            </span>
          )}
        </div>

        {/* Right: autosave + badge + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{
            fontSize: '11px', fontFamily: "'Source Serif 4', Georgia, serif",
            color: saving ? '#666' : isDirty ? '#8a6f2a' : '#3a5a3a',
            minWidth: '100px', textAlign: 'right',
          }}>
            {saving ? 'Saving…' : isDirty ? 'Unsaved changes' : (savedDisplay || '')}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
            background: form.published ? 'rgba(242,184,198,0.12)' : 'rgba(255,255,255,0.05)',
            color: form.published ? '#f2b8c6' : '#555',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: form.published ? '#f2b8c6' : '#444' }} />
            {form.published ? 'Published' : 'Draft'}
          </span>
          <button onClick={handleSaveDraft} disabled={saving} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#888', padding: '7px 16px', borderRadius: '6px', fontSize: '12px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: saving ? 0.6 : 1 }}>
            Save Draft
          </button>
          <button onClick={handlePreview} disabled={saving} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#888', padding: '7px 16px', borderRadius: '6px', fontSize: '12px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: saving ? 0.6 : 1 }}>
            Preview
          </button>
          <button onClick={handlePublish} disabled={saving} style={{ background: '#f2b8c6', color: '#0a0a0a', border: 'none', padding: '7px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: saving ? 0.7 : 1 }}>
            {form.published ? 'Save & Publish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* ─── Content row ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Writing surface */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '56px 32px 80px 72px' }}>
          <div style={{ maxWidth: '700px' }}>

            <AutoTextarea
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="Article title…"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '46px', fontWeight: '700', color: '#0a0a0a', lineHeight: '1.15', letterSpacing: '-0.02em', marginBottom: '10px' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ fontSize: '11px', color: '#bbb', fontFamily: "'Source Serif 4', Georgia, serif" }}>/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => { slugTouchedRef.current = true; update('slug', e.target.value) }}
                placeholder="article-slug"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#aaa', fontFamily: "'Source Serif 4', Georgia, serif" }}
              />
            </div>

            <AutoTextarea
              value={form.subtitle}
              onChange={e => update('subtitle', e.target.value)}
              placeholder="Subtitle…"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: '400', color: '#333', lineHeight: '1.4', marginBottom: '16px' }}
            />

            <AutoTextarea
              value={form.excerpt}
              onChange={e => update('excerpt', e.target.value)}
              placeholder="Excerpt — shown in article previews and cards…"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '16px', color: '#666', lineHeight: '1.65', marginBottom: '8px' }}
            />

            <SectionDivider label={form.template === 'custom' ? 'Custom React' : 'Body'} />
            {form.template === 'custom' ? (
              <div>
                <textarea
                  value={form.body || ''}
                  onChange={e => update('body', e.target.value)}
                  placeholder={'// Custom React component code\n// This overrides the standard article template\n// File will be saved to app/post/_custom/[slug].jsx'}
                  style={{
                    width: '100%', minHeight: '420px',
                    background: '#1a1a1a', color: '#e0e0e0',
                    fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.65',
                    padding: '16px', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', resize: 'vertical', outline: 'none',
                    boxSizing: 'border-box', tabSize: 2,
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const { selectionStart: s, selectionEnd: end, value: v } = e.target
                      const next = v.slice(0, s) + '  ' + v.slice(end)
                      update('body', next)
                      requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2 })
                    }
                  }}
                />
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#555', fontStyle: 'italic', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  Place your component at app/post/_custom/{form.slug || '[slug]'}.jsx — the body field is not used for custom React articles
                </div>
              </div>
            ) : (
              <RichTextEditor
                content={form.body}
                onChange={val => update('body', val)}
                placeholder="Write your article…"
              />
            )}
          </div>
        </div>

        {/* ─── Sidebar (right) ───────────────────────────────── */}
        <aside style={{ width: '292px', flexShrink: 0, overflowY: 'auto', background: '#111', borderLeft: '1px solid #1c1c1c' }}>

          {/* Status */}
          <SideSection title="Status">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: form.published ? '#f2b8c6' : '#666', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {form.published ? 'Published' : 'Draft'}
              </span>
              <Toggle checked={form.published} onChange={v => update('published', v)} />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: form.featured ? '#f2b8c6' : '#666', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Featured
              </span>
              <Toggle checked={form.featured} onChange={v => update('featured', v)} />
            </div>

            {/* Template */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <SideLabel>Template</SideLabel>
              {[
                { value: 'standard', label: 'Standard' },
                { value: 'custom', label: 'Custom React' },
              ].map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="template"
                    value={value}
                    checked={form.template === value}
                    onChange={() => update('template', value)}
                    style={{ accentColor: '#f2b8c6', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '13px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                    {label}
                  </span>
                </label>
              ))}
              {form.template === 'custom' && (
                <div style={{ fontSize: '10px', color: '#3a3a3a', fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: '1.5', marginTop: '4px' }}>
                  Place component at app/post/_custom/{form.slug || '<slug>'}.jsx
                </div>
              )}
            </div>

            {/* Article-level paywall */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <SideLabel>Access</SideLabel>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {[
                  { value: 'free', label: 'Free' },
                  { value: 'paywall', label: 'Paywall' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePaywallTypeChange(value)}
                    style={{
                      flex: 1, padding: '6px 4px', border: 'none', borderRadius: '5px',
                      cursor: 'pointer', fontSize: '11px',
                      background: form.paywall_type === value ? 'rgba(242,184,198,0.2)' : 'rgba(255,255,255,0.04)',
                      color: form.paywall_type === value ? '#f2b8c6' : '#555',
                      fontFamily: "'Source Serif 4', Georgia, serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.paywall_type === 'paywall' && (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <SideLabel>Single Use Access Price</SideLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '12px', color: '#555' }}>$</span>
                      <input
                        type="text"
                        value={form.paywall_price}
                        onChange={e => update('paywall_price', e.target.value)}
                        placeholder="2.50"
                        style={{ ...sideInput, width: '80px', padding: '5px 8px', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                  {/* Stripe status */}
                  {stripeStatus && (
                    <div style={{
                      fontSize: '10px', fontFamily: "'Source Serif 4', Georgia, serif",
                      color: stripeStatus === 'done' ? '#4a7a4a' : stripeStatus === 'error' ? '#c05050' : '#666',
                      marginBottom: '8px',
                    }}>
                      {stripeStatus === 'creating' && 'Creating payment…'}
                      {stripeStatus === 'done' && 'Payment set up ✓'}
                      {stripeStatus === 'error' && 'Payment setup failed — save a title first'}
                    </div>
                  )}
                  {/* Plan inclusion */}
                  <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#444', marginBottom: '8px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      Included in plans
                    </div>
                    {["Reader's Circle", 'Printing Press'].map(plan => {
                      const checked = (form.plan_access || []).includes(plan)
                      return (
                        <label key={plan} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const current = form.plan_access || []
                              update('plan_access', checked
                                ? current.filter(p => p !== plan)
                                : [...current, plan]
                              )
                            }}
                            style={{ width: '13px', height: '13px', accentColor: '#f2b8c6', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ fontSize: '12px', color: '#888', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                            {plan}
                          </span>
                        </label>
                      )
                    })}
                    <div style={{ fontSize: '10px', color: '#3a3a3a', fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: '1.5', marginTop: '6px' }}>
                      Members with these plans get free access to this content
                    </div>
                  </div>
                </>
              )}
            </div>
          </SideSection>

          {/* Cover Image */}
          <SideSection title="Cover Image">
            <CoverImagePicker value={form.cover_image_url} onChange={v => update('cover_image_url', v)} />
          </SideSection>

          {/* Author */}
          <SideSection title="Author">
            <WriterSelector supabase={supabase} authorId={form.author_id} onSelect={handleSelectWriter} />
          </SideSection>

          {/* Classification */}
          <SideSection title="Classification">
            <div style={{ marginBottom: '12px' }}>
              <SideLabel>Vertical</SideLabel>
              <select value={form.vertical} onChange={e => update('vertical', e.target.value)} style={{ ...sideInput, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}>
                <option value="">Select vertical</option>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <SideLabel>Category</SideLabel>
              <select value={form.article_category} onChange={e => update('article_category', e.target.value)} style={{ ...sideInput, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}>
                <option value="">Select category</option>
                {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <SideInput label="Tags" value={form.tags} onChange={v => update('tags', v)} placeholder="comma, separated" />
          </SideSection>

          {/* Issue */}
          <SideSection title="Issue">
            <IssuePicker
              supabase={supabase}
              issueId={form.issue_id}
              onSelect={id => update('issue_id', id)}
            />
          </SideSection>

          {/* SEO */}
          <SideSection title="SEO">
            <SideInput label="Meta Title" value={form.meta_title} onChange={v => update('meta_title', v)} placeholder="Override page title" />
            <SideTextarea label="Meta Description" value={form.meta_description} onChange={v => update('meta_description', v)} placeholder="For search engines…" rows={3} />
          </SideSection>

          {/* Post Info */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" onClick={() => setPostInfoOpen(v => !v)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#444', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Post Info
              </span>
              <span style={{ fontSize: '10px', color: '#333' }}>{postInfoOpen ? '▾' : '▸'}</span>
            </button>
            {postInfoOpen && (
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <PostStat label="Words" value={words > 0 ? words.toLocaleString() : '0'} />
                <PostStat label="Reading time" value={words > 0 ? `${mins} min` : '—'} />
                <PostStat label="Characters" value={chars > 0 ? chars.toLocaleString() : '0'} />
                <PostStat label="Last modified" value={lastSavedAt ? lastSavedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : form.updated_at ? new Date(form.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'} />
                <PostStat label="Created" value={form.created_at ? new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
                {savedId && <PostStat label="Article ID" value={savedId.slice(0, 8) + '…'} mono />}
              </div>
            )}
          </div>

          {/* Delete */}
          {savedId && (
            <div style={{ padding: '20px' }}>
              <button onClick={handleDelete} style={{ width: '100%', background: 'none', border: '1px solid rgba(224,112,112,0.2)', color: '#7a4040', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Delete Article
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          background: '#000',
        }}>
          <iframe
            src={previewUrl}
            style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
          />
        </div>
      )}
    </div>
  )
}
