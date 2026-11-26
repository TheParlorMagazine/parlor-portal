const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {buildSync}=require('/tmp/parlor-tour-validation/node_modules/esbuild')
test('IP country controls analytics consent and responses cannot be shared across visitors',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'regional-consent-'))
 try{
  const file=path.join(dir,'geo.cjs');buildSync({entryPoints:['app/api/geo/route.js'],bundle:true,platform:'node',format:'cjs',outfile:file});const {GET}=require(file)
  for(const country of ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','XX','']){
   const response=await GET(new Request('https://test/api/geo',{headers:{'x-vercel-ip-country':country}}));assert.equal((await response.json()).consentRequired,true,country||'unknown');assert.equal(response.headers.get('cache-control'),'private, no-store')
  }
  for(const country of ['US','CA','AU','JP','BR']){const response=await GET(new Request('https://test/api/geo',{headers:{'x-vercel-ip-country':country}}));assert.equal((await response.json()).consentRequired,false,country)}
  const response=await GET(new Request('https://test/api/geo',{headers:{'x-nf-geo':Buffer.from(JSON.stringify({country:{code:'IT'}})).toString('base64')}}));const geo=await response.json();assert.equal(geo.country,'IT');assert.equal(geo.currency,'eur');assert.equal(geo.consentRequired,true)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
