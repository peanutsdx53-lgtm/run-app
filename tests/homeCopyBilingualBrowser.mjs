/** Home copy regression: real Chromium/WebKit screenshots for Japanese and English.
 * Uses empty isolated storage per viewport. Source data/science are not changed.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const output=resolve(root,'audit-output','home-copy-'+engine);
await mkdir(output,{recursive:true});
const url='http://127.0.0.1:'+server.address().port+'/#/home',measurements=[];
const expected={
 ja:{
  title:'ホーム',empty:'走行記録はまだありません',cta:'走行を記録する',
  link:'コンディションの履歴を見る',heading:'ホームの使い方',
  steps:['走行を記録する','保存した走行を見る','ホームを編集する'],
  note:'「コンディション」の「開く」から、睡眠・就床時間や起床時の調子を記録・確認できます。'
 },
 en:{
  title:'Home',empty:'No Running Records Yet',cta:'Record a Run',
  link:'View Condition History',heading:'How to Use Home',
  steps:['Record a Run','Review Saved Runs','Customize Home'],
  note:'Select Open in Condition to record or review sleep, time in bed, and how you felt on waking.'
 }
};
function within(rect,w){return rect.left>=-2&&rect.right<=w+2&&rect.width>0&&rect.height>0}
try{
 for(const width of [320,390,768,1440]){
  for(const language of ['ja','en']){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',locale:language==='ja'?'ja-JP':'en-US',serviceWorkers:'block'});
   await context.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
   },language);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.locator('.home-v3').waitFor();
   const copy=expected[language];
   assert.equal((await page.locator('.home-head h1').innerText()).trim(),copy.title,'translated home heading');
   const latest=page.locator('.hx-latest');
   assert.equal((await latest.locator('.hx-latest-empty strong').innerText()).trim(),copy.empty,'empty run copy');
   assert.equal(await latest.locator('.hx-latest-empty .hx-runmark').count(),0,'no duplicate runner icon');
   assert.equal(await latest.locator('.hx-latest-empty p').count(),0,'empty state has no explanatory paragraph');
   assert.equal(await latest.locator('.home-latest-action p,.home-latest-action small').count(),0,'CTA has no redundant text');
   assert.equal((await latest.locator('.home-latest-action a').innerText()).replace('›','').trim(),copy.cta,'single record CTA');
   assert.equal(await latest.locator('a[href="#/record-start"]').count(),1);
   const condition=page.locator('.hx-condition a[href="#/condition"]');
   assert.equal((await condition.innerText()).replace('›','').trim(),copy.link,'condition history is named directly');
   const obsolete=['記録は自分のペースで始められます。','手入力またはGPSを選択','手入力した走行を保存すると、ここに表示されます。','コンディションの歩みを見る','View Condition History','Saved manual runs appear here.','Choose Manual Entry or GPS','Start recording whenever you wish.'];
   const cardCopy=await page.locator('.hx-latest,.hx-condition').allInnerTexts();
   for(const old of obsolete)assert.ok(!cardCopy.join(' ').includes(old),'obsolete home copy: '+old);
   const boxed=await page.evaluate(()=>{
    const select=['.hx-latest','.hx-latest-empty','.home-latest-action','.home-latest-action a','.hx-condition','.hx-condition a[href="#/condition"]','.home-heading-actions'];
    const metrics=select.map(q=>{const el=document.querySelector(q),r=el?.getBoundingClientRect();return {selector:q,left:r?.left,right:r?.right,top:r?.top,bottom:r?.bottom,width:r?.width,height:r?.height,scrollWidth:el?.scrollWidth,clientWidth:el?.clientWidth}});
    return {documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,metrics};
   });
   assert.ok(boxed.documentWidth<=width+2&&boxed.bodyWidth<=width+2,'home overflows horizontally '+JSON.stringify({width,language,boxed}));
   for(const m of boxed.metrics)assert.ok(within(m,width),'home UI clipped '+JSON.stringify({width,language,m}));
   await page.screenshot({path:resolve(output,'home-'+language+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   const toggle=page.locator('[data-home-guide-toggle]');
   await toggle.click();
   const guide=page.locator('#home-screen-guide');
   assert.equal((await guide.locator('h2').innerText()).trim(),copy.heading);
   assert.equal(await guide.locator('.hx-guide-eyebrow').count(),0,'no duplicate eyebrow');
   assert.equal(await guide.locator('.hx-guide-bar p').count(),0,'no guide intro');
   const li=guide.locator('li');
   assert.equal(await li.count(),3);
   for(let i=0;i<3;i++)assert.equal((await li.nth(i).locator('strong').innerText()).trim(),copy.steps[i]);
   assert.equal((await guide.locator('.hx-guide-note').innerText()).trim(),copy.note);
   const guideText=await guide.innerText();
   for(const old of ['すべて記録する必要はありません','入力しない日があっても問題ありません','画面ガイド · ホーム','Use Only the Features You Need','It is fine to have days without entries'])assert.ok(!guideText.includes(old),'outdated negation: '+old);
   const boxes=await guide.evaluate(g=>{
    const a=[g,...g.querySelectorAll('.hx-guide-bar,.hx-guide-close,li,.hx-guide-note')];
    return {documentWidth:document.documentElement.scrollWidth,items:a.map(el=>{const r=el.getBoundingClientRect();return {selector:el.tagName,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,overflow:el.scrollWidth-el.clientWidth}})};
   });
   assert.ok(boxes.documentWidth<=width+2,'open guide overflows page '+JSON.stringify({width,language,boxes}));
   for(const m of boxes.items)assert.ok(within(m,width),'guide item outside viewport '+JSON.stringify({width,language,m}));
   const steps=boxes.items.filter(x=>x.selector==='LI');
   if(width<=800)assert.ok(steps[0].bottom<=steps[1].top+1&&steps[1].bottom<=steps[2].top+1,'mobile guide order');
   else assert.ok(steps[0].right<=steps[1].left+2&&steps[1].right<=steps[2].left+2,'desktop guide order');
   await page.screenshot({path:resolve(output,'guide-'+language+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   await guide.locator('[data-home-guide-close]').click();
   assert.equal(await page.locator('#home-screen-guide').isHidden(),true);
   // Hidden widgets and available actions must be correctly localized.
   await page.locator('[data-home-edit]').click();
   const editTitles=language==='en'?{
    latest:'Latest Activity',condition:'Condition',topics:'Milestones',
    shortcuts:'Quick Access',trend:'Changes in Activity Records',discovery:'Continue Exploring'
   }:null;
   if(editTitles)for(const [id,title] of Object.entries(editTitles)){
    const label=(await page.locator('[data-home-dashboard-id="'+id+'"] .widget-edit-label').innerText()).trim();
    assert.equal(label,title+(['trend','discovery'].includes(id)?' (Hidden)':''),
      'English editor title and hidden state: '+id);
   }
   if(language==='en'){
    const discovery=page.locator('[data-home-dashboard-id="discovery"]');
    assert.equal((await discovery.locator('.hx-head h2').innerText()).trim(),'Continue Exploring');
    assert.equal((await discovery.locator('.hx-card > p').first().innerText()).trim(),'Explore topics freely. Notes are optional.');
   }
   const hiddenName=page.locator('[data-home-dashboard-id="trend"] .widget-edit-label');
   assert.match((await hiddenName.innerText()).trim(),language==='en'?/\(Hidden\)$/:/（非表示）$/);
   const showWidget=page.locator('[data-widget-id="trend"][data-widget-action="toggle"]');
   assert.equal((await showWidget.innerText()).trim(),language==='en'?'Show':'追加');
   assert.match(await showWidget.getAttribute('aria-label'),language==='en'?/show$/i:/を表示$/);
   await showWidget.click();
   assert.doesNotMatch(await page.locator('[data-home-dashboard-id="trend"] .widget-edit-label').innerText(),/\(Hidden\)|（非表示）/);
   const hideWidget=page.locator('[data-widget-id="trend"][data-widget-action="toggle"]');
   assert.equal((await hideWidget.innerText()).trim(),language==='en'?'Hide':'非表示');
   assert.match(await hideWidget.getAttribute('aria-label'),language==='en'?/hide$/i:/を隠す$/);
   await hideWidget.click();
   assert.match((await hiddenName.innerText()).trim(),language==='en'?/\(Hidden\)$/:/（非表示）$/);
   await page.locator('[data-home-edit]').click();
   // Explore modes must be centered and topic-count badges must be absent.
   await page.goto(url.replace('#/home','#/exploration-tree'),{waitUntil:'networkidle'});
   await page.locator('.ex-switch [data-ex-tab="field"]').waitFor();
   const metrics=await page.locator('.ex-switch button').evaluateAll(buttons=>buttons.map(button=>{
    const r=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);
    const t=range.getBoundingClientRect(),style=getComputedStyle(button);
    return {display:style.display,offset:Math.abs((r.left+r.right-t.left-t.right)/2),right:r.right};
   }));
   assert.equal(metrics.length,2);
   for(const m of metrics){
    assert.equal(m.display,'grid','Explore switch uses grid centering');
    assert.ok(m.offset<=3,'Explore switch label is off-centre '+JSON.stringify({width,language,m}));
    assert.ok(m.right<=width+2,'Explore switch exceeds viewport '+JSON.stringify({width,language,m}));
   }
   const core=await page.locator('.ex-core').evaluate(el=>{
    const label=el.querySelector('span'),a=el.getBoundingClientRect(),b=label.getBoundingClientRect();
    return {align:getComputedStyle(label).textAlign,
      centre:Math.abs((a.left+a.right-b.left-b.right)/2),
      overflow:label.scrollWidth-label.clientWidth};
   });
   assert.equal(core.align,'center','all words above Explore must be centered');
   assert.ok(core.centre<=1.5,'Explore sphere caption off-center '+JSON.stringify({width,language,core}));
   assert.ok(core.overflow<=2,'Explore sphere caption is clipped '+JSON.stringify({width,language,core}));
   await page.screenshot({path:resolve(output,'explore-field-'+language+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   await page.locator('[data-ex-tab="catalog"]').click();
   assert.equal(await page.locator('.ex-count,.ex-catalog-group-head small').count(),0);
   assert.equal(await page.locator('[data-ex-pick-topic]').count(),27,'all current topics remain accessible');
    assert.equal(await page.locator('[data-ex-pick-topic="気分・ストレス"]').count(),0,'retired topic must not return');
    assert.equal(await page.locator('[data-ex-pick-topic="日々のコンディション"]').count(),1,'current condition topic is unique');
   await page.screenshot({path:resolve(output,'explore-catalog-'+language+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   assert.deepEqual(errors,[],'browser errors '+language+' '+width);
   measurements.push({engine,width,language,pass:true,home:boxed,guide:boxes});
   console.log('PASS HOME-COPY',engine,width,language,'cards and help');
   await context.close();
  }
 }
 await writeFile(resolve(output,'measurements.json'),JSON.stringify({engine,scenarios:measurements.length,measurements},null,2));
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
