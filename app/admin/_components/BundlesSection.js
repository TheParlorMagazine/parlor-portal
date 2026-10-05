'use client'

import { useEffect, useState, useCallback } from 'react'
import { confirmDialog } from '../../../lib/confirmDialog'

const ff  = "'Source Serif 4', Georgia, serif"
const ffH = "'Playfair Display', Georgia, serif"
const BORDER = '#e5e0e2'
const BLACK = '#0a0a0a'
const PINK  = '#f2b8c6'

const inp = { width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: ff, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: '14px 0 6px', display: 'block' }

function money(n) { return n == null ? '—' : `$${Number(n).toFixed(2)}` }

// ── Provider validation helper ────────────────────────────────
function checkProviders(items, products) {
  const byId = new Map((products || []).map(p => [p.id, p]))
  const pids = new Set()
  for (const it of items) {
    const p = byId.get(it.product_id)
    if (p?.fulfillment === 'printify' && p.print_provider_id) pids.add(p.print_provider_id)
  }
  return pids.size > 1 ? 'Printify items span multiple providers — they won\'t ship together. Use one provider per bundle.' : null
}

// ── Bundle editor modal ───────────────────────────────────────
function BundleModal({ token, bundle, allProducts, onClose, onSaved }) {
  const editing = !!bundle?.id
  const [f, setF] = useState({
    title: bundle?.title || '',
    description: bundle?.description || '',
    price: bundle?.price ?? '',
    category: bundle?.category || '',
    active: bundle?.active ?? false,
    sort: bundle?.sort ?? 0,
  })
  const [items, setItems] = useState(
    (bundle?.shop_bundle_items || [])
      .sort((a, b) => a.sort - b.sort)
      .map(bi => ({
        product_id: bi.product_id,
        variant_id: bi.variant_id || '',
        quantity: bi.quantity || 1,
      }))
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const providerWarning = checkProviders(items, allProducts)

  function addItem() {
    setItems(prev => [...prev, { product_id: '', variant_id: '', quantity: 1 }])
  }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }
  function setItem(idx, key, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val, ...(key === 'product_id' ? { variant_id: '' } : {}) } : it))
  }

  async function save() {
    if (!f.title.trim()) { setErr('Title is required'); return }
    if (!f.price || Number(f.price) <= 0) { setErr('Price is required'); return }
    const validItems = items.filter(it => it.product_id)
    if (validItems.length < 2) { setErr('Add at least 2 products'); return }
    if (providerWarning) { setErr(providerWarning); return }
    setSaving(true); setErr('')
    const payload = { ...f, price: Number(f.price), sort: Number(f.sort) || 0, items: validItems }
    const url = editing ? `/api/admin/shop/bundles/${bundle.id}` : '/api/admin/shop/bundles'
    const res = await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(payload),
    })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setErr(j.error || 'Save failed'); return }
    onSaved()
  }

  const printifyProducts = allProducts.filter(p => p.fulfillment === 'printify')
  const manualProducts   = allProducts.filter(p => p.fulfillment !== 'printify' && p.fulfillment !== 'external')

  function productOptions(currentId) {
    const groups = []
    if (printifyProducts.length) {
      groups.push(<optgroup key="printify" label="Printify (print-on-demand)">
        {printifyProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
      </optgroup>)
    }
    if (manualProducts.length) {
      groups.push(<optgroup key="manual" label="Self-fulfilled">
        {manualProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
      </optgroup>)
    }
    return groups
  }

  function variantOptions(productId) {
    const p = allProducts.find(p => p.id === productId)
    if (!p?.variants?.length) return null
    return p.variants.map(v => (
      <option key={v.printify_variant_id} value={String(v.printify_variant_id)}>{v.name || 'Default'} — {money(v.price)}</option>
    ))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 600, padding: '28px 30px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontFamily: ffH, fontSize: 22, margin: 0 }}>{editing ? 'Edit bundle' : 'New bundle'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer' }}>×</button>
        </div>

        <label style={lbl}>Title</label>
        <input style={inp} value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. The Archivist Box" />

        <label style={lbl}>Description</label>
        <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={f.description} onChange={e => set('description', e.target.value)} placeholder="What's in the bundle and why it's special" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Bundle price ($)</label>
            <input style={inp} type="number" min="0" step="0.01" value={f.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label style={lbl}>Category</label>
            <input style={inp} value={f.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Limited Edition" />
          </div>
          <div>
            <label style={lbl}>Sort order</label>
            <input style={inp} type="number" value={f.sort} onChange={e => set('sort', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
          <input type="checkbox" id="b-active" checked={f.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="b-active" style={{ fontFamily: ff, fontSize: 14, cursor: 'pointer' }}>Active (visible in shop)</label>
        </div>

        {/* Items */}
        <div style={{ margin: '20px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...lbl, margin: 0 }}>Bundle items</span>
          <button onClick={addItem} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 12px', fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>+ Add item</button>
        </div>

        {providerWarning && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '8px 12px', fontFamily: ff, fontSize: 13, color: '#7a5500', marginBottom: 10 }}>
            ⚠ {providerWarning}
          </div>
        )}

        {items.length === 0 && (
          <div style={{ fontFamily: ff, fontSize: 13, color: '#aaa', padding: '12px 0' }}>No items yet — click "+ Add item" to start.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
          {items.map((it, idx) => {
            const p = allProducts.find(p => p.id === it.product_id)
            const vOpts = it.product_id ? variantOptions(it.product_id) : null
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 60px 32px', gap: 8, alignItems: 'end' }}>
                <div>
                  {idx === 0 && <span style={lbl}>Product</span>}
                  <select style={{ ...inp, color: it.product_id ? '#1a1a1a' : '#aaa' }} value={it.product_id} onChange={e => setItem(idx, 'product_id', e.target.value)}>
                    <option value="">— Select product —</option>
                    {productOptions(it.product_id)}
                  </select>
                </div>
                <div>
                  {idx === 0 && <span style={lbl}>Variant</span>}
                  <select style={{ ...inp, color: it.variant_id ? '#1a1a1a' : '#aaa' }} value={it.variant_id} onChange={e => setItem(idx, 'variant_id', e.target.value)} disabled={!vOpts}>
                    <option value="">Default</option>
                    {vOpts}
                  </select>
                </div>
                <div>
                  {idx === 0 && <span style={lbl}>Qty</span>}
                  <input style={inp} type="number" min="1" max="20" value={it.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <button onClick={() => removeItem(idx)} style={{ width: 32, height: 40, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#c4364a', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {items.filter(i => i.product_id).length >= 2 && (
          <div style={{ background: '#f7f5f3', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontFamily: ff, fontSize: 13, color: '#555' }}>
            {(() => {
              const validItems = items.filter(i => i.product_id)
              const lineTotal = validItems.reduce((s, it) => {
                const p = allProducts.find(p => p.id === it.product_id)
                const v = p?.variants?.find(v => String(v.printify_variant_id) === String(it.variant_id))
                return s + (Number(v?.price || p?.price || 0) * (Number(it.quantity) || 1))
              }, 0)
              const bundlePrice = Number(f.price) || 0
              const savings = lineTotal - bundlePrice
              return (
                <>
                  <span>Individual total: <strong>{money(lineTotal)}</strong></span>
                  {bundlePrice > 0 && savings > 0 && <span style={{ marginLeft: 16, color: '#2d7a4f', fontWeight: 600 }}>Saves customer {money(savings)}</span>}
                  {bundlePrice > 0 && savings <= 0 && <span style={{ marginLeft: 16, color: '#c4364a' }}>Bundle price ≥ individual — consider a discount</span>}
                </>
              )
            })()}
          </div>
        )}

        {err && <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff0f2', border: '1px solid #f2b8c6', borderRadius: 8, fontFamily: ff, fontSize: 13.5, color: '#c4364a' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, background: BLACK, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontFamily: ff, fontSize: 15, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create bundle'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 20px', fontFamily: ff, fontSize: 15, cursor: 'pointer', color: '#555' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────
export default function BundlesSection({ token }) {
  const [bundles, setBundles] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | bundle object

  const load = useCallback(async () => {
    setLoading(true)
    const [br, pr] = await Promise.all([
      fetch('/api/admin/shop/bundles', { headers: { Authorization: `Bearer ${await token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/shop-products', { headers: { Authorization: `Bearer ${await token()}` } }).then(r => r.json()).catch(() => ({})),
    ])
    setBundles(br.bundles || [])
    setAllProducts(pr.products || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function toggleActive(b) {
    await fetch(`/api/admin/shop/bundles/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ active: !b.active }),
    })
    load()
  }

  async function deleteBundle(b) {
    if (!(await confirmDialog(`Delete "${b.title}"? This cannot be undone.`))) return
    await fetch(`/api/admin/shop/bundles/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: ffH, fontSize: 20, margin: '0 0 4px', color: BLACK }}>Bundles</h3>
          <p style={{ fontFamily: ff, fontSize: 13, color: '#888', margin: 0 }}>
            Group products that ship together. Printify items in a bundle must share a print provider.
          </p>
        </div>
        <button onClick={() => setModal('new')} style={{ background: PINK, color: BLACK, border: 'none', borderRadius: 8, padding: '10px 18px', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New bundle
        </button>
      </div>

      {loading ? (
        <div style={{ fontFamily: ff, fontSize: 14, color: '#aaa', padding: '40px 0', textAlign: 'center' }}>Loading…</div>
      ) : bundles.length === 0 ? (
        <div style={{ fontFamily: ff, fontSize: 14, color: '#aaa', padding: '60px 0', textAlign: 'center', fontStyle: 'italic' }}>
          No bundles yet. Create one to group products that ship together.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bundles.map(b => {
            const items = (b.shop_bundle_items || []).sort((a, b) => a.sort - b.sort)
            const providerWarning = checkProviders(items.map(i => ({ product_id: i.product_id })), items.map(i => i.shop_products).filter(Boolean))
            return (
              <div key={b.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: ffH, fontSize: 17, color: BLACK }}>{b.title}</span>
                    <span style={{ fontFamily: ff, fontSize: 13, fontWeight: 700, color: '#2d7a4f' }}>${Number(b.price).toFixed(2)}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: b.active ? '#f0faf4' : '#f5f5f5', color: b.active ? '#2d7a4f' : '#aaa', border: `1px solid ${b.active ? '#c6e8d2' : '#e0e0e0'}` }}>
                      {b.active ? 'Active' : 'Draft'}
                    </span>
                    {providerWarning && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#fff8e1', color: '#7a5500', border: '1px solid #ffe082' }}>⚠ Provider mismatch</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map((bi, idx) => {
                      const p = bi.shop_products
                      return p ? (
                        <span key={bi.id || idx} style={{ fontFamily: ff, fontSize: 12.5, color: '#555', background: '#f7f5f3', borderRadius: 6, padding: '3px 9px' }}>
                          {bi.quantity > 1 ? `${bi.quantity}× ` : ''}{p.name}
                        </span>
                      ) : null
                    })}
                  </div>
                  {b.description && <p style={{ fontFamily: ff, fontSize: 13, color: '#888', margin: '8px 0 0' }}>{b.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(b)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 12px', fontFamily: ff, fontSize: 12.5, cursor: 'pointer', color: '#555' }}>
                    {b.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setModal(b)} style={{ background: 'none', border: `1px solid ${PINK}`, borderRadius: 6, padding: '6px 12px', fontFamily: ff, fontSize: 12.5, cursor: 'pointer', color: '#c4364a' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteBundle(b)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 12px', fontFamily: ff, fontSize: 12.5, cursor: 'pointer', color: '#aaa' }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <BundleModal
          token={token}
          bundle={modal === 'new' ? null : modal}
          allProducts={allProducts}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
