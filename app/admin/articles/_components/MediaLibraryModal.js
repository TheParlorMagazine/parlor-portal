'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../../lib/supabase'

const FOLDERS = ['body', 'covers', 'authors']

export default function MediaLibraryModal({ onSelect, onClose, defaultFolder = 'body' }) {
  const supabase = createClient()
  const [folder, setFolder] = useState(defaultFolder)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadFiles()
  }, [folder])

  async function loadFiles() {
    setLoading(true)
    const { data } = await supabase.storage.from('Media').list(folder, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    setFiles((data || []).filter(f => f.name !== '.emptyFolderPlaceholder'))
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await supabase.storage.from('Media').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
    })
    await loadFiles()
    setUploading(false)
    e.target.value = ''
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files || []).find(f => f.type.startsWith('image/'))
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await supabase.storage.from('Media').upload(path, file, { cacheControl: '3600', contentType: file.type })
    await loadFiles()
    setUploading(false)
  }

  function getUrl(name) {
    const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(`${folder}/${name}`)
    return publicUrl
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '680px', maxHeight: '82vh',
          background: '#111',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Source Serif 4', Georgia, serif",
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', fontFamily: "'Playfair Display', Georgia, serif" }}>
            Media Library
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        {/* Folder tabs + upload */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FOLDERS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFolder(f)}
                style={{
                  padding: '5px 14px', border: 'none', borderRadius: '20px',
                  cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize',
                  background: folder === f ? 'rgba(242,184,198,0.18)' : 'rgba(255,255,255,0.05)',
                  color: folder === f ? '#f2b8c6' : '#666',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '6px 15px', background: '#f2b8c6', color: '#0a0a0a',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600',
                fontFamily: "'Source Serif 4', Georgia, serif",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Uploading…' : '+ Upload'}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative',
            outline: dragOver ? '2px dashed rgba(242,184,198,0.5)' : '2px dashed transparent',
            outlineOffset: '-8px', transition: 'outline-color 0.15s',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 10, pointerEvents: 'none',
              background: 'rgba(242,184,198,0.04)',
            }}>
              <span style={{ color: '#f2b8c6', fontSize: '13px', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Drop to upload
              </span>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#444', fontSize: '13px' }}>
              Loading…
            </div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#333', fontSize: '13px', fontStyle: 'italic' }}>
              No images in this folder yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {files.map(file => (
                <MediaThumb
                  key={file.id || file.name}
                  url={getUrl(file.name)}
                  name={file.name}
                  onSelect={() => { onSelect(getUrl(file.name)); onClose() }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MediaThumb({ url, name, onSelect }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      style={{
        position: 'relative', aspectRatio: '1', borderRadius: '7px',
        overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hovered ? 'rgba(242,184,198,0.55)' : 'rgba(255,255,255,0.06)'}`,
        background: '#1a1a1a', transition: 'border-color 0.15s',
      }}
    >
      <img
        src={url}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            background: '#f2b8c6', color: '#0a0a0a',
            padding: '5px 12px', borderRadius: '5px',
            fontSize: '11px', fontWeight: '700',
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}>
            Use
          </span>
        </div>
      )}
    </div>
  )
}
