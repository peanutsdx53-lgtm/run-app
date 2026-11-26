/** UIUX06: verify retired route and accessible Learning shortcut; preserve actual PNG export evidence. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mimetypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');
  const real=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mimetypes[extname(real)]||'application/octet-stream');res.end(await readFile(real));
 }catch{res.statusCode=404;res.end('missing')}
});
await new Promise(done=>server.listen(4278,'127.0.0.1',done));
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','uiux06-'+engine);await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4278/#/',report=[];
const shot=async(page,width,state)=>{
 const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 assert.ok(sizes.document<=sizes.viewport+3&&sizes.body<=sizes.viewport+3,state+' horizontal overflow '+JSON.stringify(sizes));
 const filename=engine+'-'+width+'-'+state+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage:false,animations:'disabled'});
 report.push({width,state,filename,sha:process.env.GITHUB_SHA||'local'});
};
try{
 for(const width of [320,390,1440]){
  const mobile=width<800;
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',
   acceptDownloads:true,userAgent:mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1':undefined});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const quick=page.locator('.hx-shortcuts');await quick.waitFor();
  for(const dest of ['course','learning','consultation'])assert.equal(await quick.locator('a[href="#/'+dest+'"]').count(),1,'quick access '+dest);
  assert.equal(await quick.locator('a[href="#/simulation"]').count(),0,'retired entry removed');
  await shot(page,width,'S18-learning-entry');
  await quick.locator('a[href="#/learning"]').click();
  await page.locator('#learning-root .lr-catalog').waitFor();
  await shot(page,width,'S18-learning-catalog');
  await page.goto(base+'simulation',{waitUntil:'networkidle'});
  await page.locator('.home-v3').waitFor();
  assert.equal(await page.locator('[data-sim-page]').count(),0,'stale link cannot render retired feature');
  await shot(page,width,'S18-retired-route-safe-fallback');
  // An actual canonical saved run, not a static HTML mock, drives PNG export and print.
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const id=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const ready=await canonical.refresh();if(!ready.ok)throw Error(ready.reason);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
    date:'2026-10-30',distance:'6',hours:'',minutes:'36',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',
    rofBefore:0,rofAfter:7,rofEntryEvidence:{before:{capturedAt:'2026-10-30T10:00:00Z',assessedAt:'2026-10-30T09:55:00Z',timeBasis:'RECALLED'},after:{capturedAt:'2026-10-30T11:00:00Z',assessedAt:'2026-10-30T10:55:00Z',timeBasis:'RECALLED'}},
    steps:'',stepsProvenance:'UNKNOWN',courseName:'',shoeName:'',memo:'user-report'
   }));
   if(!saved.ok)throw Error(saved.reason);return saved.record.id;
  });
  await page.goto(base+'result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
  const result=page.locator('#activity-result');await result.locator('.rv4-hero').waitFor();
  await shot(page,width,'S20-saved-result');
  await page.evaluate(()=>{
   const prototype=CanvasRenderingContext2D.prototype;
   const original=prototype.fillText;
   window.__uiux06DrawnText=[];
   prototype.fillText=function(value,...args){window.__uiux06DrawnText.push(String(value));return original.call(this,value,...args)};
  });
  await result.locator('.rv4-export-menu summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),result.locator('[data-download]').click()]);
  assert.equal(download.suggestedFilename(),'走行結果.png');
  const path=resolve(out,engine+'-'+width+'-S20-result.png');
  await download.saveAs(path);
  const bytes=await readFile(path);
  assert.ok(bytes.length>12000&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'valid PNG signature');
  const drawn=await page.evaluate(()=>window.__uiux06DrawnText);
  assert.ok(drawn.some(x=>x.includes('ROF-J等の本人回答は非掲載（既定）')),'default image excludes subjective answers');
  assert.ok(!drawn.some(x=>x.includes('運動前 0')||x.includes('2026-10-30')),'default image excludes personal ROF-J and date');
  assert.ok(!drawn.some(x=>x.includes('評価時刻未記録')),'image must not claim timestamp absence');
  assert.ok(drawn.some(x=>x.includes('本人の身体負荷の実測値ではありません')));
  await result.locator('[data-export-rof]').check();
  await result.locator('[data-export-date]').check();
  await page.evaluate(()=>{window.__uiux06DrawnText=[]});
  const [opted]=await Promise.all([page.waitForEvent('download'),result.locator('[data-download]').click()]);
  assert.equal(opted.suggestedFilename(),'走行結果.png');
  const chosen=await page.evaluate(()=>window.__uiux06DrawnText);
  assert.ok(chosen.some(x=>x.includes('ROF-J（本人回答）：運動前 0 ／ 運動後 7')),'explicitly opted-in ROF has attribution');
  assert.ok(chosen.some(x=>x.includes('2026-10-30')),'date appears only after explicit choice');
  assert.ok(chosen.includes('回答の実際の時間的前後差は判定しません'),'opted-in ROF retains timing limits');
  if(engine==='chromium'){
   await page.emulateMedia({media:'print'});
   assert.equal(await result.locator('.rv4-hero').count(),1,'print retains source-record facts');
   await page.emulateMedia({media:'screen'});
  }
  await shot(page,width,'S20-export-menu');
  assert.deepEqual(errors,[],'no browser runtime errors');
  await context.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',engine,scope:'Retired F21 navigation + Learning and actual PNG/print; not physical-device or user-effect proof',report},null,2));
 console.log('PASS UIUX06 '+engine+' '+report.length+' actual browser screenshots');
}finally{await browser.close();await new Promise(done=>server.close(done));}
