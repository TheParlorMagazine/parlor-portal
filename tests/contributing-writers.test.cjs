const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
async function load() {
  const context = vm.createContext({ Date, AbortSignal })
  const module = new vm.SourceTextModule(fs.readFileSync('lib/contributingWriters.js', 'utf8'), { context })
  await module.link(name => new vm.SyntheticModule(name === 'react' ? ['cache'] : ['serviceClient'], function () {
    if (name === 'react') this.setExport('cache', fn => fn)
    else this.setExport('serviceClient', () => { throw Error('not configured') })
  }, { context }))
  await module.evaluate(); return module.namespace
}
function fixture(pages) {
  const calls = [], q = {}; let page = 0
  for (const key of ['select', 'order', 'range', 'eq', 'lte']) q[key] = (...args) => { calls.push([key, ...args]); return q }
  q.abortSignal = async () => pages[page++] || { data: [] }
  return { db: { from: table => { calls.push(['from', table]); return q } }, calls }
}
test('writer directory paginates and selects only public profile fields', async () => {
  const api = await load(), records = Array.from({ length: 500 }, (_, id) => ({ id, name: `Writer ${id}`, slug: `writer-${id}`, photo_url: 'https://fixture.invalid/photo.jpg' }))
  const f = fixture([{ data: records }, { data: [{ id: 501, name: 'Last writer', slug: 'last', photo_url: 'javascript:bad' }, { name: 'Missing slug' }] }])
  const result = await api.fetchContributingWriters(f.db)
  assert.equal(result.length, 501); assert.equal(result[500].photo_url, null)
  assert.ok(f.calls.some(c => c[0] === 'range' && c[1] === 500))
  assert.equal(f.calls.find(c => c[0] === 'select')[1], 'id, name, slug, photo_url, bio')
})
test('writer articles are scoped by ID and restricted to already published work', async () => {
  const api = await load(), f = fixture([{ data: [{ slug: 'story', title: 'Story', cover_image_url: 'data:bad' }] }])
  const result = await api.getWriterArticles('writer-id', f.db)
  assert.equal(result[0].cover_image_url, null)
  assert.ok(f.calls.some(c => c[0] === 'eq' && c[1] === 'author_id' && c[2] === 'writer-id'))
  assert.ok(f.calls.some(c => c[0] === 'eq' && c[1] === 'published' && c[2] === true))
  assert.ok(f.calls.some(c => c[0] === 'lte' && c[1] === 'date_published'))
})
test('CMS failures are surfaced rather than presented as missing profiles', async () => {
  const api = await load(), f = fixture([{ error: new Error('unavailable') }])
  await assert.rejects(api.fetchContributingWriters(f.db), /unavailable/)
})
