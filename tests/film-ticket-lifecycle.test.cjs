const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
async function load(file,mocks={}){const context=vm.createContext({Date,URL,console}),m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(spec=>new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context}));await m.evaluate();return m.namespace}
test('sales close at event start, independent of obsolete manually entered deadlines',async()=>{
 const m=await load('lib/filmTicketLifecycle.js'),s={sales_enabled:true,event:{status:'published',is_public:true,starts_at:'2030-01-01'}}
 assert.equal(m.filmSalesOpen(s,Date.parse('2029-12-31')),true)
 assert.equal(m.filmSalesOpen(s,Date.parse('2030-01-01')),false)
 assert.equal(m.filmSalesOpen({...s,stripe_archived:true},0),false)
 assert.equal(m.filmHasEnded({event:{ends_at:'2030-01-02'}},Date.parse('2030-01-02')),true)
})
test('finished screening archival closes locally first and retries an uncertain Stripe outcome',async()=>{
 const m=await load('lib/filmTicketLifecycle.js'),calls=[],s={event_id:'event',stripe_product_id:'prod'}
 const q={select(){return this},eq(){return this},not(){return this},lte(){return this},order(){return this},limit:async()=>({data:[s]}),update(){calls.push('stop');return this},then(resolve){resolve({})}}
 const db={from:()=>q,rpc:async()=>{calls.push('record');return{}}},stripe={products:{retrieve:async()=>({metadata:{screening_id:'event'}}),update:async()=>calls.push('product')},prices:{list:()=>({async *[Symbol.asyncIterator](){yield{id:'price'}}}),update:async()=>calls.push('price')}}
 assert.equal((await m.archiveFinishedFilmProducts(db,stripe)).archived,1);assert.deepEqual(calls,['stop','price','product','record'])
 stripe.products.update=async()=>{throw Error('timeout')};calls.length=0
 assert.equal((await m.archiveFinishedFilmProducts(db,stripe)).failed,1);assert.ok(!calls.includes('record'))
 stripe.products.retrieve=async()=>({metadata:{screening_id:'unrelated'}});calls.length=0
 assert.equal((await m.archiveFinishedFilmProducts(db,stripe)).failed,1);assert.deepEqual(calls,['stop'])
})
test('actual Stripe fees preserve settlement currency; delayed balance transactions stay pending',async()=>{
 const m=await load('lib/filmTicketFees.js'),updates=[],db={from:()=>({update(v){updates.push(v);return this},eq:async()=>({})})}
 assert.equal((await m.syncFilmTicketFee(db,{}, {id:'ticket'},{balance_transaction:null})).pending,true);assert.equal(updates.length,0)
 const result=await m.syncFilmTicketFee(db,{},{id:'ticket'},{balance_transaction:{fee:42,currency:'eur'}})
 assert.equal(result.fee,42);assert.equal(updates[0].stripe_fee_currency,'eur')
})
test('film metadata reads structured Movie fields and rejects private or untrusted URLs',async()=>{
 const {parseDocument}=require('htmlparser2'),m=await load('lib/filmMetadata.js',{'htmlparser2':{parseDocument}})
 const fields=m.parseFilmMetadata('<meta property="og:title" content="Fallback"><script type="application/ld+json">{"@type":"ScreeningEvent","workPresented":{"@type":"Movie","name":"Film","director":{"name":"Director"},"duration":"PT1H32M","inLanguage":"English"}}</script>')
 assert.equal(fields.title,'Film');assert.equal(fields.runtime_minutes,92);assert.equal(fields.filmmaker,'Director');assert.equal(fields.language,'English')
 for(const url of ['http://kinema.com/events/film','https://kinema.com.evil.test/events/film','https://kinema.com/events/film?token=secret','https://127.0.0.1/events/film','https://kinema.com/watch/private'])assert.throws(()=>m.publicFilmUrl(url))
 assert.equal(m.publicFilmUrl('https://kinema.com/events/film').hostname,'kinema.com')
})
test('settlement fees in another currency never produce a misleading net profit',async()=>{
 const m=await load('lib/filmTicketPricing.js'),s={currency:'usd',ticket_price_cents:1000,member_discount_percent:20,acquisition_cost_cents:100,host_share_percent:0},tickets=[{payment_status:'paid',amount_cents:800,refunded_cents:0,stripe_processing_fee_cents:42,stripe_fee_currency:'eur'}]
 const totals=m.filmProfitability(s,tickets);assert.equal(totals.stripeFees,null);assert.equal(totals.individualWithoutShare,null);assert.equal(totals.feesByCurrency.eur,42)
})
test('settings ignore obsolete deadlines and derive live viewing from event times',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),m=await load('lib/filmTicketSettings.js',{'./filmTicketPricing':{ticketPricing:pricing.ticketPricing}})
 const input={currency:'usd',ticket_price_cents:1000,member_discount_percent:20,host_share_percent:0,host_share_eligibility:'unknown',sales_deadline:'invalid obsolete date',event:{title:'Film',status:'draft',starts_at:'2030-01-01T19:00:00Z',ends_at:'2030-01-01T21:00:00Z'},ticket_settings:{format:'live',fulfillment_method:'individual'}}
 const saved=m.validateFilmSettings(input);assert.equal(saved.sales_deadline,input.event.starts_at);assert.equal(saved.viewing_start,input.event.starts_at);assert.equal(saved.viewing_end,input.event.ends_at)
})
