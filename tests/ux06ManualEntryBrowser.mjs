/* UX06: simulated manual-entry + save flow, JA/EN x 4 widths x normal/200% x 2 engines.
 * Physical device tests and actual usability outcomes remain separate.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux06-manual-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const filePath=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(filePath!==root&&!filePath.startsWith(root+sep))throw Error('blocked');
  const target=filePath===root?resolve(root,'index.html'):filePath;
  res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream');
  res.end(await readFile(target));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const url='http://127.0.0.1:'+server.address().port+'/#/';
const results=[];
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},
   locale:lang==='en'?'en-US':'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url+'record',{waitUntil:'networkidle'});
  await page.locator('.rv-manual').waitFor();
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.waitForFunction(language=>document.documentElement.lang===language,lang);
  await page.waitForFunction(language=>
   document.querySelector('.rv-manual [data-draft="distance"]')?.getAttribute('placeholder')===
    (language==='en'?'e.g. 5.00':'例：5.00'),lang);
  const distance=page.locator('.rv-manual [data-draft="distance"]');
  const minutes=page.locator('.rv-manual [data-draft="minutes"]');
  assert.equal(await distance.inputValue(),'','blank distance never observed zero');
  assert.equal(await minutes.inputValue(),'','blank duration never observed zero');
  assert.equal(await minutes.getAttribute('placeholder'),lang==='en'?'e.g. 30':'例：30');
  assert.equal(await page.locator('.rv-manual [data-manual-gait][aria-pressed="true"]').count(),0);
  assert.equal(await page.locator('.rv-manual .rv-required-progress').count(),0);
  const dateName=page.locator('.rv-manual .rv-date>span:first-child');
  await page.waitForFunction(language=>
   document.querySelector('.rv-manual .rv-date>span:first-child')?.textContent.trim()===
    (language==='en'?'Activity Date':'活動日'),lang);
  assert.equal((await dateName.innerText()).trim(),lang==='en'?'Activity Date':'活動日');
  const dateInput=page.locator('.rv-manual [data-draft="date"]');
  await dateInput.fill('2026-11-19');
  assert.equal(await dateInput.inputValue(),'2026-11-19');
  await page.waitForFunction(()=>
   document.querySelector('.rv-manual [data-date-display]')?.textContent==='2026/11/19');
  const geometry=await page.evaluate(()=>{
   const r=element=>element.getBoundingClientRect();
   const row=document.querySelector('.rv-manual .rv-date');
   const label=row.querySelector('span:first-child');
   const control=row.querySelector('.rl-date-control');
   const numbers=[...document.querySelectorAll('.rv-manual .rv-unit-input')].map(el=>{
    const input=r(el.querySelector('input')),unit=r(el.querySelector('em')),box=r(el);
    return {inputRight:input.right,unitLeft:unit.left,boxRight:box.right,
     scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
   });
   const options=[...document.querySelectorAll('.rv-manual [data-manual-gait]')].map(el=>({
    scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,right:r(el).right}));
   return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    bodyWidth:document.body.scrollWidth,labelRight:r(label).right,
    controlLeft:r(control).left,controlRight:r(control).right,numbers,options};
  });
  assert.ok(geometry.documentWidth<=width+3&&geometry.bodyWidth<=width+3,
   'horizontal overflow '+JSON.stringify({engine,lang,width,zoom,geometry}));
  assert.ok(geometry.labelRight<=geometry.controlLeft+2&&geometry.controlRight<=width+3,
   'date control collision '+JSON.stringify({engine,lang,width,zoom,geometry}));
  for(const number of geometry.numbers){
   assert.ok(number.inputRight<=number.unitLeft+3&&number.scrollWidth<=number.clientWidth+3,
    'number/unit collision '+JSON.stringify({engine,lang,width,zoom,number}));
   assert.ok(number.boxRight<=width+3,'numeric field outside viewport');
  }
  for(const option of geometry.options)
   assert.ok(option.scrollWidth<=option.clientWidth+3&&option.right<=width+3,
    'activity label clipping '+JSON.stringify({engine,lang,width,zoom,option}));
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-blank.png'),
    fullPage:true,animations:'disabled'});
  await page.locator('[data-demo-save]').click();
  let save=page.locator('[data-manual-run-save]');
  await save.waitFor();
  assert.equal(await save.isDisabled(),true,'incomplete manual run must not save');
  for(const key of ['distance','time','activity'])
   assert.equal(await page.locator('[data-required-status="'+key+'"]').getAttribute('data-required-ok'),'false');
  await page.locator('.rr-date-edit').click();
  await distance.fill('0');
  await minutes.fill('30');
  assert.equal(await distance.getAttribute('aria-invalid'),'true','observed 0 must remain invalid');
  await page.locator('[data-manual-gait="JOGGING"]').click();
  assert.equal(await distance.inputValue(),'0');
  assert.equal(await page.locator('[data-manual-gait="JOGGING"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-demo-save]').click();
  assert.equal(await save.isDisabled(),true,'0 km must not save');
  await page.locator('.rr-date-edit').click();
  await distance.fill('5');
  await page.locator('[data-demo-save]').click();
  assert.equal(await save.isEnabled(),true,'valid manual run is saveable');
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-review.png'),
    fullPage:true,animations:'disabled'});
  if(lang==='ja'&&width===390&&zoom===100){
   // Resolve the live control in the same browser task as both clicks.
   // Do not retry the save on timeout; capture the actual failure state.
   await page.evaluate(()=>{
    const button=document.querySelector('[data-manual-run-save]');
    if(!button?.isConnected||button.disabled||location.hash!=='#/record-review')
     throw Error('manual review is not ready for duplicate-click check');
    button.click();button.click();
   });
   try{await page.waitForURL(/#\/result\?record=/,{timeout:20000});}
   catch(error){
    const diagnostic=await page.evaluate(async()=>{
     const c=await import('/ui/manualRunCanonical.js'),stored=await c.readCanonical();
     const btn=document.querySelector('[data-manual-run-save]');
     return {hash:location.hash,savePresent:!!btn,disabled:btn?.disabled??null,
      busy:btn?.getAttribute('aria-busy')??null,
      notice:document.querySelector('[data-save-failure]')?.textContent??null,
      canonicalOk:stored.ok,recordCount:stored.read?.records?.length??null,
      pendingRequest:!!sessionStorage.getItem('runload-v2-pending-manual-commit-id')};
    }).catch(e=>({diagnosticError:String(e)}));
    const evidence={engine,lang,width,zoom,errors,diagnostic};
    console.error('UX06 save failure evidence '+JSON.stringify(evidence));
    await writeFile(resolve(out,'save-failure-'+lang+'-'+width+'-'+zoom+'.json'),JSON.stringify(evidence,null,2));
    await page.screenshot({path:resolve(out,'save-failure-'+lang+'-'+width+'-'+zoom+'.png'),animations:'disabled'}).catch(()=>{});
    throw error;
   }
   const stored=await page.evaluate(async()=>{
    const c=await import('/ui/manualRunCanonical.js'),got=await c.readCanonical();
    return {ok:got.ok,records:got.read?.records?.map(a=>({
     id:a.id,date:a.date,distanceKm:a.distanceKm,durationSeconds:a.durationSeconds,
     activityGait:a.draft.activityGait}))};
   });
   assert.equal(stored.ok,true);
   assert.equal(stored.records.length,1,'rapid duplicate click must create only one canonical record');
   assert.equal(stored.records[0].date,'2026-11-19');
   assert.equal(stored.records[0].distanceKm,5);
   assert.equal(stored.records[0].durationSeconds,1800);
   assert.equal(stored.records[0].activityGait,'JOGGING');
  }
  assert.deepEqual(errors,[],'uncaught error '+JSON.stringify({engine,lang,width,zoom,errors}));
  results.push({engine,lang,width,zoom,geometry,missingNotZero:true,saveGate:true,errors});
  await ctx.close();
 }
 assert.equal(results.length,16);
 await writeFile(resolve(out,'manual-matrix.json'),
  JSON.stringify({engine,conditions:results.length,results},null,2));
 console.log('UX06 MANUAL ENTRY PASS '+JSON.stringify({engine,conditions:results.length}));
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
