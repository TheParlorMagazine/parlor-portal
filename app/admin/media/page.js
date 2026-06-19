'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageEditor from '../_components/ImageEditor'

const menuBtnStyle = {
  display: 'block', width: '100%', padding: '9px 14px',
  background: 'none', border: 'none', textAlign: 'left',
  cursor: 'pointer', fontSize: '13px',
  fontFamily: "'Source Serif 4', Georgia, serif",
}

const FOLDERS = ['all', 'body', 'covers', 'authors']

export default function AdminMediaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState('all')
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [copiedUrl, setCopiedUrl]     = useState(null)
  const [dragging, setDragging]       = useState(false)
  const [ctxMenu, setCtxMenu]         = useState(null) // { x, y, file }
  const [renamingFile, setRenamingFile] = useState(null)
  const [editingImage, setEditingImage] = useState(null)
  const fileInputRef = useRef(null)

  // Admin check
  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (cancelled) return
      if (userError || !user) { router.push('/login'); return }

      const { data: member, error: memberError } = await supabase
        .from('members').select('role').eq('id', user.id).single()
      if (cancelled) return

      if (memberError) { console.error('Admin check — member query error:', memberError); router.push('/dashboard'); return }
      if (member?.role !== 'admin') { router.push('/dashboard'); return }

      setLoading(false)
    }

    checkAdmin()
    return () => { cancelled = true }
  }, [])

  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    if (folder === 'all') {
      const results = await Promise.all(
        ['body', 'covers', 'authors'].map(f =>
          supabase.storage.from('Media').list(f, {
            limit: 200,
            sortBy: { column: 'created_at', order: 'desc' },
          }).then(({ data }) =>
            (data || [])
              .filter(file => file.name !== '.emptyFolderPlaceholder')
              .map(file => ({ ...file, folder: f }))
          )
        )
      )
      setFiles(results.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } else {
      const { data } = await supabase.storage.from('Media').list(folder, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      setFiles(
        (data || [])
          .filter(f => f.name !== '.emptyFolderPlaceholder')
          .map(f => ({ ...f, folder }))
      )
    }
    setFilesLoading(false)
  }, [folder])

  useEffect(() => {
    if (!loading) loadFiles()
  }, [loading, loadFiles])

  function getUrl(file) {
    const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(`${file.folder}/${file.name}`)
    return publicUrl
  }

  async function handleUpload(files) {
    if (!files || files.length === 0) return
    setUploading(true)
    const targetFolder = folder === 'all' ? 'body' : folder
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${targetFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      await supabase.storage.from('Media').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
      })
    }
    await loadFiles()
    setUploading(false)
  }

  async function handleDelete(file) {
    const url = getUrl(file)
    if (!window.confirm('Delete this image? This cannot be undone.')) return
    setDeletingId(file.id || file.name)
    await supabase.storage.from('Media').remove([`${file.folder}/${file.name}`])
    setFiles(prev => prev.filter(f => f.name !== file.name || f.folder !== file.folder))
    setDeletingId(null)
  }

  async function renameFile(file, newName) {
    const ext = file.name.split('.').pop()
    const safe = newName.trim().replace(/[^a-zA-Z0-9._-]/g, '-') + '.' + ext
    await supabase.storage.from('Media').move(`${file.folder}/${file.name}`, `${file.folder}/${safe}`)
    loadFiles()
  }

  async function copyUrl(file) {
    const url = getUrl(file)
    await navigator.clipboard.writeText(url)
    setCopiedUrl(file.name)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleUpload(e.dataTransfer.files)
  }

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
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '48px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/admin" style={{ color: '#444', textDecoration: 'none', fontSize: '12px' }}>
              ← Admin
            </Link>
            <h1 style={{
              margin: 0, fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '28px', fontWeight: '600', color: '#fff',
            }}>
              Media
            </h1>
            <span style={{
              fontSize: '12px', color: '#444',
              background: '#1a1a1a', padding: '3px 10px', borderRadius: '20px',
            }}>
              {files.length}
            </span>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleUpload(e.target.files)}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: '#f2b8c6', color: '#0a0a0a',
                border: 'none', padding: '10px 20px', borderRadius: '7px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Uploading…' : '+ Upload'}
            </button>
          </div>
        </div>

        {/* Drop zone hint */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? 'rgba(242,184,198,0.6)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '28px',
            color: dragging ? '#f2b8c6' : '#2a2a2a',
            fontSize: '13px',
            transition: 'border-color 0.15s, color 0.15s',
            background: dragging ? 'rgba(242,184,198,0.03)' : 'transparent',
          }}
        >
          {dragging ? 'Drop to upload' : 'Drag & drop images here, or use the Upload button above'}
          {folder === 'all' && !dragging && (
            <span style={{ color: '#333' }}> — files dropped here go to the Body folder</span>
          )}
        </div>

        {/* Folder tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {FOLDERS.map(f => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              style={{
                padding: '6px 16px', border: 'none', borderRadius: '20px',
                cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize',
                background: folder === f ? 'rgba(242,184,198,0.18)' : 'rgba(255,255,255,0.05)',
                color: folder === f ? '#f2b8c6' : '#555',
                fontFamily: "'Source Serif 4', Georgia, serif",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filesLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#333', fontSize: '13px' }}>
            Loading…
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#2a2a2a', fontSize: '14px', fontStyle: 'italic' }}>
            No images yet. Upload your first one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {files.map(file => (
              <MediaCard
                key={`${file.folder}/${file.name}`}
                file={file}
                url={getUrl(file)}
                copied={copiedUrl === file.name}
                deleting={deletingId === (file.id || file.name)}
                onCopy={() => copyUrl(file)}
                onDelete={() => handleDelete(file)}
                onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, file }) }}
                showFolder={folder === 'all'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div onClick={() => setCtxMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1201, minWidth: '140px' }}>
            {[
              { label: 'Edit',     color: '#e0e0e0', action: () => { setEditingImage(ctxMenu.file); setCtxMenu(null) } },
              { label: 'Rename',   color: '#e0e0e0', action: () => { setRenamingFile({ file: ctxMenu.file, newName: ctxMenu.file.name.replace(/\.[^.]+$/, '') }); setCtxMenu(null) } },
              { label: 'Copy URL', color: '#e0e0e0', action: () => { copyUrl(ctxMenu.file); setCtxMenu(null) } },
              { label: 'Delete',   color: '#f87171', action: () => { handleDelete(ctxMenu.file); setCtxMenu(null) } },
            ].map(({ label, color, action }) => (
              <button key={label} type="button" onClick={action}
                style={{ ...menuBtnStyle, color }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renamingFile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', width: '360px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', marginBottom: '14px', fontFamily: "'Playfair Display', Georgia, serif" }}>Rename file</div>
            <input autoFocus type="text" value={renamingFile.newName}
              onChange={e => setRenamingFile(p => ({ ...p, newName: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { renameFile(renamingFile.file, renamingFile.newName); setRenamingFile(null) } if (e.key === 'Escape') setRenamingFile(null) }}
              style={{ width: '100%', padding: '8px 10px', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', color: '#e0e0e0', fontSize: '13px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setRenamingFile(null)} style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#666', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => { renameFile(renamingFile.file, renamingFile.newName); setRenamingFile(null) }} style={{ padding: '7px 14px', background: '#f2b8c6', border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Image editor */}
      {editingImage && (
        <ImageEditor
          imageUrl={getUrl(editingImage)}
          fileName={editingImage.name}
          folder={editingImage.folder}
          supabase={supabase}
          onSave={() => { setEditingImage(null); loadFiles() }}
          onClose={() => setEditingImage(null)}
        />
      )}
    </div>
  )
}

function MediaCard({ file, url, copied, deleting, onCopy, onDelete, onContextMenu, showFolder }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
      style={{
        borderRadius: '9px',
        overflow: 'hidden',
        border: `1px solid ${hovered ? 'rgba(242,184,198,0.3)' : 'rgba(255,255,255,0.06)'}`,
        background: '#111',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: '#1a1a1a' }}>
        <img
          src={url}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {showFolder && (
          <div style={{
            position: 'absolute', top: '7px', left: '7px',
            background: 'rgba(0,0,0,0.65)', color: '#888',
            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '2px 7px', borderRadius: '3px',
          }}>
            {file.folder}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontSize: '11px', color: '#555',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: '9px',
        }}>
          {file.name}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onCopy}
            style={{
              flex: 1,
              padding: '5px 0',
              background: copied ? 'rgba(242,184,198,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${copied ? 'rgba(242,184,198,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '5px',
              color: copied ? '#f2b8c6' : '#555',
              fontSize: '11px', cursor: 'pointer',
              fontFamily: "'Source Serif 4', Georgia, serif",
              transition: 'background 0.15s',
            }}
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            style={{
              padding: '5px 10px',
              background: 'none',
              border: '1px solid rgba(224,112,112,0.15)',
              borderRadius: '5px',
              color: '#5a3030',
              fontSize: '11px', cursor: deleting ? 'not-allowed' : 'pointer',
              fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          >
            {deleting ? '…' : 'Del'}
          </button>
        </div>
      </div>
    </div>
  )
}
