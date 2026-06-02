'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'

// ── Style tokens ──────────────────────────────────────────────
const ff   = "'Source Serif 4', Georgia, serif"
const ffH  = "'Playfair Display', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

// ── Email preview wrapper ─────────────────────────────────────
function wrapEmail(body, footer) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{margin:0;padding:20px;background:#f5f5f5;font-family:Georgia,'Source Serif 4',serif}
  .w{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .hd{background:#0a0a0a;padding:18px 28px}
  .hd img{height:36px;object-fit:contain}
  .bd{padding:28px;color:#333;line-height:1.75;font-size:15px}
  .bd h1{font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#0a0a0a;margin:0 0 16px}
  .bd h2{font-family:'Playfair Display',Georgia,serif;font-size:20px;color:#0a0a0a;margin:20px 0 10px}
  .bd a{color:#c4364a}
  .bd img{max-width:100%;border-radius:6px}
  .ft{padding:14px 28px;background:#f9f9f9;border-top:1px solid #f0f0f0;font-size:12px;color:#aaa}
</style></head><body>
<div class="w">
  <div class="hd"><img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor"/></div>
  <div class="bd">${body || '<p>Email body here.</p>'}</div>
  <div class="ft">${footer || 'The Parlor Magazine &middot; <a href="#">Unsubscribe</a>'}</div>
</div></body></html>`
}

// ── Blob iframe preview ───────────────────────────────────────
function EmailPreview({ html, mode }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [html])
  return (
    <iframe
      src={src || 'about:blank'}
      sandbox="allow-same-origin"
      style={{ width: mode === 'mobile' ? '375px' : '100%', height: '100%', border: 'none', display: 'block', transition: 'width 0.25s' }}
    />
  )
}

// ── Simple email body editor ──────────────────────────────────
const emailEditorCSS = `
.email-prose{outline:none;min-height:200px;font-family:'Source Serif 4',Georgia,serif;font-size:15px;line-height:1.75;color:#1a1a1a;caret-color:#c4364a}
.email-prose>*+*{margin-top:0.8em}
.email-prose p{margin:0 0 0.85em}
.email-prose h1{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;color:#0a0a0a;margin:1.4em 0 0.4em}
.email-prose h2{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#0a0a0a;margin:1.2em 0 0.35em}
.email-prose h3{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;color:#111;margin:1em 0 0.3em}
.email-prose a{color:#c4364a;text-decoration:underline}
.email-prose ul,.email-prose ol{padding-left:1.6em;margin:0.7em 0}
.email-prose img{max-width:100%;border-radius:6px;display:block;margin:1em 0}
.email-prose strong{font-weight:600}
`

function EB({ label, active, onClick, children }) {
  return (
    <button type="button" title={label} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ padding: '4px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', background: active ? 'rgba(196,54,74,0.12)' : 'transparent', color: active ? DP : '#666', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}

function EmailBodyEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'email-prose' } },
  })

  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', false)
    }
  }, [editor])

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('URL:', editor.getAttributes('link').href || '')
    if (url === null) return
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url.trim(), target: '_blank' }).run()
  }

  const sepStyle = { display: 'inline-block', width: '1px', height: '16px', background: '#e0e0e0', margin: '0 3px', verticalAlign: 'middle' }

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      <style dangerouslySetInnerHTML={{ __html: emailEditorCSS }} />
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1px', padding: '6px 10px', background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
        <EB label="Bold"      active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}><b style={{ fontSize: '13px' }}>B</b></EB>
        <EB label="Italic"    active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}><i style={{ fontSize: '13px' }}>I</i></EB>
        <EB label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u style={{ fontSize: '13px' }}>U</u></EB>
        <span style={sepStyle} />
        {[1,2,3].map(l => (
          <EB key={l} label={`Heading ${l}`} active={editor.isActive('heading', { level: l })} onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()}>
            <span style={{ fontSize: '11px', fontWeight: '600' }}>H{l}</span>
          </EB>
        ))}
        <span style={sepStyle} />
        <EB label="Bullet list"  active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="2" cy="3.5" r="1" fill="currentColor" stroke="none"/><circle cx="2" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="2" cy="9.5" r="1" fill="currentColor" stroke="none"/><line x1="5" y1="3.5" x2="12" y2="3.5"/><line x1="5" y1="6.5" x2="12" y2="6.5"/><line x1="5" y1="9.5" x2="12" y2="9.5"/></svg>
        </EB>
        <EB label="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><text x="0" y="5" fontSize="6" fill="currentColor" stroke="none" fontFamily="serif">1.</text><text x="0" y="9" fontSize="6" fill="currentColor" stroke="none" fontFamily="serif">2.</text><line x1="5" y1="3.5" x2="12" y2="3.5"/><line x1="5" y1="7.5" x2="12" y2="7.5"/></svg>
        </EB>
        <span style={sepStyle} />
        <EB label="Link" active={editor.isActive('link')} onClick={setLink}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </EB>
        <EB label="Image" active={false} onClick={() => { const url = window.prompt('Image URL:'); if (url) editor.chain().focus().setImage({ src: url }).run() }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </EB>
        <span style={sepStyle} />
        {['left','center','right'].map(align => (
          <EB key={align} label={`Align ${align}`} active={editor.isActive({ textAlign: align })} onClick={() => editor.chain().focus().setTextAlign(align).run()}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              {align === 'left'   && <><line x1="1" y1="3" x2="12" y2="3"/><line x1="1" y1="6" x2="9" y2="6"/><line x1="1" y1="9" x2="12" y2="9"/><line x1="1" y1="12" x2="7" y2="12"/></>}
              {align === 'center' && <><line x1="1" y1="3" x2="12" y2="3"/><line x1="3" y1="6" x2="10" y2="6"/><line x1="1" y1="9" x2="12" y2="9"/><line x1="3" y1="12" x2="10" y2="12"/></>}
              {align === 'right'  && <><line x1="1" y1="3" x2="12" y2="3"/><line x1="5" y1="6" x2="12" y2="6"/><line x1="1" y1="9" x2="12" y2="9"/><line x1="6" y1="12" x2="12" y2="12"/></>}
            </svg>
          </EB>
        ))}
      </div>
      {/* Editor area */}
      <div style={{ padding: '14px 16px' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ── Template Editor Modal (full-screen overlay) ───────────────
function TemplateEditorModal({ template, footer, onSave, onClose }) {
  const [subject, setSubject]     = useState(template?.subject || '')
  const [bodyHtml, setBodyHtml]   = useState(template?.body_html || '')
  const [previewMode, setPreview] = useState('desktop')
  const [saving, setSaving]       = useState(false)

  const previewHtml = wrapEmail(bodyHtml, footer)

  async function handleSave() {
    setSaving(true)
    await onSave({ ...template, subject, body_html: bodyHtml })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#f5f5f5', display: 'flex', flexDirection: 'column', fontFamily: ff }}>
      {/* Header */}
      <div style={{ height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e8e8e8', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: ff }}>← Back</button>
          <span style={{ fontSize: '13px', color: '#333', fontWeight: '500' }}>{template?.name || 'New Template'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            {['desktop','mobile'].map(m => (
              <button key={m} type="button" onClick={() => setPreview(m)} style={{ padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: ff, background: previewMode === m ? '#fff' : 'transparent', color: previewMode === m ? '#0a0a0a' : '#aaa', borderRadius: '5px', transition: 'all 0.12s' }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={handleSave} disabled={saving} style={{ padding: '7px 20px', background: PINK, border: 'none', borderRadius: '6px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: ff, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two-panel body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: editor */}
        <div style={{ width: '480px', flexShrink: 0, overflowY: 'auto', padding: '24px', background: '#fff', borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '6px' }}>Subject Line</div>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Enter email subject…"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '6px' }}>Email Body</div>
            <EmailBodyEditor content={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>

        {/* Right: preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#e8e8e8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', fontFamily: ff, marginBottom: '14px', alignSelf: 'flex-start' }}>Preview — {previewMode}</div>
          <div style={{ width: previewMode === 'mobile' ? '375px' : '100%', maxWidth: '680px', height: '600px', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
            <EmailPreview html={previewHtml} mode={previewMode} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Default data ──────────────────────────────────────────────
// Welcome email body sourced from lib/emails.js (${name} → {{name}})
const WELCOME_BODY_HTML = '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;"><div style="margin-bottom:32px;"><img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" width="48" height="48" style="border-radius:50%;" /></div><h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">Welcome to The Parlor, {{name}}.</h1><p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">We\'re glad you\'re here. The Parlor is a space for slow reading, critical thinking, and community — and you\'re now part of it.</p><p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">Your account is ready. Head to your dashboard to explore the library, join the reading room, and see what\'s coming up.</p><a href="https://parlor-portal.vercel.app/dashboard" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">Go to your dashboard →</a><div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;"><p style="font-size:12px;color:#888;line-height:1.6;">The Parlor Magazine · <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a></p></div></div>'

const DEFAULT_TEMPLATES = [
  { id: 'welcome',     name: 'Welcome Email',             template_type: 'welcome',      subject: 'Welcome to The Parlor',           body_html: WELCOME_BODY_HTML },
  { id: 'new_article', name: 'New Article Notification',  template_type: 'new_article',  subject: 'New from The Parlor: {{title}}',   body_html: '<h2>New from The Parlor</h2><p>A new article has just been published.</p><p><strong>{{title}}</strong></p><p>{{excerpt}}</p><p><a href="{{url}}">Read the full article →</a></p>' },
  { id: 'invoice',     name: 'Invoice Receipt',           template_type: 'invoice',       subject: 'Your receipt from The Parlor',    body_html: '<h2>Payment Confirmed</h2><p>Thank you for your payment. Your subscription is active.</p><p><strong>Amount:</strong> {{amount}}</p><p><strong>Date:</strong> {{date}}</p><p>If you have any questions, reply to this email.</p>' },
]

const DEFAULT_AUTOMATIONS = [
  { id: 'welcome',          name: 'Welcome Email',                      trigger: 'New subscriber signs up',          template: 'Welcome Email',            enabled: true,  last_sent_at: null, sent_count: 0 },
  { id: 'new_article',      name: 'New Article Notification',           trigger: 'Article published',                template: 'New Article Notification',  enabled: false, last_sent_at: null, sent_count: 0 },
  { id: 'scheduled_live',   name: 'Scheduled Article Going Live',       trigger: 'Scheduled article auto-publishes', template: 'New Article Notification',  enabled: false, last_sent_at: null, sent_count: 0 },
  { id: 'invoice_confirm',  name: 'Invoice / Payment Confirmation',     trigger: 'Payment received',                 template: 'Invoice Receipt',           enabled: true,  last_sent_at: null, sent_count: 0 },
  { id: 'password_reset',   name: 'Password Reset',                     trigger: 'Password reset requested',         template: null,                        enabled: true,  last_sent_at: null, sent_count: 0 },
]

const STATUS_COLORS = {
  delivered: { color: '#2d8f5a', bg: 'rgba(110,201,154,0.1)' },
  opened:    { color: '#4a6fd4', bg: 'rgba(160,180,242,0.12)' },
  bounced:   { color: '#c04040', bg: 'rgba(224,112,112,0.1)' },
  sent:      { color: '#888',    bg: '#f5f5f5' },
}

// ── Main EmailsSection ────────────────────────────────────────
export default function EmailsSection({ supabase }) {
  const [tab, setTab]               = useState('templates')
  const [templates, setTemplates]   = useState([])
  const [automations, setAutomations] = useState([])
  const [sentLog, setSentLog]       = useState([])
  const [settings, setSettings]     = useState({ from_name: 'The Parlor', from_email: 'hello@theparlormagazine.com', reply_to: '', footer_text: 'The Parlor Magazine · <a href="#">Unsubscribe</a>' })
  const [editing, setEditing]       = useState(null)    // template being edited
  const [loading, setLoading]       = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSettings, setSavedSettings]   = useState(false)

  useEffect(() => {
    Promise.allSettled([
      supabase.from('email_templates').select('*').order('last_edited_at', { ascending: false }),
      supabase.from('email_automations').select('*').order('id'),
      supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(100),
      supabase.from('email_settings').select('*').eq('id', 1).single(),
    ]).then(async ([tRes, aRes, lRes, sRes]) => {
      // Templates: if table exists but is empty, seed the welcome template
      if (tRes.status === 'fulfilled' && !tRes.value.error) {
        const rows = tRes.value.data || []
        if (rows.length === 0) {
          const now = new Date().toISOString()
          const seed = { ...DEFAULT_TEMPLATES[0], last_edited_at: now, created_at: now }
          await supabase.from('email_templates').insert(seed)
          setTemplates([seed, ...DEFAULT_TEMPLATES.slice(1)])
        } else {
          // Ensure welcome is first
          const sorted = [...rows].sort((a, b) => {
            if (a.template_type === 'welcome') return -1
            if (b.template_type === 'welcome') return 1
            return new Date(b.last_edited_at) - new Date(a.last_edited_at)
          })
          setTemplates(sorted)
        }
      } else {
        // Table doesn't exist yet — show defaults as fallback
        setTemplates(DEFAULT_TEMPLATES)
      }
      setAutomations(aRes.status === 'fulfilled' && aRes.value.data?.length ? aRes.value.data : DEFAULT_AUTOMATIONS)
      setSentLog(lRes.status === 'fulfilled' ? (lRes.value.data || []) : [])
      if (sRes.status === 'fulfilled' && sRes.value.data) setSettings(sRes.value.data)
      setLoading(false)
    })
  }, [])

  async function saveTemplate(updated) {
    const now = new Date().toISOString()
    const payload = { ...updated, last_edited_at: now, created_at: updated.created_at || now }
    const { error } = await supabase.from('email_templates').upsert(payload)
    if (!error) {
      setTemplates(prev => {
        const exists = prev.find(t => t.id === updated.id)
        return exists ? prev.map(t => t.id === updated.id ? { ...t, ...payload } : t) : [payload, ...prev]
      })
    }
    setEditing(null)
  }

  async function toggleAutomation(id, enabled) {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
    await supabase.from('email_automations').upsert({ id, enabled })
  }

  async function saveSettings() {
    setSavingSettings(true)
    await supabase.from('email_settings').upsert({ ...settings, id: 1 })
    setSavingSettings(false)
    setSavedSettings(true)
    setTimeout(() => setSavedSettings(false), 2000)
  }

  const thStyle = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', fontFamily: ff, padding: '10px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }
  const tdStyle = { padding: '12px 16px', fontFamily: ff, verticalAlign: 'middle' }
  const inp = { padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', width: '100%' }

  return (
    <>
      {/* Template editor overlay */}
      {editing && (
        <TemplateEditorModal
          template={editing}
          footer={settings.footer_text}
          onSave={saveTemplate}
          onClose={() => setEditing(null)}
        />
      )}

      <div>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: ffH, fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Email Management</h1>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: ff }}>Manage templates, automations, and settings via Resend</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e8e8e8', marginBottom: '24px' }}>
          {[['templates','Templates'],['automations','Automations'],['sent','Sent'],['settings','Settings']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: ff, fontSize: '13px', color: tab === key ? DP : '#888', borderBottom: tab === key ? `2px solid ${DP}` : '2px solid transparent', marginBottom: '-1px', transition: 'color 0.12s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Templates tab ── */}
        {tab === 'templates' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button
                onClick={() => setEditing({ id: `tpl_${Date.now()}`, name: 'New Template', subject: '', body_html: '', last_edited_at: new Date().toISOString() })}
                style={{ padding: '8px 16px', background: PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}
              >
                + New Template
              </button>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Template Name</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Last Edited</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t, i) => (
                      <tr key={t.id} style={{ borderBottom: i === templates.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '500', color: '#0a0a0a', fontSize: '13px' }}>{t.name}</span>
                            {t.template_type && <span style={{ padding: '1px 7px', background: '#f5f5f5', borderRadius: '3px', fontSize: '10px', color: '#aaa', fontFamily: ff, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.template_type}</span>}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#888', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subject || <span style={{ fontStyle: 'italic', color: '#ccc' }}>No subject</span>}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>
                          {t.last_edited_at ? new Date(t.last_edited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditing(t)} style={{ padding: '5px 14px', background: 'none', border: `1px solid ${PINK}`, borderRadius: '5px', color: DP, fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>Edit</button>
                            <button onClick={() => setEditing({ ...t, _previewOnly: true })} style={{ padding: '5px 14px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '5px', color: '#888', fontSize: '12px', cursor: 'pointer', fontFamily: ff }}>Preview</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Automations tab ── */}
        {tab === 'automations' && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
            ) : automations.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: i === automations.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                {/* Toggle */}
                <button type="button" onClick={() => toggleAutomation(a.id, !a.enabled)} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', padding: 0, background: a.enabled ? PINK : '#e0e0e0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '2px', left: a.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: a.enabled ? DP : '#aaa', transition: 'left 0.18s' }} />
                </button>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a0a0a', fontFamily: ff }}>{a.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px', fontFamily: ff }}>Trigger: {a.trigger}</div>
                </div>
                {/* Template */}
                <div style={{ fontSize: '12px', color: '#888', fontFamily: ff, flexShrink: 0 }}>
                  {a.template ? <span style={{ padding: '2px 8px', background: '#f5f5f5', borderRadius: '4px' }}>Template: {a.template}</span> : <span style={{ color: '#ccc', fontStyle: 'italic' }}>System default</span>}
                </div>
                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', color: '#0a0a0a', fontFamily: ff, fontWeight: '500' }}>{(a.sent_count || 0).toLocaleString()} sent</div>
                  <div style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, marginTop: '1px' }}>
                    {a.last_sent_at ? `Last: ${new Date(a.last_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Never sent'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Sent tab ── */}
        {tab === 'sent' && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>Loading…</div>
            ) : sentLog.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: ff, fontStyle: 'italic' }}>No emails sent yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Recipient</th>
                    <th style={thStyle}>Template</th>
                    <th style={thStyle}>Subject</th>
                    <th style={thStyle}>Date Sent</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sentLog.map((log, i) => {
                    const sc = STATUS_COLORS[log.status] || STATUS_COLORS.sent
                    return (
                      <tr key={log.id || i} style={{ borderBottom: i === sentLog.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                        <td style={{ ...tdStyle, fontSize: '13px', color: '#0a0a0a' }}>{log.recipient || '—'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>{log.template_name || '—'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#555', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject || '—'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#aaa' }}>
                          {log.sent_at ? new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontFamily: ff, background: sc.bg, color: sc.color }}>{log.status || 'sent'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Settings tab ── */}
        {tab === 'settings' && (
          <div style={{ maxWidth: '560px' }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'from_name',  label: 'From Name',       placeholder: 'The Parlor', type: 'text' },
                { key: 'from_email', label: 'From Email',       placeholder: 'hello@theparlormagazine.com', type: 'email' },
                { key: 'reply_to',   label: 'Reply-To Email',   placeholder: 'Same as From Email', type: 'email' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', fontFamily: ff, marginBottom: '6px' }}>{f.label}</div>
                  <input type={f.type} value={settings[f.key] || ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', fontFamily: ff, marginBottom: '6px' }}>Email Footer Text</div>
                <textarea rows={3} value={settings.footer_text || ''} onChange={e => setSettings(s => ({ ...s, footer_text: e.target.value }))} placeholder="Legal / unsubscribe text" style={{ ...inp, resize: 'vertical', lineHeight: '1.5' }} />
                <div style={{ fontSize: '11px', color: '#bbb', fontFamily: ff, marginTop: '4px' }}>Shown at the bottom of every email. HTML supported.</div>
              </div>
              <div style={{ paddingTop: '8px', borderTop: '1px solid #f5f5f5', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={saveSettings} disabled={savingSettings} style={{ padding: '9px 24px', background: PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: ff }}>
                  {savedSettings ? 'Saved ✓' : savingSettings ? 'Saving…' : 'Save Settings'}
                </button>
                <div style={{ fontSize: '12px', color: '#aaa', fontFamily: ff }}>Sending via Resend · configure API key in environment variables</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
