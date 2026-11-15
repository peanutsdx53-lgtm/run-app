import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),p=resolve(root,'.'+name);
 if(p!==root&&!p.startsWith(root+sep))throw Error('traversal');
 const path=p===root?resolve(root,'index.html'):p;
 res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
 res.end(await readFile(path));
}catch{res.statusCode=404;res.end('missing');}});
await new Promise(ok=>server.listen(4387,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','gps-stage4-save');await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4387/#/';
const phoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const audit=[];
const prepareContext=async(width,language)=>{
 const isPhone=width<800;
 const options={viewport:{width,height:900},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce'};
 if(isPhone){options.userAgent=phoneUA;options.isMobile=true;options.hasTouch=true;}
 const ctx=await browser.newContext(options);
 await ctx.addInitScript(lang=>{
  localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
  localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
  const watchers=new Map();
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
   watchPosition:(ok,err)=>{const id=watchers.size+1;watchers.set(id,{ok,err});return id;},
   clearWatch:id=>watchers.delete(id)
  }});
  window.__stage4Fix=(latitude,time)=>{for(const h of watchers.values())h.ok({
   timestamp:time,coords:{latitude,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}
  });};
 },language);
 return ctx;
};
const capture=async(page,language,width,screen)=>{
 const m=await page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
  const scope=document.querySelector('[data-pre-save-scope]');
  const dlRows=scope?[...scope.querySelectorAll('dl>div')].map(div=>{
   const label=box(div.querySelector('dt')),value=box(div.querySelector('dd'));
   return {label,value,container:box(div)};
  }):[];
  return {viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   scope:scope?box(scope):null,rows:dlRows};
 });
 assert.ok(m.doc<=m.viewport+2&&m.body<=m.viewport+2,'horizontal overflow '+screen+' '+JSON.stringify(m));
 if(m.scope){assert.ok(m.scope.left>=-1&&m.scope.right<=m.viewport+1,'scope overflow '+JSON.stringify(m));
  for(const row of m.rows){
   assert.ok(row.label.right<=row.value.left+2||row.label.bottom<=row.value.top+2,
    'pre-save label/value overlap '+screen+' '+JSON.stringify(row));
  }
 }
 await page.screenshot({path:resolve(out,engine+'-'+language+'-'+width+'-'+screen+'.png'),
  fullPage:true,animations:'disabled',timeout:20000});
 audit.push({engine,language,width,screen,...m});
};
const waitEnglish=async(page,language)=>{
 if(language!=='en')return;
 await page.waitForFunction(()=>document.querySelector('[data-pre-save-scope]')?.textContent.includes('Review Before Saving'),
  null,{timeout:12000});
 const scopeText=await page.locator('[data-pre-save-scope]').innerText();
 assert.ok(!/[ぁ-んァ-ン一-龯]/.test(scopeText),'English common save review contains Japanese: '+scopeText);
};
try{
 for(const language of ['ja','en']){
  for(const width of [320,390,414,768,1440]){
   const ctx=await prepareContext(width,language),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'record',{waitUntil:'networkidle'});
   await page.locator('.rv-manual').waitFor();
   await page.locator('[data-draft="distance"]').fill('6');
   await page.locator('[data-draft="minutes"]').fill('42');
   await page.locator('[data-manual-gait="RUNNING"]').click();
   await page.locator('[data-demo-save]').click();
   await page.locator('[data-record-review]').waitFor();
   const review=page.locator('[data-pre-save-scope]');
   assert.equal(await review.getAttribute('data-save-source'),'manual');
   assert.equal(await review.count(),1,'exactly one shared manual review');
   assert.equal(await page.locator('[data-route-consent-status]').count(),1);
   await waitEnglish(page,language);
   assert.equal(await page.locator('.rr-save').isEnabled(),true);
   assert.equal(await page.locator('.sv4-review-help').getAttribute('open'),null,'help folded');
   await capture(page,language,width,'manual-before-save');
   if(width===390){
    await page.locator('.sv4-review-help summary').click();
    await capture(page,language,width,'manual-help-open');
   }
   assert.deepEqual(errors,[],'manual screen errors '+language+' '+width);
   await ctx.close();
  }
 }
 for(const language of ['ja','en']){
  const width=390,ctx=await prepareContext(width,language);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'measurement',{waitUntil:'networkidle'});
  await page.locator('[data-phase="ready"]').waitFor();
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  const t=Date.now();
  await page.evaluate(t=>window.__stage4Fix(37.5,t),t);
  await page.evaluate(t=>window.__stage4Fix(37.50025,t),t+5000);
  await page.waitForTimeout(1200);
  await page.locator('[data-gps-action="finish"]').click();
  await page.locator('[data-gps-finish-dialog]').waitFor({state:'visible'});
  await page.locator('[data-gps-action="finish-confirm"]').click();
  await page.locator('[data-gps-review]').waitFor();
  const review=page.locator('[data-pre-save-scope]');
  assert.equal(await review.getAttribute('data-save-source'),'gps');
  await waitEnglish(page,language);
  const on=language==='ja';
  if(on)await page.locator('[data-gps-save-route]').check();
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),on);
  const label=await page.locator('[data-route-consent-status]').innerText();
  assert.match(label,on?/(位置|Location)/:/(保存しない|Not Saved)/i,'route consent reflected in visible summary');
  await capture(page,language,width,'gps-consent-'+(on?'on':'off'));
  await page.evaluate(()=>{
   const original=IDBDatabase.prototype.transaction;
   let failed=false;
   IDBDatabase.prototype.transaction=function(stores,mode,...rest){
    if(!failed&&mode==='readwrite'&&Array.isArray(stores)&&stores.includes('summaries')){
     failed=true;throw Error('stage4 simulated write failure');
    }
    return original.call(this,stores,mode,...rest);
   };
  });
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('[data-save-failure]').waitFor({timeout:14000});
  const operation=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('runload-v2-pending-gps-operation-v1')));
  assert.match(operation?.id||'',/^gps-v2-/,'same retry ID must persist');
  await capture(page,language,width,'gps-save-failure');
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('#runload-result-v4').waitFor({timeout:15000});
  const id=new URLSearchParams(page.url().split('?')[1]).get('gps');
  assert.equal(id,operation.id,'result uses exact previously failed ID');
  const stored=await page.evaluate(async()=>{
   const store=await import('/ui/gpsReplayIndexedDbStore.js');
   return store.readGpsV2Summaries();
  });
  assert.equal(stored.ok,true,stored.reason);
  assert.equal(stored.records.filter(x=>x.id===id).length,1,'retry must create just one parent');
  assert.equal(stored.records.find(x=>x.id===id)?.detailSaved,on,'route data only when explicitly opted in');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('runload-v2-pending-gps-operation-v1')),null,'confirmed save clears pending ID');
  await capture(page,language,width,'gps-result-confirmed');
  // Reconstruct only the opaque ID, not the GPS route, as if acknowledgment
  // had been lost before a reload. The original parent must be read back.
  await page.evaluate((id,date)=>{
   sessionStorage.setItem('runload-v2-pending-gps-operation-v1',JSON.stringify({id,date}));
  },id,stored.records.find(x=>x.id===id).date);
  await page.goto(base+'measurement',{waitUntil:'networkidle'});
  await page.reload({waitUntil:'networkidle'});
  const recovery=page.locator('[data-gps-recovery]');
  await recovery.waitFor({timeout:15000});
  await capture(page,language,width,'gps-reload-recovery');
  await recovery.locator('[data-gps-action="recover"]').click();
  await page.locator('#runload-result-v4').waitFor({timeout:15000});
  assert.equal(new URLSearchParams(page.url().split('?')[1]).get('gps'),id,'recovered original saved run');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('runload-v2-pending-gps-operation-v1')),null);
  assert.deepEqual(errors,[],'GPS recover errors '+language);
  await ctx.close();
 }
 console.log('PASS Stage4 pre-save bilingual 5 viewport manual and safe GPS retry/reload '+engine);
 await writeFile(resolve(out,engine+'-report.json'),JSON.stringify(audit,null,2));
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
