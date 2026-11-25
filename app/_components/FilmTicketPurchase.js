'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { filmMoney } from '../../lib/filmTicketPricing'
export async function filmTicketRequest(path,method='GET',body) {
 const {data:{session}}=await createClient().auth.getSession()
 const res=await fetch(path,{method,headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.access_token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)})
 const result=await res.json()
 if(!res.ok)throw new Error(result.error || 'Could not load screening tickets.')
 return result
}
export default function FilmTicketPurchase({screening,eligible=false,eventId}) {
 const [loaded,setLoaded]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const intent=useRef(null)
 useEffect(()=>{
  if(screening)return
  let current=true
  filmTicketRequest('/api/portal/film-club/screenings').then(result=>{if(current)setLoaded({...result,screening:result.screenings.find(s=>s.event_id===eventId)})}).catch(e=>{if(current)setError(e.message)})
  return()=>{current=false}
 },[eventId,screening])
 const s=screening || loaded?.screening,member=screening?eligible:loaded?.eligible
 async function purchase(){
  if(busy)return
  setBusy(true);setError('')
  try{intent.current ||= crypto.randomUUID();const result=await filmTicketRequest('/api/portal/film-club/checkout','POST',{eventId:s.event_id,requestId:intent.current});window.location.assign(result.url)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 if(!s)return error?<p role="alert">{error}</p>:<p>Loading ticket information…</p>
 const p=s.pricing
 return <section aria-label="Screening tickets">
  {p&&<p>Standard ticket: {member?<s>{filmMoney(p.standard,p.currency)}</s>:filmMoney(p.standard,p.currency)}</p>}
  {member&&p&&<><p><strong>Reader’s Circle price: {filmMoney(p.member,p.currency)}</strong></p><p>Configured discount: {p.percent}% · You save {filmMoney(p.savings,p.currency)}{p.member!==Math.round(p.standard*(100-p.percent)/100)?' (member price override applied)':''}</p><button className="ev-btn primary" style={{background:'#0a0a0a',color:'#fff'}} disabled={busy||!s.sales_open} onClick={purchase}>{busy?'Opening checkout…':s.sales_open?'Purchase member ticket':'Member ticket sales closed'}</button></>}
  {!member&&<>{s.ticket_url&&<a className="ev-btn primary" href={s.ticket_url} target="_blank" rel="noreferrer">Purchase ticket</a>}<p>Tickets provided by {s.provider}. <a href="/plans">Join the Reader’s Circle</a> for discounted screening tickets.</p></>}
  {s.refund_policy&&<p>Refund policy: {s.refund_policy}</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
export function FilmTicketOrders() {
 const [tickets,setTickets]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let current=true,attempts=0;const load=()=>filmTicketRequest('/api/portal/film-club/tickets').then(r=>{if(current){setTickets(r.tickets);setError('')}}).catch(e=>{if(current)setError(e.message)});load();const timer=new URLSearchParams(window.location.search).get('checkout')==='returned'?setInterval(()=>{if(++attempts>=12)clearInterval(timer);load()},5000):null;return()=>{current=false;if(timer)clearInterval(timer)}},[])
 return <section><h2>Your screening tickets</h2>{error&&<p role="alert">{error}</p>}{tickets?.length===0&&<p>No screening tickets purchased yet.</p>}{tickets?.map(t=><article key={t.id} style={{padding:16,border:'1px solid #e8d4d8',marginBottom:12}}><h3>{t.title}</h3><p>{filmMoney(t.amount_cents,t.currency)} · {t.payment_status.replaceAll('_',' ')} · {t.fulfillment_status.replaceAll('_',' ')}</p>{['paid','partially_refunded'].includes(t.payment_status)&&t.fulfillment_status==='awaiting_access'&&<p>Your ticket purchase is confirmed. You will receive your viewing link and screening instructions shortly.</p>}{t.viewing_url&&<><a href={t.viewing_url} target="_blank" rel="noreferrer">Open viewing link</a><p>{t.instructions}</p></>}{t.access_expires_at&&<p>Viewing access expires: {new Date(t.access_expires_at).toLocaleString()}</p>}<p><a href="/portal/orders">Order {t.order_number}</a>{t.forum_id&&<> · <a href={`/portal/forums/${t.forum_id}`}>Join the discussion</a></>}</p></article>)}</section>
}
