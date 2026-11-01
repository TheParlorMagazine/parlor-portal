const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')

test('newsletter article and issue links use the public domain despite a deployment base URL',async()=>{
  const module=new vm.SourceTextModule(fs.readFileSync('lib/newsletter.js','utf8'),{context:vm.createContext({URL})})
  await module.link(()=>{});await module.evaluate()
  for(const baseUrl of ['https://theparlormagazine.netlify.app','https://deploy-preview-1--theparlormagazine.netlify.app','http://localhost:3000',undefined]){
    const {html}=module.namespace.buildNewsletter({baseUrl,articles:[{slug:'deported-to-liberia-again',title:'Standalone article'}],issue:{id:'issue-id',title:'Issue'},issueArticles:[{slug:'issue-story',title:'Issue story'}]})
    assert.match(html,/href="https:\/\/theparlormagazine.com\/post\/deported-to-liberia-again"/)
    assert.match(html,/href="https:\/\/theparlormagazine.com\/post\/issue-story"/)
    assert.doesNotMatch(html,/netlify\.app|localhost/)
  }
})
