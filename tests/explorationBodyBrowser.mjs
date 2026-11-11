/* E4 T04: real manual/GPS parents, M5 append-only body observations and privacy. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('forbidden');
  const f=p===root?resolve(root,'index.html'):p;
  res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');
  res.end(await readFile(f));
 }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(done=>server.listen(4392,'127.0.0.1',done));
const browser=await engine.launch({headless:true}),base='http://127.0.0.1:4392/';
const topic=encodeURIComponent('筋肉痛・違和感');
const link=(source,id)=>base+'#/exploration-tree?source='+source+'&record='+encodeURIComponent(id)+'&category=04&topic='+topic;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/exploration-tree?category=04&topic='+topic,{waitUntil:'networkidle'});
 const panel=page.locator('[data-e-body-inquiry="T04"]');
 await panel.waitFor({timeout:20000});
 assert.equal(await panel.getAttribute('data-e-state'),'NO_RECORD');
 assert.equal(await panel.locator('[data-e-body-reveal]').count(),0);
 assert.equal(await page.locator('.ex-observation-guide').count(),1,'old observation guide is retained');
 const created=await page.evaluate(async()=>{
  const [c,m,g2]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js')]);
  await c.refresh();
  const saved=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-11-08',distance:'6',hours:'',minutes:'33',seconds:'',
   rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',courseName:'',shoeName:'',
   bodyObservation:'E4-ORIGINAL-PRIVATE：元の右膝周辺の記述'
  }));
  const t=1700000000000,point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,ele:null,
   altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,
   activity:'RUNNING'}),track=[point(0,0),point(1,.0125),point(2,.025)];
  const gps=await g2.saveGpsV2Run({phase:'finished',activity:'RUNNING',distanceM:25,
   accepted:3,rejected:0,elapsedMs:10000,flags:[],track,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,trackSimplified:false},{saveDetails:false,
   date:'2026-11-08',experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,
    beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
  const raw=await c.readCanonical();
  return {ok:saved.ok&&gps.ok&&raw.ok,
   manual:saved.record?.id,v2:gps.summary?.id,
   original:raw.raw,reason:saved.reason||gps.reason||raw.reason};
 });
 assert.equal(created.ok,true,created.reason);
 const sources=[
  {sourceType:'MANUAL',source:'manual',recordId:created.manual},
  {sourceType:'GPS_V2',source:'gps-v2',recordId:created.v2}
 ];
 const appended=await page.evaluate(async sources=>{
  const [core,editor]=await Promise.all([
   import('/ui/annotationEditorCore.js'),import('/ui/annotationEditor.js')]);
  for(const ref of sources){
   const typed={sourceType:ref.sourceType,recordId:ref.recordId};
   const input=core.makePostHocRequest(typed,'bodyObservation','ADD','NO_ANSWER',
    {text:'E4-POSTHOC-PRIVATE-'+ref.sourceType+'：後日思い出した身体の記述'},
    {declaredPhase:'AFTER',timeBasis:'RECALLED'});
   if(!input.ok)return {ok:false,reason:input.reason};
   const saved=await editor.commitPostHocRequest(input.request);
   if(!saved.ok)return {ok:false,code:saved.code,reason:saved.reason};
  }
  return {ok:true};
 },sources);
 assert.equal(appended.ok,true,appended.reason);
 await page.reload({waitUntil:'networkidle'});
 for(const ref of sources){
  await page.goto(link(ref.source,ref.recordId),{waitUntil:'networkidle'});
  await panel.waitFor({timeout:15000});
  // The SPA's hashchange handler awaits canonical.refresh() before replacing
  // the old ACTIVE panel. Wait for the *new closed* panel instead of asserting
  // immediately against the previous record's disclosure state.
  await panel.locator('[data-e-body-reveal]').waitFor({timeout:15000});
  await page.waitForFunction(()=>
   document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='NOT_REQUESTED',
   null,{timeout:15000});
  assert.equal(await panel.getAttribute('data-e-state'),'NOT_REQUESTED');
  assert.doesNotMatch(await panel.innerText(),/E4-ORIGINAL-PRIVATE|E4-POSTHOC-PRIVATE/);
  assert.equal(await panel.locator('[data-e-body-reveal]').count(),1);
  await panel.locator('[data-e-body-reveal]').click();
  await page.waitForFunction(()=>document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='ACTIVE',null,{timeout:20000});
  const content=await panel.innerText();
  if(ref.sourceType==='MANUAL'){
   assert.match(content,/E4-ORIGINAL-PRIVATE/);
   assert.match(content,/元の手入力走行の本人記述/);
   assert.equal(await page.locator('.ex-observation-guide').count(),1);
   assert.equal(await panel.locator('[data-ex-action="note"]').count(),0);
   assert.equal(await page.locator('.ex-observation-guide [data-ex-action="note"]').count(),1);
  }else{
   assert.match(content,/元のGPS記録には、独立した身体観察の申告欄がありません/);
   assert.doesNotMatch(content,/E4-ORIGINAL-PRIVATE/);
   assert.equal(await page.locator('[data-gps-inquiry-bridge]').count(),1);
   assert.equal(await page.locator('[data-gps-inquiry-bridge] [data-ex-action="note"]').count(),0);
   assert.match(await page.locator('[data-gps-inquiry-bridge] a').last().getAttribute('href'),/category=04/);
   assert.doesNotMatch(content,/ROF-J（本人回答）：運動前/);
  }
  assert.match(content,new RegExp('E4-POSTHOC-PRIVATE-'+ref.sourceType));
  assert.match(content,/対象とした時点：走った後/);
  assert.match(content,/過去を思い出して申告/);
  assert.match(content,/文献の12部位参考値/);
  assert.doesNotMatch(content,/傷害リスク.*高い|診断結果|因果関係を証明/);
  assert.match(await panel.locator('.ex-e-compare-link').getAttribute('href'),new RegExp('source='+ref.source));
  await page.emulateMedia({media:'print'});
  assert.equal(await panel.evaluate(el=>getComputedStyle(el).display),'none',
   'private body account excluded from default print');
  await page.emulateMedia({media:'screen'});
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const layout=await panel.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
    doc:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.client+2&&layout.doc<=width+2,
    'T04 at 200% must reflow '+width+' '+JSON.stringify(layout));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  await page.setViewportSize({width:390,height:844});
  console.log(JSON.stringify({gate:'E4-inquiry',caseId:'E-T04-'+ref.sourceType,
   engine:engineName,status:'PASS',optIn:true,provenance:true,printExcluded:true}));
 }
 // M5 alone owns corrections and retraction. The inquiry cannot write.
 const corrected=await page.evaluate(async id=>{
  const ref={sourceType:'MANUAL',recordId:id};
  const [store,core,editor]=await Promise.all([
   import('/ui/annotationEditor.js'),import('/ui/annotationEditorCore.js'),import('/ui/manualRunCanonical.js')]);
  const old=await store.inspectPostHoc(ref,'bodyObservation');
  if(!old.ok||old.value.status!=='ACTIVE')return {ok:false,reason:'not active'};
  const req=core.makePostHocRequest(ref,'bodyObservation','CORRECT','ACTIVE',
   {text:'E4-CORRECTED-PRIVATE：後日の本人の訂正文'},
   {latest:old.value.latest,declaredPhase:'AFTER',timeBasis:'RECALLED'});
  if(!req.ok)return req;
  const done=await store.commitPostHocRequest(req.request);
  const fresh=await store.inspectPostHoc(ref,'bodyObservation');
  return {ok:done.ok&&fresh.ok&&fresh.value.status==='ACTIVE',
   reason:done.reason||fresh.reason};
 },created.manual);
 assert.equal(corrected.ok,true,corrected.reason);
 await page.goto(link('manual',created.manual),{waitUntil:'networkidle'});
 await panel.locator('[data-e-body-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='ACTIVE',null,{timeout:20000});
 assert.match(await panel.innerText(),/E4-CORRECTED-PRIVATE/);
 assert.doesNotMatch(await panel.innerText(),/E4-POSTHOC-PRIVATE-MANUAL/);
 assert.match(await panel.innerText(),/E4-ORIGINAL-PRIVATE/);
 const withdrawn=await page.evaluate(async id=>{
  const ref={sourceType:'MANUAL',recordId:id};
  const [store,core]=await Promise.all([
   import('/ui/annotationEditor.js'),import('/ui/annotationEditorCore.js')]);
  const old=await store.inspectPostHoc(ref,'bodyObservation');
  const req=core.makePostHocRequest(ref,'bodyObservation','RETRACT','ACTIVE',null,
   {latest:old.value.latest,declaredPhase:'AFTER',timeBasis:'RECALLED'});
  if(!req.ok)return req;
  const done=await store.commitPostHocRequest(req.request);
  const again=await store.inspectPostHoc(ref,'bodyObservation');
  return {ok:done.ok&&again.ok,status:again.value?.status,reason:done.reason||again.reason};
 },created.manual);
 assert.equal(withdrawn.ok,true,withdrawn.reason);
 assert.equal(withdrawn.status,'RETRACTED');
 await page.goto(link('manual',created.manual),{waitUntil:'networkidle'});
 // Same URL does not cause a hashchange; a genuine revisit must refresh the
 // view so the prior ACTIVE panel is not mistaken for a withdrawn reread.
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await panel.getAttribute('data-e-state'),'NOT_REQUESTED');
 await panel.locator('[data-e-body-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='RETRACTED',null,{timeout:20000});
 assert.match(await panel.innerText(),/E4-ORIGINAL-PRIVATE/);
 assert.match(await panel.innerText(),/撤回した追記の文章は表示しません/);
 assert.doesNotMatch(await panel.innerText(),/E4-CORRECTED-PRIVATE|E4-POSTHOC-PRIVATE-MANUAL/);
 // Failure: a storage error must not become "no body observation" or echo original private text.
 await page.goto(link('gps-v2',created.v2),{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  const orig=indexedDB.open.bind(indexedDB),prev=Object.getOwnPropertyDescriptor(indexedDB,'open');
  Object.defineProperty(indexedDB,'open',{configurable:true,value:function(name,...args){
   if(name==='runload-v2-annotations-v1'){
    if(prev)Object.defineProperty(indexedDB,'open',prev);else delete indexedDB.open;
    throw Error('E4 deliberately blocked annotation read');
   }
   return orig(name,...args);
  }});
 });
 await panel.locator('[data-e-body-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='READ_ERROR',null,{timeout:20000});
 assert.match(await panel.innerText(),/未回答とは扱いません/);
 assert.equal(await panel.locator('[data-e-body-reveal]').count(),1,'retry is offered');
 await panel.locator('[data-e-body-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-body-inquiry]')?.getAttribute('data-e-state')==='ACTIVE',null,{timeout:20000});
 const originalNow=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw;
 });
 assert.equal(originalNow,created.original,'T04 and M5 corrections do not rewrite manual original');
 // The old optional memo still has separate data and IDs.
 await page.goto(link('manual',created.manual),{waitUntil:'networkidle'});
 await page.locator('.ex-observation-guide [data-ex-action="note"]').click();
 await page.locator('#ex-note').fill('E4: 次にどの場所の感覚を確かめるか考える');
 await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
 // Existing optional note persistence is async; assert AFTER the durable write,
 // rather than racing a fast Chromium click callback.
 await page.waitForFunction(()=>JSON.parse(
  localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===1,null,
  {timeout:15000});
 const memo=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]'));
 assert.equal(memo.length,1);
 assert.equal(memo[0].recordId,created.manual);
 assert.equal(memo[0].category,'04');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({gate:'E4-inquiry',caseId:'E-T04-CORRECT-RETRACT-FAULT',
  engine:engineName,status:'PASS',originalUnchanged:true,noPrivateLeaks:true,
  legacyMemoIntact:true,readFailureDistinct:true}));
 await context.close();
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
console.log('E4 T04 saved-data inquiry acceptance PASSED');
