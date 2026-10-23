const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict')
const{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'oauth-callback-')),'bundle.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React,{StrictMode}from'react';import{createRoot}from'react-dom/client';import Callback from './app/auth/callback/page';import{createClient}from'./lib/supabase';createClient();createRoot(document.getElementById('root')).render(<StrictMode><Callback/></StrictMode>);`},bundle:true,outfile:out,jsx:'automatic',loader:{'.js':'jsx'},define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify('https://mock.supabase.co'),'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':JSON.stringify('test-key')}})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{const ctx=await browser.newContext();await ctx.addCookies([{name:'sb-mock-auth-token-code-verifier',value:encodeURIComponent(JSON.stringify('test-pkce-verifier')),domain:'local.test',path:'/'}]);const page=await ctx.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message))
 const user={id:'11111111-1111-4111-8111-111111111111',email:'subscriber@example.invalid',app_metadata:{provider:'google'},user_metadata:{},aud:'authenticated',created_at:new Date().toISOString()}
 await page.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(u.hostname==='mock.supabase.co'){
 if(u.pathname.endsWith('/token')){calls.push(req.postDataJSON());return r.fulfill({json:{access_token:'test-access-token',refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user}})}
 if(u.pathname.endsWith('/user'))return r.fulfill({json:user})
 return r.fulfill({status:404})
 }return r.fulfill({contentType:'text/html',body:'<div id="root"></div>'})})
 await page.goto('http://local.test/auth/callback?code=test-code&returnTo=%2Fportal%2Forders');await page.addScriptTag({path:out});await page.waitForURL('http://local.test/portal/orders');assert.equal(calls.length,1);assert.equal(calls[0].code_verifier,'test-pkce-verifier');assert.deepEqual(errors,[]);console.log('PASS real Supabase browser client + Strict Mode: exactly one PKCE exchange, correct verifier, subscriber session and return URL')
 await ctx.close()
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
