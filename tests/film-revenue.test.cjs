const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function load(file,mocks={}){const context=vm.createContext({Date,URL,Intl,console}),m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(spec=>new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context}));await m.evaluate();return m.namespace}
const screening={currency:'usd',public_gross_cents:10000,public_tickets:10,host_share_eligibility:'yes',host_share_percent:45,acquisition_cost_cents:500,ticket_settings:{other_cost_cents:100}}
const receipt={payment_status:'paid',currency:'usd',amount_cents:800,refunded_cents:0,stripe_processing_fee_cents:50,stripe_fee_currency:'usd',fulfillment_status:'access_sent'}
test('revenue combines actual Stripe receipts with external sales and separates host earnings, refunds and costs',async()=>{
 const m=await load('lib/filmTicketPricing.js'),totals=m.filmRevenueTotals(screening,[receipt,{...receipt,payment_status:'partially_refunded',amount_cents:600,refunded_cents:200},{...receipt,payment_status:'failed',amount_cents:9999}])
 assert.equal(totals.stripeGross,1400);assert.equal(totals.totalGross,11400);assert.equal(totals.hostShare,4500);assert.equal(totals.retainedRevenue,5700);assert.equal(totals.net,4500);assert.equal(totals.stripeCount,2)
 assert.equal(m.filmRevenueTotals({...screening,host_share_eligibility:'no'},[receipt]).retainedRevenue,800)
})
test('missing reports, pending fees, disputes and foreign currencies do not become fabricated revenue',async()=>{
 const m=await load('lib/filmTicketPricing.js')
 let t=m.filmRevenueTotals({...screening,public_gross_cents:null},[receipt]);assert.equal(t.totalGross,null);assert.equal(t.retainedRevenue,null)
 t=m.filmRevenueTotals(screening,[{...receipt,stripe_processing_fee_cents:null}]);assert.equal(t.net,null);assert.equal(t.pendingFees,1)
 t=m.filmRevenueTotals(screening,[{...receipt,payment_status:'disputed'}]);assert.equal(t.disputed,800);assert.equal(t.retainedRevenue,4500)
 t=m.filmRevenueTotals(screening,[{...receipt,currency:'eur'}]);assert.equal(t.totalGross,null);assert.equal(t.currencyMismatch,true)
})
test('overview reads past the ticket management cap and surfaces a later page failure',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),m=await load('lib/filmRevenueReport.js',{'./filmTicketPricing':pricing}),rows=Array.from({length:5501},(_,i)=>({...receipt,id:String(i)}));let ranges=0,fail=false
 const db={from(table){const q={select(){return this},eq(){return this},lte(){return this},order(){return this},single:async()=>({data:screening}),range:async(start,end)=>{ranges++;return fail&&start===500?{error:Error('outage')}:{data:rows.slice(start,end+1)}}};return q}}
 const totals=await m.filmRevenueReport(db,'event');assert.equal(totals.stripeCount,5501);assert.equal(totals.stripeGross,5501*800);assert.equal(ranges,12)
 fail=true;await assert.rejects(()=>m.filmRevenueReport(db,'event'),/all ticket receipts/)
})
test('saving settings clears a legacy member override and defaults language to English',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),m=await load('lib/filmTicketSettings.js',{'./filmTicketPricing':pricing})
 const saved=m.validateFilmSettings({...screening,ticket_price_cents:1000,member_discount_percent:20,member_price_override_cents:123,event:{title:'Film',status:'draft',starts_at:'2099-01-01'},ticket_settings:{format:'live',fulfillment_method:'individual'}})
 assert.equal(saved.member_price_override_cents,null);assert.equal(pricing.ticketPricing(saved).member,800);assert.equal(saved.ticket_settings.language,'English')
})
