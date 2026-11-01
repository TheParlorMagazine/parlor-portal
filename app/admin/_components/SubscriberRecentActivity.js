'use client'
import { useEffect,useState } from 'react'
const label={page_view:'Page visited',click:'Site click','email.opened':'Email opened','email.clicked':'Email link clicked','email.delivered':'Email delivered','email.bounced':'Email bounced','email.failed':'Email failed','email.complained':'Email spam complaint',profile_changed:'Profile updated',subscription_changed:'Subscription updated',subscribed:'Newsletter enabled',unsubscribed:'Newsletter disabled',shop_order:'Shop order',article_purchase:'Article purchased'}
const date=value=>new Date(value).toLocaleString()
function detail(event){
  const d=event.detail || {}
  if(event.kind==='shop_order'){
    let price='';try{price=new Intl.NumberFormat(undefined,{style:'currency',currency:d.currency || 'USD'}).format(Number(d.total_cents)/100)}catch{}
    return [d.status,price].filter(Boolean).join(' · ')
  }
  return d.fields?.map(f=>f.replaceAll('_',' ')).join(', ') || d.link || d.target || d.item_type || (d.source==='email_link'?'Unsubscribe link':d.source==='preferences'?'Account/admin preferences':'')
}
export default function SubscriberRecentActivity({memberId,supabase}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0)
  useEffect(()=>{setOffset(0)},[memberId])
  useEffect(()=>{
    let live=true;setError('');setData(null)
    async function load(){try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session)throw Error('Sign in again to view activity.')
      const r=await fetch(`/api/admin/subscribers/activity?member_id=${encodeURIComponent(memberId)}&offset=${offset}`,{cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}}),body=await r.json()
      if(!r.ok)throw Error(body.error || 'Activity could not be loaded.')
      if(live)setData(body)
    }catch(e){if(live)setError(e.message)}}load();return()=>{live=false}
  },[memberId,supabase,offset,revision])
  const counts=data?.counts || {}
  return <section style={{marginTop:28,borderTop:'1px solid #eee',paddingTop:20}} aria-label="Subscriber activity — last 30 days">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h3 style={{fontSize:16,margin:0}}>Activity · Last 30 days</h3><button type="button" onClick={()=>setRevision(n=>n+1)} style={{font:'inherit',background:'#fff',border:'1px solid #ddd',borderRadius:6,padding:'5px 10px',cursor:'pointer'}}>Refresh</button></div>
    <p style={{fontSize:12,color:'#888',lineHeight:1.5}}>Recorded activity only. Site visits and account changes begin after tracking is enabled. Email opens and clicks can include automated activity.</p>
    {error && <p role="alert" style={{color:'#9b3c42',fontSize:13}}>{error}</p>}
    {!data && !error && <p>Loading activity…</p>}
    {data && <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{[['Page visits','page_views'],['Site clicks','site_clicks'],['Email opens','email_opens'],['Email clicks','email_clicks'],['Shop orders','orders'],['Article purchases','article_purchases'],['Account/preference changes','account_changes']].map(([name,key])=><div key={key} style={{background:'#faf7f8',padding:10,borderRadius:7,fontSize:12,color:'#666'}}>{name}<br/><strong style={{fontSize:18,color:'#222'}}>{Number(counts[key] || 0)}</strong></div>)}</div>
      <h4 style={{fontSize:13,marginBottom:8}}>Most visited pages</h4>
      {!data.top_pages?.length?<p style={{fontSize:12,color:'#888'}}>No page visits recorded in this period.</p>:data.top_pages.map(p=><div key={p.path} style={{fontSize:12,overflowWrap:'anywhere',marginBottom:7}}>{p.path} <strong>· {p.views} visits</strong></div>)}
      <h4 style={{fontSize:13,marginBottom:8}}>Most clicked site links and actions</h4>
      {!data.top_clicks?.length?<p style={{fontSize:12,color:'#888'}}>No site clicks recorded in this period.</p>:data.top_clicks.map(c=><div key={c.target} style={{fontSize:12,overflowWrap:'anywhere',marginBottom:7}}>{c.target} <strong>· {c.clicks} clicks</strong></div>)}
      <h4 style={{fontSize:13,marginBottom:8}}>Recent activity</h4>
      {!data.events?.length && <p style={{fontSize:12,color:'#888'}}>No activity recorded in the last 30 days.</p>}
      {(data.events || []).map(e=><div key={e.source+':'+e.id} style={{padding:'9px 0',borderTop:'1px solid #eee',fontSize:12,lineHeight:1.5,overflowWrap:'anywhere'}}><strong>{label[e.kind] || e.kind}</strong> · {date(e.occurred_at)}<div>{e.label!==e.kind?e.label:''}</div><div style={{color:'#777'}}>{detail(e)}</div></div>)}
      <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}><button type="button" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Previous</button><span style={{fontSize:12}}>Page {Math.floor(offset/50)+1}</span><button type="button" disabled={!data.hasMore} onClick={()=>setOffset(n=>n+50)}>Next</button></div>
    </>}
  </section>
}
