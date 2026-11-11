/* Professor M4 acceptance: real SPA, canonical parent, annotation IDB and retry. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const f=resolve(root,'.'+path);
  if(!(f===root||f.startsWith(root+sep)))throw Error('forbidden');const actual=f===root?resolve(root,'index.html'):f;
  res.setHeader('content-type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(done=>server.listen(4386,'127.0.0.1',done));
const browser=await engine.launch({headless:true});
const base='http://127.0.0.1:4386/';
const open=async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/record',{waitUntil:'networkidle'});
 return {context,page,errors};
};
async function doManual(page,{fault=false}={}){
 await page.locator('[data-draft="distance"]').first().fill('5');
 await page.locator('[data-draft="minutes"]').first().fill('30');
 await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.goto(base+'#/record-rof',{waitUntil:'networkidle'});
 await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.goto(base+'#/record-reflection',{waitUntil:'networkidle'});
 const panel=page.locator('[data-mental-panel="manual"]');
 await panel.waitFor({state:'attached',timeout:20000});
 assert.equal(await panel.count(),1,'mental response is S07 optional section');
 await panel.locator(':scope > summary').click();
 await panel.locator('[data-mental-answer="manual"][value="FELT"]').check();
 await panel.locator('.mx-extra > summary').click();
 await panel.locator('[data-mental-phase="manual"]').selectOption('BEFORE');
 await panel.locator('[data-mental-basis="manual"]').selectOption('RECALLED');
 await panel.locator('[data-mental-text="manual"]').fill('走る前の経験を思い出して申告');
 await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
 assert.match(await page.locator('[data-record-review]').innerText(),/気持ち・考える面の疲れ/);
 if(fault===true){
  // Only the optional annotation open fails once; canonical save must still commit.
  await page.evaluate(()=>{
   const own=Object.getOwnPropertyDescriptor(indexedDB,'open');
   const original=indexedDB.open.bind(indexedDB);let once=true;
   Object.defineProperty(indexedDB,'open',{configurable:true,value:function(name,...args){
    if(name==='runload-v2-annotations-v1'&&once){once=false;if(own)Object.defineProperty(indexedDB,'open',own);else delete indexedDB.open;throw Error('M4 injected annotation-only failure')}
    return original(name,...args);
   }});
  });
 }
 if(fault==='quota'){
  await page.evaluate(()=>{
   const p=IDBDatabase.prototype,tx=p.transaction;let once=true;
   Object.defineProperty(p,'transaction',{configurable:true,value:function(stores,mode,...args){
    const list=Array.isArray(stores)?stores:[stores];
    if(once&&mode==='readwrite'&&list.includes('events')&&list.includes('heads')&&list.includes('meta')){
     once=false;Object.defineProperty(p,'transaction',{configurable:true,value:tx});
     window.__m7QuotaTriggered=true;
     throw new DOMException('M7 quota after original commit','QuotaExceededError');
    }
    return tx.call(this,stores,mode,...args);
   }});
  });
 }
 await page.locator('[data-manual-run-save]').click();
 await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
 const id=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]);
 const before=await page.evaluate(async()=>{
  const canonical=await import('/ui/manualRunCanonical.js');const x=await canonical.readCanonical();return {ok:x.ok,raw:x.raw};
 });
 assert.equal(before.ok,true);
 const record=JSON.parse(before.raw).records.find(x=>x.id===id);
 assert.ok(record);assert.equal('mentalExperience' in record.draft,false,'strict original draft never receives mental answer');
 assert.equal(record.rofBefore,0,'explicit ROF-J zero is a reported score, independent of mental fatigue');
 assert.equal(record.rofAfter,null,'unanswered after score is not zero');
 const view=page.locator('#runload-result-v4').locator('[data-mental-result]');
 await view.waitFor({state:'attached'});
 if(fault){
  await page.locator('[data-tab="fatigue"]').first().click();
  await page.locator('[data-mental-retry]').waitFor({timeout:20000});
  assert.match(await view.innerText(),/走行記録は保存できましたが/);
  await page.locator('[data-mental-retry]').click();
 }
 await page.waitForFunction(()=>document.querySelector('#runload-result-v4')?.shadowRoot?.querySelector('[data-mental-result]')?.textContent?.includes('走る前の経験を思い出して申告'),null,{timeout:20000});
 const read=await page.evaluate(async(id)=>{
  const [{readMental},canonical]=await Promise.all([import('/ui/mentalSaveFlow.js'),import('/ui/manualRunCanonical.js')]);
  const ref={sourceType:'MANUAL',recordId:id},mental=await readMental(ref),raw=(await canonical.readCanonical()).raw;
  return {status:mental.ok?mental.value.status:mental.code,event:mental.ok?mental.value.latest:null,raw};
 },id);
 assert.equal(read.status,'ACTIVE');assert.equal(read.event.payload.answer,'FELT');assert.equal(read.event.declaredPhase,'BEFORE');
 assert.equal(read.event.timeBasis,'RECALLED');assert.equal(read.event.assessedAt,null);
 assert.equal(before.raw,read.raw,'byte-identical canonical original through optional response and retry');
 await page.locator('[data-tab="fatigue"]').first().click();
 assert.match(await view.innerText(),/感じた/);
 return {id,read};
}
try{
 for(const fault of [false,true,'quota']){
  const {context,page,errors}=await open();
  const result=await doManual(page,{fault});
  if(fault==='quota'){
   assert.equal(await page.evaluate(()=>window.__m7QuotaTriggered),true);
   const check=await page.evaluate(async id=>{
    const [c,st]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/annotationStore.js')]);
    const parent=await c.readCanonical(),opened=await st.openAnnotationStore();
    if(!parent.ok||!opened.ok)throw Error('T-090 unreadable sources');
    const a=await st.inspectAnnotationStore(opened.value.db);opened.value.db.close();
    return {parents:parent.read.records.length,id:parent.read.records[0]?.id,annotations:a.ok?a.value.eventCount:-1};
   },result.id);
   assert.deepEqual(check,{parents:1,id:result.id,annotations:1},'Quota retry only appended to the original ID');
   console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-090',engine:engineName,status:'PASS',
    quotaInjected:true,parentCount:1,eventCount:1}));
  }

  if(fault===false){
   // T-066 read faults: real saved parent remains unchanged and never becomes
   // the false 'NO_ANSWER' state even with both stores unavailable.
   const failure=await page.evaluate(async id=>{
    const [flow,canonical,display]=await Promise.all([
     import('/ui/mentalSaveFlow.js'),import('/ui/manualRunCanonical.js'),import('/ui/mentalExperience.js')]);
    const ref={sourceType:'MANUAL',recordId:id},before=await canonical.readCanonical();
    const normal=await flow.readMental(ref);
    const parentDown=await flow.readMental(ref,{resolveParent:async()=>({ok:false,code:'UNREADABLE_PARENT'})});
    const noteDown=await flow.readMental(ref,{openStore:async()=>({ok:false,code:'READ_FAILED',reason:'IDB blocked'})});
    const bothDown=await flow.readMental(ref,{openStore:async()=>({ok:false,code:'READ_FAILED',reason:'IDB blocked'}),
      resolveParent:async()=>({ok:false,code:'UNREADABLE_PARENT'})});
    const after=await canonical.readCanonical();
    return {normal:normal.ok?normal.value.status:normal.code,
     parentDown:parentDown.code,noteDown:noteDown.code,bothDown:bothDown.code,
     alertA:display.mentalResultHtml(parentDown),alertB:display.mentalResultHtml(noteDown),
     same:before.ok&&after.ok&&before.raw===after.raw};
   },result.id);
   assert.equal(failure.normal,'ACTIVE');
   assert.deepEqual([failure.parentDown,failure.noteDown,failure.bothDown],
    ['UNREADABLE_PARENT','READ_FAILED','READ_FAILED']);
   assert.equal(failure.same,true);
   for(const html of [failure.alertA,failure.alertB]){
    assert.match(html,/role="alert"/);assert.doesNotMatch(html,/この項目の申告はありません/);
   }
   console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-066',
    engine:engineName,status:'PASS',originalPreserved:true,states:'read-error distinct from unanswered'}));
   // T-084: real mental answer and actual private free text on the result,
   // while PNG canvas draw calls and print CSS exclude it by default.
   const host=page.locator('#runload-result-v4');
   await host.locator('[data-tab="fatigue"]').first().click();
   await host.locator('.mx-result-details > summary').click();
   assert.match(await host.locator('.mx-result-note').innerText(),/走る前の経験を思い出して申告/);
   await host.locator('.rv4-export-menu > summary').click();
   assert.equal(await host.locator('[data-export-rof]').isChecked(),false);
   await page.emulateMedia({media:'print'});
   const hidden=await host.evaluate(el=>{
    const root=el.shadowRoot;
    return {mental:getComputedStyle(root.querySelector('.rv4-mental')).display,
     fatigue:getComputedStyle(root.querySelector('.rv4-fatigue')).display,
     privateNote:getComputedStyle(root.querySelector('.rv4-details:not(.rv4-region-evidence)')).display};
   });
   assert.deepEqual(hidden,{mental:'none',fatigue:'none',privateNote:'none'});
   if(engineName==='chromium'){
    // M7 T-055: produce a physical PDF while the private details are expanded.
    // This is stricter than checking CSS declarations alone.
    const {spawnSync}=await import('node:child_process');
    const pdf=await page.pdf({format:'A4',printBackground:true});
    const out=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8',maxBuffer:16*1024*1024});
    assert.equal(out.status,0,'pdftotext must extract the actual Chromium PDF: '+out.stderr);
    assert.ok(out.stdout.length>25,'printed PDF must have searchable content, text='+JSON.stringify(out.stdout.slice(0,300)));
    assert.doesNotMatch(out.stdout,/走る前の経験を思い出して申告|PRIVATE-MENTAL|本人の任意申告/);
    console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-055',engine:engineName,status:'PASS',pdfBytes:pdf.length,privateExcluded:true}));
   }
   await page.emulateMedia({media:'screen'});
   await page.evaluate(()=>{
    const proto=CanvasRenderingContext2D.prototype,orig=proto.fillText;window.__m7Painted=[];
    proto.fillText=function(value,...args){window.__m7Painted.push(String(value));return orig.call(this,value,...args)};
   });
   const [download]=await Promise.all([page.waitForEvent('download'),host.locator('[data-download]').click()]);
   assert.match(download.suggestedFilename(),/\.png$/);
   const painted=await page.evaluate(()=>window.__m7Painted.join('\\n'));
   assert.match(painted,/自由記述・後日申告・経路は掲載しません/);
   assert.doesNotMatch(painted,/FELT|本人の任意申告|走る前の経験を思い出して申告/);
   console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-084',
    engine:engineName,status:'PASS',mentalActual:true,pngTextAudited:true,printHidden:true}));
  }
  assert.deepEqual(errors,[],'no SPA runtime errors');
  await context.close();
  console.log(JSON.stringify({gate:'M4-manual-real-SPA',engine:engineName,mode:fault?'annotation-failure-and-retry':'normal',result:'PASS',parentId:result.id,mentalResult:result.read.status}));
 }
 // Unselected optional response must not block an ordinary run or create an annotation event.
 {
  const {context,page,errors}=await open();
  await page.locator('[data-draft="distance"]').first().fill('4');
  await page.locator('[data-draft="minutes"]').first().fill('24');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
  await page.locator('[data-manual-run-save]').click();
  await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
  const id=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]);
  const no=await page.evaluate(async(id)=>{
   const flow=await import('/ui/mentalSaveFlow.js');
   return flow.readMental({sourceType:'MANUAL',recordId:id});
  },id);
  assert.equal(no.ok,true,no.reason);assert.equal(no.value.status,'NO_ANSWER');
  assert.deepEqual(errors,[]);await context.close();
  console.log(JSON.stringify({gate:'M4-no-answer-real-SPA',engine:engineName,result:'PASS',savedParent:true,noEvent:true}));
 }

 // M7 T-034: inject a real canonical IDB write denial on first parent save.
 // The UI must not generate any orphan mental event or claim a saved parent.
 {
  const {context,page,errors}=await open();
  await page.locator('[data-draft="distance"]').first().fill('4');
  await page.locator('[data-draft="minutes"]').first().fill('25');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.goto(base+'#/record-reflection',{waitUntil:'networkidle'});
  const mental=page.locator('[data-mental-panel="manual"]');
  await mental.locator(':scope > summary').click();
  await mental.locator('[data-mental-answer="manual"][value="FELT"]').check();
  await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   const c=globalThis.crypto,old=c.randomUUID?.bind(c);
   if(!old)throw Error('M7 T-034 requires a secure randomUUID function');
   Object.defineProperty(c,'randomUUID',{configurable:true,value:function(){
    window.__m7ParentIdFailure=true;
    Object.defineProperty(c,'randomUUID',{configurable:true,value:old});
    return null; // original UUID generation fails before any parent commit
   }});
  });
  await page.locator('[data-manual-run-save]').click();
  await page.waitForFunction(()=>window.__m7ParentIdFailure===true&&
   document.querySelector('[data-record-review]')?.textContent?.includes('保存操作IDを作成できない'),
   null,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__m7ParentIdFailure),true);
  assert.match(page.url(),/#\/record-review/);
  const state=await page.evaluate(async()=>{
   const [c,a]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/annotationStore.js')]);
   const parent=await c.readCanonical(),opened=await a.openAnnotationStore();
   if(!parent.ok||!opened.ok)throw Error('T-034 stores unavailable after failure');
   const integrity=await a.inspectAnnotationStore(opened.value.db);opened.value.db.close();
   return {parentCount:parent.read.records.length,eventCount:integrity.ok?integrity.value.eventCount:-1};
  });
  assert.deepEqual(state,{parentCount:0,eventCount:0},'T-034 must never create annotation without committed parent');
  const notice=await page.locator('[data-record-review]').innerText();
  assert.match(notice,/保存/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-034',engine:engineName,
   status:'PASS',fault:'original unique ID generation rejected before commit',parentCount:0,annotationCount:0}));
  await context.close();
 }

 // M7 T-021: simulated real geolocation permission denial leaves no measured
 // points; the independent manual input flow remains a valid working path.
 {
  const {context,page,errors}=await open();
  const denied=await page.evaluate(async()=>{
   const {createGpsSession}=await import('/ui/gpsMeasurementCore.js');
   let reject,stop=0;
   const geo={watchPosition:(success,error)=>{reject=error;return 12},clearWatch:()=>{stop++}};
   const controller=createGpsSession({geo,now:()=>1700000000000});
   if(controller.start()!==true)throw Error('T-021 GPS controller did not start');
   reject({code:1});
   const snap=controller.getSnapshot();
   return {phase:controller.state.phase,message:controller.state.positionError,watchStop:stop,
    accepted:controller.state.accepted,distanceM:controller.state.distanceM,
    track:snap.track?.length??0};
  });
  assert.equal(denied.phase,'paused');
  assert.match(denied.message,/拒否/);
  assert.deepEqual([denied.watchStop,denied.accepted,denied.distanceM,denied.track],[1,0,0,0],
   'no invented distance or locations after geolocation denial');
  await page.locator('[data-draft="distance"]').first().fill('5');
  await page.locator('[data-draft="minutes"]').first().fill('28');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
  await page.locator('[data-manual-run-save]').click();
  await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
  const result=page.locator('#runload-result-v4');
  assert.match(await result.locator('[data-source-distance]').innerText(),/本人入力/);
  assert.match(await result.locator('[data-source-pace]').innerText(),/算出/);
  const parent=await page.evaluate(async()=>{
   const canonical=await import('/ui/manualRunCanonical.js');
   const r=await canonical.readCanonical();
   return r.ok?r.read.records.map(x=>({source:x.source,distance:x.distanceKm})):[];
  });
  assert.deepEqual(parent,[{source:'manual',distance:5}]);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-021',engine:engineName,
   status:'PASS',gpsPermission:'DENIED',gpsPoints:0,gpsDistance:0,manualSaved:true}));
  await context.close();
 }
 // GPS presentation accepts only explicit mental input, not any GPS/ROF number.
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();await page.goto(base,{waitUntil:'networkidle'});
 const gps=await page.evaluate(async()=>{
  const [ui,m,store,flow]=await Promise.all([import('/ui/measurementExperience.js'),import('/ui/mentalExperience.js'),import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/mentalSaveFlow.js')]);
  const ready={phase:'finished',activity:'RUNNING',distanceM:25,accepted:3,rejected:0,flags:[]};
  const html=ui.gpsReviewPage(ready,10000,{rofBefore:0,rofAfter:null,memo:''},m.renderMentalInput({...m.newMentalDraft(),answer:'NOT_FELT'},'gps'));
  const t=1700000000000;
  const point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'});
  const track=[point(0,0),point(1,.0125),point(2,.025)];
  const session={...ready,elapsedMs:10000,track,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true,trackSimplified:false};
  const saved=await store.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-08'});
  if(!saved.ok)return {ok:false,reason:'GPS source '+saved.reason};
  const ref={sourceType:'GPS_V2',recordId:saved.summary.id};
  const prepared=m.makeMentalAppendRequest(ref,{...m.newMentalDraft(),answer:'NOT_FELT'});
  if(!prepared.ok)return {ok:false,reason:prepared.reason};
  const added=await flow.saveMentalOnly({request:prepared.request});
  const read=await flow.readMental(ref);
  return {ok:added.ok&&read.ok,markup:html,summary:saved.summary,readStatus:read.value?.status,answer:read.value?.latest?.payload?.answer,reason:added.reason};
 });
 assert.equal(gps.ok,true,gps.reason);
 assert.match(gps.markup,/data-mental-panel="gps"/);assert.match(gps.markup,/気持ち・考える面の疲れ/);
 assert.equal(gps.summary.experience,undefined,'GPS original remains separate');
 assert.equal(gps.answer,'NOT_FELT');assert.equal(gps.readStatus,'ACTIVE');
 await ctx.close();
 console.log(JSON.stringify({gate:'M4-GPS-review-and-real-summary',engine:engineName,result:'PASS',mentalNonScale:true,originalExperienceUnaffected:true}));

 // M7 P1/P2 same-run counterexamples: assertions must inspect a real saved parent.
 for(const t of [
  {id:'T-001',before:2,after:0,memo:'心地よかった',mental:null},
  {id:'T-002',before:2,after:2,memo:'',mental:'FELT'},
  {id:'T-016',before:0,after:0,memo:'',mental:'FELT'},
  {id:'T-017',before:2,after:2,memo:'楽しかった',mental:'NOT_FELT'},
  {id:'T-018',before:2,after:2,memo:'',mental:'FELT',recalled:true}
 ]){
  const {context,page,errors}=await open();
  await page.locator('[data-draft="distance"]').first().fill('5');
  await page.locator('[data-draft="minutes"]').first().fill('30');
  if(t.recalled)await page.locator('[data-draft="date"]').fill(new Date(Date.now()-24*3600000).toISOString().slice(0,10));
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.goto(base+'#/record-rof',{waitUntil:'networkidle'});
  const setScore=async(value)=>{
   await page.locator('[data-rof-v4-range]').evaluate((el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await page.waitForFunction(n=>document.querySelector('[data-rof-v4-number]')?.textContent===String(n),value,{timeout:10000});
  };
  await setScore(t.before);
  await page.locator('[data-rof-v4-phase="after"]').click();
  await setScore(t.after);
  await page.goto(base+'#/record-reflection',{waitUntil:'networkidle'});
  if(t.memo)await page.locator('[data-draft="memo"]').fill(t.memo);
  if(t.mental){
   const panel=page.locator('[data-mental-panel="manual"]');
   await panel.waitFor({state:'attached',timeout:20000});
   await panel.locator(':scope > summary').click();
   await panel.locator('[data-mental-answer="manual"][value="'+t.mental+'"]').check();
   if(t.recalled){
    await panel.locator('.mx-extra > summary').click();
    await panel.locator('[data-mental-phase="manual"]').selectOption('BEFORE');
    await panel.locator('[data-mental-basis="manual"]').selectOption('RECALLED');
   }
  }
  await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
  await page.locator('[data-manual-run-save]').click();
  await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
  const id=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]);
  const result=page.locator('#runload-result-v4');
  await result.locator('[data-tab="fatigue"]').first().click();
  const fatigue=await result.locator('.rv4-fatigue-numbers').innerText();
  assert.ok(fatigue.includes(String(t.before))&&fatigue.includes(String(t.after)),t.id+' both scores visible');
  const note=await result.locator('.rv4-fatigue-caption').innerText();
  assert.match(note,/ROF-J／本人回答/);
  assert.match(note,/原因の測定ではありません/);
  assert.doesNotMatch(note,/回復したと確定|鈍感である|精神的不整合と診断/);
  if(t.memo){
   await result.locator('.rv4-details:not(.rv4-region-evidence) > summary').click();
   assert.match(await result.locator('.rv4-details:not(.rv4-region-evidence) .rv4-note').innerText(),new RegExp(t.memo));
  }
  if(t.mental)await page.waitForFunction(()=>document.querySelector('#runload-result-v4')?.shadowRoot?.querySelector('[data-mental-result]')?.textContent?.includes('本人の任意申告'),null,{timeout:20000});
  const saved=await page.evaluate(async recordId=>{
   const [canonical,flow]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/mentalSaveFlow.js')]);
   const data=await canonical.readCanonical();
   const run=data.ok?JSON.parse(data.raw).records.find(x=>x.id===recordId):null;
   const mental=await flow.readMental({sourceType:'MANUAL',recordId});
   return {run,mental:mental.ok?mental.value:null};
  },id);
  assert.ok(saved.run,t.id+' same run parent');
  assert.deepEqual([saved.run.rofBefore,saved.run.rofAfter],[t.before,t.after]);
  assert.equal(saved.run.memo,t.memo);
  assert.equal('mentalExperience' in saved.run.draft,false,'mental not original ROF');
  assert.equal(saved.mental.status,t.mental?'ACTIVE':'NO_ANSWER');
  if(t.mental)assert.equal(saved.mental.latest.payload.answer,t.mental);
  if(t.recalled){
   assert.equal(saved.mental.latest.declaredPhase,'BEFORE');
   assert.equal(saved.mental.latest.timeBasis,'RECALLED');
   assert.equal(saved.mental.latest.assessedAt,null,'not measured before the run');
   assert.equal((Date.parse(saved.mental.latest.enteredAt.slice(0,10)+'T00:00:00.000Z')-Date.parse(saved.run.date+'T00:00:00.000Z'))/86400000,1,'T-018/T-071 input calendar day is exactly the following day');
   await result.locator('.mx-result-details > summary').click();
   assert.match(await result.locator('.mx-result-details').innerText(),/過去を思い出して申告/);
  }
  assert.deepEqual(errors,[],t.id+' no SPA errors');
  console.log(JSON.stringify({gate:'M7-P1-P2-same-record',caseId:t.id,engine:engineName,result:'PASS',recordId:id}));
  await context.close();
 }

 // M7 T-004: the operation occurred after the recorded run, but the
 // participant explicitly said they meant the state directly after running.
 // Preserve both times and never present a verified chronology or cause.
 {
  const {context,page,errors}=await open();
  const runDate=new Date(Date.now()-24*3600*1000).toISOString().slice(0,10);
  await page.locator('[data-draft="date"]').fill(runDate);
  await page.locator('[data-draft="distance"]').first().fill('5');
  await page.locator('[data-draft="minutes"]').first().fill('30');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.goto(base+'#/record-rof',{waitUntil:'networkidle'});
  await page.locator('[data-rof-v4-phase="after"]').click();
  await page.locator('[data-rof-v4-range]').evaluate(el=>{
   el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('[data-rof-v4-number]')?.textContent==='3');
  await page.locator('.rv4-optional-meta > summary').click();
  await page.locator('[data-rof-run-start]').fill('17:30');
  await page.locator('[data-rof-run-end]').fill('18:00');
  await page.locator('[data-rof-v4-timing]').selectOption('RECALLED');
  await page.locator('[data-rof-v4-declared]').fill(runDate+'T18:10');
  assert.equal(await page.locator('[data-rof-v4-timing]').inputValue(),'RECALLED');
  await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
  await page.locator('[data-manual-run-save]').click();
  await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
  const recordId=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]);
  const details=await page.evaluate(async(id)=>{
   const c=await import('/ui/manualRunCanonical.js'),stored=await c.readCanonical();
   if(!stored.ok)throw Error('canonical read failed');
   return JSON.parse(stored.raw).records.find(x=>x.id===id);
  },recordId);
  assert.ok(details,'T-004 parent exists');
  assert.equal(details.date,runDate);
  assert.equal(details.rofAfter,3);
  const e=details.rofEvidence.after;
  assert.equal(e.timeBasis,'RECALLED','the declared time must remain a recalled self-report');
  assert.equal((Date.parse(e.capturedAt.slice(0,10)+'T00:00:00.000Z')-Date.parse(runDate+'T00:00:00.000Z'))/86400000,1,'T-004 operation occurred on the next calendar day');
  assert.equal(e.assessedAt?.slice(0,10),runDate,'declared assessment date differs from input-operation date');
  assert.equal((Date.parse(e.assessedAt)-Date.parse(details.exerciseTiming.endedAt))/60000,10,'participant reports the assessment ten minutes after the declared finish');
  assert.notEqual(e.assessedAt,e.capturedAt,'assessment is not inferred from input timestamp');
  const host=page.locator('#runload-result-v4');
  await host.locator('[data-tab="fatigue"]').first().click();
  await host.locator('.rv4-fatigue-method > summary').click();
  const visible=await host.locator('.rv4-fatigue-method').innerText();
  assert.ok(visible.includes(e.capturedAt),'visible input-operation timestamp');
  assert.ok(visible.includes(e.assessedAt),'visible subjective recalled timestamp');
  assert.match(visible,/評価時刻は本人申告/);
  assert.match(visible,/実測的な保証ではありません/);
  assert.deepEqual(errors,[],'T-004 actual browser result exceptions');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-004',engine:engineName,status:'PASS',recordId,runDate,capturedAt:e.capturedAt,assessedAt:e.assessedAt}));
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
