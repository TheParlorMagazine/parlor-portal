const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

async function load(result, throws = false) {
  const calls = []
  const query = {}
  for (const method of ['select', 'eq', 'not', 'or', 'lte', 'order', 'limit']) query[method] = (...args) => { calls.push([method, ...args]); return query }
  query.abortSignal = async signal => { calls.push(['abortSignal', signal]); if (throws) throw Error('offline'); return result }
  const serviceClient = () => ({ from: table => { calls.push(['from', table]); return query } })
  const context = vm.createContext({ Date, encodeURIComponent, AbortSignal })
  const dependency = new vm.SyntheticModule(['serviceClient'], function () { this.setExport('serviceClient', serviceClient) }, { context })
  const module = new vm.SourceTextModule(fs.readFileSync('lib/aboutLatestIssue.js', 'utf8'), { context })
  await module.link(() => dependency); await module.evaluate()
  return { run: module.namespace.latestAboutIssueHref, calls }
}

test('About latest-issue link uses a published issue article and an encoded ID', async () => {
  const { run, calls } = await load({ data: [{ issue_id: 'issue/2"' }], error: null })
  assert.equal(await run(), '/issue/issue%2F2%22')
  assert.ok(calls.some(x => x[0] === 'eq' && x[1] === 'published' && x[2] === true))
  assert.ok(calls.some(x => x[0] === 'not' && x[1] === 'issue_id'))
  assert.ok(calls.some(x => x[0] === 'lte' && x[1] === 'date_published' && Number.isFinite(Date.parse(x[2]))))
})
test('About page keeps a public issue destination when discovery is empty or fails', async () => {
  for (const result of [{ data: [], error: null }, { data: [{ issue_id: 1 }], error: { message: 'unavailable' } }]) {
    assert.equal(await (await load(result)).run(), '/print')
  }
  assert.equal(await (await load(null, true)).run(), '/print')
})
