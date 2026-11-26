// Actual Film Club admin and published portal components with local upload/data fixtures.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {build}=require('/tmp/parlor-tour-validation/node_modules/esbuild'),{chromium}=require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'film-media-ui-')),out=path.join(dir,'ui.js')
 await build({stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import Admin from './app/admin/_components/FilmClubAdmin';import Published from './app/portal/film-club/PublishedFilmClub';createRoot(document.getElementById('root')).render(window.view==='admin'?<Admin/>:<Published/>);`},outfile:out,bundle:true,jsx:'automatic',loader:{'.js':'jsx'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/lib\/filmClubRequest$|lib\/uploadImage$|FilmTicketPurchase$|FilmClubModeration$|FilmClubDiscussions$|PortalShell$|^next\/link$/},a=>({path:a.path,namespace:'fixture'}))
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('FilmTicketPurchase')?`export default function Purchase(){return null};export const FilmTicketOrders=()=>null;export const filmTicketRequest=(...args)=>window.filmRequest(...args);`:a.path.endsWith('filmClubRequest')?`export const filmClubRequest=(...args)=>window.filmRequest(...args);`:a.path.endsWith('uploadImage')?`export const uploadToCloudinary=async(file,folder)=>{window.uploads.push({name:file.name,type:file.type,folder});return file.type.startsWith('image/')?'https://media.fixture/cover.webp':'https://media.fixture/clip.mp4'};`:a.path.endsWith('PortalShell')?`export const usePortal=()=>({member:{plan:"Reader's Circle",subscription_status:'active'}});`:a.path==='next/link'?`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`:`export default function Empty(){return null}`,loader:'jsx',resolveDir:process.cwd()}))
 }}]})
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 try{for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message))
  await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));await p.goto('https://fixture.test/')
  async function mount(view){
   await p.evaluate(view=>{
    window.view=view;window.uploads=[];window.calls=[];window.rejectCreateOnce=true
    window.records=[{event_id:'11111111-1111-4111-8111-111111111111',trailer_url:null,event:{id:'11111111-1111-4111-8111-111111111111',title:'Existing screening',status:'published',starts_at:'2099-12-12T19:00:00Z',cover_image_url:null}}]
    window.filmRequest=async(url,method='GET',body)=>{
     if(method==='GET'&&url.includes('/tickets'))return {tickets:[],audit:[]}
     if(method==='GET')return {screenings:structuredClone(window.records)}
     window.calls.push({method,body})
     if(method==='PATCH'){
      const record=window.records.find(r=>r.event_id===body.eventId)
      if(body.action==='cover')record.event.cover_image_url=body.cover_image_url
      if(body.action==='trailer')record.trailer_url=body.trailer_url
      return {ok:true}
     }
     if(window.rejectCreateOnce){window.rejectCreateOnce=false;throw new Error('Could not save screening. Please try again.')}
     window.records.push({event_id:body.id,trailer_url:body.trailer_url,event:{id:body.id,title:body.title,status:'draft',starts_at:body.starts_at,cover_image_url:body.cover_image_url}})
     return {eventId:body.id}
    }
   },view)
   await p.setContent(`<style>${fs.readFileSync(path.join(dir,'ui.css'),'utf8')}</style><div id="root"></div>`)
   await p.addScriptTag({path:out})
  }
  await mount('admin');await p.getByRole('button',{name:'Screenings',exact:true}).click()
  await p.getByRole('heading',{name:'Existing screening'}).waitFor()
  assert.equal(await p.getByLabel('Upload cover image',{exact:true}).count(),0)
  await p.getByRole('button',{name:'Edit',exact:true}).click()
  await p.getByRole('dialog',{name:'Edit screening',exact:true}).waitFor()
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'hidden')
  assert.ok(await p.getByRole('dialog').evaluate(d=>d.contains(document.activeElement)))
  await p.keyboard.press('Escape')
  assert.equal(await p.getByRole('dialog').count(),0)
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'')
  assert.equal(await p.getByRole('button',{name:'Edit',exact:true}).evaluate(b=>b===document.activeElement),true)
  await p.getByRole('button',{name:'Edit',exact:true}).click()
  const bounds=await p.getByRole('dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width)
  await p.getByLabel('Upload cover image',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from('fixture')})
  await p.getByLabel('Cover image URL',{exact:true}).evaluate(e=>e.value).then(value=>assert.equal(value,'https://media.fixture/cover.webp'))
  await p.getByLabel('Upload video snippet',{exact:true}).setInputFiles({name:'trailer.mp4',mimeType:'video/mp4',buffer:Buffer.from('fixture')})
  await p.locator('video').waitFor();assert.equal(await p.locator('video').getAttribute('src'),'https://media.fixture/clip.mp4')
  await p.getByRole('button',{name:'Save cover image',exact:true}).click()
  await p.getByText('Screening media saved.',{exact:true}).waitFor()
  assert.equal(await p.getByLabel('Trailer URL',{exact:true}).inputValue(),'https://media.fixture/clip.mp4')
  await p.getByRole('button',{name:'Save trailer',exact:true}).click()
  await p.getByRole('button',{name:'Done',exact:true}).click()
  await p.getByRole('button',{name:'+ Add screening event',exact:true}).click()
  const form=p.getByRole('dialog',{name:'Add screening event',exact:true}).locator('form')
  await form.getByLabel('Title',{exact:true}).fill('New screening')
  await form.getByLabel('Screening date and time (your local time)').fill('2099-12-14T19:00')
  await form.getByLabel('Cover image URL',{exact:true}).fill('https://media.fixture/new-cover.webp')
  await form.getByLabel('Trailer URL',{exact:true}).fill('https://youtu.be/fixture123')
  await form.getByRole('button',{name:'Preview trailer',exact:true}).click()
  assert.equal(await form.locator('iframe').getAttribute('src'),'https://www.youtube.com/embed/fixture123')
  await form.getByRole('button',{name:'Add screening event',exact:true}).click()
  await p.getByRole('dialog').getByRole('alert').getByText('Could not save screening. Please try again.').waitFor()
  assert.equal(await form.getByLabel('Title',{exact:true}).inputValue(),'New screening')
  await form.getByRole('button',{name:'Add screening event',exact:true}).click()
  await p.getByText('Screening saved as a draft in Events.',{exact:true}).waitFor()
  const calls=await p.evaluate(()=>window.calls)
  const submissions=calls.filter(c=>c.method==='POST');assert.equal(submissions.length,2);assert.equal(submissions[0].body.id,submissions[1].body.id)
  assert.equal(calls.find(c=>c.method==='POST').body.cover_image_url,'https://media.fixture/new-cover.webp')
  assert.equal(calls.find(c=>c.method==='POST').body.trailer_url,'https://youtu.be/fixture123')
  // Portal receives the saved cover and uploaded trailer in the published screening response.
  await mount('published')
  await p.evaluate(()=>{window.records[0].event.cover_image_url='https://media.fixture/cover.webp';window.records[0].trailer_url='https://media.fixture/clip.mp4'})
  // Remount to re-fetch the edited fixture.
  await p.setContent(`<style>${fs.readFileSync(path.join(dir,'ui.css'),'utf8')}</style><div id="root"></div>`);await p.addScriptTag({path:out})
  await p.locator('video').waitFor();assert.equal(await p.locator('video').getAttribute('poster'),'https://media.fixture/cover.webp')
  assert.equal(await p.locator('img[src="https://media.fixture/cover.webp"]').count(),1)
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await p.close()
 }console.log('PASS Film Club media UI: cover/video uploads, previews, independent saves, new-screening fields and published portal at mobile/desktop.')}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1})
