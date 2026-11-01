const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'mission-tablet-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/about/mission/page';createRoot(document.getElementById('root')).render(<Page/>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx','.css':'empty'},plugins:[{name:'shell',setup(b){b.onResolve({filter:/_components\/Site(Header|Footer)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default function Shell(){return null}'}))}}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const [width,height,touch] of [[390,844,true],[768,1024,true],[1024,768,true],[1180,820,true],[1366,1024,true],[1440,900,false]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://local.test/**',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>'}))
 await page.goto('http://local.test/mission');await page.addStyleTag({content:fs.readFileSync('app/about/mission/mobile-mission.css','utf8')});await page.addScriptTag({path:out})
 const mobile=width<1200||touch;await page.waitForFunction(()=>document.querySelector('.mobile-mission'))
 assert.equal(await page.locator('.mobile-mission').evaluate(e=>getComputedStyle(e).display),mobile?'block':'none')
 assert.equal(await page.locator('.mission-desktop-only').evaluate(e=>getComputedStyle(e).display),mobile?'none':'block')
 if(mobile){assert.equal(await page.locator('.parlor-room-canvas').evaluate(e=>e.style.transform),'');await page.mouse.wheel(0,600);await page.waitForFunction(()=>scrollY>100);assert.ok(await page.locator('.mobile-mission-join input[type=email]').count())}
 assert.deepEqual(errors,[]);await page.close()
 }console.log('PASS phone, tablet portrait/landscape and large touch tablet use mobile layout and normal scrolling; desktop retains story')}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
