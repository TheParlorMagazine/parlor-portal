'use client'

import { useEffect, useState, useCallback } from 'react'
import { uploadToCloudinary } from '../../../lib/uploadImage'
import { confirmDialog } from '../../../lib/confirmDialog'

const ff    = "'Source Serif 4', Georgia, serif"
const ffH   = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const DP    = '#c4364a'

const inputSt = { width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: ff, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const labelSt = { display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: 5 }
const btnSt   = (primary) => ({ padding: '7px 16px', background: primary ? '#0a0a0a' : '#fff', color: primary ? '#fff' : '#444', border: `1px solid ${primary ? '#0a0a0a' : BORDER}`, borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: ff })

const TOT_DEFAULTS = [
  { name: 'Badgerface Beauty Lip Balm', description: 'Lip balm in assorted flavors to carry you through sweater weather.', treats: [
    { name: 'Badgerface lip balm, flavor 1', stock: 6 },
    { name: 'Badgerface lip balm, flavor 2', stock: 6 },
    { name: 'Badgerface lip balm, flavor 3', stock: 6 },
    { name: 'Badgerface lip balm, flavor 4', stock: 6 },
    { name: 'Badgerface lip balm, flavor 5', stock: 6 },
  ]},
  { name: 'Tea with Tae', description: 'Tea for slow mornings, long reads, and good conversation.', treats: [
    { name: 'Tea with Tae, blend 1', stock: 4 },
    { name: 'Tea with Tae, blend 2', stock: 4 },
    { name: 'Tea with Tae, blend 3', stock: 4 },
    { name: 'Tea with Tae, blend 4', stock: 4 },
    { name: 'Tea with Tae, blend 5', stock: 4 },
  ]},
  { name: 'Unicorn Snot', description: 'Holographic glitter gel for face, hair, and body.', treats: [
    { name: 'Unicorn Snot, shade 1', stock: 3 },
    { name: 'Unicorn Snot, shade 2', stock: 3 },
    { name: 'Unicorn Snot, shade 3', stock: 3 },
    { name: 'Unicorn Snot, shade 4', stock: 3 },
    { name: 'Unicorn Snot, shade 5', stock: 0 },
  ]},
  { name: 'The Issue Art House', description: "Original illustrations from The Parlor's pages, printed as postcards.", treats: [
    { name: 'It Takes a Village, print 1', note: 'Unlocks the story', stock: 20 },
    { name: 'It Takes a Village, print 2', note: 'Unlocks the story', stock: 20 },
    { name: 'Against the Cloud, print 1', note: 'Unlocks the story', stock: 20 },
    { name: 'Against the Cloud, print 2', note: 'Unlocks the story', stock: 20 },
    { name: 'Cover art', note: 'Unlocks a surprise story', stock: 20 },
  ]},
]

// ── Product picker (shared by add + edit) ─────────────────────────────────────
function ProductPicker({ token, selectedId, onSelect }) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState(null)

  useEffect(() => {
    fetch('/api/admin/shop-products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
  }, [token])

  const filtered = (products || []).filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.variant || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <input
        style={{ ...inputSt, marginBottom: 6 }}
        placeholder="Search products…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {products === null
        ? <div style={{ fontSize: 12, color: '#aaa', padding: '4px 0' }}>Loading…</div>
        : (
          <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 6 }}>
            {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>No products found</div>}
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                  background: selectedId === p.id ? '#fdf0f2' : '#fff',
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 32, height: 32, borderRadius: 4, background: '#f0eaec', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: ff, fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    {!p.active && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: '#f5f5f5', color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>inactive</span>}
                  </div>
                  {p.variant && <div style={{ fontFamily: ff, fontSize: 11, color: '#aaa' }}>{p.variant}</div>}
                </div>
                {selectedId === p.id && <span style={{ color: DP, fontSize: 14, fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ── Treat row ─────────────────────────────────────────────────────────────────
function TreatRow({ treat, token, collectionId, houseId, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const product = treat.shop_products || null
  const img = treat.share_img || product?.images?.[0] || null
  const [f, setF] = useState({
    note: treat.note || '',
    stock: treat.stock,
    share_img: treat.share_img || '',
    active: treat.active,
    product_id: treat.product_id || null,
    selectedProduct: product,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const base = `/api/admin/curated-collections/${collectionId}/houses/${houseId}/treats/${treat.id}`

  async function save() {
    setSaving(true)
    const res = await fetch(base, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note: f.note, stock: Number(f.stock) || 0, share_img: f.share_img || null, active: f.active, product_id: f.product_id }),
    })
    if (res.ok) { const d = await res.json(); onUpdated(d.treat); setEditing(false) }
    setSaving(false)
  }

  async function del() {
    if (!await confirmDialog(`Delete "${treat.name}"?`)) return
    await fetch(base, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onDeleted(treat.id)
  }

  async function uploadImg(file) {
    setUploading(true)
    try { set('share_img', await uploadToCloudinary(file, 'parlor/tot')) } catch {}
    setUploading(false)
  }

  const displayName = product ? `${product.name}${product.variant ? ` — ${product.variant}` : ''}` : treat.name

  if (!editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
      {img
        ? <img src={img} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 32, height: 32, borderRadius: 4, background: '#f0eaec', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: ff, fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
        {treat.note && <div style={{ fontFamily: ff, fontSize: 11.5, color: '#999' }}>{treat.note}</div>}
        {!product && <div style={{ fontSize: 10, color: '#f0a030', marginTop: 1 }}>No product linked</div>}
      </div>
      <div style={{ fontFamily: ff, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>Stock: {treat.stock}</div>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: treat.active ? '#e6f4ea' : '#f5f5f5', color: treat.active ? '#2e7d32' : '#999' }}>{treat.active ? 'Active' : 'Hidden'}</span>
      <button onClick={() => setEditing(true)} style={{ ...btnSt(false), padding: '4px 12px', fontSize: 12 }}>Edit</button>
      <button onClick={del} style={{ background: 'none', border: 'none', color: '#e57373', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
    </div>
  )

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginBottom: 8, background: '#fdf8f9' }}>
      <label style={labelSt}>Product</label>
      <ProductPicker
        token={token}
        selectedId={f.product_id}
        onSelect={p => setF(prev => ({ ...prev, product_id: p.id, selectedProduct: p }))}
      />
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 8px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelSt}>Note (optional)</label>
          <input style={inputSt} value={f.note} onChange={e => set('note', e.target.value)} placeholder="e.g. Unlocks the story" />
        </div>
        <div style={{ width: 80 }}>
          <label style={labelSt}>Stock{f.selectedProduct ? ` (max ${f.selectedProduct.inventory ?? '?'})` : ''}</label>
          <input type="number" min="0" max={f.selectedProduct?.inventory ?? undefined} style={inputSt} value={f.stock} onChange={e => set('stock', e.target.value)} />
        </div>
      </div>
      <label style={labelSt}>Share card image (overrides product image)</label>
      {(f.share_img || f.selectedProduct?.images?.[0]) && (
        <img src={f.share_img || f.selectedProduct?.images?.[0]} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, marginBottom: 6, display: 'block' }} />
      )}
      <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadImg(e.target.files[0])} style={{ fontSize: 12, marginBottom: 8 }} />
      {uploading && <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Uploading…</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: ff, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Active
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing(false)} style={btnSt(false)}>Cancel</button>
        <button onClick={save} disabled={saving || uploading} style={btnSt(true)}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

// ── Add treat form ────────────────────────────────────────────────────────────
function AddTreatForm({ token, collectionId, houseId, onAdded, onCancel }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [note, setNote] = useState('')
  const [stock, setStock] = useState(0)
  const [saving, setSaving] = useState(false)
  const [addedCount, setAddedCount] = useState(0)

  const [err, setErr] = useState('')

  async function save() {
    if (!selectedProduct) return
    setSaving(true)
    setErr('')
    const res = await fetch(`/api/admin/curated-collections/${collectionId}/houses/${houseId}/treats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: selectedProduct.name + (selectedProduct.variant ? ` — ${selectedProduct.variant}` : ''),
        note,
        stock: Number(stock) || 0,
        product_id: selectedProduct.id,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      onAdded(d.treat)
      setSelectedProduct(null)
      setNote('')
      setStock(0)
      setAddedCount(c => c + 1)
    } else {
      setErr(d.error || 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 8, padding: 12, marginTop: 8, background: '#fdf8f9' }}>
      <label style={{ ...labelSt, marginBottom: 8 }}>
        Select a product {addedCount > 0 && <span style={{ color: '#2e7d32', textTransform: 'none', letterSpacing: 0 }}>· {addedCount} saved</span>}
      </label>
      {selectedProduct ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', border: `1px solid ${DP}`, borderRadius: 6, marginBottom: 8 }}>
          {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt="" style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover' }} />}
          <span style={{ fontFamily: ff, fontSize: 13, color: '#222', flex: 1 }}>{selectedProduct.name}{selectedProduct.variant ? ` — ${selectedProduct.variant}` : ''}</span>
          <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
        </div>
      ) : (
        <ProductPicker token={token} selectedId={null} onSelect={p => { setSelectedProduct(p); setStock(p.inventory ?? 0) }} />
      )}
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 8px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelSt}>Note (optional)</label>
          <input style={inputSt} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Unlocks the story" />
        </div>
        <div style={{ width: 80 }}>
          <label style={labelSt}>Stock{selectedProduct ? ` (max ${selectedProduct.inventory ?? '?'})` : ''}</label>
          <input type="number" min="0" max={selectedProduct?.inventory ?? undefined} style={inputSt} value={stock} onChange={e => setStock(e.target.value)} />
        </div>
      </div>
      {err && <div style={{ fontFamily: ff, fontSize: 12, color: '#c62828', marginBottom: 6 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSt(false)}>{addedCount > 0 ? 'Done' : 'Cancel'}</button>
        <button onClick={save} disabled={saving || !selectedProduct} style={btnSt(true)}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

// ── House card ────────────────────────────────────────────────────────────────
function HouseCard({ house, token, collectionId, onUpdated, onDeleted }) {
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(house.name)
  const [desc, setDesc]         = useState(house.description || '')
  const [saving, setSaving]     = useState(false)
  const [addingTreat, setAddingTreat] = useState(false)
  const [treats, setTreats]     = useState(house.treats || [])
  const totalStock              = treats.reduce((s, t) => s + (t.stock || 0), 0)
  const base                    = `/api/admin/curated-collections/${collectionId}/houses/${house.id}`

  async function saveHouse() {
    setSaving(true)
    const res = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, description: desc }) })
    if (res.ok) { const d = await res.json(); onUpdated(d.house); setEditing(false) }
    setSaving(false)
  }

  async function delHouse() {
    if (!await confirmDialog(`Delete house "${house.name}" and all its treats?`)) return
    await fetch(base, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onDeleted(house.id)
  }

  async function toggleActive() {
    const res = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ active: !house.active }) })
    if (res.ok) { const d = await res.json(); onUpdated(d.house) }
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      {/* House header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: open ? '#fdf8f9' : '#fff', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12, color: '#bbb', userSelect: 'none', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ff, fontSize: 14, fontWeight: 600, color: '#222' }}>{house.name}</div>
          <div style={{ fontFamily: ff, fontSize: 12, color: '#aaa' }}>{treats.length} treat{treats.length !== 1 ? 's' : ''} · {totalStock} total stock</div>
        </div>
        <span onClick={e => { e.stopPropagation(); toggleActive() }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: house.active ? '#e6f4ea' : '#f5f5f5', color: house.active ? '#2e7d32' : '#999', cursor: 'pointer', whiteSpace: 'nowrap' }}>{house.active ? 'Active' : 'Hidden'}</span>
        <button onClick={e => { e.stopPropagation(); setEditing(v => !v); setOpen(true) }} style={{ ...btnSt(false), padding: '4px 12px', fontSize: 12 }}>Edit</button>
        <button onClick={e => { e.stopPropagation(); delHouse() }} style={{ background: 'none', border: 'none', color: '#e57373', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${BORDER}` }}>
          {editing && (
            <div style={{ padding: '12px 0 8px' }}>
              <label style={labelSt}>House name</label>
              <input style={{ ...inputSt, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} />
              <label style={labelSt}>Description</label>
              <input style={{ ...inputSt, marginBottom: 10 }} value={desc} onChange={e => setDesc(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} style={btnSt(false)}>Cancel</button>
                <button onClick={saveHouse} disabled={saving || !name.trim()} style={btnSt(true)}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          )}
          <div style={{ paddingTop: 8 }}>
            {treats.length === 0 && !addingTreat && <div style={{ fontFamily: ff, fontSize: 13, color: '#ccc', paddingBottom: 8 }}>No treats yet.</div>}
            {treats.map(t => (
              <TreatRow key={t.id} treat={t} token={token} collectionId={collectionId} houseId={house.id}
                onUpdated={u => setTreats(ts => ts.map(x => x.id === u.id ? u : x))}
                onDeleted={id => setTreats(ts => ts.filter(x => x.id !== id))} />
            ))}
            {addingTreat
              ? <AddTreatForm token={token} collectionId={collectionId} houseId={house.id}
                  onAdded={t => { setTreats(ts => [...ts, t]); setAddingTreat(false) }}
                  onCancel={() => setAddingTreat(false)} />
              : <button onClick={() => setAddingTreat(true)} style={{ ...btnSt(false), marginTop: 10, fontSize: 12 }}>+ Add treat</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add house form ────────────────────────────────────────────────────────────
function AddHouseForm({ token, collectionId, onAdded, onCancel, nextSort }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/curated-collections/${collectionId}/houses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description: desc, sort_order: nextSort }),
    })
    if (res.ok) { const d = await res.json(); onAdded(d.house) }
    setSaving(false)
  }

  return (
    <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 16, marginTop: 8, background: '#fdf8f9' }}>
      <div style={{ fontFamily: ff, fontSize: 13, fontWeight: 600, color: DP, marginBottom: 12 }}>New house</div>
      <label style={labelSt}>House name</label>
      <input style={{ ...inputSt, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Badgerface Beauty Lip Balm" />
      <label style={labelSt}>Description (optional)</label>
      <input style={{ ...inputSt, marginBottom: 12 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Shown when user knocks on this house" />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSt(false)}>Cancel</button>
        <button onClick={save} disabled={saving || !name.trim()} style={btnSt(true)}>{saving ? 'Creating…' : 'Create house'}</button>
      </div>
    </div>
  )
}

// ── Standalone product row ────────────────────────────────────────────────────
function StandaloneRow({ item, onRemoved, token, collectionId }) {
  const p = item.shop_products || {}
  const img = p.images?.[0]
  async function remove() {
    if (!await confirmDialog(`Remove "${p.name || 'this product'}" from the bundle?`)) return
    await fetch(`/api/admin/curated-collections/${collectionId}/standalone/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onRemoved(item.id)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      {img
        ? <img src={img} alt="" style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 30, height: 30, borderRadius: 4, background: '#f0eaec', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: ff, fontSize: 13, color: '#222' }}>{p.name || '—'}</div>
        {p.price != null && <div style={{ fontFamily: ff, fontSize: 11, color: '#aaa' }}>${p.price}</div>}
      </div>
      {!p.active && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#f5f5f5', color: '#999' }}>inactive</span>}
      <button onClick={remove} style={{ background: 'none', border: 'none', color: '#e57373', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
    </div>
  )
}

// ── Collection accordion ──────────────────────────────────────────────────────
function CollectionAccordion({ collection, token, onUpdated, onDeleted }) {
  const [open, setOpen]           = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [name, setName]           = useState(collection.name)
  const [desc, setDesc]           = useState(collection.description || '')
  const [price, setPrice]         = useState(collection.price || '')
  const [priceEur, setPriceEur]   = useState(collection.price_eur || '')
  const [priceGbp, setPriceGbp]   = useState(collection.price_gbp || '')
  const [shipLine, setShipLine]   = useState(collection.ship_line || '')
  const [saving, setSaving]       = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [togglingLive, setTogglingLive] = useState(false)
  const [addingHouse, setAddingHouse]   = useState(false)
  const [addingStandalone, setAddingStandalone] = useState(false)
  const [standaloneItems, setStandaloneItems] = useState([])
  const [standaloneProduct, setStandaloneProduct] = useState(null)
  const [seeding, setSeeding]     = useState(false)
  const [houses, setHouses]       = useState(collection.houses || [])
  const base                      = `/api/admin/curated-collections/${collection.id}`

  // Load standalone products when opened
  const [standaloneLoaded, setStandaloneLoaded] = useState(false)
  async function loadStandalone() {
    if (standaloneLoaded) return
    const res = await fetch(`${base}/standalone`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setStandaloneItems(d.items || []) }
    setStandaloneLoaded(true)
  }

  async function addStandalone() {
    if (!standaloneProduct) return
    const res = await fetch(`${base}/standalone`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: standaloneProduct.id, sort_order: standaloneItems.length }),
    })
    if (res.ok) { const d = await res.json(); setStandaloneItems(si => [...si, d.item]) }
    setStandaloneProduct(null)
    setAddingStandalone(false)
  }

  async function saveName() {
    setSaving(true)
    const res = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, description: desc }) })
    if (res.ok) { const d = await res.json(); onUpdated(d.collection); setEditingName(false) }
    setSaving(false)
  }

  async function savePrice() {
    setSavingPrice(true)
    const res = await fetch(base, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price: price || null, price_eur: priceEur || null, price_gbp: priceGbp || null, ship_line: shipLine || null }),
    })
    if (res.ok) { const d = await res.json(); onUpdated(d.collection); setEditingPrice(false) }
    setSavingPrice(false)
  }

  async function toggleLive() {
    setTogglingLive(true)
    const res = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ live: !collection.live }) })
    if (res.ok) { const d = await res.json(); onUpdated(d.collection) }
    setTogglingLive(false)
  }

  function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) loadStandalone()
  }

  async function del() {
    if (!await confirmDialog(`Delete collection "${collection.name}" and everything in it?`)) return
    await fetch(base, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onDeleted(collection.id)
  }

  async function seedHouses() {
    setSeeding(true)
    const created = []
    for (let i = 0; i < TOT_DEFAULTS.length; i++) {
      const { treats, ...h } = TOT_DEFAULTS[i]
      const hRes = await fetch(`${base}/houses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...h, sort_order: i }),
      })
      if (!hRes.ok) continue
      const { house: newHouse } = await hRes.json()
      const newTreats = []
      for (let j = 0; j < treats.length; j++) {
        const tRes = await fetch(`${base}/houses/${newHouse.id}/treats`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...treats[j], sort_order: j }),
        })
        if (tRes.ok) { const d = await tRes.json(); newTreats.push(d.treat) }
      }
      created.push({ ...newHouse, treats: newTreats })
    }
    setHouses(created)
    setSeeding(false)
  }

  const liveColor = collection.live ? '#2e7d32' : '#888'
  const liveBg    = collection.live ? '#e6f4ea' : '#f5f5f5'

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      {/* Collection header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: open ? '#fdf8f9' : '#fff' }}>
        <button onClick={handleOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#bbb', fontSize: 13, lineHeight: 1, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</button>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={handleOpen}>
          {editingName ? (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...inputSt, width: 240, padding: '5px 10px' }} value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveName()} />
              <button onClick={saveName} disabled={saving} style={{ ...btnSt(true), padding: '5px 12px', fontSize: 12 }}>{saving ? '…' : 'Save'}</button>
              <button onClick={() => setEditingName(false)} style={{ ...btnSt(false), padding: '5px 12px', fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: ffH, fontSize: 16, fontWeight: 700, color: '#111' }}>{collection.name}</div>
              {collection.description && <div style={{ fontFamily: ff, fontSize: 12, color: '#999', marginTop: 1 }}>{collection.description}</div>}
            </>
          )}
        </div>
        {/* Live toggle */}
        <button
          onClick={e => { e.stopPropagation(); toggleLive() }}
          disabled={togglingLive}
          style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${liveColor}`, background: liveBg, color: liveColor, cursor: 'pointer', fontFamily: ff, whiteSpace: 'nowrap' }}
        >
          {collection.live ? '● Live' : '○ Not live'}
        </button>
        {!editingName && (
          <button onClick={e => { e.stopPropagation(); setEditingName(true) }} style={{ ...btnSt(false), padding: '4px 12px', fontSize: 12 }}>Rename</button>
        )}
        <button onClick={e => { e.stopPropagation(); del() }} style={{ background: 'none', border: 'none', color: '#e57373', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${BORDER}` }}>

          {/* ── Price + shipping ── */}
          <div style={{ paddingTop: 14, marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: editingPrice ? 12 : 0 }}>
              <div style={{ fontFamily: ff, fontSize: 13, color: '#444', flex: 1 }}>
                {collection.price
                  ? <><strong style={{ color: '#111' }}>${collection.price} USD</strong>{collection.price_eur ? ` · €${collection.price_eur}` : ''}{collection.price_gbp ? ` · £${collection.price_gbp}` : ''}</>
                  : <span style={{ color: '#e57373', fontStyle: 'italic' }}>Bundle price not set</span>}
                {collection.ship_line && <span style={{ color: '#999', marginLeft: 8 }}>· {collection.ship_line}</span>}
              </div>
              <button onClick={() => setEditingPrice(v => !v)} style={{ ...btnSt(false), padding: '3px 10px', fontSize: 11 }}>
                {editingPrice ? 'Cancel' : 'Set price'}
              </button>
            </div>
            {editingPrice && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ width: 90 }}>
                  <label style={labelSt}>USD ($)</label>
                  <input type="number" min="0" step="0.01" style={inputSt} value={price} onChange={e => setPrice(e.target.value)} placeholder="100" />
                </div>
                <div style={{ width: 90 }}>
                  <label style={labelSt}>EUR (€)</label>
                  <input type="number" min="0" step="0.01" style={inputSt} value={priceEur} onChange={e => setPriceEur(e.target.value)} placeholder="95" />
                </div>
                <div style={{ width: 90 }}>
                  <label style={labelSt}>GBP (£)</label>
                  <input type="number" min="0" step="0.01" style={inputSt} value={priceGbp} onChange={e => setPriceGbp(e.target.value)} placeholder="80" />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={labelSt}>Shipping note (shown at checkout)</label>
                  <input style={inputSt} value={shipLine} onChange={e => setShipLine(e.target.value)} placeholder="Ships by late November." />
                </div>
                <div style={{ alignSelf: 'flex-end', paddingBottom: 2 }}>
                  <button onClick={savePrice} disabled={savingPrice} style={btnSt(true)}>{savingPrice ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Standalone products (always-included items) ── */}
          <div style={{ marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 14 }}>
            <div style={{ fontFamily: ff, fontSize: 12, color: '#999', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Always included in bundle</div>
            {standaloneItems.map(item => (
              <StandaloneRow key={item.id} item={item} token={token} collectionId={collection.id}
                onRemoved={id => setStandaloneItems(si => si.filter(x => x.id !== id))} />
            ))}
            {standaloneItems.length === 0 && !addingStandalone && (
              <div style={{ fontFamily: ff, fontSize: 12, color: '#ccc', paddingBottom: 6 }}>None yet — add the tote, a card, etc.</div>
            )}
            {addingStandalone ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <ProductPicker token={token} selectedId={null} onSelect={p => setStandaloneProduct(p)} />
                </div>
                {standaloneProduct && (
                  <div style={{ fontFamily: ff, fontSize: 12, color: '#444', alignSelf: 'center' }}>{standaloneProduct.name}</div>
                )}
                <button onClick={addStandalone} disabled={!standaloneProduct} style={btnSt(true)}>Add</button>
                <button onClick={() => { setAddingStandalone(false); setStandaloneProduct(null) }} style={btnSt(false)}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingStandalone(true)} style={{ ...btnSt(false), marginTop: 6, fontSize: 12 }}>+ Add standalone product</button>
            )}
          </div>

          {/* ── Houses ── */}
          <div>
            {houses.length === 0 && !addingHouse && !seeding && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 10 }}>
                <div style={{ fontFamily: ff, fontSize: 13, color: '#bbb' }}>No houses yet.</div>
                <button onClick={seedHouses} style={{ ...btnSt(true), background: DP, borderColor: DP, alignSelf: 'flex-start', fontSize: 12 }}>
                  ✦ Seed from Trick or Treat defaults
                </button>
              </div>
            )}
            {seeding && <div style={{ fontFamily: ff, fontSize: 13, color: '#999', paddingBottom: 10 }}>Seeding houses and treats…</div>}
            {houses.map(h => (
              <HouseCard key={h.id} house={h} token={token} collectionId={collection.id}
                onUpdated={u => setHouses(hs => hs.map(x => x.id === u.id ? { ...x, ...u } : x))}
                onDeleted={id => setHouses(hs => hs.filter(x => x.id !== id))} />
            ))}
            {addingHouse
              ? <AddHouseForm token={token} collectionId={collection.id} nextSort={houses.length}
                  onAdded={h => { setHouses(hs => [...hs, h]); setAddingHouse(false) }}
                  onCancel={() => setAddingHouse(false)} />
              : <button onClick={() => setAddingHouse(true)} style={{ ...btnSt(false), marginTop: 8, fontSize: 12 }}>+ Add house</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add collection form ───────────────────────────────────────────────────────
function AddCollectionForm({ token, onAdded, onCancel, nextSort }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/curated-collections', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description: desc, sort_order: nextSort }),
    })
    if (res.ok) { const d = await res.json(); onAdded({ ...d.collection, houses: [] }) }
    setSaving(false)
  }

  return (
    <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 18, background: '#fdf8f9' }}>
      <div style={{ fontFamily: ffH, fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 14 }}>New curated collection</div>
      <label style={labelSt}>Collection name</label>
      <input style={{ ...inputSt, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Trick or Treat 2027" onKeyDown={e => e.key === 'Enter' && save()} />
      <label style={labelSt}>Description (optional)</label>
      <input style={{ ...inputSt, marginBottom: 14 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="A short note about this collection" />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSt(false)}>Cancel</button>
        <button onClick={save} disabled={saving || !name.trim()} style={btnSt(true)}>{saving ? 'Creating…' : 'Create collection'}</button>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function CuratedCollectionsSection({ supabase }) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadErr, setLoadErr]         = useState('')
  const [addingCollection, setAddingCollection] = useState(false)
  const [token, setToken]             = useState('')

  const load = useCallback(async () => {
    setLoadErr('')
    const { data: { session } } = await supabase.auth.getSession()
    const tok = session?.access_token || ''
    setToken(tok)
    const res = await fetch('/api/admin/curated-collections', { headers: { Authorization: `Bearer ${tok}` } })
    const d = await res.json()
    if (res.ok) { setCollections(d.collections || []) }
    else { setLoadErr(d.error || 'Failed to load collections') }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: ffH, fontSize: 20, fontWeight: 700, margin: '0 0 3px', color: '#111' }}>Curated Collections</h2>
          <p style={{ fontFamily: ff, fontSize: 13, color: '#888', margin: 0 }}>Each collection is a themed interactive page. Toggle it <strong>Live</strong> to make it visible.</p>
        </div>
        {!addingCollection && (
          <button onClick={() => setAddingCollection(true)} style={btnSt(true)}>+ New collection</button>
        )}
      </div>

      {loading ? (
        <div style={{ fontFamily: ff, color: '#999', fontSize: 13 }}>Loading…</div>
      ) : loadErr ? (
        <div style={{ fontFamily: ff, color: '#c62828', fontSize: 13, padding: '12px 0' }}>Error: {loadErr}</div>
      ) : (
        <>
          {collections.map(c => (
            <CollectionAccordion key={c.id} collection={c} token={token}
              onUpdated={u => setCollections(cs => cs.map(x => x.id === u.id ? { ...x, ...u } : x))}
              onDeleted={id => setCollections(cs => cs.filter(x => x.id !== id))} />
          ))}
          {collections.length === 0 && !addingCollection && (
            <div style={{ fontFamily: ff, color: '#bbb', fontSize: 13, padding: '20px 0' }}>No collections yet. Create one to get started.</div>
          )}
          {addingCollection && (
            <AddCollectionForm token={token} nextSort={collections.length}
              onAdded={c => { setCollections(cs => [...cs, c]); setAddingCollection(false) }}
              onCancel={() => setAddingCollection(false)} />
          )}
        </>
      )}
    </div>
  )
}
