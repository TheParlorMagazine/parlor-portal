// Read-only route tests with mocked authentication/database. No external requests.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
async function route(path, mocks, dynamicMocks = {}) {
  const context = vm.createContext({ Response, Headers, URL, Date, console, process: { env: {} } })
  const module = new vm.SourceTextModule(fs.readFileSync(path, 'utf8'), { context, importModuleDynamically: async specifier => {
    const exports = dynamicMocks[specifier]
    assert.ok(exports, `Unexpected dynamic import ${specifier}`)
    const dependency = new vm.SyntheticModule(Object.keys(exports), function () { for (const [key,value] of Object.entries(exports)) this.setExport(key,value) }, { context })
    await dependency.link(() => {})
    await dependency.evaluate()
    return dependency
  } })
  await module.link(async specifier => {
    const exports = mocks[specifier]
    assert.ok(exports, `Unexpected import ${specifier}`)
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key,value] of Object.entries(exports)) this.setExport(key,value) }, { context })
  })
  await module.evaluate()
  return module.namespace
}
const authPath = '../../../../lib/apiAuth'
const accessPath = '../../../../lib/eventAccess'
const creation = () => ({ json: async () => ({ title: 'An event' }) })
test('ordinary members cannot create an event by omitting forum_id', async () => {
  let touched = false
  const module = await route('app/api/portal/events/route.js', {
    [authPath]: { requireUser: async () => ({ id: 'member' }), memberOf: async () => ({ role: 'member' }), serviceClient: () => ({ from() { touched=true; throw Error('Unexpected insert') } }) },
    [accessPath]: { eventSummary(){}, eventError(){} }
  })
  assert.equal((await module.POST(creation())).status,403)
  assert.equal(touched,false)
})
test('unauthenticated creation is rejected before database access', async () => {
  const module = await route('app/api/portal/events/route.js', {
    [authPath]: { requireUser: async () => null, memberOf(){}, serviceClient(){ throw Error('Unexpected DB access') } },
    [accessPath]: { eventSummary(){},eventError(){} }
  })
  assert.equal((await module.POST(creation())).status,401)
})
test('event listing hides denied events and strips join links even for attendees', async () => {
  const query = { select(){return this},eq(){return this},order:async()=>({data:[{id:'public'},{id:'private'}]}) }
  const module = await route('app/api/portal/events/route.js', {
    [authPath]: { requireUser:async()=>({id:'member'}),memberOf(){},serviceClient:()=>({from:()=>query}) },
    [accessPath]: { eventSummary:async(db,id)=>{if(id==='private')throw {code:'42501'};return {event:{id,join_url:'secret',starts_at:'2999-01-01'},my_status:'going'}}, eventError(){throw Error('Unexpected error')} }
  })
  const body = await (await module.GET({})).json()
  assert.equal(body.upcoming.length,1)
  assert.equal(body.upcoming[0].join_url,undefined)
})
test('public calendar exports never include meeting URL',async()=>{
  const query={select(){return this},eq(){return this},single:async()=>({data:{id:'event',title:'Public',status:'published',is_public:true,join_url:'https://secret.invalid/meeting',location_type:'virtual'}})}
  const module=await route('app/api/portal/events/[id]/ics/route.js',{
    '../../../../../../lib/apiAuth':{serviceClient:()=>({from:()=>query})},
    '@supabase/ssr':{createServerClient(){throw Error('Public calendar needs no authentication')}}
  })
  const response=await module.GET({}, {params:Promise.resolve({id:'event'})})
  assert.equal(response.status,200)
  assert.ok(!(await response.text()).includes('secret.invalid'))
})
test('private calendar denies an unauthenticated request',async()=>{
  const query={select(){return this},eq(){return this},single:async()=>({data:{id:'event',status:'published',is_public:false}})}
  const module=await route('app/api/portal/events/[id]/ics/route.js',{
    '../../../../../../lib/apiAuth':{serviceClient:()=>({from:()=>query})},
    '@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:null}})}})}
  })
  assert.equal((await module.GET({}, {params:Promise.resolve({id:'event'})})).status,404)
})
test('RSVP cancellation uses only atomic registration RPC, not forum mutation',async()=>{
  let calls=[]
  const module=await route('app/api/portal/events/[id]/rsvp/route.js',{
    '../../../../../../lib/apiAuth':{requireUser:async()=>({id:'member'}),serviceClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return {data:{status:'cancelled'}}}})},
    '../../../../../../lib/eventAccess':{eventError(){throw Error('unexpected error')}},
    '../../../../../../lib/eventMessages':{deliverEventMessages:async()=>{}}
  })
  assert.equal((await module.DELETE({}, {params:Promise.resolve({id:'event'})})).status,200)
  assert.equal(calls.length,1)
  assert.equal(calls[0][0],'event_registration')
  assert.equal(calls[0][1].p_action,'cancel')
})

function messageDB(status = 'waitlist') {
  const calls=[]
  const message={id:'message',event_id:'event',member_id:'member',kind:'waitlist'}
  const db={
    rpc:async name=> name==='claim_event_registration_messages' ? {data:[message]} : {data:{my_status:status,queue_position:2}},
    from(table){
      const query={
        select(){return this},eq(){return this},
        single:async()=>({data:table==='events'?{id:'event',title:'Reading',status:'published'}:{email:'member@example.invalid'}}),
        upsert(row){calls.push(['notification',row]);return Promise.resolve({error:null})},
        update(row){calls.push(['update',row]);return this},
        then(resolve){resolve({error:null})}
      }
      return query
    }
  }
  return {db,calls}
}
test('waitlist notices include position and no meeting link, with a stable delivery key',async()=>{
  const {db,calls}=messageDB()
  let mail
  const module=await route('lib/eventMessages.js',{}, {'./sendEmail':{deliver:async value=>{mail=value;return {data:{id:'accepted'}}}}})
  await module.deliverEventMessages(db,'event')
  assert.ok(mail.html.includes('position 2'))
  assert.ok(mail.html.includes('not confirmed'))
  assert.equal(mail.idempotencyKey,'event-registration/message')
  assert.equal(calls[0][0],'notification')
  assert.equal(calls[0][1].id,'message')
  assert.ok(calls.at(-1)[1].sent_at)
})
test('mail failure preserves retry work and still creates the in-app notice',async()=>{
  const {db,calls}=messageDB()
  const module=await route('lib/eventMessages.js',{}, {'./sendEmail':{deliver:async()=>({error:{message:'Unavailable'}})}})
  await module.deliverEventMessages(db,'event')
  assert.equal(calls[0][0],'notification')
  assert.ok(calls.at(-1)[1].last_error)
  assert.equal(calls.at(-1)[1].sent_at,undefined)
})
test('superseded waitlist notices are not sent after promotion',async()=>{
  const {db,calls}=messageDB('going')
  const module=await route('lib/eventMessages.js',{})
  await module.deliverEventMessages(db,'event')
  assert.equal(calls[0][1].last_error,'superseded')
  assert.equal(calls.some(call=>call[0]==='notification'),false)
})
