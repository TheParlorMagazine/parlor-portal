// Actual event detail component with local auth/API fixtures. Never sends mail or writes live data.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const { build } = require('/tmp/parlor-tour-validation/node_modules/esbuild')
const { chromium } = require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-rsvp-')),out=path.join(dir,'page.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/portal/events/[id]/page';createRoot(document.getElementById('root')).render(<Page/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'local-auth',setup(b){
  b.onResolve({filter:/PortalShell$|lib\/supabase$|lib\/confirmDialog$|^next\/navigation$/},a=>({path:a.path,namespace:'fixture'}))
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('PortalShell')?`import React from 'react';export default function Shell({children}){return <main>{children}</main>};export const usePortal=()=>({member:window.testMember});`:a.path.endsWith('supabase')?`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}});`:a.path.endsWith('confirmDialog')?`export const confirmDialog=async()=>true;`:`export const useParams=()=>({id:'screening'});`,loader:'jsx',resolveDir:process.cwd()}))
 }}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440]) for(const scenario of ['paid','free','ordinary']){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[]
  page.on('pageerror',e=>errors.push(e.message))
  let status=null,attempts=0
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());let result,code=200
   if(url.pathname==='/') return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
   if(url.pathname==='/api/portal/events/screening'&&req.method()==='GET'){
    result={event:{id:'screening',title:'Film screening',starts_at:'2099-12-12T19:00:00Z',is_public:true,going_count:status==='going'?1:0},my_status:status,can_manage:false}
    if(scenario!=='ordinary')result.film_club_discussion=false
   }else if(url.pathname==='/api/portal/events/screening/rsvp'){
    requests.push({method:req.method(),body:req.postDataJSON()})
    if(req.method()==='POST'&&scenario==='paid'&&attempts++===0){code=400;result={error:'Please check your contact details.'}}
    else{status=req.method()==='DELETE'?null:'going';result={status}}
   }else return route.abort()
   return route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(result)})
  })
  await page.goto('https://fixture.test/')
  await page.evaluate(s=>{window.testMember={plan:s==='free'?'Free':"Reader's Circle",subscription_status:'active'}},scenario)
  await page.setContent('<div id="root"></div>');await page.addScriptTag({path:out})
  await page.getByRole('heading',{name:'Film screening',exact:true}).waitFor()
  if(scenario==='free'){
   assert.equal(await page.getByRole('button',{name:'RSVP',exact:true}).count(),0)
   assert.equal(requests.length,0)
  }else{
   await page.getByRole('button',{name:'RSVP',exact:true}).click()
   if(scenario==='paid'){
    const dialog=page.getByRole('dialog');await dialog.waitFor()
    await dialog.getByLabel('Full name').fill('Reader Example')
    await dialog.getByLabel('Email address').fill('reader@example.invalid')
    await dialog.getByRole('button',{name:'Confirm RSVP'}).click()
    await dialog.getByRole('alert').getByText('Please check your contact details.').waitFor()
    await dialog.getByRole('button',{name:'Confirm RSVP'}).click()
    await dialog.waitFor({state:'hidden'})
    assert.deepEqual(requests[1].body,{name:'Reader Example',email:'reader@example.invalid'})
   }else assert.equal(await page.getByRole('dialog').count(),0)
   await page.getByRole('button',{name:'Cancel RSVP',exact:true}).click()
   await page.getByRole('button',{name:'RSVP',exact:true}).waitFor()
   assert.equal(requests.at(-1).method,'DELETE')
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS Film Club RSVP browser: paid contact form/retry, free-member gate, ordinary RSVP, cancellation and responsive layout.')}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1})
