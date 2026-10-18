'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { confirmDialog } from '../../../lib/confirmDialog'
import { uploadToCloudinary } from '../../../lib/uploadImage'

const ff   = "'Source Serif 4', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'
const inputSt = { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, outline: 'none', boxSizing: 'border-box' }

function ImageZone({ value, onChange, onUpload, uploading, dragOver, onDragOver, onDragLeave, onDrop, inputId, pickerKey, onOpenMedia }) {
  return (
    <div>
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={() => document.getElementById(inputId).click()}
        style={{
          border: `2px dashed ${dragOver ? '#0a0a0a' : '#d0d0d0'}`, borderRadius: 8,
          padding: '14px 12px', cursor: 'pointer', background: dragOver ? '#f8f8f8' : '#fff',
          display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s', marginBottom: 6,
        }}
      >
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
        {value
          ? <img src={value} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
          : <div style={{ width: 60, height: 44, background: '#f0f0f0', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M4 16l4-4 4 4 4-6 4 6" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="3" stroke="#bbb" strokeWidth="1.5"/></svg>
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12.5px', color: '#555' }}>{uploading ? 'Uploading…' : 'Drop an image here, or click to choose'}</div>
          {value && <div style={{ fontSize: '11px', color: '#aaa', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>}
        </div>
        {value && !uploading && (
          <button onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ padding: '3px 8px', background: 'none', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: '11px', color: '#999', cursor: 'pointer', flexShrink: 0, fontFamily: ff }}>
            Remove
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          style={{ ...inputSt, fontSize: '12px', color: '#888', flex: 1 }} />
        <button onClick={() => onOpenMedia(pickerKey)}
          style={{ padding: '7px 12px', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 6, fontSize: '12px', color: '#555', cursor: 'pointer', fontFamily: ff, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Media library
        </button>
      </div>
    </div>
  )
}

const DEFAULT_SUPPORT = 'The Parlor is still a startup, run by a small team with a lot of conviction. Everything you see here — the reporting, the platform, the print issues — is built scrappily and with care. If this work means something to you, the most direct way to support it is to become a subscriber or make a donation. It keeps the lights on.'

const SECTION_DEFS = [
  { key: 'announcement',  label: 'Announcement',   desc: 'Custom campaign or announcement block at the top', editable: true },
  { key: 'issuPromo',     label: 'Issue Promo',     desc: 'Current issue highlight with intro text and image', editable: true },
  { key: 'issueArticles', label: 'Issue Articles',  desc: '1 recent article from the current issue',          editable: false },
  { key: 'articles',      label: 'Latest Articles', desc: '2 most recent standalone articles',                editable: false },
  { key: 'featuredEvent', label: 'Featured Event',  desc: 'The event flagged as featured in newsletter',      editable: false },
  { key: 'otherEvents',   label: 'Upcoming Events', desc: 'Other upcoming events listed below featured',      editable: false },
  { key: 'shopAd',        label: 'Shop Ad',         desc: 'Product ad pulled from the shop',                  editable: true },
  { key: 'support',       label: 'Support Block',   desc: 'Subscribe / donate call-to-action at the bottom', editable: true },
]

export default function NewsletterTab({ supabase }) {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [mode, setMode]           = useState('desktop')
  const [sending, setSending]     = useState(false)
  const [msg, setMsg]             = useState('')

  // Issue promo fields (saved to DB)
  const [intro, setIntro]             = useState('')
  const [issueImg, setIssueImg]       = useState('')
  const [tagline, setTagline]         = useState('')
  const [sectionTitle, setSectionTitle]   = useState('')
  const [buttonCopy, setButtonCopy]       = useState('')
  const [buttonUrl, setButtonUrl]         = useState('')
  const [button2Copy, setButton2Copy]     = useState('')
  const [button2Url, setButton2Url]       = useState('')
  const [imgUploading, setImgUploading] = useState(false)
  const [imgDragOver, setImgDragOver]   = useState(false)
  // Announcement fields (saved to DB)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcement, setAnnouncement]           = useState('')
  const [announcementUrl, setAnnouncementUrl]     = useState('')
  const [announcementImg, setAnnouncementImg]     = useState('')
  const [announcementBtn, setAnnouncementBtn]     = useState('')
  const [annImgUploading, setAnnImgUploading]   = useState(false)
  const [annImgDragOver, setAnnImgDragOver]     = useState(false)
  // Shared media picker
  const [mediaPicker, setMediaPicker]   = useState(null) // null | 'promo' | 'announcement'
  const [mediaFiles, setMediaFiles]     = useState([])
  const [mediaFolder, setMediaFolder]   = useState('body')
  const [mediaLoading, setMediaLoading] = useState(false)
  // Support copy (not persisted, sent per-send)
  const [supportCopy, setSupportCopy]   = useState('')
  const [supportTitle, setSupportTitle] = useState('')
  const [supportBtn1, setSupportBtn1]   = useState('')
  const [supportBtn2, setSupportBtn2]   = useState('')
  // Shop ad
  const [shopProducts, setShopProducts]       = useState([])
  const [shopProductsLoaded, setShopProductsLoaded] = useState(false)
  const [savingShopProduct, setSavingShopProduct]   = useState(false)

  const [savingSection, setSavingSection] = useState('')
  const defaultSections = { announcement: true, issuPromo: true, issueArticles: true, articles: true, featuredEvent: true, otherEvents: true, shopAd: true, support: true }
  const [sections, setSections] = useState(defaultSections)
  const [expanded, setExpanded] = useState({})
  const previewTimer = useRef(null)
  const annTimer = useRef(null)
  const loadRef = useRef(null)

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [supabase])

  const load = useCallback(async (secs, supCopy, annOverride, supTitle, supBtn1, supBtn2) => {
    setMsg('')
    const activeSections     = secs     ?? sections
    const activeSupportCopy  = supCopy  ?? supportCopy
    const activeSupportTitle = supTitle ?? supportTitle
    const activeSupportBtn1  = supBtn1  ?? supportBtn1
    const activeSupportBtn2  = supBtn2  ?? supportBtn2
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(activeSections)) params.set(k, String(v))
    if (activeSupportCopy)  params.set('supportCopy',  activeSupportCopy)
    if (activeSupportTitle) params.set('supportTitle', activeSupportTitle)
    if (activeSupportBtn1)  params.set('supportBtn1',  activeSupportBtn1)
    if (activeSupportBtn2)  params.set('supportBtn2',  activeSupportBtn2)
    if (annOverride) {
      if (annOverride.title) params.set('annTitle', annOverride.title)
      if (annOverride.text)  params.set('annText',  annOverride.text)
      if (annOverride.url)   params.set('annUrl',   annOverride.url)
      if (annOverride.img)   params.set('annImg',   annOverride.img)
      if (annOverride.btn)   params.set('annBtn',   annOverride.btn)
    }
    try {
      const res = await fetch(`/api/admin/newsletter/preview?${params}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setData(res.ok ? d : { error: d.error })
      if (res.ok) {
        setIntro(d.issueIntro || '')
        setIssueImg(d.issueImage || '')
        setTagline(d.issueTagline || '')
        // Pre-populate section title with DB value or computed default
        const issueLabel = d.issueTitle ? d.issueTitle.replace(/ — .*$/, '') : ''
        setSectionTitle(d.issueSectionTitle || (issueLabel ? `${issueLabel} is finally here!` : ''))
        setButtonCopy(d.issueButtonCopy || '')
        setButtonUrl(d.issueButtonUrl || '')
        setButton2Copy(d.issueButton2Copy || '')
        setButton2Url(d.issueButton2Url || '')
        if (!annOverride) {
          setAnnouncementTitle(d.issueAnnouncementTitle || '')
          setAnnouncement(d.issueAnnouncement || '')
          setAnnouncementUrl(d.issueAnnouncementUrl || '')
          setAnnouncementImg(d.issueAnnouncementImg || '')
          setAnnouncementBtn(d.issueAnnouncementBtn || '')
        }
      }
    } catch { setData({ error: 'Could not load the preview.' }) }
    setLoading(false)
  }, [token, sections, supportCopy, supportTitle, supportBtn1, supportBtn2])

  // Keep loadRef current so the announcement debounce always uses the latest load (with current sections)
  useEffect(() => { loadRef.current = load }, [load])

  // Debounce-refresh preview when announcement fields are edited (before saving)
  const announcementRef = useRef({ title: announcementTitle, text: announcement, url: announcementUrl, img: announcementImg, btn: announcementBtn })
  useEffect(() => {
    announcementRef.current = { title: announcementTitle, text: announcement, url: announcementUrl, img: announcementImg, btn: announcementBtn }
    if (annTimer.current) clearTimeout(annTimer.current)
    annTimer.current = setTimeout(() => {
      const ann = announcementRef.current
      if (ann.title || ann.text) {
        setLoading(true)
        loadRef.current?.(undefined, undefined, ann)
      }
    }, 600)
  }, [announcementTitle, announcement, announcementUrl, announcementImg, announcementBtn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Load saved section toggles from DB, then load the preview with those sections
    token().then(async tok => {
      try {
        const res = await fetch('/api/admin/newsletter/settings', { headers: { Authorization: `Bearer ${tok}` } })
        if (res.ok) {
          const d = await res.json()
          const saved = { ...defaultSections, ...d.sections }
          setSections(saved)
          if (d.supportTitle) setSupportTitle(d.supportTitle)
          if (d.supportBtn1)  setSupportBtn1(d.supportBtn1)
          if (d.supportBtn2)  setSupportBtn2(d.supportBtn2)
          load(saved, undefined, undefined, d.supportTitle || '', d.supportBtn1 || '', d.supportBtn2 || '')
          return
        }
      } catch {}
      load()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadShopProducts() {
    if (shopProductsLoaded) return
    try {
      const res = await fetch('/api/admin/newsletter/shop-product', { headers: { Authorization: `Bearer ${await token()}` } })
      if (res.ok) { const d = await res.json(); setShopProducts(d.products || []) }
    } catch {}
    setShopProductsLoaded(true)
  }

  function toggleSection(key, val) {
    const next = { ...sections, [key]: val }
    setSections(next)
    token().then(tok => fetch('/api/admin/newsletter/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ sections: next, supportTitle, supportBtn1, supportBtn2 }),
    })).catch(() => {})
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setLoading(true)
    const ann = announcementRef.current
    const annOverride = (ann.title || ann.text) ? ann : null
    previewTimer.current = setTimeout(() => load(next, undefined, annOverride, supportTitle, supportBtn1, supportBtn2), 400)
  }

  function toggleExpand(key, isEditable) {
    if (!isEditable) return
    const opening = !expanded[key]
    setExpanded(e => ({ ...e, [key]: opening }))
    if (key === 'shopAd' && opening) loadShopProducts()
  }

  async function sendNow() {
    if (!(await confirmDialog(`Send the newsletter to ${data?.recipientCount ?? 'all'} subscribers now?`))) return
    setSending(true); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ sections, supportCopy, supportTitle, supportBtn1, supportBtn2 }),
      })
      const d = await res.json()
      setMsg(res.ok ? `Sent to ${d.sent} subscriber${d.sent === 1 ? '' : 's'} ✓` : (d.error || 'Could not send.'))
      if (res.ok) load()
    } catch { setMsg('Could not send.') }
    setSending(false)
  }

  async function saveIssueSection() {
    if (!data?.issueId) return
    setSavingSection('issue'); setMsg('')
    try {
      const res = await fetch('/api/admin/newsletter/issue-intro', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ issueId: data.issueId, intro, image: issueImg, tagline, announcement, announcementTitle, announcementUrl, announcementImg, announcementBtn, sectionTitle, buttonCopy, buttonUrl, button2Copy, button2Url }),
      })
      if (res.ok) { setMsg('Saved ✓'); load() } else setMsg('Could not save.')
    } catch { setMsg('Could not save.') }
    setSavingSection('')
  }

  async function toggleFeaturedProduct(productId, currentlySelected) {
    const featuredCount = shopProducts.filter(p => p.newsletter_featured).length
    if (!currentlySelected && featuredCount >= 3) return // cap at 3
    setSavingShopProduct(true)
    try {
      const res = await fetch('/api/admin/newsletter/shop-product', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ productId, selected: !currentlySelected }),
      })
      if (res.ok) {
        setShopProducts(ps => ps.map(p => p.id === productId ? { ...p, newsletter_featured: !currentlySelected } : p))
        load()
      }
    } catch {}
    setSavingShopProduct(false)
  }

  async function clearFeaturedProducts() {
    setSavingShopProduct(true)
    try {
      await fetch('/api/admin/newsletter/shop-product', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ clearAll: true }),
      })
      setShopProducts(ps => ps.map(p => ({ ...p, newsletter_featured: false })))
      load()
    } catch {}
    setSavingShopProduct(false)
  }

  async function uploadPromoImage(file) {
    if (!file) return
    setImgUploading(true)
    try { setIssueImg(await uploadToCloudinary(file, 'parlor/newsletter')) }
    catch { setMsg('Image upload failed.') }
    setImgUploading(false)
  }

  async function uploadAnnImg(file) {
    if (!file) return
    setAnnImgUploading(true)
    try { setAnnouncementImg(await uploadToCloudinary(file, 'parlor/newsletter')) }
    catch { setMsg('Image upload failed.') }
    setAnnImgUploading(false)
  }

  async function openMediaPicker(target) {
    setMediaPicker(target)
    setMediaLoading(true)
    const { data } = await supabase.storage.from('Media').list(mediaFolder, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' }
    })
    setMediaFiles((data || []).filter(x => x.name !== '.emptyFolderPlaceholder'))
    setMediaLoading(false)
  }

  async function loadMediaFolder(folder) {
    setMediaFolder(folder)
    setMediaLoading(true)
    const { data } = await supabase.storage.from('Media').list(folder, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' }
    })
    setMediaFiles((data || []).filter(x => x.name !== '.emptyFolderPlaceholder'))
    setMediaLoading(false)
  }

  function getMediaUrl(name) {
    const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(`${mediaFolder}/${name}`)
    return publicUrl
  }

  function pickMediaUrl(url) {
    if (mediaPicker === 'promo') setIssueImg(url)
    if (mediaPicker === 'announcement') setAnnouncementImg(url)
    setMediaPicker(null)
  }

  function debouncePreview(newSupportCopy, newTitle, newBtn1, newBtn2) {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setLoading(true)
    previewTimer.current = setTimeout(() => {
      load(undefined, newSupportCopy, undefined, newTitle, newBtn1, newBtn2)
      token().then(tok => fetch('/api/admin/newsletter/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ sections, supportTitle: newTitle, supportBtn1: newBtn1, supportBtn2: newBtn2 }),
      })).catch(() => {})
    }, 600)
  }

  const card = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px' }
  const labelSt = { display: 'block', fontSize: '11.5px', color: '#999', marginBottom: 4 }
  const saveBtnSt = (disabled) => ({ padding: '7px 16px', background: disabled ? '#ccc' : '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12.5px', cursor: disabled ? 'default' : 'pointer', fontFamily: ff })

  return (
    <div style={{ fontFamily: ff }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
            This is a <strong>living template</strong> — it always shows your latest 2 articles, the featured event, and upcoming events. It goes out <strong>every other week</strong>, alternating with the Bi-weekly Digest; you'll get a nudge to review &amp; send. You can also send it now.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => load()} disabled={loading} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '7px', color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: ff }}>↻ Refresh</button>
          <button onClick={sendNow} disabled={sending || loading || data?.empty} title={data?.empty ? 'No content to send yet' : ''} style={{ padding: '8px 18px', background: (sending || data?.empty) ? '#ccc' : PINK, border: 'none', borderRadius: '7px', color: '#0a0a0a', fontSize: '13px', fontWeight: 600, cursor: (sending || data?.empty) ? 'default' : 'pointer', fontFamily: ff }}>
            {sending ? 'Sending…' : 'Send to subscribers now'}
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {data && !data.error && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, fontSize: '12.5px', color: '#555' }}>
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.recipientCount ?? '—'}</strong> subscribers</span>
          {data.issueTitle && <span style={{ ...card, padding: '6px 12px' }}>Issue: <strong>{data.issueTitle}</strong> ({data.issueArticleCount})</span>}
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.articleCount}</strong> articles total</span>
          <span style={{ ...card, padding: '6px 12px' }}>{data.featured ? `Featured: ${data.featuredTitle}` : 'No featured event'}</span>
          <span style={{ ...card, padding: '6px 12px' }}><strong>{data.otherEventCount}</strong> other events</span>
          {msg && <span style={{ padding: '6px 12px', color: msg.includes('✓') ? '#2d8f5a' : DP, fontWeight: 600 }}>{msg}</span>}
        </div>
      )}

      {/* Section toggles */}
      <div style={{ ...card, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa' }}>Template sections</div>
        </div>

        {SECTION_DEFS.map((sec, i) => {
          const isOn      = sections[sec.key] !== false
          const isOpen    = !!expanded[sec.key]
          const hasIssue  = !!data?.issueId
          const canExpand = sec.editable && (
            sec.key === 'support' ||
            sec.key === 'shopAd' ||
            ((sec.key === 'issuPromo' || sec.key === 'announcement') && hasIssue)
          )

          return (
            <div key={sec.key} style={{ borderBottom: i < SECTION_DEFS.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              {/* Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
                <div onClick={() => toggleSection(sec.key, !isOn)}
                  style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, background: isOn ? '#0a0a0a' : '#d0d0d0', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: isOn ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: isOn ? '#0a0a0a' : '#aaa' }}>{sec.label}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 1 }}>{sec.desc}</div>
                </div>
                {canExpand && (
                  <button onClick={() => toggleExpand(sec.key, true)}
                    style={{ padding: '5px 12px', background: isOpen ? '#0a0a0a' : '#fff', color: isOpen ? '#fff' : '#555', border: '1px solid #d0d0d0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: ff, flexShrink: 0, fontWeight: 500 }}>
                    {isOpen ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>

              {/* ── Announcement editor ── */}
              {sec.key === 'announcement' && canExpand && isOpen && (
                <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #f5f5f5' }}>
                  <div style={{ paddingTop: 12 }}>
                    <label style={labelSt}>Title (optional)</label>
                    <input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)}
                      placeholder="e.g. We're turning one 🎉"
                      style={{ ...inputSt, marginBottom: 8 }} />
                    <label style={labelSt}>Image (optional)</label>
                    <ImageZone
                      value={announcementImg} onChange={setAnnouncementImg} onUpload={uploadAnnImg}
                      uploading={annImgUploading} dragOver={annImgDragOver}
                      onDragOver={e => { e.preventDefault(); setAnnImgDragOver(true) }}
                      onDragLeave={() => setAnnImgDragOver(false)}
                      onDrop={e => { e.preventDefault(); setAnnImgDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadAnnImg(f) }}
                      inputId="nl-ann-img-input" pickerKey="announcement" onOpenMedia={openMediaPicker}
                    />
                    <label style={{ ...labelSt, marginTop: 8 }}>Announcement text</label>
                    <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} rows={3}
                      placeholder="e.g. Our spring fundraiser is live — help us reach $5k by April 30."
                      style={{ ...inputSt, fontSize: '14px', resize: 'vertical' }} />
                    <label style={{ ...labelSt, marginTop: 8 }}>CTA link URL (optional)</label>
                    <input value={announcementUrl} onChange={e => setAnnouncementUrl(e.target.value)}
                      placeholder="https://…" style={inputSt} />
                    <label style={{ ...labelSt, marginTop: 8 }}>Button copy (optional)</label>
                    <input value={announcementBtn} onChange={e => setAnnouncementBtn(e.target.value)}
                      placeholder="Learn more" style={inputSt} />
                    <div style={{ marginTop: 10 }}>
                      <button onClick={saveIssueSection} disabled={!!savingSection || !data?.issueId} style={saveBtnSt(!!savingSection || !data?.issueId)}>
                        {savingSection === 'issue' ? 'Saving…' : 'Save announcement'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Issue promo editor ── */}
              {sec.key === 'issuPromo' && canExpand && isOpen && (
                <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #f5f5f5' }}>
                  <div style={{ paddingTop: 12 }}>
                    <label style={labelSt}>Section title</label>
                    <input value={sectionTitle} onChange={e => setSectionTitle(e.target.value)}
                      style={inputSt} />
                    <label style={{ ...labelSt, marginTop: 8 }}>Intro copy</label>
                    <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={4}
                      placeholder="A short intro to the current issue shown in the promo…"
                      style={{ ...inputSt, fontSize: '14px', resize: 'vertical' }} />
                    <label style={{ ...labelSt, marginTop: 8 }}>Tagline (below the buy buttons)</label>
                    <input value={tagline} onChange={e => setTagline(e.target.value)}
                      placeholder="Original essays, reporting, and art — bound in print."
                      style={inputSt} />
                    {/* Button 1 */}
                    <div style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 8, border: '1px solid #ececec' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Button 1 (primary)</div>
                      <label style={labelSt}>Label</label>
                      <input value={buttonCopy} onChange={e => setButtonCopy(e.target.value)}
                        placeholder="Buy the issue" style={inputSt} />
                      <label style={{ ...labelSt, marginTop: 6 }}>Link</label>
                      <div style={{ position: 'relative' }}>
                        <input value={buttonUrl} onChange={e => setButtonUrl(e.target.value)}
                          placeholder={data?.issueId ? `/issue/${data.issueId}` : '/issue/…'}
                          style={{ ...inputSt, paddingRight: 60 }} />
                        {!buttonUrl && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#bbb', pointerEvents: 'none' }}>default</span>}
                      </div>
                    </div>
                    {/* Button 2 */}
                    <div style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 8, border: '1px solid #ececec' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Button 2 (secondary)</div>
                      <label style={labelSt}>Label</label>
                      <input value={button2Copy} onChange={e => setButton2Copy(e.target.value)}
                        placeholder="Subscribe" style={inputSt} />
                      <label style={{ ...labelSt, marginTop: 6 }}>Link</label>
                      <div style={{ position: 'relative' }}>
                        <input value={button2Url} onChange={e => setButton2Url(e.target.value)}
                          placeholder="/plans"
                          style={{ ...inputSt, paddingRight: 60 }} />
                        {!button2Url && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#bbb', pointerEvents: 'none' }}>default</span>}
                      </div>
                    </div>
                    <label style={{ ...labelSt, marginTop: 8 }}>Promo image</label>
                    <ImageZone
                      value={issueImg} onChange={setIssueImg} onUpload={uploadPromoImage}
                      uploading={imgUploading} dragOver={imgDragOver}
                      onDragOver={e => { e.preventDefault(); setImgDragOver(true) }}
                      onDragLeave={() => setImgDragOver(false)}
                      onDrop={e => { e.preventDefault(); setImgDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadPromoImage(f) }}
                      inputId="nl-promo-img-input" pickerKey="promo" onOpenMedia={openMediaPicker}
                    />
                    <div style={{ marginTop: 10 }}>
                      <button onClick={saveIssueSection} disabled={!!savingSection || !data?.issueId || imgUploading} style={saveBtnSt(!!savingSection || !data?.issueId || imgUploading)}>
                        {savingSection === 'issue' ? 'Saving…' : 'Save issue promo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Shop ad picker ── */}
              {sec.key === 'shopAd' && isOpen && (
                <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #f5f5f5' }}>
                  <div style={{ paddingTop: 12 }}>
                    {/* Header with count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        Select up to 3 products — {shopProducts.filter(p => p.newsletter_featured).length} selected
                      </div>
                      {shopProducts.some(p => p.newsletter_featured) && (
                        <button onClick={clearFeaturedProducts} disabled={savingShopProduct}
                          style={{ padding: '4px 10px', background: 'none', border: '1px solid #e0e0e0', borderRadius: 5, fontSize: '11.5px', color: '#888', cursor: 'pointer', fontFamily: ff }}>
                          Clear all
                        </button>
                      )}
                    </div>
                    {!shopProductsLoaded ? (
                      <div style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>Loading products…</div>
                    ) : shopProducts.length === 0 ? (
                      <div style={{ color: '#999', fontSize: '13px' }}>No active shop products found.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {shopProducts.map(p => {
                          const isChecked = !!p.newsletter_featured
                          const featuredCount = shopProducts.filter(x => x.newsletter_featured).length
                          const isDisabled = savingShopProduct || (!isChecked && featuredCount >= 3)
                          return (
                            <label key={p.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, border: `1px solid ${isChecked ? '#0a0a0a' : '#e8e8e8'}`, background: isChecked ? '#f8f8f8' : '#fff', cursor: isDisabled ? 'default' : 'pointer', opacity: isDisabled && !isChecked ? 0.45 : 1 }}>
                              {/* Checkbox */}
                              <div onClick={() => !isDisabled && toggleFeaturedProduct(p.id, isChecked)}
                                style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isChecked ? '#0a0a0a' : '#ccc'}`, background: isChecked ? '#0a0a0a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: isDisabled ? 'default' : 'pointer' }}>
                                {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                              <div onClick={() => !isDisabled && toggleFeaturedProduct(p.id, isChecked)} style={{ flex: 1, fontSize: '13px', cursor: isDisabled ? 'default' : 'pointer' }}>
                                <strong>{p.name}</strong>{p.variant ? ` — ${p.variant}` : ''}
                                {p.price != null ? <span style={{ color: '#999', marginLeft: 6 }}>${Number(p.price).toFixed(2)}</span> : null}
                              </div>
                            </label>
                          )
                        })}
                        {/* placeholder: no featured yet */}
                        {!shopProducts.some(p => p.newsletter_featured) && shopProductsLoaded && (
                          <div style={{ marginTop: 4, fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>No products selected — the Shop Ad section will be hidden in the newsletter.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Support copy editor ── */}
              {sec.key === 'support' && isOpen && (
                <div style={{ padding: '0 16px 14px 64px', borderTop: '1px solid #f5f5f5' }}>
                  <div style={{ paddingTop: 12 }}>
                    <label style={labelSt}>Title (leave blank to use default)</label>
                    <input value={supportTitle} onChange={e => { setSupportTitle(e.target.value); debouncePreview(supportCopy, e.target.value, supportBtn1, supportBtn2) }}
                      placeholder="💛 A note on where we are."
                      style={{ ...inputSt, marginBottom: 8 }} />
                    <label style={labelSt}>Body copy (leave blank to use default)</label>
                    <textarea value={supportCopy} onChange={e => { setSupportCopy(e.target.value); debouncePreview(e.target.value, supportTitle, supportBtn1, supportBtn2) }} rows={4}
                      placeholder={DEFAULT_SUPPORT}
                      style={{ ...inputSt, fontSize: '13.5px', resize: 'vertical', lineHeight: 1.6, marginBottom: 8 }} />
                    <label style={labelSt}>Primary button copy (leave blank to use default)</label>
                    <input value={supportBtn1} onChange={e => { setSupportBtn1(e.target.value); debouncePreview(supportCopy, supportTitle, e.target.value, supportBtn2) }}
                      placeholder="Become a subscriber"
                      style={{ ...inputSt, marginBottom: 8 }} />
                    <label style={labelSt}>Secondary button copy (leave blank to use default)</label>
                    <input value={supportBtn2} onChange={e => { setSupportBtn2(e.target.value); debouncePreview(supportCopy, supportTitle, supportBtn1, e.target.value) }}
                      placeholder="Make a donation"
                      style={{ ...inputSt, marginBottom: 8 }} />
                    <div style={{ marginTop: 5, fontSize: '11.5px', color: '#bbb' }}>Reflects in the preview automatically. Sent with the newsletter — not saved to the database.</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Live preview */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa' }}>Live preview{data?.subject ? ` — ${data.subject}` : ''}</div>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '6px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {['desktop', 'mobile'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: ff, background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0a0a0a' : '#aaa' }}>{m[0].toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
        </div>
        <div style={{ background: '#e8e8e8', padding: '20px', display: 'flex', justifyContent: 'center' }}>
          {loading ? <div style={{ padding: 60, color: '#999', fontStyle: 'italic' }}>Composing…</div>
            : data?.error ? <div style={{ padding: 60, color: DP }}>{data.error}</div>
            : data?.empty ? <div style={{ padding: 60, color: '#999', fontStyle: 'italic' }}>No published articles or events yet — the newsletter will fill in as you publish.</div>
            : <iframe title="Newsletter preview" srcDoc={data?.html || ''} style={{ width: mode === 'mobile' ? '375px' : '640px', maxWidth: '100%', height: '640px', border: 'none', background: '#fff', borderRadius: '6px' }} />}
        </div>
      </div>
      {/* ── Media picker modal ── */}
      {mediaPicker && (
        <div onClick={() => setMediaPicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: '80vh', background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: ff }}>Choose from media library</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {['body', 'covers', 'authors', 'announcements'].map(f => (
                  <button key={f} onClick={() => loadMediaFolder(f)}
                    style={{ padding: '4px 10px', background: mediaFolder === f ? '#0a0a0a' : '#f5f5f5', color: mediaFolder === f ? '#fff' : '#555', border: 'none', borderRadius: 5, fontSize: '11.5px', cursor: 'pointer', fontFamily: ff }}>
                    {f}
                  </button>
                ))}
                <button onClick={() => setMediaPicker(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {mediaLoading
                ? <div style={{ textAlign: 'center', padding: 40, color: '#999', fontStyle: 'italic', fontFamily: ff }}>Loading…</div>
                : mediaFiles.length === 0
                  ? <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontFamily: ff }}>No images in this folder.</div>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {mediaFiles.map(file => (
                        <div key={file.name} onClick={() => pickMediaUrl(getMediaUrl(file.name))}
                          style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '2px solid #f0f0f0', background: '#f8f8f8' }}>
                          <img src={getMediaUrl(file.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      ))}
                    </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
