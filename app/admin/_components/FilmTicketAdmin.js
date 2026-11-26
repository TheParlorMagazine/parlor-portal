'use client'
import { useEffect, useRef, useState } from 'react'
import { filmClubRequest } from '../../../lib/filmClubRequest'
import { ticketPricing, filmMoney, filmProfitability, FILM_CURRENCIES, currencyExponent } from '../../../lib/filmTicketPricing'
import styles from './FilmClubAdmin.module.css'
const api='/api/admin/film-club'
const localDate=value=>value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):''
export function FilmTicketSettings({screening,onChanged,onBusyChange}) {
 const [s,setS]=useState(screening),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>setS(screening),[screening])
 useEffect(()=>{onBusyChange?.(busy)},[busy,onBusyChange])
 const config=s.ticket_settings || {},dirty=JSON.stringify(s)!==JSON.stringify(screening)
 const set=(key,value)=>setS(old=>({...old,[key]:value}))
 const detail=(key,value)=>set('ticket_settings',{...config,[key]:value})
 let quote;try{quote=ticketPricing(s)}catch{}
 async function action(action,extra={}){
  setBusy(true);setMessage('')
  try{const result=await filmClubRequest(`${api}/commerce`,'POST',{eventId:s.event_id,action,...extra});setMessage(result.message || 'Saved.');await onChanged()}catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function importDetails(){
  setBusy(true);setMessage('')
  try{const {details}=await filmClubRequest(`${api}/import`,'POST',{url:s.ticket_url});setS(old=>({...old,event:{...old.event,title:old.event?.title || details.title || ''},ticket_settings:{...old.ticket_settings,...Object.fromEntries(Object.entries(details).filter(([key])=>key!=='title'&&!old.ticket_settings?.[key]))}}));setMessage(Object.keys(details).length?'Imported available details into empty fields. Review before saving.':'No film details found on this page. Enter them manually.')}catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 const moneyField=(key,label)=>{const scale=key.endsWith('_cents')?10**currencyExponent(s.currency || 'usd'):1;return <label key={key}>{label}<input type="number" min="0" step={scale>1||key.includes('percent')?'0.01':'1'} value={s[key]==null?'':s[key]/scale} onChange={e=>set(key,e.target.value===''?null:key.endsWith('_cents')?Math.round(Number(e.target.value)*scale):Number(e.target.value))}/></label>}
 const dateField=(key,label)=><label key={key}>{label}<input type="datetime-local" value={localDate(s.event?.[key])} onChange={e=>set('event',{...s.event,[key]:e.target.value?new Date(e.target.value).toISOString():null})}/></label>
 return <section className={styles.form}>
  <label>Title<input value={s.event?.title || ''} onChange={e=>set('event',{...s.event,title:e.target.value})}/></label>
  {dateField('starts_at','Starts')}{dateField('ends_at','Ends')}
  <p>Sales close when the event starts. The Stripe ticket product is archived automatically after it ends.</p>
  <label>Publication<select value={s.event?.status || 'draft'} onChange={e=>set('event',{...s.event,status:e.target.value})}>{['draft','published','cancelled'].map(status=><option key={status}>{status}</option>)}</select></label>
  <label>Public screening / ticket URL<input type="url" value={s.ticket_url || ''} onChange={e=>set('ticket_url',e.target.value)}/></label>
  <button disabled={busy||!s.ticket_url} onClick={importDetails}>Import film details</button>
  <label>Filmmaker<input value={config.filmmaker || ''} onChange={e=>detail('filmmaker',e.target.value)}/></label>
  <label>Synopsis<textarea rows={3} value={config.synopsis || ''} onChange={e=>detail('synopsis',e.target.value)}/></label>
  <h3>Tickets</h3>
  <label>Currency<select value={s.currency || 'usd'} onChange={e=>set('currency',e.target.value)}>{FILM_CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label>
  {moneyField('ticket_price_cents','Public ticket price')}{moneyField('member_discount_percent','Member discount (%)')}
  {quote&&<p>Member price: {filmMoney(quote.member,quote.currency)} · Save {filmMoney(quote.savings,quote.currency)}</p>}
  <p>Processing fees are pulled from Stripe after payment.</p>
  <details><summary>More film details</summary>
   {['provider','language','subtitles','qa','refund_policy'].map(key=><label key={key}>{{provider:'Provider',language:'Language',subtitles:'Subtitles',qa:'Q&A details',refund_policy:'Refund policy'}[key]}<textarea rows={2} maxLength={5000} value={config[key] || ''} onChange={e=>detail(key,e.target.value)}/></label>)}
   <label>Runtime (minutes)<input type="number" min="0" value={config.runtime_minutes ?? ''} onChange={e=>detail('runtime_minutes',e.target.value===''?null:Number(e.target.value))}/></label>
  </details>
  <details><summary>Capacity and viewing options</summary>
   {moneyField('member_ticket_limit','Maximum member tickets')}{moneyField('member_price_override_cents','Member price override (optional)')}
   <label>Maximum audience<input type="number" min="1" value={s.event?.capacity ?? ''} onChange={e=>set('event',{...s.event,capacity:e.target.value?Number(e.target.value):null})}/></label>
   <label>Format<select value={config.format || 'live'} onChange={e=>detail('format',e.target.value)}><option value="live">Live event</option><option value="flex">Flexible viewing window</option></select></label>
   {config.format==='flex'&&['viewing_start','viewing_end'].map(key=><label key={key}>{key==='viewing_start'?'Viewing starts':'Viewing ends'}<input type="datetime-local" value={localDate(s[key])} onChange={e=>set(key,e.target.value?new Date(e.target.value).toISOString():null)}/></label>)}
   <label>Access delivery<select value={config.fulfillment_method || 'individual'} onChange={e=>detail('fulfillment_method',e.target.value)}>{['individual','provider_link','private_license','other'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
  </details>
  <details><summary>Optional costs and revenue share</summary>
   {moneyField('acquisition_cost_cents','Cost per external ticket')}{moneyField('license_price_cents','Private license cost')}{moneyField('host_share_percent','Host revenue share (%)')}
   <label>Host share applies<select value={s.host_share_eligibility || 'unknown'} onChange={e=>set('host_share_eligibility',e.target.value)}><option value="unknown">Unconfirmed</option><option value="yes">Yes</option><option value="no">No</option></select></label>
   <label>Other expenses<input type="number" min="0" step="0.01" value={config.other_cost_cents==null?'':config.other_cost_cents/10**currencyExponent(s.currency || 'usd')} onChange={e=>detail('other_cost_cents',e.target.value?Math.round(Number(e.target.value)*10**currencyExponent(s.currency || 'usd')):null)}/></label>
  </details>
  <button disabled={busy||!quote} onClick={()=>action('settings',{settings:{...s,currency:s.currency || 'usd',ticket_settings:{...config,format:config.format || 'live',fulfillment_method:config.fulfillment_method || 'individual'}}})}>Save changes</button>
  <details><summary>Stripe ticket sales</summary>
   <p>{screening.stripe_archived?'Archived':screening.stripe_synced_version===screening.pricing_version?'Pricing connected':'Pricing needs synchronization'}</p>
   {dirty&&<p>Save changes before updating Stripe.</p>}
   <button disabled={busy||dirty} onClick={()=>action('sync')}>{screening.stripe_product_id?'Update Stripe pricing':'Connect ticket to Stripe'}</button>
   <button disabled={busy||(dirty&&!screening.sales_enabled)} onClick={()=>action('sales',{enabled:!screening.sales_enabled})}>{screening.sales_enabled?'Stop ticket sales':'Enable ticket sales'}</button>
   <button disabled={busy} onClick={()=>action('archive')}>Archive ticket product</button>
  </details>
  {message&&<p role="status">{message}</p>}
 </section>
}
export function FilmTicketManagement({screening,overview=false}) {
 const [tickets,setTickets]=useState([]),[error,setError]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState(''),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[patch,setPatch]=useState({}),[refund,setRefund]=useState(''),[quantity,setQuantity]=useState('')
 const [bulkIds,setBulkIds]=useState([]),[audit,setAudit]=useState([])
 const operation=useRef(null)
 async function load(){try{const r=await filmClubRequest(`${api}/tickets?eventId=${screening.event_id}`);setTickets(r.tickets);setAudit(r.audit || []);if(r.truncated)setError('Showing the first 5,000 tickets; export is subject to the same limit.')}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[screening.event_id])
 async function act(action){
  setBusy(true);setError('')
  try{const result=await filmClubRequest(`${api}/tickets`,'POST',{ticketId:selected?.id,action,patch,...(action==='bulk'?{ticketIds:bulkIds,eventId:screening.event_id}:{}),...(action==='refund'?{amount:Math.round(Number(refund)*10**currencyExponent(selected.currency)),operationId:operation.current ||= crypto.randomUUID(),confirm:true}:{})});setError(result.status || (result.refund?`Refund ${result.refund.status}`:'Saved.'));await load()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const rows=tickets.filter(t=>`${t.member?.full_name} ${t.member?.email} ${t.order?.order_number}`.toLowerCase().includes(search.toLowerCase())&&(!filter||t.payment_status===filter||t.fulfillment_status===filter))
 if(overview){let totals;try{totals=filmProfitability(screening,tickets,quantity===''?null:Number(quantity))}catch{return <p>Configure pricing to see profitability.</p>}
 const paid=tickets.filter(t=>['paid','partially_refunded'].includes(t.payment_status))
 return <section className={styles.card}><h2>Ticket sales and fulfillment</h2><p>Member tickets sold: {tickets.length} · Public tickets: {screening.public_tickets ?? 'Not reported'}</p>{screening.member_ticket_limit&&<><progress max={screening.member_ticket_limit} value={tickets.length}/><p>{tickets.length} / {screening.member_ticket_limit} member tickets</p></>}<p>Awaiting fulfillment: {paid.filter(t=>t.fulfillment_status!=='access_sent').length} · Access sent: {paid.filter(t=>t.fulfillment_status==='access_sent').length} · Refunded tickets: {tickets.filter(t=>t.refunded_cents>0).length}</p><p>Stripe processing fees: {Object.keys(totals.feesByCurrency).length?Object.entries(totals.feesByCurrency).map(([currency,amount])=>filmMoney(amount,currency)).join(' · '):totals.pendingFees?'Pending from Stripe':filmMoney(0,screening.currency)}{totals.pendingFees>0&&` (${totals.pendingFees} pending)`}</p><details><summary>Profitability comparison</summary><label>Scenario ticket count (blank = actual sales)<input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>{Object.entries({revenue:'Gross member revenue',refunds:'Refunds',stripeFees:'Actual Stripe fees',acquisition:'Estimated external acquisition cost',publicShare:'Estimated public ticket revenue share',individualWithoutShare:'Individual acquisition — no host share',individualWithShare:'Individual acquisition — with host share',privateLicense:'Private license scenario'}).map(([key,label])=><p key={key}>{label}: {totals[key]==null?'Not configured / not reported':filmMoney(totals[key],screening.currency)}</p>)}<p>Fees appear after Stripe reports them. Unavailable costs remain unreported.</p></details>{error&&<p role="alert">{error}</p>}</section>
 }
 return <section className={styles.card}><h2>Member ticket management</h2><input aria-label="Search tickets" placeholder="Search name, email or order" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter tickets" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All statuses</option>{['paid','refunded','partially_refunded','disputed','awaiting_access','access_sent','cancelled','expired','failed'].map(s=><option key={s}>{s}</option>)}</select><button onClick={async()=>{try{const{data:{session}}=await (await import('../../../lib/supabase')).createClient().auth.getSession();const response=await fetch(`${api}/tickets?eventId=${screening.event_id}&format=csv`,{headers:{Authorization:`Bearer ${session.access_token}`}});if(!response.ok)throw Error('Export failed');const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='film-tickets.csv';a.click();URL.revokeObjectURL(url)}catch(e){setError(e.message)}}}>Export CSV</button>
 <div style={{overflowX:'auto'}}><table className={styles.ticketTable}><thead><tr>{['Select','Member','Email','Screening','Eligibility at purchase','Purchased','Price paid','Order / Stripe reference','Payment','Fulfillment','Access email','Manage'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(t=><tr key={t.id}><td><input aria-label={`Select ${t.member?.email}`} type="checkbox" checked={bulkIds.includes(t.id)} onChange={e=>setBulkIds(ids=>e.target.checked?[...ids,t.id]:ids.filter(id=>id!==t.id))}/></td><td>{t.member?.full_name}</td><td>{t.member?.email}</td><td>{t.screening?.event?.title}</td><td>{t.eligibility?.plan} · {t.eligibility?.status}</td><td>{new Date(t.purchased_at).toLocaleString()}</td><td>{filmMoney(t.amount_cents,t.currency)}</td><td><a href="/admin?section=orders">{t.order?.order_number}</a><br/>{t.order?.stripe_payment_intent}</td><td>{t.payment_status}</td><td>{t.fulfillment_status}</td><td>Purchase: {t.purchase_email_status}<br/>Access: {t.access_email_status}</td><td><button onClick={()=>{setSelected(t);setPatch({fulfillment_status:t.fulfillment_status==='access_sent'?'access_assigned':t.fulfillment_status,fulfillment_notes:t.fulfillment_notes || '',access_expires_at:t.access_expires_at});operation.current=null}}>Manage</button></td></tr>)}</tbody></table></div>
 {selected&&<div className={styles.form}><h3>{selected.member?.full_name || selected.member?.email}</h3><p>Viewing credentials are private. Enter the provider-issued URL and instructions when assigning or replacing access.</p><select value={patch.fulfillment_status} onChange={e=>setPatch({...patch,fulfillment_status:e.target.value})}>{['awaiting_access','external_ticket_purchased','private_license_selected','access_assigned','cancelled','expired','failed'].map(s=><option key={s}>{s}</option>)}</select>{['viewing_url','instructions','fulfillment_notes','access_expires_at'].map(key=><label key={key}>{key.replaceAll('_',' ')}<input value={patch[key] || ''} onChange={e=>setPatch({...patch,[key]:e.target.value || null})}/></label>)}<button disabled={busy} onClick={()=>act('fulfillment')}>Save fulfillment / new access version</button>{<button disabled={busy||!bulkIds.length} onClick={()=>act('bulk')}>Assign current access to selected tickets</button>}<button disabled={busy} onClick={()=>act('send')}>Send viewing instructions</button><button disabled={busy} onClick={()=>act('remind')}>Send screening reminder</button><p>To explicitly resend, save a new access version with the authorized link, then send instructions. Retrying send for the same version does not duplicate an accepted email.</p><label>Refund amount ({selected.currency.toUpperCase()})<input type="number" min="0" step={currencyExponent(selected.currency)>0?'0.01':'1'} value={refund} onChange={e=>{setRefund(e.target.value);operation.current=null}}/></label><button disabled={busy||!refund} onClick={()=>{if(window.confirm('Refund this screening ticket payment? Membership is unchanged.'))act('refund')}}>Refund ticket payment</button></div>}
 {selected&&<details><summary>Ticket audit history</summary>{audit.filter(a=>a.ticket_id===selected.id).map((a,i)=><p key={i}>{new Date(a.created_at).toLocaleString()} · {a.action} · {a.actor_id || 'System'}</p>)}</details>}
 {error&&<p role="status">{error}</p>}
 </section>
}
