// Actual homepage, shared header, shop and global drawer, with mocked services.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const tools=process.env.TOUR_BROWSER_TOOLS||'/tmp/parlor-tour-validation/node_modules'
const {build}=require(path.join(tools,'esbuild')),{chromium}=require(path.join(tools,'playwright-core'))
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'parlor-cart-ui-'))
;(async()=>{
 const outfile=path.join(dir,'bundle.js')
 await build({stdin:{resolveDir:root,loader:'jsx',contents:`import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
 import Home from './app/HomePageClient';import Header from './app/_components/SiteHeader';import Shop from './app/shop/page';import CartDrawer from './app/_components/CartDrawer';
 function App(){const[ready,setReady]=useState(location.pathname!=='/delayed');useEffect(()=>{if(!ready)setTimeout(()=>setReady(true),800)},[]);return <>{location.pathname==='/home'?<Home initial={{articles:[]}}/>:location.pathname==='/shop'?<Shop/>:<><Header/><h1>Current article</h1></>}{ready&&<CartDrawer/>}</>}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,outfile,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'auth',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const user={id:'member',email:'member@example.invalid',user_metadata:{full_name:'Member'}};const query=table=>({select(){return this},eq(){return this},order(){return this},limit(){return this},single:async()=>({data:{role:'member'}}),then(resolve){resolve({data:[]})}});const client={from:query,auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'local-test'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};export const createClient=()=>client;`}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [1440,390]){for(const surface of ['home','article','shop','delayed']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{products:[],bundles:[],categories:[],currency:'usd',symbol:'$',country:'US'}})
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame())return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'})
   return route.fulfill({body:'',contentType:'text/plain'})
  })
  await page.goto(`http://parlor.test/${surface}`);await page.addScriptTag({path:outfile})
  const cart=page.getByRole('button',{name:'Open cart',exact:true});await cart.waitFor();await cart.click()
  const dialog=page.getByRole('dialog',{name:'Cart and wishlist'});await dialog.waitFor()
  assert.equal(page.url(),`http://parlor.test/${surface}`)
  assert.ok((await dialog.innerText()).includes('Your cart is empty'))
  await page.getByRole('button',{name:'Close cart and wishlist'}).click()
  if(surface!=='shop'){
   await page.locator('.member-trigger').click()
   const expected={'My subscriptions':'/portal/subscriptions','My orders':'/portal/orders','Account settings':'/portal/settings'}
   for(const[label,href]of Object.entries(expected))assert.equal(await page.getByRole('link',{name:label,exact:true}).getAttribute('href'),href)
   await page.getByRole('button',{name:'Wishlist',exact:true}).click()
   await dialog.waitFor();assert.equal(page.url(),`http://parlor.test/${surface}`)
   assert.ok((await dialog.innerText()).toLowerCase().includes('wishlist'))
   assert.equal(await dialog.getByTitle('Wishlist').evaluate(el=>getComputedStyle(el).color),'rgb(196, 54, 74)')
   assert.equal(await page.locator('.member-dropdown.open').count(),0)
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
  }
  assert.deepEqual(errors,[])
  await context.close()
 }}console.log('PASS: homepage, shared header, shop and delayed drawer mount at desktop/mobile widths; cart/wishlist overlay without navigation; correct portal links and wishlist tab; dropdown closes; Escape closes drawer; no browser errors.')
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
