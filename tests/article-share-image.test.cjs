const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { build } = require('/tmp/parlor-tour-validation/node_modules/esbuild')
async function route(entry) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'article-card-test-')), 'route.cjs')
  await build({ entryPoints: [entry], outfile: out, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx' }, packages: 'external', plugins: [{ name: 'db', setup(b) {
    b.onResolve({ filter: /lib\/(supabase|apiAuth)$/ }, () => ({ path: 'db', namespace: 'mock' }))
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `export const createClient=()=>global.cardDB;export const serviceClient=createClient;export const requireUser=async()=>global.cardUser;export const memberOf=async()=>({role:global.cardRole});` }))
  } }] })
  // Resolve dependencies from the repository for the temporary bundle.
  return require(out)
}
function database(article) {
  const filters = []
  return { filters, from(table) { assert.equal(table, 'articles'); return { select() { return this }, eq(...args) { filters.push(args); return this }, async single() { return { data: article } } } } }
}
const request = body => ({ json: async () => body })
test('public PNG uses published-only lookup, correct size and a cover fallback', async () => {
  const api = await route('app/post/[slug]/share-image/route.js')
  global.cardDB = database({ title: 'Independent ideas and shared conversations', author_name: 'A writer', category: 'Society & Culture', cover_image_url: 'http://127.0.0.1/private' })
  const response = await api.GET({}, { params: Promise.resolve({ slug: 'example' }) })
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png')
  const png = Buffer.from(await response.arrayBuffer()); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630)
  fs.writeFileSync('/tmp/parlor-article-card-preview.png', png)
  assert.ok(global.cardDB.filters.some(([key, value]) => key === 'published' && value === true))
  global.cardDB = database(null); assert.equal((await api.GET({}, { params: { slug: 'draft' } })).status, 404)
})
test('draft card requires staff authentication and is private', async () => {
  const api = await route('app/api/admin/article-share-card/route.js')
  global.cardDB = database({ title: 'Private draft', author_name: 'Author' })
  global.cardUser = null; assert.equal((await api.POST(request({ article_id: 'draft' }))).status, 401)
  global.cardUser = { id: 'user' }; global.cardRole = 'member'; assert.equal((await api.POST(request({ article_id: 'draft' }))).status, 403)
  global.cardRole = 'admin'; assert.equal((await api.POST(request({}))).status, 400)
  const response = await api.POST(request({ article_id: 'draft' })); assert.equal(response.headers.get('cache-control'), 'private, no-store'); await response.arrayBuffer()
  assert.ok(global.cardDB.filters.some(([key, value]) => key === 'id' && value === 'draft'))
})

test('cover artwork renders with long titles and live writer credit', async () => {
  const api = await route('app/post/[slug]/share-image/route.js')
  global.cardDB = database({ title: 'How shared conversations and independent ideas help us imagine a more generous world together', author_name: 'Old name', writers: { name: 'Current writer' }, category: 'Society & Culture', cover_image_url: 'https://res.cloudinary.com/example/cover.png' })
  const originalFetch = global.fetch
  global.fetch = async () => new Response(fs.readFileSync('public/Victorian Birthday Tea Party Still Life.png'), { headers: { 'content-type': 'image/png' } })
  try {
    const response = await api.GET({}, { params: { slug: 'cover-example' } })
    const png = Buffer.from(await response.arrayBuffer()); assert.equal(png.readUInt32BE(16), 1200)
    fs.writeFileSync('/tmp/parlor-article-cover-preview.png', png)
  } finally { global.fetch = originalFetch }
})
