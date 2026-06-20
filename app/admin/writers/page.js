'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TipTapLink from '@tiptap/extension-link'

function slugify(str) {
  return str.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const sideInput = {
  width: '100%', padding: '9px 12px',
  background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '6px', color: '#e0e0e0', fontSize: '13px',
  fontFamily: "'Source Serif 4', Georgia, serif",
  outline: 'none', boxSizing: 'border-box',
}

export default function AdminWritersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [writers, setWriters] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }

      const { data: member, error: memberError } = await supabase
        .from('members').select('role').eq('id', user.id).single()
      if (cancelled) return
      if (memberError) { router.push('/dashboard'); return }
      if (member?.role !== 'admin') { router.push('/dashboard'); return }

      const { data } = await supabase.from('writers').select('*').order('name')
      if (cancelled) return
      setWriters(data || [])
      setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  async function handleDelete(writer) {
    if (!window.confirm(`Delete "${writer.name}"? This cannot be undone.`)) return
    setDeletingId(writer.id)
    await supabase.from('writers').delete().eq('id', writer.id)
    setWriters(prev => prev.filter(w => w.id !== writer.id))
    setDeletingId(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '14px' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/admin" style={{ color: '#444', textDecoration: 'none', fontSize: '12px' }}>← Admin</Link>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', fontWeight: '600', color: '#fff' }}>
              Writers
            </h1>
            <span style={{ fontSize: '12px', color: '#444', background: '#1a1a1a', padding: '3px 10px', borderRadius: '20px' }}>
              {writers.length}
            </span>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            style={{ background: '#f2b8c6', color: '#0a0a0a', border: 'none', padding: '10px 20px', borderRadius: '7px', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Add Writer
          </button>
        </div>

        {writers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#2a2a2a', fontSize: '15px', fontStyle: 'italic' }}>
            No writers yet. Add your first one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {writers.map(writer => (
              <WriterRow
                key={writer.id}
                writer={writer}
                deleting={deletingId === writer.id}
                onEdit={() => { setEditing(writer); setShowForm(true) }}
                onDelete={() => handleDelete(writer)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <WriterFormModal
          supabase={supabase}
          initial={editing}
          onSave={writer => {
            if (editing) {
              setWriters(prev => prev.map(w => w.id === writer.id ? writer : w))
            } else {
              setWriters(prev => [...prev, writer].sort((a, b) => a.name.localeCompare(b.name)))
            }
            setShowForm(false)
            setEditing(null)
          }}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function WriterRow({ writer, deleting, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: hovered ? '#111' : 'transparent', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.12s' }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.07)' }}>
        {writer.photo_url
          ? <img src={writer.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#333' }}>👤</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', color: '#e0e0e0', marginBottom: '2px' }}>{writer.name}</div>
        {writer.bio && <div style={{ fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{writer.bio.replace(/<[^>]+>/g, '')}</div>}
      </div>
      {writer.profile_url && (
        <a href={writer.profile_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#444', textDecoration: 'none' }}>↗</a>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onEdit} style={{ background: 'none', border: '1px solid rgba(242,184,198,0.2)', color: '#f2b8c6', padding: '5px 13px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Edit
        </button>
        <button onClick={onDelete} disabled={deleting} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#3a3a3a', padding: '5px 13px', borderRadius: '5px', fontSize: '12px', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
          {deleting ? '…' : 'Del'}
        </button>
      </div>
    </div>
  )
}

// ── Mini rich-text editor for bio ────────────────────────────
function BioProse({ value, onChange }) {
  const [linkPrompt, setLinkPrompt] = useState(false)
  const [linkUrl, setLinkUrl]       = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, bulletList: false, orderedList: false, listItem: false }),
      Underline,
      TipTapLink.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: [
          'min-height:80px', 'outline:none', 'font-size:13px',
          "font-family:'Source Serif 4',Georgia,serif", 'color:#e0e0e0',
          'line-height:1.6', 'padding:9px 12px', 'white-space:pre-wrap',
        ].join(';'),
      },
    },
  })

  const btn = (active, onClick, title, children) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        background: active ? 'rgba(242,184,198,0.18)' : 'none',
        border: 'none', borderRadius: '4px', color: active ? '#f2b8c6' : '#666',
        cursor: 'pointer', padding: '3px 7px', fontSize: '12px', lineHeight: 1,
        fontFamily: "'Source Serif 4',Georgia,serif",
      }}
    >{children}</button>
  )

  function applyLink() {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) { editor.chain().focus().unsetLink().run(); setLinkPrompt(false); return }
    editor.chain().focus().setLink({ href: url.startsWith('http') ? url : 'https://' + url }).run()
    setLinkPrompt(false)
    setLinkUrl('')
  }

  if (!editor) return null

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', background: '#1c1c1c', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      'Bold',      <strong>B</strong>)}
        {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    'Italic',    <em>I</em>)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline', <span style={{ textDecoration: 'underline' }}>U</span>)}
        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
        {btn(editor.isActive('link'), () => {
          if (editor.isActive('link')) { editor.chain().focus().unsetLink().run() }
          else { setLinkUrl(editor.isActive('link') ? editor.getAttributes('link').href : ''); setLinkPrompt(true) }
        }, 'Link', '🔗')}
        {editor.isActive('link') && btn(false, () => editor.chain().focus().unsetLink().run(), 'Remove link', '✕')}
      </div>

      {/* Link input */}
      {linkPrompt && (
        <div style={{ display: 'flex', gap: '6px', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#161616' }}>
          <input
            autoFocus
            type="text"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') { setLinkPrompt(false); setLinkUrl('') } }}
            placeholder="https://…"
            style={{ flex: 1, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e0e0e0', fontSize: '12px', padding: '4px 8px', outline: 'none', fontFamily: "'Source Serif 4',Georgia,serif" }}
          />
          <button type="button" onMouseDown={e => { e.preventDefault(); applyLink() }} style={{ background: '#f2b8c6', border: 'none', borderRadius: '4px', color: '#0a0a0a', fontSize: '11px', fontWeight: '600', padding: '4px 10px', cursor: 'pointer' }}>Apply</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); setLinkPrompt(false); setLinkUrl('') }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#555', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}

function WriterFormModal({ supabase, initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || '')
  const [bio, setBio] = useState(initial?.bio || '')
  const [profileUrl, setProfileUrl] = useState(initial?.profile_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function uploadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `authors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('Media').upload(path, file, { cacheControl: '3600', contentType: file.type })
    if (uploadError) {
      setError('Photo upload failed: ' + uploadError.message)
    } else {
      const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
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

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), slug: slugify(name), photo_url: photoUrl || null, bio: bio || null, profile_url: profileUrl || null }
    let data, err
    if (initial) {
      ({ data, error: err } = await supabase.from('writers').update(payload).eq('id', initial.id).select().single())
    } else {
      ({ data, error: err } = await supabase.from('writers').insert([payload]).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '440px', background: '#111', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e0e0e0', fontFamily: "'Playfair Display', Georgia, serif" }}>{initial ? 'Edit writer' : 'Add writer'}</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: dragOver ? '#2a2a2a' : '#1c1c1c',
              border: `1px solid ${dragOver ? 'rgba(242,184,198,0.5)' : 'rgba(255,255,255,0.07)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {uploading
              ? <span style={{ fontSize: '11px', color: '#555' }}>…</span>
              : photoUrl
                ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '20px', color: dragOver ? '#888' : '#333' }}>👤</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a4a4a', marginBottom: '5px' }}>Photo</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="Photo URL…" style={{ ...sideInput, flex: 1, marginBottom: 0 }} />
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '0 12px', background: 'rgba(242,184,198,0.15)', border: '1px solid rgba(242,184,198,0.25)', borderRadius: '6px', color: '#f2b8c6', fontSize: '12px', cursor: 'pointer', opacity: uploading ? 0.6 : 1, fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {uploading ? '…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a4a4a', marginBottom: '5px' }}>Name *</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={sideInput} autoFocus />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a4a4a', marginBottom: '5px' }}>Bio</div>
          <BioProse value={bio} onChange={setBio} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a4a4a', marginBottom: '5px' }}>Profile URL</div>
          <input type="text" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://…" style={sideInput} />
        </div>

        {error && <div style={{ color: '#e07070', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: '#f2b8c6', border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Source Serif 4', Georgia, serif", opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add writer'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#666', fontSize: '13px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
