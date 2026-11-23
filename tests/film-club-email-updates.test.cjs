const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
async function load(path, mocks) {
  const context = vm.createContext({ console, Date, Intl, process: { env: {} } })
  const module = new vm.SourceTextModule(fs.readFileSync(path, 'utf8'), { context })
  await module.link(name => {
    const values = mocks[name]; assert.ok(values, `Unexpected dependency ${name}`)
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key,value] of Object.entries(values)) this.setExport(key,value) }, { context })
  })
  await module.evaluate(); return module.namespace
}
test('Film Club built-in previews render branded safe HTML without constructing an email client', async () => {
  const emails = await load('lib/emails.js', { './sendEmail': { deliver() { throw Error('Preview must not send email') } } })
  for (const type of ['film_club_rsvp','film_club_reminder','film_club_discussion']) {
    const html = emails.renderDefaultEmail(type, { eventTitle: '<script>film</script>', eventWhen: 'Tomorrow UTC', eventUrl: 'https://example.invalid/event', forumUrl: 'https://example.invalid/forum' })
    assert.match(html, /Film Club/); assert.match(html, /The Parlor Magazine/)
    assert.match(html, /&lt;script&gt;film&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/)
    if (type === 'film_club_rsvp') assert.match(html, /viewing link shortly/)
  }
})
function queue(records, rpcError = null) {
  const updates = [], calls = []
  return { updates, calls, db: {
    rpc: async name => { calls.push(name); return { data: records, error: rpcError } },
    from: table => ({ update: value => ({ eq: async (key,id) => { updates.push({ table, value, key, id }); return {} } }) }),
  } }
}
test('Film Club queues preserve recipient, discussion links and stable delivery idempotency keys', async () => {
  const sent = []
  const api = await load('lib/filmClubEmails.js', {
    './emails': { renderDefaultEmail: (type,vars) => `${type}: ${vars.eventTitle}` },
    './sendEmail': { deliver: async message => { sent.push(message); return { data: { id: 'accepted' } } } },
  })
  const q = queue([{ id: 'delivery', email: 'contact@example.invalid', title: 'Film & community', forum_id: 'discussion', starts_at: '2026-12-12T19:00:00Z' }])
  assert.equal((await api.deliverFilmClubDiscussionEmails(q.db)).sent, 1)
  assert.equal(sent[0].to, 'contact@example.invalid')
  assert.equal(sent[0].idempotencyKey, 'film-club-discussion/delivery')
  assert.equal(sent[0].vars.forumUrl, 'https://theparlormagazine.com/portal/forums/discussion')
  assert.equal((await api.deliverFilmClubReminderEmails(q.db)).sent, 1)
  assert.equal(sent[1].idempotencyKey, 'film-club-reminder/delivery')
  assert.match(sent[1].vars.eventWhen, /UTC/)
  assert.equal(q.updates[1].table, 'film_club_reminder_deliveries')
})
test('disabled or failed Film Club emails remain unsent and missing reminder setup is explicit', async () => {
  for (const result of [{ skipped: true }, { error: { message: 'rejected' } }]) {
    const api = await load('lib/filmClubEmails.js', { './emails': { renderDefaultEmail: () => 'HTML' }, './sendEmail': { deliver: async () => result } })
    const q = queue([{ id:'delivery',email:'contact@example.invalid',title:'Film',starts_at:'2026-12-12T19:00:00Z' }])
    const status = await api.deliverFilmClubReminderEmails(q.db)
    assert.equal(status.sent, 0); assert.equal(q.updates.length, 0)
    const missing = await api.deliverFilmClubReminderEmails(queue(null, { code: 'PGRST202' }).db)
    assert.equal(missing.configured, false)
  }
})
