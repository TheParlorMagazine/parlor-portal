const{test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function load(file,mocks={},globals={}){const context=vm.createContext({Date,AbortSignal,console,...globals}),m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(spec=>new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context}));await m.evaluate();return m.namespace}
test('FX loader converts USD-base published quotes into dollar-per-euro rates and exposes the rate date',async()=>{
 let calls=0;const m=await load('lib/filmExchangeRates.js',{}, {fetch:async(url,options)=>{calls++;assert.match(url,/base=USD&symbols=EUR$/);assert.equal(options.next.revalidate,3600);return{ok:true,json:async()=>({base:'USD',date:'2026-11-25',rates:{EUR:.8}})}}})
 assert.equal((await m.loadFilmExchangeRates(['usd'])).rates.usd,1);assert.equal(calls,0)
 const fx=await m.loadFilmExchangeRates(['eur','eur','usd']);assert.equal(fx.rates.eur,1.25);assert.equal(fx.date,'2026-11-25');assert.equal(calls,1)
})
test('missing or failed quotes never become invented dollar amounts',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({base:'EUR',date:'2026-11-25',rates:{EUR:.8}})},{ok:true,json:async()=>({base:'USD',date:'2026-11-25',rates:{EUR:0}})}]){
  const m=await load('lib/filmExchangeRates.js',{}, {fetch:async()=>response}),fx=await m.loadFilmExchangeRates(['eur']);assert.equal(fx.unavailable,true);assert.equal(fx.rates.eur,undefined);assert.equal(fx.rates.usd,1)
 }
})
test('one combined USD net includes converted sharing and deducts actual USD settlement fees',async()=>{
 const pricing=await load('lib/filmTicketPricing.js'),report=await load('lib/filmRevenueReport.js',{'./filmTicketPricing':pricing,'./filmExchangeRates':{loadFilmExchangeRates(){}}})
 const row={screening:{event_id:'euro',currency:'eur'},totals:{stripeGross:1000,refunds:0,disputed:0,externalGross:10000,totalGross:11000,hostShare:4500,retainedRevenue:5500,acquisition:500,other:100,feesByCurrency:{usd:50},pendingFees:0,stripeCount:1}}
 const converted=report.convertFilmRevenueRow(row,{rates:{usd:1,eur:1.2}})
 assert.equal(converted.totals.hostShare,5400);assert.equal(converted.totals.net,5830);assert.equal(converted.screening.currency,'eur');assert.equal(converted.reportingCurrency,'usd')
 const pending=report.convertFilmRevenueRow(row,{rates:{usd:1}});assert.equal(pending.totals.net,null);assert.equal(pending.totals.hostShare,null)
 const jpy=report.convertFilmRevenueRow({...row,screening:{currency:'jpy'}},{rates:{usd:1,jpy:.0067}});assert.equal(jpy.totals.hostShare,3015)
})
