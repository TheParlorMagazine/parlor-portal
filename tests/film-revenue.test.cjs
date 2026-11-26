const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function load(file,mocks={}){mocks={'./filmExchangeRates':{loadFilmExchangeRates:async()=>({rates:{usd:1,eur:1.1},date:'2026-11-25',provider:'ECB reference rates',unavailable:false})},...mocks};const context=vm.createContext({Date,URL,Intl,console}),m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(spec=>new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context}));await m.evaluate();return m.namespace}
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
test('all-screening aggregation includes revenue sharing in net, converts currencies to USD and shows every configured rate',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),m=await load('lib/filmRevenueReport.js',{'./filmTicketPricing':pricing})
 const make=(id,currency,share,rate,report=10000)=>{const s={...screening,event_id:id,currency,host_share_eligibility:share,host_share_percent:rate,public_gross_cents:report,event:{title:id,starts_at:id==='past'?'2000-01-01':'2099-01-01'}};return{screening:s,totals:pricing.filmRevenueTotals(s,[{...receipt,currency,stripe_fee_currency:currency}])}}
 const source=[make('past','usd','yes',45),make('future','usd','no',0),make('europe','eur','yes',20),make('pending','usd','yes',30,null)],rows=source.map(row=>m.convertFilmRevenueRow(row,{rates:{usd:1,eur:1.1}})),r=m.aggregateFilmRevenue(rows)
 assert.equal(r.screenings,4);assert.equal(r.rows.length,4);assert.equal(r.pendingScreenings,1)
 const usd=r.byCurrency.find(c=>c.currency==='usd'),eur=r.byCurrency.find(c=>c.currency==='eur')
 assert.equal(usd.net,rows[0].totals.net+rows[1].totals.net+rows[2].totals.net);assert.equal(usd.hostShare,6700);assert.equal(usd.pendingNet,1);assert.equal(eur,undefined)
 assert.deepEqual(Array.from(r.rates,x=>x.label).sort(),['20%','30%','45%','No share'].sort())
})
test('all-screening report paginates both screenings and receipts and refuses partial reports on failure',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),m=await load('lib/filmRevenueReport.js',{'./filmTicketPricing':pricing}),screens=Array.from({length:501},(_,i)=>({...screening,event_id:String(i),event:{title:String(i),starts_at:'2099-01-01'}})),tickets=Array.from({length:5501},(_,i)=>({...receipt,event_id:String(i%501)}));let fail=false
 const db={from(table){return{select(){return this},lte(){return this},order(){return this},range:async(start,end)=>fail&&start===500?{error:Error('outage')}:{data:(table==='film_club_screenings'?screens:tickets).slice(start,end+1)}}}}
 const r=await m.filmRevenueDashboard(db);assert.equal(r.rows.length,501);assert.equal(r.tickets,5501+5010)
 fail=true;await assert.rejects(()=>m.filmRevenueDashboard(db),/all screenings/)
})
