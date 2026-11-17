const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
const { parseDocument } = require('htmlparser2')
async function load() {
  const context = vm.createContext({ AbortSignal })
  const parser = new vm.SyntheticModule(['parseDocument'], function () { this.setExport('parseDocument', parseDocument) }, { context })
  const auth = new vm.SyntheticModule(['serviceClient'], function () { this.setExport('serviceClient', () => { throw Error('offline') }) }, { context })
  const module = new vm.SourceTextModule(fs.readFileSync('lib/founderBio.js', 'utf8'), { context })
  await module.link(specifier => specifier === 'htmlparser2' ? parser : auth); await module.evaluate()
  return module.namespace
}
test('Existing founder biography keeps wording and paragraphs without executing CMS markup', async () => {
  const { biographyParagraphs, getFounderBiography } = await load()
  const bio = '<p>Lindsey is a <strong>writer &amp; editor</strong>.</p><p>Second paragraph.<script>bad()</script></p>'
  assert.deepEqual(Array.from(biographyParagraphs(bio)), ['Lindsey is a writer & editor.', 'Second paragraph.'])
  const q = { select() { return this }, eq(key, slug) { assert.equal(key, 'slug'); assert.equal(slug, 'lindsey-brock-morales'); return this }, limit() { return this }, abortSignal: async () => ({ data: [{ bio }], error: null }) }
  assert.deepEqual(Array.from(await getFounderBiography({ writerSlug: 'lindsey-brock-morales', introduction: 'Fallback' }, { from: table => { assert.equal(table, 'writers'); return q } })), ['Lindsey is a writer & editor.', 'Second paragraph.'])
})
test('Unavailable biography uses only the confirmed role introduction', async () => {
  const { getFounderBiography } = await load()
  const intro = 'Confirmed role only.'
  assert.deepEqual(Array.from(await getFounderBiography({ writerSlug: 'lindsey-brock-morales', introduction: intro })), [intro])
  assert.deepEqual(Array.from(await getFounderBiography({ introduction: intro })), [intro])
})

test('A sourced profile biography is used without replacing it with a CMS fallback', async () => {
  const { getFounderBiography } = await load()
  assert.deepEqual(Array.from(await getFounderBiography({ biography: ['Sourced paragraph one.', 'Sourced paragraph two.'], introduction: 'Role only.' })), ['Sourced paragraph one.', 'Sourced paragraph two.'])
})
