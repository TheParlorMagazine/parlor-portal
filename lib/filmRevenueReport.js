import { filmRevenueTotals, currencyExponent } from './filmTicketPricing'
import { loadFilmExchangeRates } from './filmExchangeRates'
export async function filmRevenueReport(db,eventId){
 if(!eventId)throw Error('Choose a screening.')
 const {data:screening,error}=await db.from('film_club_screenings').select('currency,public_gross_cents,public_tickets,host_share_percent,host_share_eligibility,acquisition_cost_cents,ticket_settings').eq('event_id',eventId).single()
 if(error||!screening)throw Error('Could not load screening revenue settings.')
 const tickets=[],snapshot=new Date().toISOString()
 // Overview totals cover all purchases, independently of the 5,000-row management/export cap.
 for(let offset=0;;offset+=500){
  const {data:page,error}=await db.from('film_club_tickets').select('id,amount_cents,currency,refunded_cents,payment_status,fulfillment_status,stripe_processing_fee_cents,stripe_fee_currency')
   .eq('event_id',eventId).lte('purchased_at',snapshot).order('purchased_at').order('id').range(offset,offset+499)
  if(error||!page)throw Error('Could not load all ticket receipts.')
  tickets.push(...page)
  if(page.length<500)break
 }
 return filmRevenueTotals(screening,tickets)
}

export async function filmRevenueDashboard(db,{loadRates=loadFilmExchangeRates}={}){
 const screenings=[],ticketsByEvent=new Map(),snapshot=new Date().toISOString()
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from('film_club_screenings').select('event_id,currency,public_gross_cents,public_tickets,host_share_percent,host_share_eligibility,acquisition_cost_cents,ticket_settings,ticket_url,ticket_reported_at,stripe_product_id,stripe_archived,event:events!inner(title,starts_at,ends_at,status,is_public)').order('event_id').range(offset,offset+499)
  if(error||!data)throw Error('Could not load all screenings.')
  screenings.push(...data);if(data.length<500)break
 }
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from('film_club_tickets').select('event_id,amount_cents,currency,refunded_cents,payment_status,fulfillment_status,stripe_processing_fee_cents,stripe_fee_currency').lte('purchased_at',snapshot).order('purchased_at').order('id').range(offset,offset+499)
  if(error||!data)throw Error('Could not load all ticket receipts.')
  for(const ticket of data){const rows=ticketsByEvent.get(ticket.event_id)||[];rows.push(ticket);ticketsByEvent.set(ticket.event_id,rows)}
  if(data.length<500)break
 }
 const rows=screenings.map(screening=>({screening:{...screening,ticket_settings:{other_cost_cents:screening.ticket_settings?.other_cost_cents ?? null}},totals:filmRevenueTotals(screening,ticketsByEvent.get(screening.event_id)||[])}))
 const currencies=rows.flatMap(row=>[row.screening.currency,...Object.keys(row.totals.feesByCurrency)])
 let fx;try{fx=await loadRates(currencies)}catch{fx={rates:{usd:1},date:null,provider:'ECB reference rates',unavailable:true}}
 const result=aggregateFilmRevenue(rows.map(row=>convertFilmRevenueRow(row,fx)))
 return{...result,currency:'usd',exchange:fx}

}
export function aggregateFilmRevenue(rows){
 const byCurrency={},rates={},result={screenings:rows.length,tickets:0,unreportedTicketCounts:0,pendingScreenings:0,byCurrency:[],rates:[],rows:[]}
 for(const row of rows){
  const s=row.screening,t=row.totals,c=row.reportingCurrency || s.currency
  const group=byCurrency[c] ||= {currency:c,net:0,hostShare:0,pendingNet:0,pendingShare:0}
  if(t.net==null){group.pendingNet++;result.pendingScreenings++}else group.net+=t.net
  if(t.hostShare==null)group.pendingShare++;else group.hostShare+=t.hostShare
  result.tickets+=t.stripeCount+(s.public_tickets || 0)
  if(s.public_tickets==null)result.unreportedTicketCounts++
  const rate=s.host_share_eligibility==='yes'?`${s.host_share_percent}%`:s.host_share_eligibility==='no'?'No share':'Not configured'
  rates[rate]=(rates[rate] || 0)+1
 }
 result.byCurrency=Object.values(byCurrency).sort((a,b)=>a.currency.localeCompare(b.currency))
 result.rates=Object.entries(rates).map(([label,count])=>({label,count}))
 result.rows=[...rows].sort((a,b)=>(b.screening.event?.starts_at || '').localeCompare(a.screening.event?.starts_at || ''))
 return result
}

export function convertFilmRevenueRow(row,fx){
 const t=row.totals,currency=row.screening.currency
 const convert=(amount,c=currency)=>{
  if(amount==null)return null
  if(amount===0)return 0
  const rate=c==='usd'?1:fx.rates?.[c]
  if(!Number.isFinite(rate)||rate<=0)return null
  return Math.round(amount/10**currencyExponent(c)*rate*100)
 }
 const converted={...t}
 for(const key of ['stripeGross','refunds','disputed','externalGross','totalGross','hostShare','retainedRevenue','acquisition','other'])converted[key]=convert(t[key])
 const fees=Object.entries(t.feesByCurrency).map(([c,fee])=>convert(fee,c))
 converted.stripeFees=t.pendingFees||fees.some(fee=>fee==null)?null:fees.reduce((sum,fee)=>sum+fee,0)
 converted.feesByCurrency=converted.stripeFees==null?{}:{usd:converted.stripeFees}
 converted.net=[converted.retainedRevenue,converted.stripeFees,converted.acquisition,converted.other].some(v=>v==null)?null:converted.retainedRevenue-converted.stripeFees-converted.acquisition-converted.other
 return{...row,totals:converted,reportingCurrency:'usd',sourceCurrency:currency}
}
