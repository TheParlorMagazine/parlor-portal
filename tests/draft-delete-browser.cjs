// Real writing page with local in-memory submissions and mocked auth/editor.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const tools=process.env.TOUR_BROWSER_TOOLS||'/tmp/parlor-tour-validation/node_modules'
const {build}=require(path.join(tools,'esbuild')),{chromium}=require(path.join(tools,'playwright-core'))
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'parlor-draft-delete-'))
;(async()=>{const out=path.join(dir,'bundle.js');await build({stdin:{resolveDir:root,loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Write from './app/portal/write/page';createRoot(document.getElementById('root')).render(<Write/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'mock',setup(b){b.onResolve({filter:/lib\/supabase$|_components\/PortalShell$|_components\/RichTextEditor$|lib\/uploadImage$|lib\/confirmDialog$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.endsWith('/supabase')?`const client={auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}};export const createClient=()=>client;`:args.path.endsWith('/PortalShell')?`export default function Shell({children}){return children}`:args.path.endsWith('/RichTextEditor')?`export default function Editor(){return null}`:args.path.endsWith('/uploadImage')?`export const prepareImageUpload=()=>{};export const isDuplicateUpload=()=>false;`:`export const confirmDialog=async()=>true;`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const scenario of ['success','rejected','save-in-flight','new-draft-saves']){
  const page=await browser.newPage(),errors=[],requests=[];let rows=scenario==='new-draft-saves'?[]:[{id:'draft',title:'Original draft',body:'',status:'draft'}],saving=false,deleteDuringSave=false
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('http://parlor.test/**',async route=>{const req=route.request(),url=new URL(req.url());if(url.pathname==='/api/portal/submissions'){
   const method=req.method(),data=method==='GET'?{}:req.postDataJSON();requests.push(method)
   if(method==='GET')return route.fulfill({json:url.searchParams.has('id')?{submission:rows[0]}:{submissions:rows}})
   if(method==='POST'||method==='PATCH'){
    saving=true;await new Promise(r=>setTimeout(r,scenario==='new-draft-saves'?2000:1000));
    if(method==='POST')rows.push({id:'new',status:'draft',...data});else rows=rows.map(row=>row.id===data.id?{...row,...data}:row)
    saving=false;return route.fulfill({json:{submission:rows.find(row=>row.id===(data.id||'new'))}})
   }
   if(method==='DELETE'){
    deleteDuringSave=saving
    if(scenario==='rejected')return route.fulfill({status:409,json:{error:'Draft is locked; could not delete.'}})
    rows=rows.filter(row=>row.id!==data.id);return route.fulfill({json:{ok:true,deleted_id:data.id}})
   }
  }return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})})
  await page.goto('http://parlor.test/portal/write');await page.addScriptTag({path:out})
  if(scenario==='new-draft-saves'){
   await page.getByRole('button',{name:'+ New draft',exact:true}).click();await page.getByPlaceholder('Your headline').fill('First title');await page.waitForTimeout(1400);await page.getByPlaceholder('Your headline').fill('Revised title');await page.waitForTimeout(4000);assert.equal(requests.filter(m=>m==='POST').length,1);assert.equal(rows.length,1);assert.equal(rows[0].title,'Revised title')
  }else await page.getByRole('button',{name:'Edit',exact:true}).click()
  if(scenario==='save-in-flight'){
   await page.getByPlaceholder('Your headline').fill('Changed title');await page.waitForTimeout(1400);assert.equal(saving,true)
  }
  await page.getByRole('button',{name:'Delete draft',exact:true}).click()
  if(scenario==='rejected'){
   await page.getByRole('alert').filter({hasText:'could not delete'}).waitFor();assert.equal(await page.getByPlaceholder('Your headline').count(),1);assert.equal(rows.length,1)
  }else{
   await page.getByText('Nothing here yet',{exact:true}).waitFor();await page.waitForTimeout(1500);assert.equal(rows.length,0);assert.equal(deleteDuringSave,false)
   await page.reload();await page.addScriptTag({path:out});await page.getByText('Nothing here yet',{exact:true}).waitFor()
  }
  assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS: deleted drafts stay gone after refresh; errors keep editor open; delete waits for active save; overlapping new-draft autosaves create only one record.')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
