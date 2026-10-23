// Reuse the existing GIF; no database, credentials, or generated replacement art.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process')
const {chromium}=require(path.join(process.env.TOUR_BROWSER_TOOLS||'/tmp/parlor-tour-validation/node_modules','playwright-core'))
;(async()=>{
 const root=path.resolve(__dirname,'..'),base=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'parlor-tot-share-')),'base.png')
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']})
 try{const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;background:#000}main{width:1200px;height:630px;display:flex}.copy{width:700px;height:630px;padding:48px 52px;background:linear-gradient(145deg,#f1d3d8,#f7ece0);display:flex;flex-direction:column;color:#7a1f3d}.brand{font-size:28px;font-weight:bold;margin-bottom:42px}.kicker{font-size:15px;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px}h1{font-size:66px;line-height:1.04;margin:0 0 24px;letter-spacing:-2px}p{font-size:24px;line-height:1.4;color:#51434a;margin:0}.url{margin-top:auto;font-size:18px}.scene{width:500px;background:#000}</style><main><section class="copy"><div class="brand">The Parlor</div><div class="kicker">Knock. Choose. Collect.</div><h1>Trick or Treat<br>at The Parlor</h1><p>Start with your Parlor tote.<br>Choose one treat from each house<br>to complete your five-piece bundle.</p><div class="url">theparlormagazine.com/trick-or-treat</div></section><div class="scene"></div></main>`);await page.screenshot({path:base})}finally{await browser.close()}
 execFileSync('python',['-c',`
from PIL import Image, ImageSequence
import sys
base=Image.open(sys.argv[1]).convert('RGB')
source=Image.open(sys.argv[2])
frames=[];durations=[]
for frame in ImageSequence.Iterator(source):
 canvas=base.copy()
 art=frame.convert('RGBA');art.thumbnail((500,630),Image.Resampling.LANCZOS)
 canvas.paste(art,(700+(500-art.width)//2,(630-art.height)//2),art)
 frames.append(canvas.quantize(colors=128));durations.append(frame.info.get('duration',100))
# Frame 134 shows all four collected treats. Use it for the still and GIF
# opening frame, since some link preview clients freeze the GIF at frame one.
poster=min(134,len(frames)-1)
frames[poster].convert('RGB').save(sys.argv[3])
# Keep the original loop duration while reducing download size for previews.
indices=list(range(poster,len(frames),2))+list(range(0,poster,2))
compact=[frames[i] for i in indices]
timing=[sum(durations[i:i+2]) for i in indices]
compact[0].save(sys.argv[4],save_all=True,append_images=compact[1:],duration=timing,loop=0,optimize=True,disposal=1)
 `,base,path.join(root,'public/trick-or-treat-email.gif'),path.join(root,'public/trick-or-treat-social.png'),path.join(root,'public/trick-or-treat-social.gif')],{stdio:'inherit'})
})().catch(e=>{console.error(e);process.exitCode=1})
