import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('missing');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','home-fatigue-readability-'+engine);
await mkdir(out,{recursive:true});
const base='http://127.0.0.1:'+server.address().port+'/#/';
const evidence=[];
const forbidden=/RunLoad|ランロード|研究Current|研究用の出典台帳|Reference-100|モデル内の原著ID|研究台帳参照|試行教材|補助教材（試行版）/i;
try{
 for(const width of [320,390,414,768,1440])for(const lang of ['ja','en']){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:lang==='ja'?'ja-JP':'en-US',timezoneId:lang==='ja'?'Asia/Tokyo':'America/New_York',reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const id=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('./ui/manualRunCanonical.js'),import('./ui/manualRunStore.js')]);
   const init=await canonical.refresh();if(!init.ok)throw Error(init.reason);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{date:'2026-11-26',distance:'5',hours:'',minutes:'30',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:3,rofAfter:7,stepsProvenance:'UNKNOWN'}));
   if(!saved.ok)throw Error(saved.reason);
   return saved.record.id;
  });
  await page.reload({waitUntil:'networkidle'});
  for(const zoom of [100,200]){
   const suffix=lang+'-'+width+'-'+zoom;
   await page.goto(base+'home',{waitUntil:'networkidle'});
   await page.evaluate(z=>{document.documentElement.style.fontSize=z+'%'},zoom);
   const grid=page.locator('.hx-latest-fig');
   await grid.waitFor();
   await page.waitForFunction(language=>document.querySelector('.hx-latest-fig small')?.textContent===(language==='ja'?'距離':'Distance'),lang);
   assert.deepEqual(await grid.locator('small').allInnerTexts(),lang==='ja'?['距離','時間','平均ペース']:['Distance','Time','Average Pace']);
   assert.deepEqual(await grid.locator('strong').allInnerTexts(),['5.00','30','6:00']);
   assert.deepEqual(await grid.locator('em').allInnerTexts(),lang==='ja'?['km','分','/km']:['km','min','/km']);
   const layout=await grid.evaluate(el=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
    const cards=[...el.children].map(e=>({rect:rect(e),scroll:e.scrollWidth,client:e.clientWidth,fields:[...e.children].map(f=>({rect:rect(f),scroll:f.scrollWidth,client:f.clientWidth}))}));
    return {columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,grid:rect(el),cards,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),document:document.documentElement.scrollWidth,body:document.body.scrollWidth};
   });
   assert.equal(layout.rootFont,zoom===100?16:32);
   assert.ok([1,3].includes(layout.columns),'must not render two plus one: '+JSON.stringify(layout));
   // The grid occupies the content box, capped at 680px, and uses a 17rem container threshold.
   assert.equal(layout.columns,layout.grid.width>=17*layout.rootFont-1?3:1);
   if(zoom===100&&width===390)assert.equal(layout.columns,3,'the reported smartphone state must have three columns');
   assert.ok(layout.document<=width+2&&layout.body<=width+2);
   for(const c of layout.cards){
    assert.ok(c.rect.left>=layout.grid.left-1&&c.rect.right<=layout.grid.right+1);
    assert.ok(c.scroll<=c.client+2,'metric card overflows '+JSON.stringify(c));
    for(const f of c.fields)assert.ok(f.scroll<=f.client+2&&f.rect.left>=c.rect.left-1&&f.rect.right<=c.rect.right+1,'metric label/value/unit clipped '+JSON.stringify(f));
   }
   assert.doesNotMatch(await grid.innerText(),forbidden);
   await page.screenshot({path:resolve(out,'home-'+suffix+'.png'),fullPage:true,animations:'disabled'});
   await page.goto(base+'result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
   await page.evaluate(z=>{document.documentElement.style.fontSize=z+'%'},zoom);
   const result=page.locator('#activity-result');
   await result.locator('[data-tab="body"]').waitFor({state:'attached'});
   assert.equal(await result.locator('[data-tab]').count(),3);
   if(width<=800)await result.locator('[data-tab="fatigue"]').click();
   const fatigue=result.locator('.rv4-fatigue[data-pane="fatigue"]');
   const disclosure=fatigue.locator('.rv4-fatigue-method');
   await fatigue.waitFor();
   await fatigue.locator('.rv4-fatigue-caption').waitFor();
   const expected=lang==='ja'?'自分で回答した疲労感（0〜10）':'Your fatigue ratings (0–10)';
   await page.waitForFunction(t=>document.querySelector('#activity-result')?.shadowRoot?.querySelector('.rv4-fatigue-caption')?.textContent===t,expected);
   assert.equal(await fatigue.locator('.rv4-fatigue-scale').getAttribute('aria-label'),expected);
   assert.equal(await disclosure.evaluate(el=>el.open),false);
   assert.doesNotMatch(await fatigue.innerText(),/ROF-J|未判定|not verified/i,'specialist explanation stays folded');
   assert.deepEqual(await fatigue.locator('.rv4-fatigue-scale-heading strong').allInnerTexts(),['3 / 10','7 / 10']);
   assert.doesNotMatch(await fatigue.innerText(),forbidden);
   await fatigue.scrollIntoViewIfNeeded();
   await page.screenshot({path:resolve(out,'fatigue-'+suffix+'.png'),fullPage:true,animations:'disabled'});
   await disclosure.locator(':scope > summary').click();
   assert.equal(await disclosure.evaluate(el=>el.open),true);
   assert.match(await disclosure.innerText(),/ROF-J/);
   assert.equal(await disclosure.locator('a[href="https://link.springer.com/article/10.1186/s40798-026-01108-8"]').count(),1);
   const history=disclosure.locator('.rv4-rof-audit');
   assert.equal(await history.locator('.rv4-rof-time-grid .rv4-rof-time-card').count(),2);
   const correction=history.locator('.rv4-rof-correction');
   assert.equal(await correction.evaluate(e=>e.open),false);
   assert.equal(await correction.locator('[data-rof-correct-score]').isVisible(),false);
   assert.doesNotMatch(await history.innerText(),/\d{4}-\d{2}-\d{2}T\d{2}:|\.\d{3}Z|評価時点は不明/);
   if(lang==='en')assert.doesNotMatch(await history.innerText(),/[ぁ-ゟァ-ヿ一-龯]/,'history labels must translate');
   await page.screenshot({path:resolve(out,'fatigue-history-'+suffix+'.png'),fullPage:true,animations:'disabled'});
   await correction.locator(':scope > summary').click();
   assert.ok(await correction.locator('[data-rof-correct-score]').isVisible(),'correction remains available on request');
   const anchors=await disclosure.locator('.rv4-fatigue-method-content>p').allInnerTexts();
   if(lang==='en')assert.doesNotMatch(anchors.join(' '),/[ぁ-ゟァ-ヿ一-龯]/,'English scale description and limits must be translated');
   const fatigueLayout=await fatigue.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {left:r.left,right:r.right,scroll:el.scrollWidth,client:el.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth};
   });
   assert.ok(fatigueLayout.left>=-2&&fatigueLayout.right<=width+2&&fatigueLayout.scroll<=fatigueLayout.client+2&&fatigueLayout.document<=width+2&&fatigueLayout.body<=width+2,'fatigue disclosure clipped '+JSON.stringify(fatigueLayout));
   await page.screenshot({path:resolve(out,'fatigue-detail-'+suffix+'.png'),fullPage:true,animations:'disabled'});
   evidence.push({width,lang,zoom,layout,fatigueLayout,pass:true});
   await correction.locator(':scope > summary').click();
   await disclosure.locator(':scope > summary').click();
  }
  assert.deepEqual(errors,[],'browser errors '+lang+' '+width);
  await ctx.close();
 }
 await writeFile(resolve(out,'measurements.json'),JSON.stringify({engine,scenarios:evidence.length,evidence},null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
