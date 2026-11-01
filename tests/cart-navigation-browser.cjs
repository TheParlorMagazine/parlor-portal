// Actual homepage, shared header, shop and global drawer, with mocked services.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const tools=process.env.TOUR_BROWSER_TOOLS||'/tmp/parlor-tour-validation/node_modules'
const {build}=require(path.join(tools,'esbuild')),{chromium}=require(path.join(tools,'playwright-core'))
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'parlor-cart-ui-'))
;(async()=>{
 const outfile=path.join(dir,'bundle.js')
 await build({stdin:{resolveDir:root,loader:'jsx',contents:`import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
 import Privacy from './app/privacy/page';import Terms from './app/terms/page';import Home from './app/HomePageClient';import Header from './app/_components/SiteHeader';import Shop from './app/shop/page';import CartDrawer from './app/_components/CartDrawer';
 function App(){const[ready,setReady]=useState(location.pathname!=='/delayed');useEffect(()=>{if(!ready)setTimeout(()=>setReady(true),800)},[]);return <>{location.pathname==='/privacy'?<Privacy/>:location.pathname==='/terms'?<Terms/>:location.pathname==='/home'?<Home initial={{articles:[]}}/>:location.pathname==='/shop'?<Shop/>:<><Header/><h1>Current article</h1></>}{ready&&<CartDrawer/>}</>}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,outfile,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'auth',setup(b){b.onResolve({filter:/(^|\/)supabase$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const user={id:'member',email:'member@example.invalid',user_metadata:{full_name:'Member'}};const query=table=>({select(){return this},eq(){return this},order(){return this},limit(){return this},single:async()=>({data:{role:'member'}}),then(resolve){resolve({data:[]})}});const client={from:query,auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'local-test'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};export const createClient=()=>client;`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [1440,390]){for(const surface of ['home','article','shop','delayed','privacy','terms']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[]
  let notificationCount=7
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.pathname==='/api/portal/unread-counts')return route.fulfill({json:{notifications:notificationCount,inbox:0}})
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{products:[],bundles:[],categories:[],currency:'usd',symbol:'$',country:'US'}})
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame())return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'})
   return route.fulfill({body:'',contentType:'text/plain'})
  })
  await page.goto(`http://parlor.test/${surface}`);await page.addScriptTag({path:outfile})
  const cart=page.getByRole('button',{name:'Open cart',exact:true});await cart.waitFor();if(surface==='shop'&&width===390){const r=await cart.boundingBox(),heading=await page.locator('.shop-welcome').boundingBox();assert.ok(r.x>width/2&&r.y<heading.y);assert.ok(r.width>=44&&r.height>=44)}await cart.click()
  const dialog=page.getByRole('dialog',{name:'Cart and wishlist'});await dialog.waitFor()
  assert.equal(page.url(),`http://parlor.test/${surface}`)
  assert.ok((await dialog.innerText()).includes('Your cart is empty'))
  await page.getByRole('button',{name:'Close cart and wishlist'}).click()
  if(surface!=='shop'){
   await page.waitForFunction(()=>document.querySelector('.header-notification-badge')?.textContent==='7')
   await page.locator('.member-trigger').click()
   const links=await page.locator('.member-dropdown.open > a').all()
   assert.equal(await links[0].getAttribute('href'),'/portal')
   assert.equal(await links[1].getAttribute('href'),'/portal/notifications')
   assert.equal(await page.locator('.header-notification-count').textContent(),'7')
   const expected={'My subscriptions':'/portal/subscriptions','My orders':'/portal/orders','Account settings':'/portal/settings'}
   for(const[label,href]of Object.entries(expected))assert.equal(await page.getByRole('link',{name:label,exact:true}).getAttribute('href'),href)
   await page.getByRole('button',{name:'Wishlist',exact:true}).click()
   await dialog.waitFor();assert.equal(page.url(),`http://parlor.test/${surface}`)
   assert.ok((await dialog.innerText()).toLowerCase().includes('wishlist'))
   assert.equal(await dialog.getByTitle('Wishlist').evaluate(el=>getComputedStyle(el).color),'rgb(196, 54, 74)')
   assert.equal(await page.locator('.member-dropdown.open').count(),0)
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
   notificationCount=105;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('.header-notification-badge')?.textContent==='99+')
   notificationCount=0;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.locator('.header-notification-badge').waitFor({state:'detached'})
  }
  if(['home','shop','privacy','terms'].includes(surface)){
   const footer=page.locator('.site-footer')
   const destinations={'Work & Wealth':'/work-wealth','Society & Culture':'/society-culture','World & Politics':'/world-politics','Perspectives & Identity':'/perspectives-identity','About':'/about/mission','Shop':'/shop','Donate':'/buy-us-a-birthday-gift','People of The Parlor':'/about/people','Archive':'/portal/library','Become a member':'/plans','Member dashboard':'/portal','Reading Room':'/portal/reading-room','Events':'/portal/events','Library':'/portal/library','Privacy':'/privacy','Terms':'/terms'}
   for(const[label,href]of Object.entries(destinations))assert.equal(await footer.getByRole('link',{name:label,exact:true}).getAttribute('href'),href)
  }
  if(surface==='privacy'||surface==='terms'){
   assert.equal(await page.locator('main h1').textContent(),surface==='privacy'?'Privacy Policy':'Terms of Use')
   const anchors=await page.locator('.legal-toc a').evaluateAll(nodes=>nodes.map(node=>node.hash.slice(1)))
   for(const id of anchors)assert.equal(await page.locator(`main section[id="${id}"]`).count(),1)
   assert.ok(await page.locator('main').evaluate(el=>el.scrollWidth<=innerWidth))
   if(surface==='terms'){
    const returns=await page.locator('#returns-refunds').innerText()
    assert.ok(returns.includes('14 calendar days of delivery'))
    assert.ok(returns.includes('you pay the return shipping costs'))
    assert.ok(returns.includes('30 calendar days'))
    assert.ok(returns.includes('shorter deadline takes precedence'))
   }
  }
  assert.deepEqual(errors,[])
  await context.close()
 }}console.log('PASS: homepage, shared header, shop and delayed drawer mount at desktop/mobile widths; cart/wishlist overlay without navigation; correct portal/Notifications links and wishlist tab; avatar counts refresh, cap at 99+ and disappear at zero; dropdown closes; Escape closes drawer; no browser errors.')
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
