'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useState, useRef } from 'react'
import { AudioBlock } from './AudioBlockExtension'
import { VideoBlock } from './VideoBlockExtension'
import { EmbedBlock } from './EmbedBlockExtension'
import MediaLibraryModal from './MediaLibraryModal'

// ── Color palettes ───────────────────────────────────────────
const TEXT_COLORS = [
  { v: null,      label: 'Default' },
  { v: '#1a1a1a', label: 'Black' },
  { v: '#4a4a4a', label: 'Dark gray' },
  { v: '#718096', label: 'Gray' },
  { v: '#e53e3e', label: 'Red' },
  { v: '#dd6b20', label: 'Orange' },
  { v: '#d69e2e', label: 'Gold' },
  { v: '#38a169', label: 'Green' },
  { v: '#3182ce', label: 'Blue' },
  { v: '#805ad5', label: 'Purple' },
  { v: '#d53f8c', label: 'Pink' },
  { v: '#f2b8c6', label: 'Rose' },
]

const HIGHLIGHT_COLORS = [
  { v: null,      label: 'None' },
  { v: '#fef3c7', label: 'Yellow' },
  { v: '#fde68a', label: 'Amber' },
  { v: '#ffd6df', label: 'Pink' },
  { v: '#dbeafe', label: 'Blue' },
  { v: '#d1fae5', label: 'Green' },
  { v: '#ede9fe', label: 'Purple' },
  { v: '#fee2e2', label: 'Red' },
  { v: '#f3f4f6', label: 'Gray' },
]

// ── Editor CSS ───────────────────────────────────────────────
const editorCSS = `
.ProseMirror {
  outline: none;
  min-height: 480px;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 17px;
  line-height: 1.78;
  color: #1a1a1a;
  caret-color: #f2b8c6;
}
.ProseMirror > * + * { margin-top: 0.8em; }
.ProseMirror p { margin: 0 0 0.85em; }
.ProseMirror p:last-child { margin-bottom: 0; }
.ProseMirror h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2em; font-weight: 800; color: #0a0a0a;
  margin: 1.8em 0 0.4em; line-height: 1.1;
}
.ProseMirror h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.55em; font-weight: 700; color: #0a0a0a;
  margin: 1.6em 0 0.4em; line-height: 1.2;
}
.ProseMirror h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.22em; font-weight: 600; color: #111;
  margin: 1.4em 0 0.35em; line-height: 1.25;
}
.ProseMirror h4 {
  font-size: 1.05em; font-weight: 700; color: #111;
  margin: 1.2em 0 0.3em;
}
.ProseMirror h5 {
  font-size: 0.95em; font-weight: 700; color: #333;
  margin: 1em 0 0.3em;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ProseMirror h6 {
  font-size: 0.85em; font-weight: 600; color: #555;
  margin: 1em 0 0.25em;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.ProseMirror blockquote {
  border-left: 3px solid #f2b8c6;
  margin: 1.6em 0; padding: 0.4em 0 0.4em 1.3em;
  color: #555; font-style: italic;
}
.ProseMirror ul, .ProseMirror ol {
  padding-left: 1.6em; margin: 0.75em 0;
}
.ProseMirror li { margin-bottom: 0.3em; }
.ProseMirror a { color: #b07085; text-decoration: underline; cursor: pointer; }
.ProseMirror img {
  max-width: 100%; height: auto;
  border-radius: 6px; display: block; margin: 1.2em 0;
}
.ProseMirror mark { border-radius: 2px; padding: 0 2px; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left; color: #c5c5c5;
  pointer-events: none; height: 0; font-style: italic;
}
`

// ── SVG Icons ────────────────────────────────────────────────
function IconBold() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
}
function IconItalic() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
}
function IconUnderline() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
}
function IconQuote() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
}
function IconBulletList() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
}
function IconOrderedList() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="1" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">1</text><text x="1" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">2</text><text x="1" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="serif">3</text></svg>
}
function IconLink() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
}
function IconImage() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
function IconAudio() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
}
function IconVideo() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
}
function IconEmbed() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}
function IconAlignLeft() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
}
function IconAlignCenter() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
}
function IconAlignRight() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
}
function IconAlignJustify() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
}
function IconIndentMore() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="9" y1="12" x2="21" y2="12"/><polyline points="3 9 6 12 3 15"/></svg>
}
function IconIndentLess() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="9" y1="12" x2="21" y2="12"/><polyline points="7 9 4 12 7 15"/></svg>
}

// ── Toolbar primitives ───────────────────────────────────────
function TBtn({ onClick, active, title, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }}
      style={{
        padding: '5px 7px',
        border: 'none', borderRadius: '5px', cursor: disabled ? 'default' : 'pointer',
        fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.2',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(242,184,198,0.22)' : 'transparent',
        color: active ? '#9d5e73' : disabled ? '#ccc' : '#666',
        fontWeight: active ? '700' : '400',
        transition: 'background 0.1s, color 0.1s',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return (
    <span style={{
      display: 'inline-block', width: '1px', height: '18px',
      background: '#e0e0e0', margin: '0 3px',
      verticalAlign: 'middle', flexShrink: 0,
    }} />
  )
}

// ── Heading dropdown ─────────────────────────────────────────
const HEADING_OPTIONS = [
  { label: 'Paragraph', level: null },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
  { label: 'Heading 4', level: 4 },
  { label: 'Heading 5', level: 5 },
  { label: 'Heading 6', level: 6 },
]

const HEADING_LABEL_STYLES = {
  null: { fontSize: '13px', color: '#555' },
  1: { fontSize: '17px', fontWeight: '800', fontFamily: "'Playfair Display', Georgia, serif", color: '#111' },
  2: { fontSize: '15px', fontWeight: '700', fontFamily: "'Playfair Display', Georgia, serif", color: '#111' },
  3: { fontSize: '14px', fontWeight: '600', fontFamily: "'Playfair Display', Georgia, serif", color: '#222' },
  4: { fontSize: '13px', fontWeight: '700', color: '#333' },
  5: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#444' },
  6: { fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' },
}

function getCurrentBlock(editor) {
  for (let i = 1; i <= 6; i++) {
    if (editor.isActive('heading', { level: i })) return `H${i}`
  }
  return 'P'
}

// ── Color swatches ───────────────────────────────────────────
function ColorSwatch({ color, label, onClick, active }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        width: '22px', height: '22px', borderRadius: '4px',
        border: active ? '2px solid #333' : '1.5px solid rgba(0,0,0,0.1)',
        background: color || 'transparent',
        cursor: 'pointer', padding: 0, flexShrink: 0,
        outline: color === null ? '1.5px dashed #ccc' : 'none',
        position: 'relative',
      }}
    >
      {color === null && (
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: 'absolute', inset: 0, margin: 'auto' }}>
          <line x1="1" y1="1" x2="11" y2="11" stroke="#ccc" strokeWidth="1.5"/>
        </svg>
      )}
    </button>
  )
}

function ColorPalette({ colors, onSelect, currentColor }) {
  return (
    <div
      data-menu
      style={{
        position: 'absolute', top: '100%', left: 0, zIndex: 200,
        background: '#fff', border: '1px solid #e5e5e5',
        borderRadius: '8px', padding: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: '5px',
        width: 'max-content',
      }}
    >
      {colors.map(c => (
        <ColorSwatch
          key={c.label}
          color={c.v}
          label={c.label}
          active={currentColor === c.v}
          onClick={() => onSelect(c.v)}
        />
      ))}
    </div>
  )
}

// ── Main editor ──────────────────────────────────────────────
export default function RichTextEditor({ content, onChange, placeholder }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      Image,
      Placeholder.configure({ placeholder: placeholder || 'Write your article…' }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      AudioBlock,
      VideoBlock,
      EmbedBlock,
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { spellcheck: 'true' } },
  })

  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content, false)
    }
  }, [editor])

  // Close menus on outside click
  useEffect(() => {
    function handler(e) {
      if (!e.target.closest('[data-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('URL:', prev)
    if (url === null) return
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url.trim(), target: '_blank' }).run()
  }

  const currentTextColor = editor.getAttributes('textStyle').color || null
  const currentHighlight = editor.getAttributes('highlight').color || null
  const inListItem = editor.isActive('listItem')

  function applyHeading(level) {
    if (level === null) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().setHeading({ level }).run()
    }
    setOpenMenu(null)
  }

  return (
    <>
      <div style={{ border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'visible', background: '#fff', position: 'relative' }}>
        <style dangerouslySetInnerHTML={{ __html: editorCSS }} />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: '1px', padding: '7px 10px',
          background: '#f8f8f8', borderBottom: '1px solid #eee',
          borderRadius: '10px 10px 0 0', position: 'relative',
        }}>

          {/* Bold / Italic / Underline */}
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <IconBold />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <IconItalic />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <IconUnderline />
          </TBtn>
          <Sep />

          {/* Heading dropdown */}
          <div data-menu style={{ position: 'relative' }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpenMenu(openMenu === 'heading' ? null : 'heading') }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '5px 8px', border: 'none', borderRadius: '5px',
                cursor: 'pointer', fontSize: '12px',
                background: openMenu === 'heading' ? 'rgba(242,184,198,0.22)' : 'transparent',
                color: '#666', fontFamily: 'inherit',
              }}
            >
              <span style={{ minWidth: '18px', fontWeight: '500' }}>
                {getCurrentBlock(editor)}
              </span>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>

            {openMenu === 'heading' && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e5e5e5',
                borderRadius: '8px', padding: '5px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                minWidth: '160px',
              }}>
                {HEADING_OPTIONS.map(({ label, level }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); applyHeading(level) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 10px', border: 'none', borderRadius: '5px',
                      cursor: 'pointer', background: 'transparent',
                      ...HEADING_LABEL_STYLES[level],
                      fontFamily: HEADING_LABEL_STYLES[level].fontFamily || "'Source Serif 4', Georgia, serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Sep />

          {/* Blockquote / Lists */}
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <IconQuote />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <IconBulletList />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <IconOrderedList />
          </TBtn>
          <Sep />

          {/* Link / Image */}
          <TBtn onClick={setLink} active={editor.isActive('link')} title="Add link">
            <IconLink />
          </TBtn>
          <TBtn onClick={() => setShowMediaLibrary(true)} active={false} title="Insert image">
            <IconImage />
          </TBtn>
          <Sep />

          {/* Audio / Video / Embed */}
          <TBtn onClick={() => editor.chain().focus().insertAudioBlock().run()} active={editor.isActive('audioBlock')} title="Insert audio player">
            <IconAudio />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().insertVideoBlock().run()} active={editor.isActive('videoBlock')} title="Insert video embed">
            <IconVideo />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().insertEmbedBlock().run()} active={editor.isActive('embedBlock')} title="Insert embed">
            <IconEmbed />
          </TBtn>
          <Sep />

          {/* Text color */}
          <div data-menu style={{ position: 'relative' }}>
            <TBtn
              onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
              active={openMenu === 'color' || !!currentTextColor}
              title="Text color"
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span style={{ fontWeight: '700', fontSize: '13px', lineHeight: 1 }}>A</span>
                <span style={{ width: '13px', height: '3px', borderRadius: '1px', background: currentTextColor || '#333' }} />
              </span>
            </TBtn>
            {openMenu === 'color' && (
              <ColorPalette
                colors={TEXT_COLORS}
                currentColor={currentTextColor}
                onSelect={v => {
                  if (v === null) editor.chain().focus().unsetColor().run()
                  else editor.chain().focus().setColor(v).run()
                  setOpenMenu(null)
                }}
              />
            )}
          </div>

          {/* Highlight */}
          <div data-menu style={{ position: 'relative' }}>
            <TBtn
              onClick={() => setOpenMenu(openMenu === 'highlight' ? null : 'highlight')}
              active={openMenu === 'highlight' || !!currentHighlight}
              title="Highlight"
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span style={{
                  fontWeight: '700', fontSize: '12px', lineHeight: 1,
                  background: currentHighlight || '#fef3c7',
                  padding: '0 2px', borderRadius: '2px',
                }}>
                  A
                </span>
                <span style={{ width: '13px', height: '3px', borderRadius: '1px', background: currentHighlight || '#fef3c7', border: '1px solid rgba(0,0,0,0.1)' }} />
              </span>
            </TBtn>
            {openMenu === 'highlight' && (
              <ColorPalette
                colors={HIGHLIGHT_COLORS}
                currentColor={currentHighlight}
                onSelect={v => {
                  if (v === null) editor.chain().focus().unsetHighlight().run()
                  else editor.chain().focus().setHighlight({ color: v }).run()
                  setOpenMenu(null)
                }}
              />
            )}
          </div>
          <Sep />

          {/* Align */}
          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
            <IconAlignLeft />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
            <IconAlignCenter />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
            <IconAlignRight />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
            <IconAlignJustify />
          </TBtn>
          <Sep />

          {/* Indent / Dedent */}
          <TBtn
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!inListItem}
            title="Increase indent"
          >
            <IconIndentMore />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!inListItem}
            title="Decrease indent"
          >
            <IconIndentLess />
          </TBtn>
        </div>

        {/* Editor area */}
        <div style={{ padding: '4px 28px 32px', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {showMediaLibrary && (
        <MediaLibraryModal
          defaultFolder="body"
          onSelect={url => {
            editor.chain().focus().setImage({ src: url }).run()
            setShowMediaLibrary(false)
          }}
          onClose={() => setShowMediaLibrary(false)}
        />
      )}
    </>
  )
}
