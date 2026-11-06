const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { generateKeyPairSync } = require('node:crypto')
const { build } = require('/tmp/parlor-tour-validation/node_modules/esbuild')
let modules
async function load() {
  if (!modules) modules = (async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reporting-')), result = {}
    for (const [name, entry] of Object.entries({ helper: 'lib/reporting.js', route: 'app/api/admin/reporting/route.js', registration: 'app/api/admin/reporting/merchant-registration/route.js', csv: 'lib/analyticsExport.js' })) {
      const file = path.join(directory, name + '.cjs')
      await build({ entryPoints: [entry], outfile: file, bundle: true, platform: 'node', format: 'cjs', plugins: [{ name: 'auth', setup(b) { b.onResolve({ filter: /lib\/apiAuth$/ }, a => ({ path: a.path, namespace: 'mock' })); b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const requireUser=async()=>global.reportingUser;export const serviceClient=()=>({});export const memberOf=async()=>({role:global.reportingRole});' })) } }] })
      result[name] = require(file)
    }
    return result
  })()
  return modules
}
const post = body => new Request('http://localhost/api/admin/reporting', { method: 'POST', body: JSON.stringify(body) })
test('reporting dates reject rollover, future dates, reversed ranges, and unbounded queries', async () => {
  const { helper: h } = await load()
  for (const dates of [['2026-02-30','2026-03-01'],['2026-01-02','2026-01-01'],['2020-01-01','2026-01-01'],['9999-01-01','9999-01-01'],['x','x']]) assert.throws(() => h.reportPeriod(...dates), e => e.status === 400)
  assert.deepEqual(h.reportPeriod('2026-01-01','2026-01-31'), {start:'2026-01-01',end:'2026-01-31'})
})
test('admin gates prevent provider requests and status never discloses secret values', async () => {
  const { route } = await load(), previous = global.fetch
  global.fetch = () => { throw Error('must not call provider') }
  try {
    global.reportingUser = null
    assert.equal((await route.GET(post({}))).status,401)
    global.reportingUser = {id:'x'}; global.reportingRole='editor'
    assert.equal((await route.POST(post({}))).status,403)
    global.reportingRole='admin'
    process.env.META_ACCESS_TOKEN='private-test-token'
    const status = await route.GET(post({}))
    assert.doesNotMatch(await status.text(),/private-test-token/)
    assert.equal((await route.POST(post({source:'reddit',start:'2026-01-01',end:'2026-01-31'}))).status,503)
    assert.equal((await route.POST(post({source:'https://evil.test',start:'2026-01-01',end:'2026-01-31'}))).status,400)
  } finally { global.fetch=previous; delete process.env.META_ACCESS_TOKEN }
})
test('Google uses signed scoped server authentication; GA4 and Search Console preserve source metrics', async () => {
  const { helper: h } = await load(), previous = global.fetch, oldEnv = {...process.env}
  const { privateKey } = generateKeyPairSync('rsa',{modulusLength:2048})
  process.env.GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'test@example.test',private_key:privateKey.export({type:'pkcs8',format:'pem'})})
  process.env.GOOGLE_ANALYTICS_PROPERTY_ID='123'
  process.env.GOOGLE_SEARCH_CONSOLE_SITE='sc-domain:theparlormagazine.com'
  const calls=[]
  global.fetch=async(url,options)=>{
    calls.push([url,options])
    assert.equal(options.redirect,'error')
    if(url.includes('oauth2.googleapis.com')) {
      const assertion=options.body.get('assertion'), claims=JSON.parse(Buffer.from(assertion.split('.')[1],'base64url'))
      assert.match(claims.scope,/analytics.readonly|webmasters.readonly/)
      assert.equal(claims.aud,'https://oauth2.googleapis.com/token')
      return Response.json({access_token:'private-access-token'})
    }
    assert.equal(options.headers.Authorization,'Bearer private-access-token')
    return Response.json(url.includes('analyticsdata') ? {rows:[{dimensionValues:[{value:'google / organic'}],metricValues:[{value:'20'},{value:'12'},{value:'15'},{value:'2'}]}]} : {rows:[{keys:['/post/story'],clicks:2,impressions:20,ctr:.1,position:3}]})
  }
  try {
    const ga4=await h.loadReport('ga4','2026-01-01','2026-01-31')
    assert.deepEqual(ga4.rows[0],['google / organic','20','12','15','2'])
    assert.deepEqual(JSON.parse(calls[1][1].body).orderBys,[{metric:{metricName:'sessions'},desc:true}])
    const search=await h.loadReport('search','2026-01-01','2026-01-31')
    assert.equal(search.rows[0][3],.1)
    assert.doesNotMatch(JSON.stringify(search),/private-access-token/)
    assert.match(calls[3][0],/sc-domain%3Atheparlormagazine.com/)
  } finally {global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})
test('Instagram excludes Facebook placements; Pinterest retains account currency; provider failures are sanitized', async()=>{
  const {helper:h,csv}=await load(),previous=global.fetch,oldEnv={...process.env}
  Object.assign(process.env,{META_ACCESS_TOKEN:'secret',META_AD_ACCOUNT_ID:'123',META_GRAPH_API_VERSION:'v99.0',PINTEREST_ACCESS_TOKEN:'secret',PINTEREST_AD_ACCOUNT_ID:'456'})
  try {
    global.fetch=async(url)=>Response.json(url.includes('graph.facebook')?{data:[{publisher_platform:'facebook',campaign_name:'exclude'},{publisher_platform:'instagram',campaign_name:'=malicious',account_currency:'EUR',spend:'12'}]}:url.includes('/analytics?')?[{CAMPAIGN_ID:'789',SPEND_IN_DOLLAR:10,TOTAL_IMPRESSION:300,TOTAL_CLICKTHROUGH:5}]:url.includes('/campaigns?')?{items:[{id:'789',name:'Campaign'}]}:{currency:'EUR'})
    const instagram=await h.loadReport('instagram','2026-01-01','2026-01-31')
    assert.equal(instagram.rows.length,1);assert.equal(instagram.rows[0][1],'EUR')
    assert.match(csv.connectedReportCsv(instagram),/'=malicious/)
    const pinterest=await h.loadReport('pinterest','2026-01-01','2026-01-31')
    assert.equal(pinterest.rows[0][1],'EUR')
    global.fetch=async()=>new Response('secret upstream details',{status:403})
    await assert.rejects(h.loadReport('instagram','2026-01-01','2026-01-31'),e=>!e.message.includes('secret')&&/denied/.test(e.message))
  } finally {global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})
test('Reddit splits date ranges into contiguous UTC windows, converts micro-spend, flags truncation and rejects oversized reports', async()=>{
  const {helper:h}=await load(),previous=global.fetch,oldEnv={...process.env},windows=[]
  Object.assign(process.env,{REDDIT_ACCESS_TOKEN:'secret',REDDIT_AD_ACCOUNT_ID:'a2_example'})
  try {
    global.fetch=async(url,options)=>{
      assert.equal(options.headers.Authorization,'Bearer secret')
      assert.match(options.headers['User-Agent'],/theparlormagazine/)
      if(!url.endsWith('/reports'))return Response.json({data:{currency:'GBP'}})
      const body=JSON.parse(options.body).data;windows.push(body)
      assert.deepEqual(body.breakdowns,['campaign_id','date'])
      return Response.json({data:{metrics:[{campaign_id:'c1',date:body.starts_at,impressions:100,clicks:2,spend:1250000}]},pagination:{next_url:'https://untrusted.example/never-followed'}})
    }
    const report=await h.loadReport('reddit','2026-01-01','2026-01-07')
    assert.equal(windows.length,3)
    assert.equal(windows[0].starts_at,'2026-01-01T00:00:00.000Z')
    assert.equal(windows[0].ends_at,windows[1].starts_at)
    assert.equal(windows[2].ends_at,'2026-01-08T00:00:00.000Z')
    assert.deepEqual(report.rows[0],['c1','2026-01-01','GBP',100,2,1.25])
    assert.match(report.note,/Do not treat this as a complete total/)
    await assert.rejects(h.loadReport('reddit','2026-01-01','2026-02-01'),e=>e.status===400)
    assert.equal(windows.length,3)
  } finally {global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})
test('Google Ads and Merchant reporting use server account IDs, preserve currency and flag pagination',async()=>{
  const {helper:h}=await load(),previous=global.fetch,oldEnv={...process.env}
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048})
  Object.assign(process.env,{GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.test',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),GOOGLE_ADS_CUSTOMER_ID:'123-456',GOOGLE_ADS_LOGIN_CUSTOMER_ID:'999-000',GOOGLE_ADS_DEVELOPER_TOKEN:'secret-developer-token',GOOGLE_ADS_API_VERSION:'v99',GOOGLE_MERCHANT_ACCOUNT_ID:'123'})
  try {
    global.fetch=async(url,options)=>{
      if(url.includes('oauth2'))return Response.json({access_token:'secret-token'})
      const body=JSON.parse(options.body)
      assert.match(body.query,/2026-01-01/)
      if(url.includes('googleads')){
        assert.match(url,/customers\/123456/)
        assert.equal(options.headers['login-customer-id'],'999000')
        assert.equal(options.headers['developer-token'],'secret-developer-token')
        return Response.json({results:[{campaign:{name:'Campaign'},customer:{currencyCode:'EUR'},metrics:{costMicros:'2500000',clicks:'5',impressions:'200',conversions:1,conversionsValue:15}}],nextPageToken:'more'})
      }
      assert.match(body.query,/marketing_method = 'ORGANIC'/)
      return Response.json({results:[{productPerformanceView:{date:{year:2026,month:1,day:2},clicks:'2',impressions:'20',clickThroughRate:.1}}],nextPageToken:'more'})
    }
    const ads=await h.loadReport('googleAds','2026-01-01','2026-01-31')
    assert.equal(ads.rows[0][4],2.5);assert.equal(ads.rows[0][1],'EUR');assert.match(ads.note,/More campaigns/)
    const merchant=await h.loadReport('merchant','2026-01-01','2026-01-31')
    assert.deepEqual(merchant.rows[0],['2026-01-02','2','20',.1]);assert.match(merchant.note,/Additional rows/)
    assert.doesNotMatch(JSON.stringify([ads,merchant]),/secret-token|secret-developer-token/)
  }finally{global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})

test('provider timeouts return retry guidance without exposing credentials',async()=>{
  const {helper:h,route}=await load(),previous=global.fetch,oldEnv={...process.env}
  Object.assign(process.env,{META_ACCESS_TOKEN:'secret-timeout-token',META_AD_ACCOUNT_ID:'123',META_GRAPH_API_VERSION:'v99.0'})
  global.reportingUser={id:'admin'};global.reportingRole='admin'
  global.fetch=async()=>{throw Object.assign(Error('secret-timeout-token'),{name:'TimeoutError'})}
  try {
    await assert.rejects(h.loadReport('instagram','2026-01-01','2026-01-31'),e=>e.status===504&&!e.message.includes('secret'))
    const response=await route.POST(post({source:'instagram',start:'2026-01-01',end:'2026-01-31'}))
    assert.equal(response.status,504);assert.match((await response.json()).error,/Try again later/)
  }finally{global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})

test('Merchant access failures identify setup causes without echoing private Google error details',async()=>{
 const {helper:h}=await load(),previous=global.fetch,oldEnv={...process.env}
 const{privateKey}=generateKeyPairSync('rsa',{modulusLength:2048})
 Object.assign(process.env,{GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.test',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),GOOGLE_MERCHANT_ACCOUNT_ID:'5666998773'})
 try{for(const[reason,message,expected]of[['SERVICE_DISABLED','private-token',/Enable Merchant API/],['ACCESS_TOKEN_SCOPE_INSUFFICIENT','private-token',/authorization scope/],['DEVELOPER_REGISTRATION_REQUIRED','private-token',/developer registration/],['UNKNOWN','The GCP project must be registered. private-token',/developer registration/],['UNKNOWN','private-token',/Merchant API denied access/]]){
 global.fetch=async url=>url.includes('oauth2')?Response.json({access_token:'private-token'}):Response.json({error:{message,details:[{reason,metadata:{token:'private-token',email:'private@example.test'}}]}},{status:403})
 await assert.rejects(h.loadReport('merchant','2026-01-01','2026-01-31'),e=>{assert.match(e.message,expected);assert.doesNotMatch(e.message,/private-token|private@example|5666998773/);return true})
 }global.fetch=async url=>url.includes('oauth2')?Response.json({access_token:'private-token'}):new Response('private-token',{status:403});await assert.rejects(h.loadReport('merchant','2026-01-01','2026-01-31'),/Merchant API denied access/)
 }finally{global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})

test('Merchant registration is admin-only, requires explicit confirmation and never runs on report reads',async()=>{
 const{registration:r}=await load(),previous=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('Must not reach Google')}
 try{for(const[user,role,status]of[[null,'admin',401],[{id:'reader'},'member',403],[{id:'admin'},'admin',400]]){global.reportingUser=user;global.reportingRole=role;const response=await r.POST(post({developerEmail:'owner@example.test'}));assert.equal(response.status,status);assert.match(response.headers.get('cache-control'),/no-store/)}assert.equal(calls,0)}finally{global.fetch=previous}
})
test('Merchant registration uses saved project credentials and account ID, with a human contact and sanitized success',async()=>{
 const{helper:h,registration:r}=await load(),previous=global.fetch,oldEnv={...process.env},calls=[];const{privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});Object.assign(process.env,{GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'service@example.test',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),GOOGLE_MERCHANT_ACCOUNT_ID:'5666998773'});global.reportingUser={id:'admin'};global.reportingRole='admin'
 try{global.fetch=async(url,options)=>{calls.push({url,options});return url.includes('oauth2')?Response.json({access_token:'private-token'}):Response.json({name:'private-provider-result',gcpIds:['private-project']})};for(const email of['','bad','x@project.iam.gserviceaccount.com'])await assert.rejects(h.registerMerchantProject(email),e=>e.status===400);assert.equal(calls.length,0);const response=await r.POST(post({confirm:true,developerEmail:'lindsey@theparlormagazine.com',accountId:'999',projectId:'override'}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{registered:true});assert.equal(calls[1].url,'https://merchantapi.googleapis.com/accounts/v1/accounts/5666998773/developerRegistration:registerGcp');assert.deepEqual(JSON.parse(calls[1].options.body),{developerEmail:'lindsey@theparlormagazine.com'});assert.equal(calls[1].options.headers.Authorization,'Bearer private-token')
 }finally{global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
})
