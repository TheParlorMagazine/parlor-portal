'use client'

import { useEffect, useState, useRef } from 'react'
import { prepareImageUpload, isDuplicateUpload } from '../../../lib/uploadImage'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP = '#c4364a'
const PINK = '#f2b8c6'
const BLACK = '#0a0a0a'

const input = { width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '14px 0 6px' }

function money(n) { return n == null || n === '' ? '—' : `$${Number(n).toFixed(2)}` }

// ── Editor modal ──────────────────────────────────────────────
function ProductModal({ token, item, supabase, onClose, onSaved, categories = [] }) {
  const [f, setF] = useState({
    name: item?.name || '', variant: item?.variant || '', description: item?.description || '',
    category: item?.category || '', price: item?.price ?? '', price_eur: item?.price_eur ?? '', price_gbp: item?.price_gbp ?? '',
    images: Array.isArray(item?.images) ? item.images : [], tint: item?.tint || '#eee',
    sku: item?.sku || '', inventory: item?.inventory ?? '', sort: item?.sort ?? 0,
    fulfillment: item?.fulfillment || 'manual', external_url: item?.external_url || '',
    printify_product_id: item?.printify_product_id || '', printify_shop_id: item?.printify_shop_id || '',
    active: item?.active ?? true, featured: item?.featured ?? false,
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const dropRef = useRef(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function uploadImages(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setUploading(true); setErr('')
    try {
      const urls = []
      for (const file of files) {
        if (isDuplicateUpload(dropRef, file)) continue
        const { blob: up, contentType, ext } = await prepareImageUpload(file)
        const path = `shop/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from('Media').upload(path, up, { cacheControl: '31536000', contentType })
        if (error) { setErr(error.message); continue }
        const { data: { publicUrl } } = supabase.storage.from('Media').getPublicUrl(path)
        urls.push(publicUrl)
      }
      if (urls.length) set('images', [...f.images, ...urls])
    } catch (e) { setErr(e.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  function removeImage(i) { set('images', f.images.filter((_, j) => j !== i)) }
  function makePrimary(i) { if (i === 0) return; const a = [...f.images]; const [x] = a.splice(i, 1); a.unshift(x); set('images', a) }

  async function save() {
    if (!f.name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr('')
    const payload = { ...f, price: f.price === '' ? 0 : f.price }
    if (item?.id) payload.id = item.id
    const res = await fetch('/api/admin/shop-products', {
      method: item?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(payload),
    })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setErr(j.error || 'Save failed'); return }
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: ffH, fontSize: 22, margin: 0, color: BLACK }}>{item?.id ? 'Edit product' : 'New product'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={label}>Name</div>
        <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="The Parlor — Vol. 2" style={input} />
        <div style={label}>Variant / subtitle</div>
        <input value={f.variant} onChange={e => set('variant', e.target.value)} placeholder="The World We're Building" style={input} />
        <div style={label}>Description</div>
        <textarea value={f.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Shown on the product card / page…" style={{ ...input, resize: 'vertical' }} />

        <div style={label}>Category</div>
        <select value={f.category} onChange={e => set('category', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
          <option value="">Select category…</option>
          {[...new Set([...(categories || []), f.category].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Pricing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><div style={label}>Price (USD)</div><input type="number" step="0.01" value={f.price} onChange={e => set('price', e.target.value)} placeholder="35" style={input} /></div>
          <div><div style={label}>EUR <span style={{ textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(opt)</span></div><input type="number" step="0.01" value={f.price_eur} onChange={e => set('price_eur', e.target.value)} placeholder="35" style={input} /></div>
          <div><div style={label}>GBP <span style={{ textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(opt)</span></div><input type="number" step="0.01" value={f.price_gbp} onChange={e => set('price_gbp', e.target.value)} placeholder="35" style={input} /></div>
        </div>

        {/* Images */}
        <div style={label}>Images <span style={{ textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(first is the primary)</span></div>
        <div ref={dropRef}
          onDragOver={e => { e.preventDefault() }}
          onDrop={e => { e.preventDefault(); uploadImages(e.dataTransfer.files) }}
          style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 8, background: '#faf8f6', padding: 12 }}>
          {f.images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {f.images.map((url, i) => (
                <div key={url} style={{ position: 'relative', width: 74, height: 74, borderRadius: 6, overflow: 'hidden', border: i === 0 ? `2px solid ${DP}` : `1px solid ${BORDER}` }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removeImage(i)} title="Remove" style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>×</button>
                  {i !== 0 && <button onClick={() => makePrimary(i)} title="Make primary" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, cursor: 'pointer', padding: '2px 0' }}>Make primary</button>}
                  {i === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: DP, color: '#fff', fontSize: 9, textAlign: 'center', padding: '2px 0' }}>Primary</div>}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: '#888' }}>
            {uploading ? 'Uploading…' : <><strong style={{ color: '#555' }}>Drag &amp; drop</strong> images, or <label style={{ color: DP, cursor: 'pointer' }}>upload<input type="file" accept="image/*" multiple hidden onChange={e => { uploadImages(e.target.files); e.target.value = '' }} /></label></>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div><div style={label}>…or placeholder tint</div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="color" value={f.tint} onChange={e => set('tint', e.target.value)} style={{ width: 40, height: 38, border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }} /><input value={f.tint} onChange={e => set('tint', e.target.value)} style={input} /></div></div>
          <div><div style={label}>Sort</div><input type="number" value={f.sort} onChange={e => set('sort', e.target.value)} style={input} /></div>
        </div>

        {/* Inventory / SKU */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={label}>SKU <span style={{ textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(opt)</span></div><input value={f.sku} onChange={e => set('sku', e.target.value)} style={input} /></div>
          <div><div style={label}>Inventory <span style={{ textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(blank = ∞)</span></div><input type="number" value={f.inventory} onChange={e => set('inventory', e.target.value)} placeholder="∞" style={input} /></div>
        </div>

        {/* Fulfillment */}
        <div style={label}>Fulfillment</div>
        <select value={f.fulfillment} onChange={e => set('fulfillment', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
          <option value="manual">Self-fulfilled (you ship it)</option>
          <option value="printify">Printify (print-on-demand)</option>
          <option value="external">External link (e.g. Wix)</option>
        </select>
        {f.fulfillment === 'printify' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4, padding: 12, background: '#faf6f7', borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <div><div style={label}>Printify product ID</div><input value={f.printify_product_id} onChange={e => set('printify_product_id', e.target.value)} style={input} /></div>
            <div><div style={label}>Printify shop ID</div><input value={f.printify_shop_id} onChange={e => set('printify_shop_id', e.target.value)} style={input} /></div>
          </div>
        )}
        {f.fulfillment === 'external' && (
          <><div style={label}>External URL</div><input value={f.external_url} onChange={e => set('external_url', e.target.value)} placeholder="https://…" style={input} /></>
        )}

        {/* Flags */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13.5, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!f.active} onChange={e => set('active', e.target.checked)} style={{ width: 15, height: 15, accentColor: BLACK, cursor: 'pointer' }} /> Active (visible in shop)
          </label>
          <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13.5, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!f.featured} onChange={e => set('featured', e.target.checked)} style={{ width: 15, height: 15, accentColor: DP, cursor: 'pointer' }} /> Featured
          </label>
        </div>

        {err && <div style={{ color: DP, fontSize: 13, marginTop: 12 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', border: `1px solid ${BORDER}`, borderRadius: 24, background: '#fff', color: '#555', fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 22px', border: 'none', borderRadius: 24, background: BLACK, color: '#fff', fontFamily: ff, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save product'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Printify import modal ─────────────────────────────────────
function PrintifyImportModal({ token, onClose, onDone }) {
  const [state, setState] = useState({ loading: true })
  const [sel, setSel] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/shop/printify', { headers: { Authorization: `Bearer ${await token()}` } })
      const j = await res.json().catch(() => ({}))
      setState({ loading: false, ...j })
    })()
  }, [])

  async function importIds(ids) {
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/shop/printify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(ids ? { ids } : {}) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg(j.error || 'Import failed'); return }
    setMsg(`Imported ${j.created} new · re-synced ${j.updated}. New products start inactive — set a category and activate them.`)
    onDone()
  }

  const products = state.products || []
  const chosen = Object.keys(sel).filter(k => sel[k])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: ffH, fontSize: 22, margin: 0, color: BLACK }}>Import from Printify</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer' }}>×</button>
        </div>

        {state.loading ? <div style={{ color: '#999', padding: 24 }}>Connecting to Printify…</div>
          : state.configured === false ? (
            <div style={{ padding: '16px 0', color: '#555', fontSize: 13.5, lineHeight: 1.6 }}>
              Printify isn’t connected yet. Add <code style={{ background: '#f4eef0', padding: '1px 5px', borderRadius: 4 }}>PRINTIFY_API_TOKEN</code> (and optionally <code style={{ background: '#f4eef0', padding: '1px 5px', borderRadius: 4 }}>PRINTIFY_SHOP_ID</code>) to your environment, then reopen this. Create the token in Printify → <em>My account → Connections → API tokens</em>.
            </div>
          ) : state.error ? <div style={{ color: DP, padding: 16 }}>{state.error}</div>
          : products.length === 0 ? <div style={{ color: '#999', padding: 16 }}>No products found in your Printify shop.</div>
          : (
            <>
              <div style={{ maxHeight: 320, overflowY: 'auto', margin: '14px 0', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                {products.map((p, i) => (
                  <label key={p.printify_product_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${BORDER}` : 'none', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!sel[p.printify_product_id]} onChange={e => setSel(s => ({ ...s, [p.printify_product_id]: e.target.checked }))} style={{ width: 15, height: 15, accentColor: BLACK }} />
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: '#eee', overflow: 'hidden', flexShrink: 0 }}>{p.image && <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: BLACK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 11.5, color: '#999' }}>{p.variants} variant{p.variants === 1 ? '' : 's'}{p.imported ? ' · already imported' : ''}</div>
                    </div>
                  </label>
                ))}
              </div>
              {msg && <div style={{ color: '#2d8f5a', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button onClick={() => importIds(null)} disabled={busy} style={{ padding: '10px 16px', border: `1px solid ${BORDER}`, borderRadius: 24, background: '#fff', color: '#555', fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}>Import / sync all</button>
                <button onClick={() => importIds(chosen)} disabled={busy || !chosen.length} style={{ padding: '10px 20px', border: 'none', borderRadius: 24, background: BLACK, color: '#fff', fontFamily: ff, fontSize: 13.5, cursor: chosen.length ? 'pointer' : 'default', opacity: chosen.length ? 1 : 0.5 }}>{busy ? 'Importing…' : `Import selected (${chosen.length})`}</button>
              </div>
            </>
          )}
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────
export default function ShopProductsSection({ supabase }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([]) // [{ id, name }]
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState('all')
  const [addingCat, setAddingCat] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [moveFor, setMoveFor] = useState(null) // product id whose "move" menu is open
  const [hoverRow, setHoverRow] = useState(null)
  const [err, setErr] = useState('')
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.access_token }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/shop-products', { headers: { Authorization: `Bearer ${await token()}` } })
    const j = await res.json().catch(() => ({}))
    setProducts(Array.isArray(j.products) ? j.products : [])
    setLoading(false)
  }
  async function loadCategories() {
    const res = await fetch('/api/admin/shop-categories', { headers: { Authorization: `Bearer ${await token()}` } })
    const j = await res.json().catch(() => ({}))
    setCategories(Array.isArray(j.categories) ? j.categories : [])
  }
  useEffect(() => { load(); loadCategories() }, [])

  async function toggleActive(p) {
    await fetch('/api/admin/shop-products', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: p.id, active: !p.active }) })
    load()
  }
  async function remove(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    await fetch('/api/admin/shop-products', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: p.id }) })
    load()
  }
  async function moveProduct(p, category) {
    setMoveFor(null)
    await fetch('/api/admin/shop-products', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: p.id, category }) })
    load()
  }
  async function addCategory() {
    const name = newCat.trim()
    if (!name) return
    setErr('')
    const res = await fetch('/api/admin/shop-categories', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ name }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Could not add category'); return }
    setNewCat(''); setAddingCat(false); loadCategories()
  }
  async function deleteCategory(name) {
    setErr('')
    const res = await fetch('/api/admin/shop-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ name }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Could not delete category'); return }
    if (filter === name) setFilter('all')
    loadCategories()
  }

  const catNames = categories.map(c => c.name)
  const countFor = name => products.filter(p => p.category === name).length
  const uncategorized = products.filter(p => !p.category).length
  const shown = filter === 'all' ? products : filter === '__uncat__' ? products.filter(p => !p.category) : products.filter(p => p.category === filter)

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ fontFamily: ffH, fontSize: 26, margin: 0, color: BLACK }}>Shop Products</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setImporting(true)} style={{ padding: '9px 16px', border: `1px solid ${BORDER}`, borderRadius: 24, background: '#fff', color: '#555', fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>⟳ Import from Printify</button>
          <button onClick={() => setEditing(null)} style={{ padding: '9px 18px', border: 'none', borderRadius: 24, background: BLACK, color: '#fff', fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>+ New product</button>
        </div>
      </div>
      <p style={{ color: '#888', fontSize: 13.5, margin: '0 0 18px' }}>Manage everything on <a href="/shop" target="_blank" style={{ color: DP }}>the storefront</a>. Products marked <em>Printify</em> are fulfilled print-on-demand. Hover a product (or double-click it) to move it to another category.</p>

      {/* Category chips: filter + delete-if-empty + add */}
      <div style={{ display: 'flex', gap: 8, marginBottom: err ? 8 : 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === 'all' ? BLACK : BORDER}`, background: filter === 'all' ? BLACK : '#fff', color: filter === 'all' ? '#fff' : '#666', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>All</button>
        {catNames.map(c => {
          const empty = countFor(c) === 0
          const active = filter === c
          return (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 20, border: `1px solid ${active ? BLACK : BORDER}`, background: active ? BLACK : '#fff', overflow: 'hidden' }}>
              <button onClick={() => setFilter(c)} style={{ padding: '6px 10px 6px 14px', border: 'none', background: 'transparent', color: active ? '#fff' : '#666', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>{c}{!empty && <span style={{ opacity: 0.5, marginLeft: 5 }}>{countFor(c)}</span>}</button>
              {empty && <button onClick={() => deleteCategory(c)} title="Delete empty category" style={{ border: 'none', background: 'transparent', color: active ? '#fff' : '#bbb', cursor: 'pointer', fontSize: 14, padding: '0 10px 0 2px', lineHeight: 1 }}>×</button>}
            </span>
          )
        })}
        {uncategorized > 0 && (
          <button onClick={() => setFilter('__uncat__')} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === '__uncat__' ? BLACK : '#e0b4bc'}`, background: filter === '__uncat__' ? BLACK : '#fdf1f3', color: filter === '__uncat__' ? '#fff' : DP, fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>Uncategorized <span style={{ opacity: 0.6 }}>{uncategorized}</span></button>
        )}
        {addingCat ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setAddingCat(false); setNewCat('') } }} placeholder="Category name" style={{ padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: 20, fontFamily: ff, fontSize: 13, outline: 'none', width: 150 }} />
            <button onClick={addCategory} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: BLACK, color: '#fff', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>Add</button>
            <button onClick={() => { setAddingCat(false); setNewCat(''); setErr('') }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </span>
        ) : (
          <button onClick={() => setAddingCat(true)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px dashed ${BORDER}`, background: '#fff', color: DP, fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>+ Add category</button>
        )}
      </div>
      {err && <div style={{ color: DP, fontSize: 13, margin: '0 0 16px' }}>{err}</div>}

      {loading ? <div style={{ color: '#999', padding: 30 }}>Loading…</div> : shown.length === 0 ? (
        <div style={{ color: '#999', padding: 40, textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 10 }}>No products in this category yet.</div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'visible' }}>
          {shown.map((p, i) => {
            const showMove = hoverRow === p.id || moveFor === p.id
            return (
            <div key={p.id} onMouseEnter={() => setHoverRow(p.id)} onMouseLeave={() => setHoverRow(h => (h === p.id ? null : h))} onDoubleClick={() => setMoveFor(moveFor === p.id ? null : p.id)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderTop: i ? `1px solid ${BORDER}` : 'none', background: p.active ? '#fff' : '#faf9f9' }}>
              <div style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, background: p.tint || '#eee', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: ffH, fontSize: 16, color: BLACK, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.name}
                  {p.featured && <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: DP, border: `1px solid ${PINK}`, borderRadius: 20, padding: '1px 7px' }}>Featured</span>}
                  {p.fulfillment === 'printify' && <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2d6ca8', border: '1px solid #bcd', borderRadius: 20, padding: '1px 7px' }}>Printify</span>}
                </div>
                <div style={{ fontSize: 12.5, color: '#999' }}>{[p.variant, p.category || 'Uncategorized'].filter(Boolean).join(' · ')}</div>
              </div>

              {/* Move-to-category arrow (on hover / double-click) */}
              <div style={{ position: 'relative', width: 30, flexShrink: 0 }}>
                {showMove && (
                  <button onClick={() => setMoveFor(moveFor === p.id ? null : p.id)} title="Move to category"
                    style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${BORDER}`, background: moveFor === p.id ? BLACK : '#fff', color: moveFor === p.id ? '#fff' : '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>→</button>
                )}
                {moveFor === p.id && (
                  <div style={{ position: 'absolute', top: 32, right: 0, zIndex: 20, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', minWidth: 180, overflow: 'hidden' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', padding: '9px 14px 5px' }}>Move to</div>
                    {catNames.filter(c => c !== p.category).map(c => (
                      <button key={c} onClick={() => moveProduct(p, c)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', background: '#fff', color: '#333', fontFamily: ff, fontSize: 13.5, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f6eef0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>{c}</button>
                    ))}
                    {catNames.filter(c => c !== p.category).length === 0 && <div style={{ padding: '9px 14px', fontSize: 13, color: '#aaa' }}>No other categories</div>}
                  </div>
                )}
              </div>

              <div style={{ fontFamily: ffH, fontSize: 15, color: '#333', width: 70, textAlign: 'right' }}>{money(p.price)}</div>
              <button onClick={() => toggleActive(p)} title={p.active ? 'Active' : 'Hidden'} style={{ width: 46, height: 24, borderRadius: 20, border: 'none', background: p.active ? '#2d8f5a' : '#ccc', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: p.active ? 24 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
              </button>
              <button onClick={() => setEditing(p)} style={{ padding: '6px 14px', border: `1px solid ${BORDER}`, borderRadius: 20, background: '#fff', color: '#555', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>Edit</button>
              <button onClick={() => remove(p)} title="Delete" style={{ background: 'none', border: 'none', color: '#c99', fontSize: 16, cursor: 'pointer' }}>🗑</button>
            </div>
          )})}
        </div>
      )}

      {editing !== undefined && <ProductModal token={token} item={editing} supabase={supabase} categories={catNames} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load() }} />}
      {importing && <PrintifyImportModal token={token} onClose={() => setImporting(false)} onDone={load} />}
    </div>
  )
}
