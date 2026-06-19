'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../../lib/supabase'
import ImageEditor from '../../_components/ImageEditor'

// ── Editor NodeView ───────────────────────────────────────────
function AlbumBlockView({ node, selected }) {
  let images = []
  try { images = JSON.parse(node.attrs.images || '[]') } catch {}
  const { layout } = node.attrs
  const layoutLabels = { carousel: 'Carousel', 'grid-2': 'Grid 2-col', 'grid-3': 'Grid 3-col', masonry: 'Masonry' }

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        style={{
          border: `2px ${selected ? 'solid #f2b8c6' : 'dashed #e0e0e0'}`,
          borderRadius: '8px', padding: '12px 16px', margin: '1.2em 0',
          background: '#fafafa', fontFamily: "'Source Serif 4', Georgia, serif",
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: images.length ? '10px' : 0 }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bbb' }}>
            Album — {layoutLabels[layout] || layout}
          </span>
          <span style={{ fontSize: '11px', color: '#bbb' }}>
            {images.length} image{images.length !== 1 ? 's' : ''}
          </span>
        </div>
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {images.slice(0, 6).map((img, i) => (
              <div key={i} style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#e0e0e0', flexShrink: 0 }}>
                <img src={img.src} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {images.length > 6 && (
              <div style={{ width: '60px', height: '60px', borderRadius: '4px', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#888', flexShrink: 0 }}>
                +{images.length - 6}
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ── Album Insert Modal ────────────────────────────────────────
const FOLDERS = ['body', 'covers', 'authors']
const LAYOUTS = [
  { key: 'carousel', label: 'Carousel' },
  { key: 'grid-2',  label: 'Grid (2-col)' },
  { key: 'grid-3',  label: 'Grid (3-col)' },
  { key: 'masonry', label: 'Masonry' },
]

const selInputStyle = {
  flex: 1, padding: '5px 8px',
  background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '5px', color: '#e0e0e0', fontSize: '12px',
  fontFamily: "'Source Serif 4', Georgia, serif",
  outline: 'none', boxSizing: 'border-box',
}

export function AlbumInsertModal({ onInsert, onClose }) {
  const supabase = createClient()
  const [folder, setFolder] = useState('body')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState('grid-2')
  const [selected, setSelected] = useState([]) // [{ src, alt, caption }]
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, file }
  const [editingFile, setEditingFile] = useState(null) // { file, newName }
  const [editingImage, setEditingImage] = useState(null) // file
  const dragIndex = useRef(null)

  useEffect(() => { loadFiles() }, [folder])

  async function loadFiles() {
    setLoading(true)
    const { data } = await supabase.storage.from('Media').list(folder, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' },
    })
    setFiles((data || []).filter(f => f.name !== '.emptyFolderPlaceholder'))
    setLoading(false)
  }

  async function deleteFile(file) {
    await supabase.storage.from('Media').remove([`${folder}/${file.name}`])
    setSelected(prev => prev.filter(s => s.src !== getUrl(file.name)))
    loadFiles()
  }

  async function renameFile(file, newName) {
    const ext = file.name.split('.').pop()
    const safeName = newName.trim().replace(/[^a-zA-Z0-9._-]/g, '-') + '.' + ext
    const oldPath = `${folder}/${file.name}`
    const newPath = `${folder}/${safeName}`
    await supabase.storage.from('Media').move(oldPath, newPath)
    loadFiles()
  }

  async function uploadFiles(fileList) {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return
    setUploading(true)
    await Promise.all(imageFiles.map(async file => {
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      await supabase.storage.from('Media').upload(path, file, { cacheControl: '3600', contentType: file.type })
    }))
    setUploading(false)
    loadFiles()
  }

  function getUrl(name) {
    const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(`${folder}/${name}`)
    return publicUrl
  }

  function toggleImage(url) {
    setSelected(prev => {
      const exists = prev.find(img => img.src === url)
      if (exists) return prev.filter(img => img.src !== url)
      return [...prev, { src: url, alt: '', caption: '' }]
    })
  }

  function updateImage(src, field, value) {
    setSelected(prev => prev.map(img => img.src === src ? { ...img, [field]: value } : img))
  }

  function handleInsert() {
    if (!selected.length) return
    onInsert({ layout, images: selected })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '820px', maxHeight: '88vh',
          background: '#111', borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', fontFamily: "'Source Serif 4', Georgia, serif",
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', fontFamily: "'Playfair Display', Georgia, serif" }}>Insert Album</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        {/* Controls row: layout + folder */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>Layout</span>
            {LAYOUTS.map(l => (
              <button key={l.key} type="button" onClick={() => setLayout(l.key)} style={{ padding: '4px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', background: layout === l.key ? 'rgba(242,184,198,0.18)' : 'rgba(255,255,255,0.05)', color: layout === l.key ? '#f2b8c6' : '#666', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {l.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FOLDERS.map(f => (
              <button key={f} type="button" onClick={() => setFolder(f)} style={{ padding: '4px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize', background: folder === f ? 'rgba(242,184,198,0.18)' : 'rgba(255,255,255,0.05)', color: folder === f ? '#f2b8c6' : '#666', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Body: image grid + selected panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Image grid */}
          <div
            style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', position: 'relative', border: isDragOver ? '2px dashed #f2b8c6' : '2px dashed transparent', borderRadius: '8px', transition: 'border-color 0.15s' }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsDragOver(true) }}
            onDragLeave={e => { e.stopPropagation(); setIsDragOver(false) }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files) }}
          >
            {isDragOver && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(242,184,198,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                <span style={{ color: '#f2b8c6', fontSize: '13px', fontWeight: '600' }}>Drop to upload</span>
              </div>
            )}
            {uploading && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#f2b8c6', fontSize: '12px' }}>Uploading…</div>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontSize: '13px' }}>Loading…</div>
            ) : files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontSize: '13px', fontStyle: 'italic' }}>No images in this folder. Drag images here to upload.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {files.map(file => {
                  const url = getUrl(file.name)
                  const isSelected = selected.some(img => img.src === url)
                  return (
                    <div
                      key={file.id || file.name}
                      onClick={() => toggleImage(url)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }) }}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${isSelected ? '#f2b8c6' : 'rgba(255,255,255,0.06)'}`, background: '#1a1a1a', transition: 'border-color 0.12s' }}
                    >
                      <img src={url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', borderRadius: '50%', background: '#f2b8c6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected panel */}
          <div style={{ width: '280px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
              Selected ({selected.length})
            </div>
            {selected.length === 0 ? (
              <div style={{ padding: '24px 14px', fontSize: '12px', color: '#333', fontStyle: 'italic' }}>Click images to add them.</div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selected.map((img, i) => (
                  <div
                    key={img.src}
                    draggable="true"
                    onDragStart={e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; dragIndex.current = i }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={e => {
                      e.preventDefault()
                      const from = dragIndex.current
                      dragIndex.current = null
                      if (from === null || from === i) return
                      setSelected(prev => {
                        const next = [...prev]
                        const [moved] = next.splice(from, 1)
                        next.splice(i, 0, moved)
                        return next
                      })
                    }}
                    onDragEnd={() => { dragIndex.current = null }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', color: '#333', paddingTop: '13px', flexShrink: 0, cursor: 'grab' }}>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><circle cx="3" cy="2" r="1.2" fill="#555"/><circle cx="7" cy="2" r="1.2" fill="#555"/><circle cx="3" cy="7" r="1.2" fill="#555"/><circle cx="7" cy="7" r="1.2" fill="#555"/><circle cx="3" cy="12" r="1.2" fill="#555"/><circle cx="7" cy="12" r="1.2" fill="#555"/></svg>
                    </div>
                    <img src={img.src} alt="" draggable="false" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <input type="text" value={img.alt} onChange={e => updateImage(img.src, 'alt', e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Alt text…" style={selInputStyle} />
                      <input type="text" value={img.caption} onChange={e => updateImage(img.src, 'caption', e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Caption (optional)…" style={selInputStyle} />
                    </div>
                    <button type="button" onClick={() => setSelected(prev => prev.filter(s => s.src !== img.src))} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px', padding: '2px 0', flexShrink: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#666', fontSize: '12px', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!selected.length}
            style={{ padding: '8px 20px', background: '#f2b8c6', border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: selected.length ? 'pointer' : 'not-allowed', fontFamily: "'Source Serif 4', Georgia, serif", opacity: selected.length ? 1 : 0.5 }}
          >
            Insert Album ({selected.length})
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          onClick={() => setContextMenu(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1101, minWidth: '140px' }}
          >
            <button
              type="button"
              onClick={() => { setEditingImage(contextMenu.file); setContextMenu(null) }}
              style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e0e0e0', fontSize: '13px', textAlign: 'left', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => { setEditingFile({ file: contextMenu.file, newName: contextMenu.file.name.replace(/\.[^.]+$/, '') }); setContextMenu(null) }}
              style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e0e0e0', fontSize: '13px', textAlign: 'left', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => { if (window.confirm(`Delete "${contextMenu.file.name}"? This cannot be undone.`)) deleteFile(contextMenu.file); setContextMenu(null) }}
              style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#f87171', fontSize: '13px', textAlign: 'left', cursor: 'pointer', fontFamily: "'Source Serif 4', Georgia, serif" }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Image editor */}
      {editingImage && (
        <ImageEditor
          imageUrl={getUrl(editingImage.name)}
          fileName={editingImage.name}
          folder={folder}
          supabase={supabase}
          onSave={newUrl => {
            setEditingImage(null)
            loadFiles()
            // auto-select the newly saved image
            setSelected(prev => [...prev, { src: newUrl, alt: '', caption: '' }])
          }}
          onClose={() => setEditingImage(null)}
        />
      )}

      {/* Rename modal */}
      {editingFile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', width: '360px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', marginBottom: '14px', fontFamily: "'Playfair Display', Georgia, serif" }}>Rename file</div>
            <input
              autoFocus
              type="text"
              value={editingFile.newName}
              onChange={e => setEditingFile(prev => ({ ...prev, newName: e.target.value }))}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { renameFile(editingFile.file, editingFile.newName); setEditingFile(null) } if (e.key === 'Escape') setEditingFile(null) }}
              style={{ ...selInputStyle, width: '100%', fontSize: '13px', padding: '8px 10px', marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingFile(null)} style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#666', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => { renameFile(editingFile.file, editingFile.newName); setEditingFile(null) }} style={{ padding: '7px 14px', background: '#f2b8c6', border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Rename</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TipTap extension ──────────────────────────────────────────
export const AlbumBlock = Node.create({
  name: 'albumBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      layout: {
        default: 'grid-2',
        parseHTML: el => el.getAttribute('data-layout') || 'grid-2',
        renderHTML: attrs => ({ 'data-layout': attrs.layout }),
      },
      images: {
        default: '[]',
        parseHTML: el => el.getAttribute('data-images') || '[]',
        renderHTML: attrs => ({
          'data-images': typeof attrs.images === 'string' ? attrs.images : JSON.stringify(attrs.images),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="album-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'album-block' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlbumBlockView)
  },

  addCommands() {
    return {
      insertAlbumBlock: (attrs) => ({ commands }) =>
        commands.insertContent({ type: 'albumBlock', attrs }),
    }
  },
})
