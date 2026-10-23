// Render a static card using the homepage birthday banner's artwork and colors.
// Uses Playwright/Chromium; set TOUR_BROWSER_TOOLS and CHROMIUM_PATH if needed.
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require(path.join(process.env.TOUR_BROWSER_TOOLS || '/tmp/parlor-tour-validation/node_modules', 'playwright-core'))
;(async () => {
  const root = path.resolve(__dirname, '..')
  const artwork = fs.readFileSync(path.join(root, 'public/Victorian Birthday Tea Party Still Life.png')).toString('base64')
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
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
    </style></head><body><main><section class="copy"><div class="brand">The Parlor</div><div class="eyebrow">A year of gathering</div><h1>Happy first<br>birthday,<br>The Parlor.</h1><p>Independent ideas.<br>Shared conversations.<br>A place to belong.</p><div class="url">www.theparlormagazine.com</div></section><div class="art"><img src="data:image/png;base64,${artwork}" alt=""></div></main></body></html>`)
    await page.locator('img').evaluate(img => img.decode())
    await page.screenshot({ path: path.join(root, 'public/parlor-social-card.png') })
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
