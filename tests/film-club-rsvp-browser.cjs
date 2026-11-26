// Actual event page: Film Club uses ticket purchases; ordinary events retain RSVP.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'film-tickets-event-')),'page.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/portal/events/[id]/page';createRoot(document.getElementById('root')).render(<Page/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/PortalShell$|lib\/supabase$|lib\/confirmDialog$|^next\/navigation$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:process.cwd(),contents:a.path.endsWith('PortalShell')?`import React from 'react';export default function Shell({children}){return <main>{children}</main>}export const usePortal=()=>({member:{plan:'Reader Circle',subscription_status:'active'}});`:a.path.endsWith('supabase')?`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}});`:a.path.endsWith('confirmDialog')?`export const confirmDialog=async()=>true;`:`export const useParams=()=>({id:'screening'});`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440])for(const kind of ['paid','free','ordinary']){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],calls=[];let joined=false,attempts=0
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://fixture.test/**',r=>{const u=new URL(r.request().url())
   if(u.pathname==='/api/portal/events/screening')return r.fulfill({json:{event:{id:'screening',title:'Documentary',starts_at:'2099-01-01',going_count:joined?1:0},my_status:joined?'going':null,...(kind==='ordinary'?{}:{film_club_discussion:false})}})
   if(u.pathname==='/api/portal/film-club/screenings')return r.fulfill({json:{eligible:kind==='paid',screenings:[{event_id:'screening',pricing:{currency:'usd',standard:999,member:799,percent:20,savings:200},sales_open:true,ticket_url:'https://kinema.com/example',provider:'Kinema'}]}})
   if(u.pathname==='/api/portal/film-club/checkout'){calls.push(r.request().postDataJSON());return r.fulfill(attempts++===0?{status:409,json:{error:'Please retry checkout.'}}:{json:{url:'https://fixture.test/stripe-checkout'}})}
   if(u.pathname.endsWith('/rsvp')){calls.push(r.request().method());joined=r.request().method()==='POST';return r.fulfill({json:{status:joined?'going':'cancelled'}})}
   return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
  })
  await page.goto('https://fixture.test/');await page.addScriptTag({path:out});await page.getByRole('heading',{name:'Documentary',exact:true}).waitFor()
  if(kind==='paid'){
   await page.getByRole('button',{name:'Purchase member ticket'}).click();await page.getByRole('alert').getByText('Please retry checkout.').waitFor();await page.getByRole('button',{name:'Purchase member ticket'}).click();await page.waitForURL('**/stripe-checkout');assert.equal(calls[0].requestId,calls[1].requestId);assert.equal(calls[0].price,undefined)
  }else if(kind==='free'){assert.equal(await page.getByRole('link',{name:'Purchase ticket',exact:true}).getAttribute('href'),'https://kinema.com/example');assert.equal(await page.getByRole('button',{name:'RSVP',exact:true}).count(),0)}
  else{await page.getByRole('button',{name:'RSVP',exact:true}).click();await page.getByRole('button',{name:'Cancel RSVP'}).click();await page.getByRole('button',{name:'RSVP',exact:true}).waitFor();assert.deepEqual(calls,['POST','DELETE'])}
  assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS Film Club discounted checkout retries preserve intent, free external routing, ordinary event RSVP and cancellation on mobile/desktop')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
