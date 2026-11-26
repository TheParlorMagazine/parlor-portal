'use client'
import {useEffect,useState} from 'react'
import {filmClubRequest} from '../../../lib/filmClubRequest'
import {filmMoney} from '../../../lib/filmTicketPricing'
import styles from './FilmClubAdmin.module.css'
const money=value=>value==null?'Pending':filmMoney(value,'usd')
export default function FilmRevenueDashboard({revision=0,renderScreening}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[filter,setFilter]=useState('all'),[search,setSearch]=useState('')
 useEffect(()=>{
  let active=true;setLoading(true);setError('')
  filmClubRequest('/api/admin/film-club/tickets?overview=true').then(result=>{if(!result.dashboard)throw Error('Could not load Film Club revenue.');if(active)setData(result.dashboard)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[revision,refresh])
 if(loading&&!data)return <p role="status">Loading Film Club revenue…</p>
 if(error)return <div role="alert"><p>{error}</p><button className={styles.primary} onClick={()=>setRefresh(v=>v+1)}>Retry revenue report</button></div>
 if(!data)return null
 const total=data.byCurrency.find(group=>group.currency==='usd') || {net:0,hostShare:0,pendingShare:0}
 const rows=data.rows.filter(({screening:s})=>{
  const ended=!!s.event?.ends_at&&Date.parse(s.event.ends_at)<=Date.now()
  return (filter==='all'||(filter==='past'?ended:!ended))&&(s.event?.title || '').toLowerCase().includes(search.toLowerCase())
 })
 const foreignRates=Object.entries(data.exchange?.rates || {}).filter(([currency])=>currency!=='usd')
 return <div className={styles.revenueDashboard}>
  <div className={styles.heading}><div className={styles.revenueIntro}><h2>Revenue overview</h2><p>All screenings · Net revenue in USD</p></div><button disabled={loading} className={styles.reportRefresh} onClick={()=>setRefresh(v=>v+1)}>{loading?'Updating…':'Refresh totals'}</button></div>
  <div className={styles.revenueCards}>
   <section className={styles.revenueMetric} aria-label="Recorded net revenue"><div className={styles.revenueValue}><span>{money(total.net)}</span><small>USD</small></div><h3>Recorded net revenue</h3><p>{data.pendingScreenings>0?`${data.pendingScreenings} awaiting complete figures`:'After fees and costs'}</p></section>
   <section className={styles.revenueMetric} aria-label="Revenue share earned"><div className={styles.revenueValue}><span>{money(total.hostShare)}</span><small>USD</small></div><h3>Revenue share earned</h3><p>Included in net revenue</p></section>
   <section className={styles.revenueMetric} aria-label="Recorded ticket purchases"><div className={styles.revenueValue}>{data.tickets.toLocaleString()}</div><h3>Recorded ticket purchases</h3><p>Across {data.screenings} screenings</p></section>
   <section className={styles.revenueMetric} aria-label="Revenue sharing rates"><div className={styles.rateList}>{data.rates.length?data.rates.map(rate=><span key={rate.label}><strong>{rate.label}</strong><small>{rate.count} screening{rate.count===1?'':'s'}</small></span>):'—'}</div><h3>Revenue sharing rates</h3></section>
  </div>
  <div className={styles.revenueContext}>
   <p>Net includes revenue sharing, less payment fees, provider costs and expenses.</p>
   {foreignRates.length>0&&<p>{foreignRates.map(([currency,rate])=>`1 ${currency.toUpperCase()} = ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:4,maximumFractionDigits:4}).format(rate)}`).join(' · ')} · {data.exchange.provider}, {data.exchange.date}. Converted for this report.</p>}
   {data.exchange?.unavailable&&<p role="status">Currency conversion is pending. Unconverted amounts are excluded from the USD total.</p>}
   {data.pendingScreenings>0&&<p>{data.pendingScreenings} screening{data.pendingScreenings===1?'':'s'} awaiting complete reports, costs, fees or conversion. Totals include confirmed figures only.</p>}
  </div>
  <section className={styles.revenuePanel} aria-label="Screening revenue list">
   <div className={styles.revenuePanelHeader}><h3>Screenings <span>{data.screenings}</span></h3><div className={styles.reportFilters}><label className={styles.reportSearch}>Find a screening<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search screenings…"/></label><div className={styles.reportTimeframe} role="group" aria-label="Screening timeframe">{[['all','All screenings'],['upcoming','Current and upcoming'],['past','Past screenings']].map(([key,label])=><button key={key} aria-label={label} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{key==='all'?'All':key==='past'?'Past':'Upcoming'}</button>)}</div></div></div>
   <div className={styles.revenueList}>
    {rows.map(({screening:s,totals:t})=><details key={`screening-revenue:${s.event_id}`} className={styles.revenueItem}>
     <summary><span className={styles.revenueTitle}><strong>{s.event?.title || 'Untitled screening'}</strong><small>{s.event?.starts_at?new Date(s.event.starts_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Date TBA'} · {s.event?.status}{s.currency!=='usd'?` · ${s.currency.toUpperCase()} converted to USD`:''}</small></span><span className={styles.revenueRowNumbers}><strong>{money(t.net)} <small>USD net</small></strong><small>{s.host_share_eligibility==='yes'?`${s.host_share_percent}% share · ${money(t.hostShare)} included`:s.host_share_eligibility==='no'?'No revenue share':'Share not configured'}</small></span></summary>
     <div className={styles.revenueDetail}>
      <dl className={styles.costs}><div><dt>Net revenue (USD)</dt><dd>{money(t.net)}</dd></div><div><dt>Included revenue share</dt><dd>{money(t.hostShare)}</dd></div><div><dt>Stripe processing fees</dt><dd>{money(t.stripeFees)}</dd></div><div><dt>Provider ticket costs</dt><dd>{money(t.acquisition)}</dd></div><div><dt>Other expenses</dt><dd>{money(t.other)}</dd></div>{(t.refunds>0||t.disputed>0)&&<div><dt>Refund/dispute adjustments</dt><dd>{money((t.refunds || 0)+(t.disputed || 0))}</dd></div>}</dl>
      {t.net==null&&<p>Complete the provider sales report and ticket costs. Payment fees and currency conversion appear when available.</p>}
      {renderScreening?.(s)}
     </div>
    </details>)}
    {!rows.length&&<p className={styles.revenueEmpty}>No screenings match this view.</p>}
   </div>
  </section>
 </div>
}
