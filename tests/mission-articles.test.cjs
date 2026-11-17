const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
async function load() {
  const context = vm.createContext({ Date, encodeURIComponent, AbortSignal })
  const dependency = new vm.SyntheticModule(['serviceClient'], function () { this.setExport('serviceClient', () => { throw Error('not configured') }) }, { context })
  const module = new vm.SourceTextModule(fs.readFileSync('lib/missionArticles.js', 'utf8'), { context })
  await module.link(() => dependency); await module.evaluate()
  return module.namespace
}
function fixture(data, error = null) {
  const calls = [], query = {}
  for (const key of ['select', 'in', 'eq', 'lte']) query[key] = (...args) => { calls.push([key, ...args]); return query }
  query.abortSignal = async () => ({ data, error })
  return { db: { from: () => query }, calls }
}
test('Mission cards keep all eight selected links in their requested groups and order', async () => {
  const { getMissionArticles, missionArticleSlugs } = await load()
  const records = Array.from(missionArticleSlugs.flat(), (slug, i) => ({ slug, title: `Published title ${i}`, cover_image_url: `https://fixture.invalid/${i}.jpg` })).reverse()
  const { db, calls } = fixture(records)
  const groups = await getMissionArticles(db)
  assert.equal(groups.length, 4)
  for (let i = 0; i < 4; i++) assert.deepEqual(Array.from(groups[i], a => a.href), Array.from(missionArticleSlugs[i], slug => `/post/${slug}`))
  assert.equal(groups[0][0].title, 'Published title 0')
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'published' && c[2] === true))
})
test('Mission cards do not invent missing articles or images and tolerate lookup failures', async () => {
  const { getMissionArticles, missionArticleSlugs } = await load()
  const { db } = fixture([{ slug: missionArticleSlugs[0][0], title: 'Published title', cover_image_url: 'javascript:invalid' }])
  const groups = await getMissionArticles(db)
  assert.equal(groups[0][0].image, null)
  assert.equal(groups.flat().length, 1)
  assert.equal((await getMissionArticles(fixture(null, { message: 'unavailable' }).db)).flat().length, 0)
  assert.equal((await getMissionArticles()).flat().length, 0)
})
