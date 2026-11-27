/** G2 result-to-note round trip; no participant efficacy claims. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','g2-reflection-'+engine);
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep))throw Error('outside repo');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',types[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(out,{recursive:true});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const cases=[[320,'ja',200],[390,'ja',100],[390,'en',200],[1440,'en',100]];
const successes=[],failures=[];
try{
 for(const [width,language,zoom] of cases){
  const ctx=await browser.newContext({viewport:{width,height:width>1000?900:844},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.evaluate(async lang=>{
    const {LEGAL_VERSION}=await import('/ui/legalDocuments.js');
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
    localStorage.setItem('runload-v2-legal-consent-v1',JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:'2026-11-17T00:00:00Z',termsVersion:LEGAL_VERSION,privacyVersion:LEGAL_VERSION}));
   },language);
   await page.goto(origin+'#/home',{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});
   const savedId=await page.evaluate(async()=>{
    const canonical=await import('/ui/manualRunCanonical.js'),store=await import('/ui/manualRunStore.js');
    const init=await canonical.initialize();if(!init.ok)throw Error(init.reason||'initialize failed');
    const result=await canonical.mutate(s=>store.saveManualRun(s,{date:'2026-11-15',distance:'6',hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN'}));
    if(!result.ok)throw Error(result.reason||'save failed');return result.record.id;
   });
   await page.goto(origin+'#/result?record='+encodeURIComponent(savedId),{waitUntil:'networkidle'});
   const btn=page.locator('[data-result-to-reflection]');await btn.waitFor({state:'visible'});
   if(zoom===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
   await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
   assert.equal(await page.locator('#activity-result [data-tab]').count(),3,'result stays three tabs');
   const label=await btn.innerText();
   assert.ok(label.includes(language==='en'?'Write a reflection':'振り返りを書く'),language+' CTA must be translated');
   assert.equal(await page.locator('[data-result-reflection-count]').count(),0,'empty reflection count is omitted');
   assert.equal(await page.locator('.rv4-hero .rv4-run-details').count(),1,'run details belong to the hero');
   const condition=page.locator('[data-result-condition]');
   assert.equal(await condition.getAttribute('href'),'#/condition?date=2026-11-15','use the exact saved run date, not today');
   await condition.click();
   await page.locator('.cj-daily-history').waitFor();
   assert.ok(await page.locator('.cj-daily-record').isVisible(),'exact day is shown even if unrecorded');
   await page.goBack();
   await btn.waitFor({state:'visible'});
   const bounds=await btn.boundingBox();assert.ok(bounds&&bounds.height>=43,'44px minimum tap target');
   assert.ok(bounds.x>=-2&&bounds.x+bounds.width<=width+2,'no horizontal overflow');
   await page.screenshot({path:resolve(out,engine+'-'+language+'-'+width+'-'+zoom+'-result.png'),fullPage:true,animations:'disabled'});
   const details=page.locator('.rv4-hero .rv4-run-details');
   await details.locator('summary').click();
   assert.equal(await details.isVisible(),true,'run details are available in screen mode');
   await page.emulateMedia({media:'print'});
   assert.equal(await details.isVisible(),false,'run details and private memo must not print');
   assert.equal(await condition.isVisible(),false,'daily condition link must not print');
   assert.equal(await page.locator('[data-result-reflection-entry]').isVisible(),false,'reflection must not print');
   await page.emulateMedia({media:'screen'});
   assert.equal(await details.isVisible(),true,'screen mode restored');
   await details.locator('summary').click();
   await btn.click();
   await page.waitForURL(u=>u.hash.startsWith('#/exploration-tree?'));
   const params=new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
   assert.equal(params.get('source'),'manual');assert.equal(params.get('record'),savedId);
   assert.equal(params.get('category'),'01');assert.equal(params.get('topic'),'気付きと次の確認');
   await page.locator('.ex-record-return').waitFor({state:'visible'});
   await page.locator('[data-ex-action="note"]').first().click();
   await page.locator('#ex-note').fill('MY_OWN_NOTE_FROM_RESULTS');
   await page.locator('[data-ex-action="save-note"]').click();
   await page.waitForFunction(id=>{
    try{return JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').some(n=>n.text==='MY_OWN_NOTE_FROM_RESULTS'&&n.recordId===id&&n.topicId==='voluntary-reflection');}catch{return false}
   },savedId);
   await page.locator('.ex-record-return a[href^="#/result?record="]').click();
   await page.waitForURL(u=>u.hash.startsWith('#/result?record='));
   assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('record'),savedId,'return retains the exact run id');
   await btn.waitFor({state:'visible'});
   assert.equal(await btn.count(),1,'return to the same saved result after asynchronous render');
   assert.deepEqual(errors,[],'no browser runtime exceptions');
   successes.push({width,language,zoom,recordIdType:'MANUAL',linkIsExplicit:true,translated:true,saveAndReturn:true});
  }catch(e){failures.push({width,language,zoom,error:String(e)});}finally{await ctx.close();}
 }
}finally{await writeFile(resolve(out,'summary.json'),JSON.stringify({engine,successes,failures},null,2));await browser.close();await new Promise(done=>server.close(done))}
assert.deepEqual(failures,[],'G2 result-linked optional note browser failures');
console.log('G2 '+engine+' '+successes.length+' optional reflection round trips PASS');
