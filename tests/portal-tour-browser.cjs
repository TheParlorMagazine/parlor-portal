// Isolated UI harness: real PortalTour component, mocked auth/routes/progress API.
// npm install --prefix /tmp/parlor-tour-validation esbuild playwright-core
// TOUR_BROWSER_TOOLS=/tmp/parlor-tour-validation/node_modules node tests/portal-tour-browser.cjs
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http')
const tools=process.env.TOUR_BROWSER_TOOLS || '/tmp/parlor-tour-validation/node_modules'
const esbuild=require(path.join(tools,'esbuild')), {chromium}=require(path.join(tools,'playwright-core'))
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'parlor-tour-ui-'))
const react=require.resolve('react',{paths:[root]}),reactDOM=require.resolve('react-dom/client',{paths:[root]})
const assert=require('node:assert/strict')
async function main(){
 fs.writeFileSync(path.join(dir,'navigation.js'),`import {useSyncExternalStore} from ${JSON.stringify(react)};
 export const usePathname=()=>useSyncExternalStore(cb=>{addEventListener('popstate',cb);return()=>removeEventListener('popstate',cb)},()=>location.pathname);
 export const useRouter=()=>({push(url){history.pushState({},'',url);dispatchEvent(new Event('popstate'))}});`)
 fs.writeFileSync(path.join(dir,'auth.js'),`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{user:{id:'test-member',created_at:'2999-01-01'},access_token:'local-test'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});`)
 fs.writeFileSync(path.join(dir,'entry.jsx'),`import React,{useState} from ${JSON.stringify(react)};
 import {createRoot} from ${JSON.stringify(reactDOM)};
 import {usePathname} from './navigation';import PortalTour from ${JSON.stringify(path.join(root,'app/_components/portal-tour/PortalTour.js'))};
 function App(){const pathname=usePathname();const[opened,setOpened]=useState('');return <><header>The Parlor · Member portal</header><main style={{padding:'110px 30px 500px',maxWidth:900}}>
 {pathname==='/portal'&&<h1 data-tour="dashboard-ready">Hello, member.</h1>}
 {pathname==='/portal/profile'&&<><h1>My profile</h1>{opened!=='post'?<button data-tour="start-post" onClick={()=>setOpened('post')}>Start a post</button>:<textarea aria-label="Your post" placeholder="Share a thought"/>}</>}
 {pathname==='/portal/write'&&<><h1>Write for The Parlor</h1>{opened!=='draft'?<button data-tour="new-draft" onClick={()=>setOpened('draft')}>+ New draft</button>:<input aria-label="Draft title"/>}</>}
 {pathname==='/portal/groups'&&<><h1>Forums</h1><button data-tour="propose-forum" onClick={()=>setOpened('forum')}>+ Propose a forum</button>{opened==='forum'&&<p>Forum proposal form</p>}</>}
 {pathname.startsWith('/portal/events')&&<><h1>Events</h1><section data-tour="events-listings"><h2>Past events</h2><p>Past and upcoming gatherings appear here.</p></section></>}
 {pathname==='/portal/library'&&<><h1>The Archive</h1><div data-tour="archive-tools" style={{display:'flex',gap:8,width:'100%'}}><button>Saved items</button><button>Reading history</button></div><input data-tour="archive-search" placeholder="Search library..."/></>}
 </main><PortalTour/></>};createRoot(document.getElementById('root')).render(<App/>);`)
 await esbuild.build({entryPoints:[path.join(dir,'entry.jsx')],bundle:true,outfile:path.join(dir,'bundle.js'),loader:{'.js':'jsx'},jsx:'automatic',plugins:[{name:'mock-services',setup(build){
 build.onResolve({filter:/^next\/navigation$/},()=>({path:path.join(dir,'navigation.js')}));
 build.onResolve({filter:/lib\/supabase$/},()=>({path:path.join(dir,'auth.js')}));
 build.onResolve({filter:/^react(\/jsx-runtime)?$/},args=>({path:require.resolve(args.path,{paths:[root]})}));
 }}]})
 const states=new Map(),writes=[]
 const server=http.createServer(async(req,res)=>{
  if(req.url==='/api/portal/tour'){
   const client=req.headers['x-test-client']||'default'
   if(req.method==='PATCH'){let body='';for await(const chunk of req)body+=chunk;const state=JSON.parse(body);writes.push(state);states.set(client,state);res.setHeader('content-type','application/json');return res.end(JSON.stringify({state}))}
   res.setHeader('content-type','application/json');return res.end(JSON.stringify({eligible:true,state:states.get(client)||{version:1,status:'not_started',step:0}}))
  }
  const asset=req.url==='/bundle.js'?'bundle.js':req.url==='/bundle.css'?'bundle.css':null
  res.setHeader('content-type',asset?.endsWith('js')?'text/javascript':asset?'text/css':'text/html')
  res.end(asset?fs.readFileSync(path.join(dir,asset)):`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>body{margin:0;font-family:Georgia;background:#fffaf8;color:#301b21}header{position:fixed;top:0;background:#21151b;color:white;padding:22px;width:100%}main button,main input,textarea{font:16px Georgia;padding:15px;border:1px solid #dec8cd;border-radius:12px;max-width:80%}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`)
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const base=`http://127.0.0.1:${server.address().port}`
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
 try{
  for(const viewportWidth of [1440,390,768]){
   const mobile=viewportWidth<=820
   const context=await browser.newContext({viewport:mobile?{width:viewportWidth,height:844}:{width:1440,height:1000},extraHTTPHeaders:{'x-test-client':String(viewportWidth)}})
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/portal');await page.getByRole('button',{name:'Start Tour',exact:true}).waitFor()
   if(!mobile){await page.getByRole('button',{name:'Maybe Later',exact:true}).click();await page.getByRole('button',{name:'Your tour is here when you’re ready'}).waitFor();await page.reload();await page.getByRole('button',{name:'Your tour is here when you’re ready'}).waitFor();await page.getByRole('button',{name:'Open your Parlor tour and help'}).click()}
   await page.getByRole('button',{name:'Start Tour',exact:true}).click()
   const selectors=['[data-tour="start-post"]','[data-tour="new-draft"]','[data-tour="propose-forum"]','[data-tour="events-listings"]','[data-tour="archive-search"]']
   const actions=['Open the post composer','Open a new draft','See how to propose a forum','Explore events','Explore the Archive']
   for(let index=0;index<5;index++){
    await page.locator(selectors[index]).waitFor()
    if(mobile){
     const toggle=page.getByRole('button',{name:'Minimize tour',exact:true});await toggle.waitFor()
     assert.equal(await toggle.getAttribute('aria-expanded'),'true','Each stop opens fully')
     await toggle.click()
     assert.equal(await page.getByRole('button',{name:'Next',exact:true}).count(),0,'Minimized content is hidden')
     const region=await page.getByRole('region').boundingBox();assert.ok(region.height<100,'Collapsed tour frees the page')
     if(index===0){
      const target=await page.locator(selectors[index]).boundingBox();assert.ok(target.y+target.height<region.y,'Target is uncovered while minimized')
     }
     await page.getByRole('button',{name:'Expand tour',exact:true}).click()
     assert.equal(await toggle.getAttribute('aria-expanded'),'true')
    }
    if(index===3){assert.equal(await page.locator('.parlor-tour-section-highlight').count(),1);assert.equal(await page.getByRole('button',{name:'Explore events',exact:true}).count(),0);await page.getByRole('button',{name:'Next',exact:true}).click();continue}
    const cue=page.getByRole('button',{name:actions[index],exact:true}).filter({hasText:index===4?'Search here':mobile?'Tap here':'Click here'})
    await cue.waitFor()
    const direction=await cue.evaluate(el=>getComputedStyle(el).flexDirection)
    const flipped=mobile&&[1,2].includes(index)
    assert.equal(direction,flipped?'row':'row-reverse','Only writing/forum cues move the arrow right on mobile/tablet')
    assert.equal(await cue.locator('svg').evaluate(el=>getComputedStyle(el).transform),flipped?'matrix(1, 0, 0, -1, 0, 0)':'matrix(-1, 0, 0, -1, 0, 0)','Arrow points down toward the action')
    const box=await cue.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=(mobile?844:1000),'Cue must stay inside viewport')
    const targetBox=await page.locator(selectors[index]).boundingBox();assert.ok(box.y+box.height<targetBox.y,'Cue belongs above its target')
    if(index===0)await page.screenshot({path:path.join(dir,mobile?'mobile-tour.png':'desktop-tour.png')})
    await cue.click()
    if(index===4) assert.equal(await page.locator('[data-tour="archive-search"]').evaluate(el=>document.activeElement===el),true,'Archive cue should focus search')
    if(index<4)await page.getByRole('button',{name:'Next',exact:true}).click()
   }
   await page.getByRole('button',{name:'Finish & explore',exact:true}).click()
   await page.waitForTimeout(150)
   assert.equal(states.get(String(viewportWidth)).status,'completed')
   assert.ok(page.url().endsWith('/portal/library'))
   assert.equal(errors.length,0,errors.join('\n'))
   await page.goto(base+'/portal');await page.getByRole('button',{name:'Open your Parlor tour and help'}).waitFor();assert.equal(await page.locator('dialog').count(),0)
   await page.getByRole('button',{name:'Open your Parlor tour and help'}).click();await page.getByRole('button',{name:'Restart Tour'}).click();await page.getByRole('button',{name:'Skip Tour',exact:true}).click();await page.waitForTimeout(100)
   assert.equal(states.get(String(viewportWidth)).status,'skipped')
   await page.goto(base+'/portal');await page.getByRole('button',{name:'Open your Parlor tour and help'}).waitFor();assert.equal(await page.locator('dialog').count(),0)
   await context.close()
  }
  // A partly scrolled target must not produce a sliced highlight rectangle.
  const clippedContext=await browser.newContext({viewport:{width:390,height:600},extraHTTPHeaders:{'x-test-client':'clipped'}})
  const clippedPage=await clippedContext.newPage();await clippedPage.goto(base+'/portal');await clippedPage.getByRole('button',{name:'Start Tour',exact:true}).click()
  await clippedPage.locator('.parlor-tour-highlight').waitFor()
  await clippedPage.evaluate(()=>{const element=document.querySelector('[data-tour="start-post"]');window.scrollTo(0,element.getBoundingClientRect().top+scrollY-15)})
  await clippedPage.waitForTimeout(450)
  assert.equal(await clippedPage.getByRole('button',{name:'Open the post composer',exact:true}).filter({hasText:'Tap here'}).count(),0)
  assert.equal(await clippedPage.locator('.parlor-tour-highlight').count(),1)
  await clippedPage.evaluate(()=>scrollTo(0,0));await clippedPage.getByRole('button',{name:'Open the post composer',exact:true}).filter({hasText:'Tap here'}).waitFor()
  await clippedContext.close()
  // Reduced motion leaves a static cue.
  const context=await browser.newContext({reducedMotion:'reduce',extraHTTPHeaders:{'x-test-client':'reduced'}});const page=await context.newPage();await page.goto(base+'/portal');await page.getByRole('button',{name:'Start Tour',exact:true}).click();const cue=page.getByRole('button',{name:'Open the post composer',exact:true}).filter({hasText:'Click here'});await cue.waitFor();assert.equal(await cue.evaluate(el=>getComputedStyle(el,'::before').animationName),'none');await page.keyboard.press('Escape');assert.equal(await page.getByRole('region').count(),0);await context.close()
  console.log('PASS: real tour component in Chromium at desktop/mobile widths; five stops, pulse visibility, completion, postpone, skip, restart, Archive ending, reduced motion, Escape; no browser errors.')
  console.log('Screenshots: '+dir)
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1})
