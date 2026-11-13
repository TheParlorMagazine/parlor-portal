const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
async function main(){
 const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'subscriber-actions-'))
 const initial={id:'11111111-1111-4111-8111-111111111111',email:'subscriber@example.test',plan:"Reader's Circle",newsletter_subscribed:true}
 fs.writeFileSync(dir+'/entry.jsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import Actions from ${JSON.stringify(root+'/app/admin/_components/SubscriberActions.js')};const supabase={auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}};function App(){const[member,setMember]=useState(${JSON.stringify(initial)});return <><output style={{display:"block",overflowWrap:"anywhere"}} data-testid="member">{JSON.stringify(member)}</output><Actions member={member} supabase={supabase} onUpdate={setMember}/></>}createRoot(document.getElementById('root')).render(<App/>);`)
 await build({entryPoints:[dir+'/entry.jsx'],bundle:true,outfile:dir+'/bundle.js',loader:{'.js':'jsx'},jsx:'automatic',alias:{react:root+'/node_modules/react','react-dom':root+'/node_modules/react-dom'},nodePaths:[root+'/node_modules']})
 const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?fs.readFileSync(dir+'/bundle.js'):'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>')});await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of[390,1200]){
  const page=await browser.newPage({viewport:{width,height:900}}),posts=[];let member={...initial},deny=false,billing={id:'sub_test',status:'active',cancelAtPeriodEnd:false,periodEnd:'2026-12-01T00:00:00Z'}
  await page.route('**/api/admin/subscribers/actions**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{member,billing,externalBilling:null,invoices:[{id:'in_test',remaining:1200,currency:'usd',decimals:2}]}})
   const body=route.request().postDataJSON();posts.push(body)
   if(deny)return route.fulfill({status:503,json:{error:'Subscriber could not be saved.'}})
   if(body.action==='upgrade')member={...member,plan:'Printing Press'}
   if(body.action==='cancel')billing={...billing,cancelAtPeriodEnd:true}
   if(body.action==='remove')member={...member,newsletter_subscribed:false,unsubscribed_at:'2026-11-13T00:00:00Z'}
   return route.fulfill({json:{member,billing,message:body.action==='cancel'?'Renewal cancelled. Paid access continues until the end of the billing period.':'Change confirmed.'}})
  })
  await page.goto('http://127.0.0.1:'+server.address().port)
  await page.getByRole('button',{name:'Upgrade plan',exact:true}).click();await page.getByLabel('New plan').waitFor();assert.equal(posts.length,0)
  await page.getByRole('button',{name:'Confirm change'}).click();assert.equal(posts.length,0)
  await page.getByRole('checkbox').check();deny=true;await page.getByRole('button',{name:'Confirm change'}).click();await page.getByRole('alert').filter({hasText:'could not be saved'}).waitFor();assert.equal(JSON.parse(await page.getByTestId('member').textContent()).plan,"Reader's Circle")
  const firstOp=posts[0].operationId;deny=false;await page.getByRole('button',{name:'Confirm change'}).click();await page.getByRole('status').filter({hasText:'Change confirmed'}).waitFor();assert.equal(posts[1].operationId,firstOp);assert.equal(JSON.parse(await page.getByTestId('member').textContent()).plan,'Printing Press')
  await page.getByRole('button',{name:'Cancel subscription',exact:true}).click();await page.getByLabel('When').waitFor();assert.equal(await page.getByLabel('When').inputValue(),'period_end');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm change'}).click();await page.getByText('Renewal is cancelled.',{exact:false}).waitFor();assert.equal(posts.at(-1).immediate,false);assert.equal(JSON.parse(await page.getByTestId('member').textContent()).plan,'Printing Press')
  await page.getByRole('button',{name:'Issue refund',exact:true}).click();await page.getByLabel('Refund amount').fill('3.25');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm change'}).click();await page.getByRole('status').filter({hasText:'Change confirmed'}).waitFor();assert.equal(posts.at(-1).amount,325);assert.equal(posts.at(-1).invoiceId,'in_test')
  await page.getByRole('button',{name:'Remove subscriber',exact:true}).click();await page.getByRole('heading',{name:'Remove from newsletter'}).waitFor();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm change'}).click();await page.getByRole('status').filter({hasText:'Change confirmed'}).waitFor();const updated=JSON.parse(await page.getByTestId('member').textContent());assert.equal(updated.newsletter_subscribed,false);assert.equal(updated.plan,'Printing Press');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close()
 }
 console.log('PASS: mobile/desktop subscriber forms require confirmation, persist updates, preserve billing access on scheduled cancellation/removal, submit precise refunds and retain retry IDs on failures.')
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1})
