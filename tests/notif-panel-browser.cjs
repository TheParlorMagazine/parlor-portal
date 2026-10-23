// Actual notification panel with mocked auth/network; no production services.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const tools=process.env.TOUR_BROWSER_TOOLS||'/tmp/parlor-tour-validation/node_modules'
const {build}=require(path.join(tools,'esbuild')),{chromium}=require(path.join(tools,'playwright-core'))
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'parlor-notifications-'))
;(async()=>{
 const out=path.join(dir,'bundle.js')
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import NotifPanel from ${JSON.stringify(path.join(root,'app/portal/_components/NotifPanel.js'))};createRoot(document.getElementById('root')).render(<NotifPanel open onClose={()=>{}} onChange={delta=>window.changes.push(delta)}/>);`,loader:'jsx',resolveDir:root},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'auth',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'local-test-only'}}})}})`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],patches=[],deletes=[]
  let failDismiss=true
  let notifications=[{id:'one',message:'Event invitation',type:'event',read:false,created_at:new Date().toISOString(),link_to:'event',link_ref:'event-id'},{id:'two',message:'A reply',type:'reply',read:false,created_at:new Date().toISOString(),link_to:'event',link_ref:'another-event'}]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('500'))errors.push(m.text())})
  await page.route('http://parlor.test/**',async route=>{
   const request=route.request()
   if(request.url().endsWith('/api/portal/notifications')){
    if(request.method()==='DELETE'){if(failDismiss){failDismiss=false;return route.fulfill({status:500,json:{error:'Could not dismiss this notification. Please try again.'}})}const {id,all}=request.postDataJSON();if(all){notifications=[];return route.fulfill({json:{ok:true,cleared_all:true}})}deletes.push(id);notifications=notifications.filter(n=>n.id!==id);return route.fulfill({json:{ok:true,deleted_id:id}})}
    if(request.method()==='PATCH'){const body=request.postDataJSON();patches.push(body);notifications=notifications.map(n=>body.all||n.id===body.id?{...n,read:true}:n);return route.fulfill({json:{ok:true}})}
    return route.fulfill({json:{notifications}})
   }
   return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
  })
  await page.goto('http://parlor.test/portal');await page.evaluate(()=>{window.changes=[]});await page.addScriptTag({path:out})
  await page.getByRole('button',{name:'Dismiss notification: Event invitation',exact:true}).waitFor()
  assert.equal(await page.locator('button button').count(),0)
  await page.getByRole('button',{name:'Dismiss notification: Event invitation',exact:true}).click()
  await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Event invitation',{exact:true}).count(),1);assert.deepEqual(await page.evaluate(()=>window.changes),[])
  await page.getByRole('button',{name:'Dismiss notification: Event invitation',exact:true}).click()
  await page.waitForFunction(()=>window.changes.length===1)
  assert.equal(page.url(),'http://parlor.test/portal');assert.deepEqual(await page.evaluate(()=>window.changes),[-1]);assert.equal(await page.getByRole('button',{name:'Dismiss notification: Event invitation',exact:true}).count(),0)
  await page.reload();await page.evaluate(()=>{window.changes=[]});await page.addScriptTag({path:out});await page.getByText('A reply',{exact:true}).waitFor();assert.equal(await page.getByText('Event invitation',{exact:true}).count(),0)
  await page.getByRole('button',{name:'Clear all',exact:true}).click();await page.getByText('You’re all caught up.',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.changes),[null])
  await page.reload();await page.evaluate(()=>{window.changes=[]});await page.addScriptTag({path:out});await page.getByText('You’re all caught up.',{exact:true}).waitFor();assert.deepEqual(deletes,['one']);assert.equal(notifications.length,0);assert.deepEqual(errors,[])
  await page.close()
 }console.log('PASS: desktop/mobile notification panel has no nested buttons or React errors; dismissal and Clear all persist after reload; failures preserve notifications.')}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
