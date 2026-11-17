// Actual Mission page with a local CMS fixture; no live services or image downloads.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const { build } = require('/tmp/parlor-tour-validation/node_modules/esbuild')
const { chromium } = require('/tmp/parlor-tour-validation/node_modules/playwright-core')
const groups = [
  ['the-battle-for-the-southwest', 'occupied-minnesota-inside-the-resistance-to-operation-metro-surge'],
  ['following-the-foodways', 'layers-of-paint-and-purpose'],
  ['holding-space-lib-lula-books-co', 'building-damsel'],
  ['who-gets-to-save-the-planet', 'growing-something-that-lasts'],
]
;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-cards-')), out = path.join(dir, 'page.js')
  const articles = groups.flat().map((slug, i) => ({ slug, title: `Fixture published title ${i + 1}`, cover_image_url: `https://fixture.test/${i}.svg` }))
  await build({ stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `import React from 'react';import{createRoot}from'react-dom/client';import Mission from './app/about/mission/page';Mission().then(page=>createRoot(document.getElementById('root')).render(page));` }, bundle: true, outfile: out, loader: { '.js': 'jsx', '.css': 'empty' }, jsx: 'automatic', plugins: [{ name: 'local-cms', setup(b) {
    b.onResolve({ filter: /apiAuth$/ }, () => ({ path: 'cms', namespace: 'mock' }))
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `const q={select(){return this},in(){return this},eq(){return this},lte(){return this},abortSignal:async()=>({data:${JSON.stringify(articles)},error:null})};export const serviceClient=()=>({from:()=>q});` }))
  } }] })
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }), errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#f5dfe5"/></svg>' }))
      await page.setContent(`<style>body{margin:0}${fs.readFileSync('app/about/_components/about.css', 'utf8')}</style><div id="root"></div>`)
      await page.addScriptTag({ path: out })
      await page.locator('.mission-article-card').last().waitFor()
      assert.equal(await page.locator('.mission-article-card').count(), 8)
      assert.equal(await page.locator('#collective .founding-team-card').count(), 2)
      assert.equal(await page.getByRole('link', { name: 'Read more about Lindsey Brock Morales' }).getAttribute('href'), '/about/people/lindsey-brock-morales')
      assert.equal(await page.getByRole('link', { name: 'Read more about Alexandria Turnley' }).getAttribute('href'), '/about/people/alexandria-turnley')
      assert.equal(await page.locator('.mission-article-card[href="/post/occupied-minnesota-inside-the-resistance-to-operation-metro-surge"] span').innerText(), 'Occupied Minnesota')
      const areas = page.locator('.mission-areas > div')
      for (let i = 0; i < 4; i++) {
        const area = areas.nth(i), cards = area.locator('.mission-article-card')
        assert.deepEqual(await cards.evaluateAll(es => es.map(e => e.getAttribute('href'))), groups[i].map(slug => `/post/${slug}`))
        assert.ok((await cards.first().boundingBox()).y > (await area.locator('p').boundingBox()).y)
        assert.equal(await cards.first().locator('img').evaluate(e => getComputedStyle(e).objectFit), 'cover')
      }
      const image = page.locator('.mission-purpose-image')
      assert.match(await page.locator('.mission-purpose-figure').evaluate(e => e.previousElementSibling.textContent), /^We approach this work/)
      assert.equal(await image.evaluate(e => getComputedStyle(e).objectFit), 'contain')
      assert.match(await page.locator('.mission-purpose-figure figcaption').innerText(), /The Parlor Magazine\/Thaïs Llorca/)
      assert.equal(await page.locator('.mission-purpose-figure figcaption a').getAttribute('href'), '/post/cabo-rojo-no-se-vende-cabo-rojo-is-not-for-sale')
      assert.equal(await page.locator('.about-home').evaluate(e => getComputedStyle(e).fontSize), '13px')
      await page.locator('.about-home').hover()
      assert.equal(await page.locator('.about-home').evaluate(e => getComputedStyle(e).color), 'rgb(26, 26, 26)')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('PASS actual Mission page with local CMS records: all eight article links, correct focus groups, thumbnails below text, responsive layout, purpose image and donation-style Home link.')
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }) }
})().catch(e => { console.error(e); process.exitCode = 1 })
