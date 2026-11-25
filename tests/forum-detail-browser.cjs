// Render the actual forum page, commenting controls and post feed with local API/auth fixtures.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'forum-detail-')),'page.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/portal/forums/[slug]/page';createRoot(document.getElementById('root')).render(<Page/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'fixtures',setup(b){
 b.onResolve({filter:/PortalShell$|(?:^|\/)supabase$|^next\/navigation$/},a=>({path:a.path,namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:process.cwd(),contents:a.path.endsWith('PortalShell')?`import React from 'react';export default function Shell({children}){return <main>{children}</main>}export const usePortal=()=>({member:{id:'reader',full_name:'Reader'}});`:a.path.endsWith('supabase')?`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}}),getUser:async()=>({data:{user:{id:'reader'}}})}});`:`export const useParams=()=>({slug:'forum'});export const useRouter=()=>({push:()=>{}});`}))
 }}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440])for(const film of [false,true])for(const locked of [false,true]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.setDefaultTimeout(5000)
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://local.test/**',r=>{
  const url=new URL(r.request().url())
  if(url.pathname==='/api/portal/forums/forum')return r.fulfill({json:{forum:{id:'forum',name:film?'Film discussion':'Democracy Salons',film_club:film,my_role:'member'},threads:[{id:'thread',title:'A discussion',reply_count:0}],members:[],events:{upcoming:[],past:[]}}})
  if(url.pathname==='/api/portal/commenting')return r.fulfill({json:{locked,forumOpen:true,canManage:false}})
  if(url.pathname==='/api/portal/posts')return r.fulfill({json:{posts:[]}})
  return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
 })
 await page.goto('http://local.test/');await page.addScriptTag({path:out});await page.getByRole('heading',{name:film?'Film discussion':'Democracy Salons',exact:true}).waitFor().catch(error=>{throw new Error(JSON.stringify(errors)+'; '+error.message)})
 if(locked)await page.getByRole('status').waitFor()
 else if(film)await page.getByRole('heading',{name:'Start a thread'}).waitFor()
 else await page.getByRole('button',{name:'Start a post'}).waitFor().catch(async error=>{throw new Error(JSON.stringify(errors)+'; '+await page.locator('body').innerText()+'; '+error.message)})
 assert.deepEqual(errors,[])
 if(film){await page.getByText('A discussion',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Post thread',exact:true}).count(),locked?0:1)}
 else assert.equal(await page.getByRole('button',{name:'Start a post'}).count(),locked?0:1)
 await page.close()
 }console.log('PASS actual Democracy Salons and Film Club pages render with open/locked commenting on mobile and desktop')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
