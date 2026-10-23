// Render a static card using the homepage birthday banner's artwork and colors.
// Uses Playwright/Chromium; set TOUR_BROWSER_TOOLS and CHROMIUM_PATH if needed.
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require(path.join(process.env.TOUR_BROWSER_TOOLS || '/tmp/parlor-tour-validation/node_modules', 'playwright-core'))
;(async () => {
  const root = path.resolve(__dirname, '..')
  const artwork = fs.readFileSync(path.join(root, 'public/Victorian Birthday Tea Party Still Life.png')).toString('base64')
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  fs.mkdirSync(path.join(root, 'public/social-cards'), { recursive: true })
  const formats = [
    { name: 'landscape', width: 1200, height: 630, output: 'parlor-social-card.png', css: '' },
    { name: 'square', width: 1080, height: 1080, output: 'social-cards/parlor-square.png', css: 'main{width:1080px;height:1080px;grid-template-columns:1fr;grid-template-rows:550px 530px}.copy{padding:48px 64px 30px}.brand{margin-bottom:20px;font-size:38px}h1{font-size:72px;line-height:1.03;margin-bottom:18px}p{width:auto;font-size:24px}.url{margin-top:24px;font-size:18px}.art img{object-position:center 50%}.art:after{background:linear-gradient(to bottom,#f2b8c6,rgba(242,184,198,.15) 24%,transparent 45%)}' },
    { name: 'portrait', width: 1080, height: 1350, output: 'social-cards/parlor-portrait.png', css: 'main{width:1080px;height:1350px;grid-template-columns:1fr;grid-template-rows:620px 730px}.copy{padding:64px 72px 36px}.brand{margin-bottom:28px;font-size:40px}h1{font-size:84px;line-height:1.05;margin-bottom:24px}p{width:auto;font-size:28px}.url{margin-top:30px;font-size:20px}.art img{object-position:center}.art:after{background:linear-gradient(to bottom,#f2b8c6,rgba(242,184,198,.15) 24%,transparent 45%)}' },
    { name: 'story', width: 1080, height: 1920, output: 'social-cards/parlor-story.png', css: 'main{width:1080px;height:1920px;grid-template-columns:1fr;grid-template-rows:850px 1070px}.copy{padding:170px 82px 50px}.brand{margin-bottom:38px;font-size:44px}.eyebrow{font-size:20px}h1{font-size:88px;line-height:1.06;margin-bottom:30px}p{width:auto;font-size:30px}.url{margin-top:36px;font-size:22px}.art img{object-position:center}.art:after{background:linear-gradient(to bottom,#f2b8c6,rgba(242,184,198,.15) 24%,transparent 45%)}' },
    { name: 'thumbnail', width: 600, height: 315, output: 'social-cards/parlor-thumbnail.png', css: 'main{transform:scale(.5);transform-origin:top left}' },
  ]
  try {
    for (const format of formats) {
    const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 })
    await page.setContent(`<!doctype html><html><head><style>
      *{box-sizing:border-box}body{margin:0;background:#f2b8c6;color:#0a0a0a;font-family:Georgia,'Times New Roman',serif}
      main{width:1200px;height:630px;display:grid;grid-template-columns:510px 690px;position:relative;overflow:hidden}
      .copy{padding:64px 0 52px 60px;position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start}
      .brand{font-size:34px;font-weight:bold;letter-spacing:-1px;margin-bottom:46px}
      .eyebrow{font-size:14px;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;color:#694c53}
      h1{font-size:61px;line-height:1.06;letter-spacing:-2px;margin:0 0 24px;font-weight:bold}
      p{font-size:22px;line-height:1.45;margin:0;width:390px;color:#47363b}
      .url{margin-top:auto;font-size:16px;letter-spacing:1px}
      .art{position:relative;background:#fdf8f5}.art img{height:100%;width:100%;object-fit:cover;object-position:48% center}
      .art:after{content:'';position:absolute;inset:0;background:linear-gradient(to right,#f2b8c6 0%,rgba(242,184,198,.35) 20%,transparent 42%,transparent 88%,rgba(253,248,245,.35))}
      ${format.css}
    </style></head><body><main><section class="copy"><div class="brand">The Parlor</div><div class="eyebrow">A year of gathering</div><h1>Happy first<br>birthday,<br>The Parlor.</h1><p>Independent ideas.<br>Shared conversations.<br>A place to belong.</p><div class="url">www.theparlormagazine.com</div></section><div class="art"><img src="data:image/png;base64,${artwork}" alt=""></div></main></body></html>`)
    await page.locator('img').evaluate(img => img.decode())
    if (['square', 'portrait', 'story'].includes(format.name)) {
      await page.locator('h1').evaluate(el => { el.innerHTML = 'Happy first birthday,<br>The Parlor.' })
      await page.locator('p').evaluate(el => { el.innerHTML = 'Independent ideas. Shared conversations.<br>A place to belong.' })
    }
    await page.screenshot({ path: path.join(root, 'public', format.output) })
    await page.close()
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
