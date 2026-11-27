'use client'
import {useEffect,useState} from 'react'
import {displayShopPrice,shopBundleSalePercent} from '../../../lib/shopSale'

export default function CampaignShopGridEditor({block,onChange}){
 const [products,setProducts]=useState([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;fetch('/api/shop/products',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(live)setProducts(data.products||[])}).catch(()=>{if(live)setError('Products could not load. Reopen this section to retry.')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[])
 const selected=block.products||[],currency=block.currency||'usd'
 const change=items=>onChange({...block,products:items})
 const input={width:'100%',boxSizing:'border-box',padding:'9px 10px',border:'1px solid #ddd',borderRadius:6,font:'inherit',background:'#fff',color:'#0a0a0a'}
 const button={padding:'6px 10px',border:'1px solid #ddd',borderRadius:5,background:'#fff',color:'#333',cursor:'pointer',font:'inherit'}
 const snapshot=p=>({id:p.id,name:p.name,variant:p.variant||'',image:p.images?.[0]||'',href:`/shop/${p.id}`,prices:Object.fromEntries(['usd','eur','gbp'].map(c=>[c,{amount:displayShopPrice(p,c),regular:displayShopPrice(p,c,true)}])),bundlePercent:shopBundleSalePercent(p)})
 function move(index,direction){const items=[...selected],next=index+direction;if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];change(items)}
 return <div style={{display:'grid',gap:12,fontSize:13}}>
  <p style={{margin:0,color:'#777'}}>Choose up to 12 products. Images and prices are captured when selected; remove and re-add a product to refresh it before sending.</p>
  <label>Layout<select aria-label="Shop grid layout" value={block.layout||'stacked'} onChange={e=>onChange({...block,layout:e.target.value})} style={input}><option value="stacked">Stacked — one product per row</option><option value="columns">Two columns on desktop</option></select></label>
  <label>Price currency<select aria-label="Shop grid currency" value={currency} onChange={e=>onChange({...block,currency:e.target.value})} style={input}><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select></label>
  <label>Product button label<input aria-label="Product button label" value={block.product_cta_label??'Shop now'} onChange={e=>onChange({...block,product_cta_label:e.target.value})} style={input}/></label>
  <div>{selected.map((p,i)=><div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #eee'}}>{p.image&&<img src={p.image} alt="" width="42" height="42" style={{objectFit:'cover'}}/>}<span style={{flex:1}}>{p.name}</span><button type="button" aria-label={`Move ${p.name} up`} disabled={!i} onClick={()=>move(i,-1)} style={button}>↑</button><button type="button" aria-label={`Move ${p.name} down`} disabled={i===selected.length-1} onClick={()=>move(i,1)} style={button}>↓</button><button type="button" aria-label={`Remove ${p.name}`} onClick={()=>change(selected.filter(item=>item.id!==p.id))} style={button}>Remove</button></div>)}</div>
  <label>Find products<input aria-label="Find products" placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)} style={input}/></label>
  {error&&<p role="alert">{error}</p>}{loading&&<p>Loading products…</p>}
  <div style={{maxHeight:240,overflowY:'auto',border:'1px solid #eee',borderRadius:6}}>{products.filter(p=>`${p.name} ${p.variant||''}`.toLowerCase().includes(search.toLowerCase())).map(p=><label key={p.id} style={{display:'flex',gap:10,alignItems:'center',padding:10,borderBottom:'1px solid #eee',cursor:'pointer'}}><input type="checkbox" aria-label={`Promote ${p.name}`} checked={selected.some(item=>item.id===p.id)} disabled={!selected.some(item=>item.id===p.id)&&selected.length>=12} onChange={e=>change(e.target.checked?[...selected,snapshot(p)]:selected.filter(item=>item.id!==p.id))}/>{p.images?.[0]&&<img src={p.images[0]} alt="" width="38" height="38" style={{objectFit:'cover'}}/>}<span>{p.name}{p.variant?` · ${p.variant}`:''}</span></label>)}{!loading&&!error&&!products.some(p=>`${p.name} ${p.variant||''}`.toLowerCase().includes(search.toLowerCase()))&&<p style={{padding:10}}>No matching products.</p>}</div>
 </div>
}
