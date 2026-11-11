/* E5 T05: real IDB and UI proof, not simulated browser states. */
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
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4393,'127.0.0.1',done));
const browser=await engine.launch({headless:true}),base='http://127.0.0.1:4393/';
const topic=encodeURIComponent('気温・天候');
const route=(source,id)=>base+'#/exploration-tree?source='+source+'&record='+encodeURIComponent(id)+'&category=03&topic='+topic;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/exploration-tree?category=03&topic='+topic,{waitUntil:'networkidle'});
 const panel=page.locator('[data-e-condition-inquiry="T05"]');
 await panel.waitFor({timeout:18000});
 assert.equal(await panel.getAttribute('data-e-state'),'NO_RECORD');
 assert.equal(await panel.locator('[data-e-condition-reveal]').count(),0);
 assert.equal(await page.locator('.ex-observation-guide').count(),1,'old generic guide remains');
 const created=await page.evaluate(async()=>{
  const [c,m,g2]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js')]);
  await c.refresh();
  const man=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-11-08',distance:'6',hours:'',minutes:'33',seconds:'',rofBefore:0,
   rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',
   courseName:'E5-ORIGINAL-COURSE-PRIVATE',gradeMode:'FLAT',
   surfaceMode:'SINGLE',primarySurface:'paved',temperatureC:'0',
   environmentNote:'E5-ORIGINAL-WEATHER-PRIVATE：天候：雨'
  }));
  const t=1700000000000,point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,
   breakBefore:i===0,activity:'RUNNING'}),track=[point(0,0),point(1,.0125),point(2,.025)];
  const gps=await g2.saveGpsV2Run({phase:'finished',activity:'RUNNING',
   distanceM:25,accepted:3,rejected:0,elapsedMs:10000,flags:[],track,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,trackSimplified:false},{
   saveDetails:false,date:'2026-11-08',experience:{
    source:'USER_REPORTED',rofBefore:0,rofAfter:null,
    beforeCapturedAt:null,afterCapturedAt:null,memo:''
   }
  });
  const orig=await c.readCanonical();
  return {ok:man.ok&&gps.ok&&orig.ok,
   manual:man.record?.id,v2:gps.summary?.id,
   original:orig.raw,reason:man.reason||gps.reason||orig.reason};
 });
 assert.equal(created.ok,true,created.reason);
 const refs=[
  {sourceType:'MANUAL',source:'manual',recordId:created.manual},
  {sourceType:'GPS_V2',source:'gps-v2',recordId:created.v2}
 ];
 const append=await page.evaluate(async refs=>{
  const [core,editor]=await Promise.all([
   import('/ui/annotationEditorCore.js'),import('/ui/annotationEditor.js')]);
  for(const r of refs){
   const ref={sourceType:r.sourceType,recordId:r.recordId};
   const data={
    courseName:{text:'E5-POSTHOC-COURSE-PRIVATE-'+r.sourceType},
    gradeBundle:{gradeMode:'FLAT'},
    surfaceBundle:{surfaceMode:'SINGLE',primarySurface:'paved'},
    temperatureC:{celsius:0},
    environmentNote:{text:'E5-POSTHOC-WEATHER-PRIVATE-'+r.sourceType}
   };
   for(const [field,payload] of Object.entries(data)){
    const request=core.makePostHocRequest(ref,field,'ADD','NO_ANSWER',payload,
     {declaredPhase:'DURING',timeBasis:'RECALLED'});
    if(!request.ok)return {ok:false,reason:request.reason,field,source:r.sourceType};
    const result=await editor.commitPostHocRequest(request.request);
    if(!result.ok)return {ok:false,reason:result.reason,code:result.code,field,source:r.sourceType};
   }
  }
  return {ok:true};
 },refs);
 assert.equal(append.ok,true,JSON.stringify(append));
 await page.reload({waitUntil:'networkidle'});
 // P8: inspect first hashchange, before the async canonical.refresh() has
 // finished. Previously revealed data must never remain visible even briefly.
 async function selectConditionRecord(source,id){
  const nextHash=new URL(route(source,id)).hash;
  const immediate=await page.evaluate(hash=>new Promise(resolve=>{
   window.addEventListener('hashchange',()=>{
    const panels=[...document.querySelectorAll(
     '[data-e-mental-inquiry],[data-e-body-inquiry],[data-e-condition-inquiry],'+
     '[data-e-life-inquiry],[data-e-inquiry="T02"],[data-e-inquiry="T08"]'
    )];
    const leaking=panels.filter(el=>{
     const style=getComputedStyle(el);
     const shown=!el.hidden&&style.display!=='none'&&style.visibility!=='hidden';
     return shown&&(/E5-(?:POSTHOC|ORIGINAL)-.*PRIVATE/.test(el.textContent||'')||
      el.getAttribute('data-e-state')==='READY');
    });
    const outgoing=document.querySelector('.ex-page');
    const outgoingVisible=!!outgoing&&!outgoing.hidden&&
     getComputedStyle(outgoing).display!=='none';
    resolve({leakCount:leaking.length,outgoingVisible,
     states:panels.map(el=>el.getAttribute('data-e-state'))});
   },{once:true});
   location.hash=hash;
  }),nextHash);
  assert.equal(immediate.outgoingVisible,false,
   'P8 previous exploration view (including notes) remains visible during record switch');
  assert.equal(immediate.leakCount,0,
   'P8 previous private record was visible during async route refresh: '+
    JSON.stringify(immediate));
  await page.waitForFunction(hash=>{
   const next=document.querySelector('[data-e-condition-inquiry]');
   return location.hash===hash&&next?.getAttribute('data-e-state')==='NOT_REQUESTED'&&
    !next.hidden&&getComputedStyle(next).display!=='none';
  },nextHash,{timeout:20000});
  return immediate;
 }
 for(const r of refs){
  const transition=await selectConditionRecord(r.source,r.recordId);
  await panel.waitFor({timeout:18000});
  assert.equal(await panel.getAttribute('data-e-state'),'NOT_REQUESTED');
  console.log(JSON.stringify({gate:'P8-PRIVATE-ROUTE-REDACTION',
   source:r.sourceType,engine:engineName,status:'PASS',
   previousPrivateVisible:false,transitionStates:transition.states}));
  assert.doesNotMatch(await panel.innerText(),/E5-ORIGINAL|E5-POSTHOC/);
  await panel.locator('[data-e-condition-reveal]').click();
  await page.waitForFunction(()=>document.querySelector('[data-e-condition-inquiry]')?.getAttribute('data-e-state')==='READY',null,{timeout:20000});
  const txt=await panel.innerText();
  assert.match(txt,new RegExp('E5-POSTHOC-COURSE-PRIVATE-'+r.sourceType));
  assert.match(txt,new RegExp('E5-POSTHOC-WEATHER-PRIVATE-'+r.sourceType));
  assert.equal(await panel.locator('[data-e-condition-field]').count(),5);
  assert.match(txt,/後日追記（本人申告）：0 ℃/);
  assert.match(txt,/過去を思い出して申告/);
  assert.match(txt,/文献12部位値への適用を推定しません/);
  assert.doesNotMatch(txt,/139\.91|37\.501|緯度|経度|危険度スコア|原因は天候/);
  if(r.sourceType==='MANUAL'){
   assert.match(txt,/E5-ORIGINAL-COURSE-PRIVATE/);
   assert.match(txt,/E5-ORIGINAL-WEATHER-PRIVATE/);
   assert.match(txt,/元の手入力記録：0 ℃（本人入力）/);
   assert.equal(await page.locator('.ex-observation-guide [data-ex-action="note"]').count(),1);
   assert.equal(await panel.locator('[data-ex-action="note"]').count(),0);
  }else{
   assert.doesNotMatch(txt,/E5-ORIGINAL-COURSE-PRIVATE|E5-ORIGINAL-WEATHER-PRIVATE/);
   assert.match(txt,/元のGPS記録：該当する本人申告欄なし/);
   assert.match(txt,/GPSの位置情報から坂道・路面・気温・天候を推定しません/);
   const bridge=page.locator('[data-gps-inquiry-bridge]');
   assert.equal(await bridge.count(),1);
   assert.match(await bridge.locator('a').last().getAttribute('href'),/category=03/);
   assert.doesNotMatch(await bridge.innerText(),/ROF-J（本人回答）：運動前/);
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await panel.evaluate(el=>getComputedStyle(el).display),'none');
  await page.emulateMedia({media:'screen'});
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const fit=await panel.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
    doc:document.documentElement.scrollWidth}));
   assert.ok(fit.scroll<=fit.client+2&&fit.doc<=width+2,
    'E5 200% source='+r.sourceType+' width='+width+' '+JSON.stringify(fit));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  await page.setViewportSize({width:390,height:844});
  console.log(JSON.stringify({gate:'E5-inquiry',caseId:'E-T05-'+r.sourceType,
   engine:engineName,status:'PASS',optIn:true,fiveFields:true,noGpsGuess:true}));
 }
 // Edit, then retract only ONE stream: other four must remain untouched.
 const corrected=await page.evaluate(async id=>{
  const r={sourceType:'MANUAL',recordId:id};
  const [core,editor]=await Promise.all([
   import('/ui/annotationEditorCore.js'),import('/ui/annotationEditor.js')]);
  const before=await editor.inspectPostHoc(r,'environmentNote');
  if(!before.ok||before.value?.status!=='ACTIVE')return {ok:false,reason:'not active'};
  const req=core.makePostHocRequest(r,'environmentNote','CORRECT','ACTIVE',
   {text:'E5-CORRECTED-WEATHER-PRIVATE'},{
    latest:before.value.latest,declaredPhase:'AFTER',timeBasis:'RECALLED'
   });
  if(!req.ok)return req;
  const saved=await editor.commitPostHocRequest(req.request);
  return {ok:saved.ok,reason:saved.reason};
 },created.manual);
 assert.equal(corrected.ok,true,corrected.reason);
 await page.goto(route('manual',created.manual),{waitUntil:'networkidle'});
 await panel.locator('[data-e-condition-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-condition-inquiry]')?.getAttribute('data-e-state')==='READY',null,{timeout:20000});
 assert.match(await panel.innerText(),/E5-CORRECTED-WEATHER-PRIVATE/);
 assert.doesNotMatch(await panel.innerText(),/E5-POSTHOC-WEATHER-PRIVATE-MANUAL/);
 const withdrawn=await page.evaluate(async id=>{
  const r={sourceType:'MANUAL',recordId:id};
  const [core,editor]=await Promise.all([
   import('/ui/annotationEditorCore.js'),import('/ui/annotationEditor.js')]);
  const prior=await editor.inspectPostHoc(r,'environmentNote');
  const req=core.makePostHocRequest(r,'environmentNote','RETRACT','ACTIVE',null,{
   latest:prior.value.latest,declaredPhase:'AFTER',timeBasis:'RECALLED'
  });
  if(!req.ok)return req;
  const saved=await editor.commitPostHocRequest(req.request);
  const after=await editor.inspectPostHoc(r,'environmentNote');
  return {ok:saved.ok&&after.ok,status:after.value?.status,reason:saved.reason||after.reason};
 },created.manual);
 assert.equal(withdrawn.ok,true,withdrawn.reason);
 assert.equal(withdrawn.status,'RETRACTED');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await panel.getAttribute('data-e-state'),'NOT_REQUESTED');
 await panel.locator('[data-e-condition-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-condition-inquiry]')?.getAttribute('data-e-state')==='READY',null,{timeout:20000});
 const afterText=await panel.innerText();
 assert.match(afterText,/後日の追記は撤回済みです/);
 assert.match(afterText,/E5-ORIGINAL-WEATHER-PRIVATE/);
 assert.match(afterText,/E5-POSTHOC-COURSE-PRIVATE-MANUAL/);
 assert.doesNotMatch(afterText,/E5-CORRECTED-WEATHER-PRIVATE|E5-POSTHOC-WEATHER-PRIVATE-MANUAL/);
 // A storage exception is NOT 5 NO_ANSWER values; all sensitive fields fail closed.
 await page.goto(route('gps-v2',created.v2),{waitUntil:'networkidle'});
 await page.evaluate(()=>{
  const orig=indexedDB.open.bind(indexedDB),prev=Object.getOwnPropertyDescriptor(indexedDB,'open');
  Object.defineProperty(indexedDB,'open',{configurable:true,value:function(name,...args){
   if(name==='runload-v2-annotations-v1'){
    if(prev)Object.defineProperty(indexedDB,'open',prev);else delete indexedDB.open;
    throw Error('E5 forced one M5 field read error');
   }
   return orig(name,...args);
  }});
 });
 await panel.locator('[data-e-condition-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-condition-inquiry]')?.getAttribute('data-e-state')==='READ_ERROR',null,{timeout:20000});
 assert.match(await panel.innerText(),/未入力・未回答と決めつけず/);
 assert.doesNotMatch(await panel.innerText(),/E5-POSTHOC/);
 assert.equal(await panel.locator('[data-e-condition-reveal]').count(),1);
 await panel.locator('[data-e-condition-reveal]').click();
 await page.waitForFunction(()=>document.querySelector('[data-e-condition-inquiry]')?.getAttribute('data-e-state')==='READY',null,{timeout:20000});
 const unchanged=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw;
 });
 assert.equal(unchanged,created.original,'original unchanged by T05 and M5 update');
 await page.goto(route('manual',created.manual),{waitUntil:'networkidle'});
 await page.locator('.ex-observation-guide [data-ex-action="note"]').click();
 await page.locator('#ex-note').fill('E5：次は同じ道で感じ方の違いを考えたい');
 await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===1,null,{timeout:12000});
 const memo=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]'));
 assert.equal(memo[0].recordId,created.manual);
 assert.equal(memo[0].category,'03');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({gate:'E5-inquiry',caseId:'E-T05-CORRECT-RETRACT-FAULT',
  engine:engineName,status:'PASS',oneFieldRetraction:true,privacy:true,notesPreserved:true}));
 await context.close();
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
console.log('E5 T05 five-field real-IDB inquiry PASSED');
