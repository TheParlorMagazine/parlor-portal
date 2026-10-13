'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { confirmDialog } from '../../../lib/confirmDialog'

const ff   = "'Source Serif 4', Georgia, serif"
const PINK = '#f2b8c6'
const DP   = '#c4364a'

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
  // Announcement fields (saved to DB)
  const [announcement, setAnnouncement]       = useState('')
  const [announcementUrl, setAnnouncementUrl] = useState('')
  // Support copy (not persisted, sent per-send)
  const [supportCopy, setSupportCopy] = useState('')
  // Shop ad
  const [shopProducts, setShopProducts]       = useState([])
  const [shopProductsLoaded, setShopProductsLoaded] = useState(false)
  const [savingShopProduct, setSavingShopProduct]   = useState(false)

  const [savingSection, setSavingSection] = useState('')
  const [sections, setSections] = useState({
    announcement: true, issuPromo: true, issueArticles: true,
    articles: true, featuredEvent: true, otherEvents: true, shopAd: true, support: true,
  })
  const [expanded, setExpanded] = useState({})
  const previewTimer = useRef(null)

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [supabase])

  const load = useCallback(async (secs, supCopy) => {
    setMsg('')
    const activeSections  = secs     ?? sections
    const activeSupportCopy = supCopy ?? supportCopy
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(activeSections)) params.set(k, String(v))
    if (activeSupportCopy) params.set('supportCopy', activeSupportCopy)
    try {
      const res = await fetch(`/api/admin/newsletter/preview?${params}`, { headers: { Authorization: `Bearer ${await token()}` } })
      const d = await res.json()
      setData(res.ok ? d : { error: d.error })
      if (res.ok) {
        setIntro(d.issueIntro || '')
        setIssueImg(d.issueImage || '')
        setTagline(d.issueTagline || '')
        setAnnouncement(d.issueAnnouncement || '')
        setAnnouncementUrl(d.issueAnnouncementUrl || '')
      }
    } catch { setData({ error: 'Could not load the preview.' }) }
    setLoading(false)
  }, [token, sections, supportCopy])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setLoading(true)
    previewTimer.current = setTimeout(() => load(next), 400)
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
        body: JSON.stringify({ sections, supportCopy }),
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
        body: JSON.stringify({ issueId: data.issueId, intro, image: issueImg, tagline, announcement, announcementUrl }),
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

  function debouncePreview(newSupportCopy) {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setLoading(true)
    previewTimer.current = setTimeout(() => load(undefined, newSupportCopy), 600)
  }

  const card = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px' }
  const inputSt = { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: ff, outline: 'none', boxSizing: 'border-box' }
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
                    <label style={labelSt}>Announcement text</label>
                    <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} rows={3}
                      placeholder="e.g. Our spring fundraiser is live — help us reach $5k by April 30."
                      style={{ ...inputSt, fontSize: '14px', resize: 'vertical' }} />
                    <label style={{ ...labelSt, marginTop: 8 }}>CTA link URL (optional)</label>
                    <input value={announcementUrl} onChange={e => setAnnouncementUrl(e.target.value)}
                      placeholder="https://…" style={inputSt} />
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
                    <label style={labelSt}>Intro copy</label>
                    <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={4}
                      placeholder="A short intro to the current issue shown in the promo…"
                      style={{ ...inputSt, fontSize: '14px', resize: 'vertical' }} />
                    <label style={{ ...labelSt, marginTop: 8 }}>Tagline (below the buy buttons)</label>
                    <input value={tagline} onChange={e => setTagline(e.target.value)}
                      placeholder="Original essays, reporting, and art — bound in print."
                      style={inputSt} />
                    <label style={{ ...labelSt, marginTop: 8 }}>Promo image URL</label>
                    <input value={issueImg} onChange={e => setIssueImg(e.target.value)}
                      placeholder="https://… (a styled photo of the print issue)"
                      style={inputSt} />
                    <div style={{ marginTop: 10 }}>
                      <button onClick={saveIssueSection} disabled={!!savingSection || !data?.issueId} style={saveBtnSt(!!savingSection || !data?.issueId)}>
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
                    <label style={labelSt}>Body copy (leave blank to use default)</label>
                    <textarea value={supportCopy} onChange={e => { setSupportCopy(e.target.value); debouncePreview(e.target.value) }} rows={4}
                      placeholder={DEFAULT_SUPPORT}
                      style={{ ...inputSt, fontSize: '13.5px', resize: 'vertical', lineHeight: 1.6 }} />
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
    </div>
  )
}
