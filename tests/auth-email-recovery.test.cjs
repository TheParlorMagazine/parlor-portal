const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm'), fs = require('node:fs')
async function endpoint(file, { delivery = { data: { id: 'accepted' } }, limited = null, resendError = null, throws = false } = {}) {
  const calls = []
  const ctx = vm.createContext({ Response, URL, console, process: { env: { NEXT_PUBLIC_SITE_URL: 'https://theparlormagazine.com' } } })
  function mock(values) { return new vm.SyntheticModule(Object.keys(values), function () { for (const [k,v] of Object.entries(values)) this.setExport(k,v) }, { context: ctx }) }
  const db = { from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { id:'member', full_name:'Reader' } }) }) }
  const provider = { createClient: () => ({ auth: { admin: { generateLink: async () => ({ data: { properties: { action_link: 'https://auth.test/link' } } }) }, resend: async args => { calls.push(args); return { error: resendError } } } }) }
  const mod = new vm.SourceTextModule(fs.readFileSync(file,'utf8'), { context: ctx, importModuleDynamically: async () => { const m = mock(provider); await m.link(()=>{}); await m.evaluate(); return m } })
  await mod.link(spec => mock(spec.endsWith('apiAuth') ? { serviceClient: () => db } : spec.endsWith('authEmailRateLimit') ? { authEmailRateLimit: async () => limited } : spec.endsWith('passwordRecovery') ? { sendAccountPasswordLink: async () => true } : spec.endsWith('emails') ? { sendMagicLinkEmail: async () => { calls.push('send'); if(throws) throw Error('network'); return delivery } } : provider))
  await mod.evaluate()
  return { calls, post: body => mod.namespace.POST({ json: async () => body, url: 'https://local.test/api/auth' }) }
}
test('magic sign-in reports provider rejection, skip, missing receipt and exceptions as failures', async () => {
  for (const options of [{delivery:{error:{message:'rejected'}}},{delivery:{skipped:true}},{delivery:{}},{throws:true}]) {
    const api = await endpoint('app/api/auth/check-email/route.js', options)
    assert.equal((await api.post({email:'reader@example.com'})).status,503)
  }
  const api = await endpoint('app/api/auth/check-email/route.js')
  assert.equal((await api.post({email:'reader@example.com'})).status,200)
  assert.equal((await api.post(null)).status,400)
})
test('limited requests do not generate or send mail', async () => {
  const api = await endpoint('app/api/auth/check-email/route.js', { limited: Response.json({error:'wait'},{status:429,headers:{'Retry-After':'60'}}) })
  const response = await api.post({email:'reader@example.com'})
  assert.equal(response.status,429); assert.equal(response.headers.get('Retry-After'),'60'); assert.equal(api.calls.length,0)
})
test('confirmation resend uses signup verification and preserves article destination', async () => {
  const api = await endpoint('app/api/auth/resend-confirmation/route.js')
  assert.equal((await api.post({email:' Reader@Example.com ', returnTo:'/post/story'})).status,200)
  assert.equal(api.calls[0].type,'signup'); assert.equal(api.calls[0].email,'reader@example.com')
  assert.match(api.calls[0].options.emailRedirectTo,/flow=signup&returnTo=%2Fpost%2Fstory/)
})
test('resend conceals unknown accounts, exposes service errors and handles invalid bodies', async () => {
  for (const [error,status] of [[{code:'user_not_found'},200],[{code:'email_already_confirmed'},200],[{status:500},503],[{status:429},429]]) {
    const api = await endpoint('app/api/auth/resend-confirmation/route.js',{resendError:error})
    assert.equal((await api.post({email:'reader@example.com'})).status,status)
  }
  const api = await endpoint('app/api/auth/resend-confirmation/route.js')
  assert.equal((await api.post(null)).status,400)
})
test('shared limiter is staged, hashes identifiers and propagates retry windows', async () => {
  for (const [enabled,result,status] of [[false,90,null],[true,90,429],[true,0,null],[true,null,503]]) {
    const calls=[]
    const ctx=vm.createContext({Response,process:{env:{AUTH_EMAIL_RATE_LIMIT_ENABLED:String(enabled),SUPABASE_SERVICE_ROLE_KEY:'test-secret',NETLIFY:'true'}}})
    const mod=new vm.SourceTextModule(fs.readFileSync('lib/authEmailRateLimit.js','utf8'),{context:ctx})
    await mod.link(()=>new vm.SyntheticModule(['createHmac','isIP'],function(){this.setExport('createHmac',require('node:crypto').createHmac);this.setExport('isIP',require('node:net').isIP)},{context:ctx}));await mod.evaluate()
    const response=await mod.namespace.authEmailRateLimit(new Request('https://local.test',{headers:{'x-nf-client-connection-ip':'192.0.2.1'}}),{rpc:async(name,args)=>{calls.push(args);return{data:result}}},'reader@example.com')
    assert.equal(response?.status||null,status)
    if(enabled){assert.match(calls[0].email_key,/^[a-f0-9]{64}$/);assert.match(calls[0].ip_key,/^[a-f0-9]{64}$/)}else assert.equal(calls.length,0)
  }
})

 test('IP buckets trust only valid Netlify client addresses on Netlify', async () => {
  const hash = value => require('node:crypto').createHmac('sha256','test-secret').update(value).digest('hex')
  for (const [platform, headers, expected] of [
    ['true', {'x-nf-client-connection-ip':'192.0.2.1', 'x-forwarded-for':'198.51.100.1'}, '192.0.2.1'],
    ['true', {'x-nf-client-connection-ip':'2001:db8::1'}, '2001:db8::1'],
    ['true', {'x-nf-client-connection-ip':'192.0.2.1, 198.51.100.1'}, null],
    ['true', {'x-nf-client-connection-ip':'invalid'}, null],
    ['true', {'x-vercel-forwarded-for':'192.0.2.1','x-forwarded-for':'192.0.2.1'}, null],
    ['false', {'x-nf-client-connection-ip':'192.0.2.1'}, null],
  ]) {
    const ctx=vm.createContext({Response,process:{env:{AUTH_EMAIL_RATE_LIMIT_ENABLED:'true',SUPABASE_SERVICE_ROLE_KEY:'test-secret',NETLIFY:platform}}})
    const mod=new vm.SourceTextModule(fs.readFileSync('lib/authEmailRateLimit.js','utf8'),{context:ctx})
    await mod.link(spec=>{const values=require(spec);const key=spec==='node:net'?'isIP':'createHmac';return new vm.SyntheticModule([key],function(){this.setExport(key,values[key])},{context:ctx})});await mod.evaluate()
    let claimed
    const response=await mod.namespace.authEmailRateLimit(new Request('https://local.test',{headers}),{rpc:async(name,args)=>{claimed=args;return{data:0}}},'reader@example.com')
    assert.equal(response,null)
    assert.equal(claimed.ip_key,expected?hash(`ip:${expected}`):null)
    assert.equal(claimed.email_key,hash('email:reader@example.com'))
  }
})
