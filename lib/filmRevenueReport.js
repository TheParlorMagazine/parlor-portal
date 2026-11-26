import { filmRevenueTotals } from './filmTicketPricing'
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
