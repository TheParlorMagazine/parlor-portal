const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs')
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
async function fixture({weight=3,env={},response={rates:[{amount:'7.25',currency:'USD',provider:'USPS'}]},ok=true}={}) {
 const requests=[]
 const context=vm.createContext({AbortSignal,console:{error(){}},process:{env:{SHIPPO_API_KEY:'test',SHIP_FROM_STREET:'Test street',SHIP_FROM_CITY:'Test city',SHIP_FROM_STATE:'VA',SHIP_FROM_ZIP:'22026',SHIP_FROM_COUNTRY:'US',...env}},fetch:async(url,opts)=>{requests.push(JSON.parse(opts.body));return {ok,status:ok?200:401,json:async()=>response}}})
 async function load(file){const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await m.link(async spec=>{
  if(spec==='./shopSnapshot')return load('lib/shopSnapshot.js')
  const values=spec==='./geo'?{priceForCurrency:p=>p.price}:{printifyConfigured:()=>false,resolveShopId:async()=>'',calcShipping:async()=>({standard:500})}
  return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context})
 });await m.evaluate();return m}
 const shipping=(await load('lib/shopShipping.js')).namespace,prepare=(await load('lib/prepareShopCart.js')).namespace
 const products=[{id:id(1),name:'A',price:8,weight_oz:weight,fulfillment:'manual',active:true},{id:id(2),name:'B',price:12,weight_oz:5,fulfillment:'manual',active:true}]
 const bundle={id:id(3),name:'Bundle',price:20,active:true,shop_bundle_items:[{quantity:2,shop_products:products[0]},{quantity:1,shop_products:products[1]}]}
 const db={from(table){const q={ids:[],select(){return q},in(k,v){q.ids=v;return q},eq(){return q},then(resolve){return Promise.resolve({data:(table==='shop_bundles'?[bundle]:products).filter(p=>q.ids.includes(p.id))}).then(resolve)}};return q}}
 async function quote(items){const p=await prepare.prepareShopCart(db,items,'usd','US');return shipping.quoteCartShipping(db,p.shippingItems,'US','VA',new Map(p.shippingItems.map(i=>[i.id,i.resolvedProduct])),{line1:'Test street',city:'Test city',zip:'22026'})}
 return {quote,requests}
}
test('Shippo receives sum of component weights including bundle and cart quantities',async()=>{const f=await fixture();const q=await f.quote([{id:id(3),qty:2},{id:id(1),qty:1}]);assert.equal(f.requests[0].parcels[0].weight,'25');assert.equal(f.requests[0].parcels[0].mass_unit,'oz');assert.equal(q.cents,725)})
test('missing item weights cannot silently become eight ounces',async()=>{const f=await fixture({weight:null});await assert.rejects(f.quote([{id:id(1),qty:1}]),/shipping weight/);assert.equal(f.requests.length,0)})
test('missing Shippo configuration cannot become a flat charge',async()=>{const f=await fixture({env:{SHIPPO_API_KEY:''}});await assert.rejects(f.quote([{id:id(1),qty:1}]),/temporarily unavailable/);assert.equal(f.requests.length,0)})
test('Shippo failures and malformed rates cannot become free or fallback shipping',async()=>{for(const options of [{ok:false},{response:{rates:[]}},{response:{rates:[{amount:'NaN',currency:'USD'}]}}]){const f=await fixture(options);await assert.rejects(f.quote([{id:id(1),qty:1}]),/rate/);}})
