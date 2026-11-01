const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
async function main(){
 const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'welcome-browser-')),file=path.join(dir,'bundle.js')
 await build({stdin:{resolveDir:root,loader:'jsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Subscribers from './app/admin/_components/SubscribersSection';const members=[{id:'11111111-1111-4111-8111-111111111111',full_name:'Missed Reader',email:'missed@example.test',plan:'free',notes:'',joined_at:'2026-10-30T12:00:00Z'},{id:'22222222-2222-4222-8222-222222222222',full_name:'Legacy Reader',email:'legacy@example.test',plan:'free',onboarding_email_sent:true,notes:''}];const supabase={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})},from(table){const q={select(){return q},order(){return q},eq(){return q},limit(){return q},then(resolve){return Promise.resolve({data:table==='members'?members:[]}).then(resolve)}};return q}};createRoot(document.getElementById('root')).render(<Subscribers supabase={supabase}/>);`},bundle:true,outfile:file,jsx:'automatic',loader:{'.js':'jsx'}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true}),errors=[];let sends=0,fail=true
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept())
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.pathname==='/api/admin/subscribers/onboarding'){
    sends++;assert.equal(req.headers().authorization,'Bearer fixture-token');assert.deepEqual(JSON.parse(req.postData()),{memberId:'11111111-1111-4111-8111-111111111111'})
    return route.fulfill({status:fail?409:200,json:fail?{error:'The welcome automation is disabled. No email was sent.'}:{sent:true,onboardingSentAt:'2026-11-01T12:00:00Z'}})
   }
   if(url.pathname==='/api/admin/subscribers/activity')return route.fulfill({json:{counts:{},top_pages:[],top_clicks:[],events:[],hasMore:false}})
   return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>'})
  })
  await page.goto('http://fixture.test/');await page.addScriptTag({path:file})
  const missed=page.getByRole('row').filter({hasText:'Missed Reader'}),legacy=page.getByRole('row').filter({hasText:'Legacy Reader'})
  await legacy.getByText('✓ Sent',{exact:true}).waitFor();assert.equal(sends,0)
  await missed.getByRole('button',{name:'View',exact:true}).click()
  await page.getByRole('button',{name:'Send missed welcome email',exact:true}).click()
  await page.getByRole('status').filter({hasText:'automation is disabled'}).waitFor()
  assert.equal(await missed.getByText('✓ Sent',{exact:true}).count(),0)
  fail=false
  await page.getByRole('button',{name:'Send missed welcome email',exact:true}).click()
  await page.getByRole('status').filter({hasText:'accepted by Resend and recorded'}).waitFor()
  await missed.getByText('✓ Sent',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Send missed welcome email',exact:true}).count(),0);assert.equal(sends,2)
  await page.getByRole('button',{name:'Timeline',exact:true}).click();await page.getByText('Onboarding email sent',{exact:true}).waitFor()
  // Close the profile, then export the updated parent state.
  await page.getByRole('button',{name:'×',exact:true}).click()
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();const download=await downloadPromise
  const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/'?"Missed Reader".*"Yes"/);assert.match(csv,/"Legacy Reader".*"Yes"/)
  assert.deepEqual(errors,[]);await page.close()
 }
 console.log('PASS: subscriber legacy flags, failed recovery unchanged, accepted recovery updates profile/table/timeline/CSV and prevents another send at phone and desktop widths.')
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1})
