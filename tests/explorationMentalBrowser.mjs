/* E3 T03 true-browser and authoritative-IDB acceptance (Chromium and WebKit). */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('forbidden');
  const f=p===root?resolve(root,'index.html'):p;res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4391,'127.0.0.1',done));
const browser=await engine.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:4391/',topic=encodeURIComponent('気分・ストレス');
 const route=(source,id)=>base+'#/exploration-tree?source='+source+'&record='+encodeURIComponent(id)+'&category=05&topic='+topic;
 await page.goto(base+'#/exploration-tree?category=05&topic='+topic,{waitUntil:'networkidle'});
 const inquiry=page.locator('[data-e-mental-inquiry="T03"]');
 await inquiry.waitFor({timeout:20000});
 assert.equal(await inquiry.getAttribute('data-e-state'),'NO_RECORD');
 assert.equal(await inquiry.locator('[data-e-mental-reveal]').count(),0,'zero-record never reads a private stream');
 const created=await page.evaluate(async()=>{
  const [canonical,m,g2]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js')]);
  await canonical.refresh();
  const man=await canonical.mutate(s=>m.saveManualRun(s,{date:'2026-11-08',distance:'6',
   hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:null,steps:'',
   stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',
   memo:'',shoeName:'',courseName:''}));
  const t=1700000000000,point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,
   breakBefore:i===0,activity:'RUNNING'}),track=[point(0,0),point(1,.0125),point(2,.025)];
  const session={phase:'finished',activity:'RUNNING',distanceM:25,accepted:3,rejected:0,
   elapsedMs:10000,flags:[],track,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,trackSimplified:false};
  const gps=await g2.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-08',
   experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,
   beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
  const original=await canonical.readCanonical();
  return {ok:man.ok&&gps.ok&&original.ok,
   manual:man.record?.id,v2:gps.summary?.id,
   canonical:original.raw,
   reason:man.reason||gps.reason||original.reason};
 });
 assert.equal(created.ok,true,created.reason);
 const refs=[
  {sourceType:'MANUAL',recordId:created.manual,source:'manual',answer:'FELT'},
  {sourceType:'GPS_V2',recordId:created.v2,source:'gps-v2',answer:'NOT_FELT'}];
 // I3: observe the first hashchange event before async saved-data refresh
 // resolves. No earlier record's ACTIVE response may remain exposed.
 async function selectPrivateRecord(source,id){
  const hash=new URL(route(source,id)).hash;
  const transition=await page.evaluate(nextHash=>new Promise(resolve=>{
   window.addEventListener('hashchange',()=>{
    const old=document.querySelector('[data-e-mental-inquiry]');
    resolve({state:old?.getAttribute('data-e-state')||'ABSENT',
      visibleActive:!!old&&old.getAttribute('data-e-state')==='ACTIVE'&&
        getComputedStyle(old).display!=='none'&&!old.hidden});
   },{once:true});
   location.hash=nextHash;
  }),hash);
  assert.equal(transition.visibleActive,false,
   'I3: previous record private answer remains visible after switching RecordRef');
  await page.waitForFunction(nextHash=>{
   const fresh=document.querySelector('[data-e-mental-inquiry]');
   return location.hash===nextHash&&fresh?.getAttribute('data-e-state')==='NOT_REQUESTED'&&
     !fresh.hidden&&getComputedStyle(fresh).display!=='none';
  },hash,{timeout:20000});
  return transition;
 }
 const appended=await page.evaluate(async refs=>{
  const [mental,flow]=await Promise.all([
   import('/ui/mentalExperience.js'),import('/ui/mentalSaveFlow.js')]);
  const out=[];
  for(const ref of refs){
   const req=mental.makeMentalAppendRequest(
    {sourceType:ref.sourceType,recordId:ref.recordId},
    {answer:ref.answer,declaredPhase:'DURING',timeBasis:'RECALLED',
     freeText:'PRIVATE-MENTAL-E3-'+ref.sourceType,open:false});
   if(!req.ok||!req.request)return {ok:false,reason:req.reason||'no request'};
   const saved=await flow.saveMentalOnly({request:req.request});
   if(!saved.ok)return {ok:false,reason:saved.reason,code:saved.code};
   out.push(saved.eventId);
  }
  return {ok:true,eventIds:out};
 },refs);
 assert.equal(appended.ok,true,appended.reason);
 await page.reload({waitUntil:'networkidle'});
 for(const ref of refs){
  const transition=await selectPrivateRecord(ref.source,ref.recordId);
  await inquiry.waitFor({timeout:15000});
  assert.equal(await inquiry.getAttribute('data-e-state'),'NOT_REQUESTED','mental data stays sealed until click');
  console.log(JSON.stringify({gate:'I3-TRANSITION-REDACTION',source:ref.sourceType,
    previousState:transition.state,visiblePreviousAnswer:false,status:'PASS'}));
  assert.doesNotMatch(await inquiry.innerText(),/PRIVATE-MENTAL-E3|感じた（本人|よく分からない（本人/);
  assert.equal(await inquiry.locator('[data-e-mental-reveal]').count(),1);
  await inquiry.locator('[data-e-mental-reveal]').click();
  await page.waitForFunction(()=>['ACTIVE','READ_ERROR','NO_ANSWER','RETRACTED','UNVERIFIED'].includes(
   document.querySelector('[data-e-mental-inquiry]')?.getAttribute('data-e-state')),null,{timeout:20000});
  const observed=await inquiry.getAttribute('data-e-state');
  const diagnostic=await page.evaluate(async target=>{
    const [flow,records]=await Promise.all([
     import('/ui/mentalSaveFlow.js'),import('/ui/recordRef.js')]);
    const ref={sourceType:target.sourceType,recordId:target.recordId};
    const v=await flow.readMental(ref),parent=await records.resolveRecord(ref);
    return {ok:v.ok,status:v.value?.status,code:v.code,reason:v.reason,
     parentOk:parent.ok,parentCode:parent.code,parentReason:parent.reason,
     parentId:parent.value?.record?.id,parentKind:parent.value?.sourceKind,
     eventSource:v.value?.latest?.recordRef?.sourceType,
     eventField:v.value?.latest?.fieldKey,
     eventPhase:v.value?.latest?.declaredPhase,
     eventBasis:v.value?.latest?.timeBasis,
     provenance:v.value?.provenance};
  },ref);
  assert.equal(observed,'ACTIVE','E3 '+ref.sourceType+' expected verified report, got '+observed+
   ' :: '+JSON.stringify({diagnostic,text:await inquiry.innerText(),pageErrors:errors}));
  const content=await inquiry.innerText();
  assert.match(content,/本人の任意申告/);
  assert.match(content,/走っている間/);
  assert.match(content,/過去を思い出して申告/);
  assert.match(content,/ROF-Jと合算せず/);
  if(ref.source!=='manual'){
   const bridge=page.locator('[data-gps-inquiry-bridge]');
   assert.equal(await bridge.count(),1);
   assert.doesNotMatch(await bridge.innerText(),/ROF-J（本人回答）：運動前/,
    'mental T03 does not duplicate ROF-J values from the separate fatigue inquiry');
   const link=bridge.locator('a').last();
   assert.match(await link.getAttribute('href'),/category=05/,
    'general-link topic stays mental, without a private RecordRef');
  }
  assert.doesNotMatch(content,/PRIVATE-MENTAL-E3|危険度スコア|診断結果/);
  assert.match(await inquiry.locator('.ex-e-compare-link').getAttribute('href'),new RegExp('source='+ref.source));
  await page.emulateMedia({media:'print'});
  const css=await inquiry.evaluate(el=>getComputedStyle(el).display);
  assert.equal(css,'none','private mental report excluded in print by default');
  await page.emulateMedia({media:'screen'});
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const ext=await inquiry.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
    page:document.documentElement.scrollWidth}));
   assert.ok(ext.scroll<=ext.client+2&&ext.page<=width+2,
    'mental inquiry at 200% must not clip '+width+' '+JSON.stringify(ext));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  await page.setViewportSize({width:390,height:844});
  console.log(JSON.stringify({gate:'E3-inquiry',caseId:'E-T03-'+ref.sourceType,
   engine:engineName,status:'PASS',readOptIn:true,privateTextExcluded:true,printExcluded:true}));
 }
 // Withdrawn answer can never be read out again after parent-validated retract.
 const removed=await page.evaluate(async id=>{
  const ref={sourceType:'MANUAL',recordId:id};
  const [flow,core,editor]=await Promise.all([
   import('/ui/mentalSaveFlow.js'),import('/ui/annotationEditorCore.js'),import('/ui/annotationEditor.js')]);
  const before=await flow.readMental(ref);
  if(!before.ok||before.value.status!=='ACTIVE')return {ok:false,reason:'not active'};
  const req=core.makePostHocRequest(ref,'mentalExperience','RETRACT','ACTIVE',null,
   {latest:before.value.latest});
  if(!req.ok)return req;
  const saved=await editor.commitPostHocRequest(req.request);
  const after=await flow.readMental(ref);
  return {ok:saved.ok&&after.ok,status:after.value?.status,
   reason:saved.reason||after.reason};
 },created.manual);
 assert.equal(removed.ok,true,removed.reason);
 assert.equal(removed.status,'RETRACTED');
 await selectPrivateRecord('manual',created.manual);
 await inquiry.locator('[data-e-mental-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-mental-inquiry]')?.getAttribute('data-e-state')==='RETRACTED',null,{timeout:20000});
 assert.match(await inquiry.innerText(),/撤回済み/);
 assert.doesNotMatch(await inquiry.innerText(),/PRIVATE-MENTAL-E3|本人の任意申告：感じた/);
 // Fail-closed read permission/reliability: a real read error is not "no answer".
 await selectPrivateRecord('gps-v2',created.v2);
 await page.evaluate(()=>{
  const orig=indexedDB.open.bind(indexedDB),prev=Object.getOwnPropertyDescriptor(indexedDB,'open');
  Object.defineProperty(indexedDB,'open',{configurable:true,value:function(name,...args){
   if(name==='runload-v2-annotations-v1'){
    if(prev)Object.defineProperty(indexedDB,'open',prev);else delete indexedDB.open;
    throw Error('E3 test blocked annotation reader');
   }
   return orig(name,...args);
  }});
 });
 await inquiry.locator('[data-e-mental-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-mental-inquiry]')?.getAttribute('data-e-state')==='READ_ERROR',null,{timeout:20000});
 assert.match(await inquiry.innerText(),/未回答だとは扱いません/);
 assert.equal(await inquiry.locator('[data-e-mental-reveal]').count(),1,'read failure is retryable');
 await inquiry.locator('[data-e-mental-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-mental-inquiry]')?.getAttribute('data-e-state')==='ACTIVE',null,{timeout:20000});
 const originalAfter=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw;
 });
 assert.equal(originalAfter,created.canonical,'mental inquiry/retract never modifies canonical run');
 assert.deepEqual(errors,[],'no SPA errors');
 console.log(JSON.stringify({gate:'E3-inquiry',caseId:'E-T03-RETRACT-FAULT',
  engine:engineName,status:'PASS',withdrawnHidden:true,readErrorDistinct:true,originalUnchanged:true}));
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('E3 T03 verified mental self-inquiry browser PASSED');
