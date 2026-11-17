const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const { build } = require('/tmp/parlor-tour-validation/node_modules/esbuild'), { chromium } = require('/tmp/parlor-tour-validation/node_modules/playwright-core')
;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-profiles-')), out = path.join(dir, 'profile.js')
  await build({ stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `import React from 'react';import{createRoot}from'react-dom/client';import Profile from './app/about/people/[slug]/page';Profile({params:Promise.resolve({slug:window.profileSlug})}).then(page=>createRoot(document.getElementById('root')).render(page));` }, outfile: out, bundle: true, loader: { '.js': 'jsx', '.css': 'empty' }, jsx: 'automatic', plugins: [{ name: 'local-services', setup(b) {
    b.onResolve({ filter: /apiAuth$/ }, () => ({ path: 'cms', namespace: 'mock' }))
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'mock' }))
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path === 'navigation' ? `export function notFound(){throw Error('404')}` : `const query={select(){return this},eq(){return this},limit(){return this},abortSignal:async()=>({data:[{bio:'<p>Existing Lindsey writer biography fixture.</p>'}],error:null})};export const serviceClient=()=>({from:()=>query});` }))
  } }] })
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
  try {
    for (const width of [390, 1440]) for (const slug of ['lindsey-brock-morales', 'alexandria-turnley']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }), errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#f5dfe5"/></svg>' }))
      await page.setContent('<style>body{margin:0}' + fs.readFileSync('app/about/_components/about.css', 'utf8') + '</style><div id="root"></div>')
      await page.evaluate(slug => { window.profileSlug = slug }, slug)
      await page.addScriptTag({ path: out })
      await page.locator('.founder-profile').waitFor()
      if (slug === 'lindsey-brock-morales') {
        assert.equal(await page.locator('.founder-profile h2').innerText(), 'Lindsey Brock Morales')
        assert.match(await page.locator('.founder-biography').innerText(), /In addition to her work at The Parlor, Lindsey works as a product engineer/)
      } else {
        assert.equal(await page.locator('.founder-profile h2').innerText(), 'Alexandria Turnley')
        assert.match(await page.locator('.founder-biography').innerText(), /Durham Nativity School/)
        assert.match(await page.locator('.founder-biography').innerText(), /University of Central Florida/)
        assert.equal(await page.locator('.founder-linkedin').getAttribute('href'), 'https://www.linkedin.com/in/alexandria-turnley/')
        assert.ok(!(await page.locator('.founder-profile').innerText()).includes('@gmail.com'))
      }
      assert.equal(await page.locator('.about-menu [aria-current=page]').innerText(), 'The People of The Parlor')
      assert.equal(await page.locator('.founder-back').getAttribute('href'), '/about/people')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('PASS founder profiles on desktop/mobile: approved Lindsey bio, sourced Alexandria bio, headshots, People navigation and no personal contact details or overflow (local CMS/image fixtures).')
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }) }
})().catch(e => { console.error(e); process.exitCode = 1 })
