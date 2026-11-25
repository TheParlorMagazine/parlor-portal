const{test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
async function load(file,mocks={},env={}){
 const ctx=vm.createContext({Response,Request,Headers,URL,Date,Intl,console,process:{env}}),cache=new Map()
 async function module(path){if(cache.has(path))return cache.get(path);const m=new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{context:ctx});cache.set(path,m);await m.link(async spec=>{
  if(mocks[spec])return new vm.SyntheticModule(Object.keys(mocks[spec]),function(){for(const[k,v]of Object.entries(mocks[spec]))this.setExport(k,v)},{context:ctx})
  if(spec.endsWith('filmTicketPricing'))return module('lib/filmTicketPricing.js')
  if(spec.endsWith('filmTicketSettings'))return module('lib/filmTicketSettings.js')
  throw Error('Unexpected import '+spec)
 });return m}
 const m=await module(file);await m.evaluate();return m.namespace
}
const screening={event_id:'screening',currency:'usd',ticket_price_cents:999,member_discount_percent:20,member_price_override_cents:null,member_ticket_limit:10,acquisition_cost_cents:999,host_share_percent:45,license_price_cents:10000,license_threshold:23,pricing_version:1,stripe_synced_version:1,stripe_product_id:'prod_ticket',stripe_price_id:'price_ticket',provider_authorized:true,sales_enabled:true,sales_deadline:'2099-01-01',shop_product_id:'product',ticket_settings:{stripe_fee_percent:0,stripe_fee_fixed_cents:0},event:{title:'Documentary',status:'published',is_public:true}}
test('integer pricing, currency exponents, overrides and financial inputs',async()=>{
 const m=await load('lib/filmTicketPricing.js')
 assert.equal(m.ticketPricing(screening).member,799);assert.equal(m.ticketPricing({...screening,member_discount_percent:15}).member,849)
 assert.equal(m.ticketPricing({...screening,member_price_override_cents:750}).member,750)
 assert.equal(m.currencyExponent('jpy'),0);assert.match(m.filmMoney(999,'jpy'),/999/)
 for(const patch of [{ticket_price_cents:0},{member_discount_percent:101},{member_discount_percent:20.001},{currency:'xxx'},{member_price_override_cents:1000}])assert.throws(()=>m.ticketPricing({...screening,...patch}))
 const estimates=m.filmProfitability(screening,[{payment_status:'paid',amount_cents:799,refunded_cents:0}])
 assert.equal(estimates.individualWithoutShare,-200);assert.equal(estimates.individualWithShare,250);assert.equal(estimates.shareEligibility,'unknown');assert.equal(estimates.publicShare,null)
})
async function checkout({member={id:'member',plan:'Reader Circle',subscription_status:'active'},user={id:'member',email_confirmed_at:'verified'},s=screening,price={},enabled=true}={}){
 const calls=[];const db={from:table=>({select(){return this},eq(){return this},single:async()=>({data:table==='members'?member:s})})}
 class Stripe{constructor(){this.prices={retrieve:async()=>({id:'price_ticket',active:true,currency:'usd',unit_amount:799,product:'prod_ticket',...price})}}}
 const m=await load('app/api/portal/film-club/checkout/route.js',{'stripe':{default:Stripe},'../../../../../lib/apiAuth':{requireUser:async()=>user,serviceClient:()=>db},'../../../../../lib/stripeCustomer':{ensureStripeCustomer:async()=> 'cus_existing'},'../../../../../lib/checkoutReservations':{createReservedCheckout:async args=>{calls.push(args);return{url:'https://checkout.stripe.com/test'}}},'../../../../../lib/checkoutOrigin':{checkoutOrigin:()=> 'https://theparlormagazine.com'}},{FILM_CLUB_TICKET_SALES_ENABLED:enabled?'true':'false'})
 return{calls,post:()=>m.POST(new Request('https://local.test',{method:'POST',body:JSON.stringify({eventId:'screening',requestId:'request',price:1,discount:99,member:true})}))}
}
test('checkout uses server price, existing customer and eligibility snapshot, ignores client pricing',async()=>{
 const api=await checkout();assert.equal((await api.post()).status,200);assert.equal((await api.post()).status,200);assert.equal(JSON.stringify(api.calls[0].params),JSON.stringify(api.calls[1].params))
 const p=api.calls[0].params;assert.equal(p.line_items[0].price,'price_ticket');assert.equal(p.metadata.amount_cents,'799');assert.equal(p.metadata.eligible_plan,'Reader Circle');assert.equal(p.customer,'cus_existing');assert.equal(p.mode,'payment');assert.equal(p.shipping_options,undefined)
})
test('free, expired, unverified and closed/unsynchronized ticket sales cannot checkout',async()=>{
 for(const options of [{user:null},{user:{id:'member'}},{member:{plan:'Free',subscription_status:'active'}},{member:{plan:'Reader Circle',subscription_status:'expired'}},{member:{plan:'Reader Circle',subscription_status:'past_due'}},{enabled:false},{s:{...screening,provider_authorized:false}},{s:{...screening,sales_enabled:false}},{s:{...screening,sales_deadline:'2000-01-01'}},{s:{...screening,stripe_synced_version:0}},{price:{unit_amount:1}},{price:{active:false}}]){const api=await checkout(options);assert.notEqual((await api.post()).status,200);assert.equal(api.calls.length,0)}
})
test('public projection includes price/provider but excludes costs, authorization notes and viewing links',async()=>{
 const q={select(){return this},eq(){return this},then(resolve){resolve({data:[{...screening,ticket_url:'https://kinema.com/tickets',ticket_settings:{provider:'Kinema',authorization_note:'private',viewing_url:'secret'}}]})}}
 const api=await load('app/api/portal/film-club/screenings/route.js',{'../../../../../lib/apiAuth':{requireUser:async()=>null,serviceClient:()=>({from:()=>q})}},{FILM_CLUB_TICKET_SALES_ENABLED:'true'})
 const response=await api.GET({});assert.equal(response.status,200);const result=await response.json();assert.equal(result.eligible,false);assert.equal(result.screenings[0].pricing.member,799);assert.equal(result.screenings[0].provider,'Kinema');assert.ok(!JSON.stringify(result).includes('private'));assert.ok(!JSON.stringify(result).includes('secret'));assert.equal(result.screenings[0].acquisition_cost_cents,undefined)
})
async function commerce(db={},stripeMail=async()=>({trackingStatus:'accepted'})){
 return load('lib/filmTicketCommerce.js',{'./apiAuth':{serviceClient:()=>db},'./stripeEmail':{sendStripeEmailOnce:stripeMail},'./sendEmail':{deliver:async()=>({data:{id:'mail'}})},'./emails':{renderDefaultEmail:()=>'<p>Film ticket</p>'}})
}
test('viewing access requires authorized, fulfilled paid tickets and enforces start/end times',async()=>{
 const m=await commerce(),ticket={payment_status:'paid',fulfillment_status:'access_sent',viewing_url:'https://provider.invalid/private'},s={provider_authorized:true}
 assert.equal(m.ticketAccessAvailable(ticket,s),true)
 for(const [t,c]of [[{...ticket,payment_status:'refunded'},s],[{...ticket,payment_status:'disputed'},s],[{...ticket,fulfillment_status:'awaiting_access'},s],[ticket,{provider_authorized:false}],[ticket,{...s,viewing_start:'2099-01-01'}],[ticket,{...s,viewing_end:'2000-01-01'}],[{...ticket,access_expires_at:'2000-01-01'},s]])assert.equal(m.ticketAccessAvailable(t,c),false)
})
test('product sync recovers existing Stripe price using durable operation metadata',async()=>{
 const calls=[],op={id:'operation',snapshot:{currency:'usd',member:799,title:'Documentary'}}
 const db={from:()=>({upsert(){return this},select(){return this},maybeSingle:async()=>({data:op})}),rpc:async(name,args)=>{calls.push([name,args]);return{}}}
 const stripe={products:{retrieve:async()=>({id:'product',metadata:{screening_id:'screening'}}),update:async()=>({})},prices:{list:()=>({async *[Symbol.asyncIterator](){yield{id:'existing',unit_amount:799,currency:'usd',metadata:{operation_id:'operation'}}}}),create:async()=>{throw Error('duplicate price')},update:async()=>({})}}
 const m=await commerce(db);assert.equal((await m.synchronizeFilmProduct(db,stripe,screening)).priceId,'existing');assert.equal(calls[0][0],'finish_film_price_sync')
})
test('screening order refund targets its payment, preserves subscriptions and reuses operation identity',async()=>{
 const order={id:'order',stripe_payment_intent:'pi_ticket',metadata:{kind:'film_screening_ticket'}},ticket={id:'ticket',order,amount_cents:799,currency:'usd'},calls=[]
 const db={from:()=>({select(){return this},eq(){return this},single:async()=>({data:ticket})})}
 const stripe={paymentIntents:{retrieve:async id=>{assert.equal(id,'pi_ticket');return{id,currency:'usd',amount:799,latest_charge:{paid:true,amount:799,amount_refunded:0}}}},refunds:{list:async()=>({data:[]}),create:async(args,options)=>{calls.push([args,options]);return{id:'re_ticket',status:'succeeded'}}}}
 const m=await load('lib/subscriberActions.js',{'./plans':{hasEndedPaidMembership:()=>false}})
 const body={ticketId:'ticket',operationId:'00000000-0000-4000-8000-000000000001',amount:200,confirm:true}
 assert.equal((await m.refundScreeningOrder(db,stripe,{id:'admin'},body)).id,'re_ticket');assert.equal(calls[0][0].payment_intent,'pi_ticket');assert.equal(calls[0][0].amount,200);assert.match(calls[0][1].idempotencyKey,/film-refund:ticket:/)
 await assert.rejects(()=>m.refundScreeningOrder(db,stripe,{id:'admin'},{...body,amount:800}))
 stripe.refunds.list=async()=>({data:[{id:'existing',metadata:{parlor_operation_id:body.operationId}}]})
 assert.equal((await m.refundScreeningOrder(db,stripe,{id:'admin'},body)).id,'existing');assert.equal(calls.length,1)
})
test('paid ticket webhook validates current Stripe session and creates entitlement once through existing orders',async()=>{
 const calls=[],ticket={id:'ticket',order_id:'order',member_id:'member',event_id:'screening',payment_status:'paid',refunded_cents:0,amount_cents:799,currency:'usd'}
 const session={id:'cs_ticket',mode:'payment',payment_status:'paid',status:'complete',metadata:{kind:'film_screening_ticket',reservation_id:'reservation',userId:'member'},client_reference_id:'member',amount_total:799,currency:'usd',payment_intent:'pi_ticket',customer_details:{email:'reader@example.invalid'}}
 const db={rpc:async(name,args)=>{calls.push(name);return{data:ticket}},from:table=>({select(){return this},eq(){return this},single:async()=>({data:table==='checkout_reservations'?{id:'reservation',kind:'film_screening_ticket',member_id:'member',stripe_params:{currency:'usd',metadata:{amount_cents:'799'}}}:table==='orders'?{stripe_payment_intent:'pi_ticket'}:table==='members'?{email:'reader@example.invalid'}:{...screening,event:{title:'Documentary'}}}),update(){return this},then(resolve){resolve({})}})}
 const stripe={checkout:{sessions:{retrieve:async()=>session}},paymentIntents:{retrieve:async()=>({latest_charge:{paid:true,amount:799,amount_refunded:0}})}}
 const m=await commerce(db)
 await m.fulfillFilmTicket(stripe,{id:session.id});assert.ok(calls.includes('record_paid_film_ticket'));assert.ok(calls.includes('observe_checkout'))
 session.amount_total=1;await assert.rejects(()=>m.fulfillFilmTicket(stripe,{id:session.id}),/identity or amount/)
 session.payment_status='unpaid';assert.equal(await m.fulfillFilmTicket(stripe,{id:session.id}),null)
})
test('member ticket API scopes ownership and omits internal notes and unfulfilled credentials',async()=>{
 const filters=[]
 const db={from:()=>({select(){return this},eq(key,value){filters.push([key,value]);return this},order:async()=>({data:[{id:'ticket',member_id:'member',event_id:'screening',order_id:'order',order:{order_number:'PARLOR-1000'},payment_status:'paid',fulfillment_status:'awaiting_access',amount_cents:799,currency:'usd',viewing_url:'https://private.invalid/access',instructions:'private instructions',fulfillment_notes:'admin only',eligibility:{internal:'private'},screening:{event:{title:'Documentary'}}}]})})}
 const m=await load('app/api/portal/film-club/tickets/route.js',{'../../../../../lib/apiAuth':{requireUser:async()=>({id:'member'}),serviceClient:()=>db},'../../../../../lib/filmTicketCommerce':{ticketAccessAvailable:()=>false}})
 const response=await m.GET({}),text=await response.text();assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(filters,[['member_id','member']]);assert.ok(!text.includes('private'));assert.ok(!text.includes('admin only'));assert.ok(text.includes('awaiting_access'))
})
test('ticket admin rejects anonymous and ordinary members before reading ticket records',async()=>{
 for(const [user,role,status]of [[null,null,401],[{id:'member'},'member',403]]){
  const m=await load('app/api/admin/film-club/tickets/route.js',{'stripe':{default:class{}},'../../../../../lib/apiAuth':{requireUser:async()=>user,memberOf:async()=>({role}),serviceClient:()=>({from(){throw Error('Ticket read without permission')}})},'../../../../../lib/filmTicketCommerce':{refreshFilmPayment(){},sendFilmEmail(){}},'../../../../../lib/subscriberActions':{refundScreeningOrder(){}}})
  assert.equal((await m.GET(new Request('https://local.test'))).status,status)
 }
})
test('Stripe product/price creation is recoverable after local synchronization failure',async()=>{
 const op={id:'durable-op',snapshot:{member:799,currency:'usd',title:'Documentary'}},products=[],prices=[];let fail=true
 const db={from:()=>({upsert(){return this},select(){return this},maybeSingle:async()=>({data:op})}),rpc:async()=>fail?{error:{message:'database unavailable'}}:{}}
 const stripe={products:{retrieve:async()=>{if(!products.length)throw Object.assign(Error('missing'),{statusCode:404});return products[0]},create:async p=>{products.push(p);return p},update:async()=>({})},prices:{list:()=>({async *[Symbol.asyncIterator](){for(const p of prices)yield p}}),create:async(p,options)=>{assert.equal(options.idempotencyKey,'film-price-durable-op');const result={...p,id:'price_new'};prices.push(result);return result},update:async()=>({})}}
 const m=await commerce(db)
 await assert.rejects(()=>m.synchronizeFilmProduct(db,stripe,screening),/could not be linked/);fail=false
 assert.equal((await m.synchronizeFilmProduct(db,stripe,screening)).priceId,'price_new');assert.equal(products.length,1);assert.equal(prices.length,1)
})
