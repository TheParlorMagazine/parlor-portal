const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')

async function newsletter(){
  const context=vm.createContext({URL})
  const module=new vm.SourceTextModule(fs.readFileSync('lib/newsletter.js','utf8'),{context})
  await module.link(async()=>{const images=new vm.SourceTextModule(fs.readFileSync('lib/campaignEmailStyles.js','utf8'),{context});await images.link(()=>{});return images});await module.evaluate()
  return module.namespace
}

test('newsletter article and issue links use the public domain despite a deployment base URL',async()=>{
  const module=await newsletter()
  for(const baseUrl of ['https://theparlormagazine.netlify.app','https://deploy-preview-1--theparlormagazine.netlify.app','http://localhost:3000',undefined]){
    const {html}=module.buildNewsletter({baseUrl,articles:[{slug:'deported-to-liberia-again',title:'Standalone article'}],issue:{id:'issue-id',title:'Issue'},issueArticles:[{slug:'issue-story',title:'Issue story'}]})
    assert.match(html,/href="https:\/\/theparlormagazine.com\/post\/deported-to-liberia-again"/)
    assert.match(html,/href="https:\/\/theparlormagazine.com\/post\/issue-story"/)
    assert.doesNotMatch(html,/netlify\.app|localhost/)
  }
})

test('transparent print promotions use a white email derivative and link to the purchase destination, leaving the original asset unchanged',async()=>{
  const module=await newsletter()
  for(const key of ['newsletter_image','cover_image_url']){
    const original='https://res.cloudinary.com/demo/image/upload/v123/transparent-cover.png'
    const issue={id:'issue',title:'The World',number:2,[key]:original,newsletter_button_url:'/plans',newsletter_section_title:'Subscribe to print'}
    const {html}=module.buildNewsletter({issue})
    assert.match(html,/<a href="https:\/\/theparlormagazine.com\/plans"[^>]*style="[^"]*background:#ffffff[^>]*><img src="https:\/\/res.cloudinary.com\/demo\/image\/upload\/b_rgb:ffffff,f_jpg\/v123\/transparent-cover.png"/)
    assert.match(html,/background-color:#ffffff;" alt="Issue 2 print edition"/)
    assert.equal(issue[key],original)
    assert.doesNotMatch(html,/download=/)
  }
})

test('single-product and shop-grid artwork use white email derivatives with product-page links',async()=>{
  const module=await newsletter(),original='https://res.cloudinary.com/demo/image/upload/v123/print-trio.png'
  const trio={id:'trio',name:'The Parlor Print Trio: Pick Any Three',images:[original],price:45}
  for(const count of [1,2,3]){
    const shopProducts=[trio,...Array.from({length:count-1},(_,i)=>({id:'product-'+i,name:'Other product',images:[],price:10}))]
    const {html}=module.buildNewsletter({shopProducts})
    assert.match(html,/<a href="https:\/\/theparlormagazine.com\/shop\/trio"[^>]*style="[^"]*background:#ffffff[^>]*><img src="https:\/\/res.cloudinary.com\/demo\/image\/upload\/b_rgb:ffffff,f_jpg\/v123\/print-trio.png"/)
    assert.match(html,/background-color:#ffffff;" alt="The Parlor Print Trio: Pick Any Three"/)
    assert.equal(trio.images[0],original)
  }
})

test('newsletter image destinations support full URLs and website paths without duplicating the domain',async()=>{
  const module=await newsletter()
  for(const url of ['/plans?offer=print&source=email','https://theparlormagazine.com/plans?offer=print&source=email']){
    const {html}=module.buildNewsletter({issue:{id:'issue',title:'Print issue',newsletter_image:'https://res.cloudinary.com/demo/image/upload/print.png',newsletter_button_url:url,newsletter_button2_url:'https://theparlormagazine.com/plans'}})
    assert.match(html,/href="https:\/\/theparlormagazine.com\/plans\?offer=print&amp;source=email"[^>]*><img/)
    assert.doesNotMatch(html,/theparlormagazine.com\/https?:/)
  }
  const {html}=module.buildNewsletter({shopProducts:[{id:'trio',name:'Print Trio',images:['https://res.cloudinary.com/demo/image/upload/trio.png'],external_url:'javascript:alert(1)'}]})
  assert.match(html,/href="https:\/\/theparlormagazine.com\/shop\/trio"/);assert.doesNotMatch(html,/javascript:/)
})

test('announcement transparency matches its pink block and links only when a destination is provided',async()=>{
  const module=await newsletter(),original='https://res.cloudinary.com/demo/image/upload/v123/trick-or-treat.png'
  for(const url of ['/trick-or-treat','']){
    const issue={id:'issue',newsletter_announcement_title:'Trick or Treat at The Parlor',newsletter_announcement_img:original,newsletter_announcement_url:url}
    const {html}=module.buildNewsletter({issue,sections:{issuPromo:false}})
    assert.match(html,/src="https:\/\/res.cloudinary.com\/demo\/image\/upload\/b_rgb:fdf0f3,f_jpg\/v123\/trick-or-treat.png"/)
    assert.match(html,/background-color:#fdf0f3;" alt="Trick or Treat at The Parlor"/)
    if(url)assert.match(html,/<a href="https:\/\/theparlormagazine.com\/trick-or-treat"[^>]*><img/)
    else assert.doesNotMatch(html,/<a[^>]*><img[^>]*class="ann-img"/)
    assert.equal(issue.newsletter_announcement_img,original)
  }
})
