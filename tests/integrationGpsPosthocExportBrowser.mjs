/**
 * I1: Existing isolated M1/M3/M5/M7 prove individual data operations.
 * This is the missing connected path: GPS V2 + later subjective response
 * -> result -> GPS-readonly inquiry -> general running knowledge ->
 * portable backup opt-in/opt-out and failed restore preflight.
 * The experiment is synthetic; it does not validate runner outcomes.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(path!==root&&!path.startsWith(root+sep))throw Error('outside');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('content-type',types[extname(file)]||'application/octet-stream');
 res.end(await readFile(file));
}catch{res.writeHead(404);res.end('not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
try{
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const goto=hash=>page.goto(base+hash,{waitUntil:'networkidle'});
  await goto('#/history');
  const origins=await page.evaluate(async()=>{
   const [c,m,gps]=await Promise.all([
    import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),import('/ui/gpsReplayIndexedDbStore.js')]);
   if(!(await c.initialize()).ok)throw Error('manual canonical initialize');
   const draft={date:'2026-11-08',distance:'6',hours:'',minutes:'33',seconds:'',
     rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
     activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',shoeName:'',courseName:''};
   const manual=await c.mutate(s=>m.saveManualRun(s,draft));
   if(!manual.ok)throw Error('manual save '+manual.reason);
   const t=1700000000000,track=[0,.015,.03].map((km,i)=>({
    lat:37+i*.0001,lon:139.5,ele:null,altitudeAccuracy:null,
    altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'
   }));
   const session={phase:'finished',activity:'RUNNING',distanceM:30,elapsedMs:10000,accepted:3,rejected:0,
     track,trackSimplified:false,replayTrackAvailable:true,
     replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
   const result=await gps.saveGpsV2Run(session,{date:'2026-11-08',saveDetails:false,
     experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
   if(!result.ok)throw Error('GPS save '+result.reason);
   const listing=await gps.readGpsV2Summaries(),current=(await c.readCanonical()).raw;
   if(!listing.ok||!current)throw Error('origin read failed');
   return {manualId:manual.record.id,gpsId:result.summary.id,gpsRaw:JSON.stringify(listing.records),manualRaw:current};
  });
  assert.ok(origins.manualId.startsWith('run-v1-'));
  assert.ok(origins.gpsId.startsWith('gps-v2-'));
  const ref={sourceType:'GPS_V2',recordId:origins.gpsId};
  await goto('#/annotation?source=gps-v2&record='+encodeURIComponent(origins.gpsId));
  await page.locator('[data-ax-editor]').waitFor({timeout:20000});
  await page.locator('[data-ax-field]').selectOption('rofAfter');
  await page.locator('[data-ax-form] input[name="score"]').fill('0');
  await page.locator('[data-ax-form] select[name="declaredPhase"]').selectOption('AFTER');
  await page.locator('[data-ax-form] select[name="timeBasis"]').selectOption('RECALLED');
  await page.locator('[data-ax-save]').click();
  await page.waitForFunction(async r=>{
   const s=await import('/ui/annotationStore.js'),o=await s.openAnnotationStore();
   if(!o.ok)return false;
   try{
    const thread=await s.readAnnotationThread(o.value.db,r,'rofAfter');
    return thread.ok&&thread.value.length===1&&thread.value[0].payload?.score===0;
   }finally{o.value.db.close();}
  },ref,{timeout:20000});
  // Await the annotation editor's UI commit, not only the earlier IDB
  // transaction. A new field selection during the pending render can race
  // the previous form, especially on desktop.
  await page.locator('[data-ax-notice]').getByText('運動後',{exact:false}).waitFor({timeout:20000});
  await goto('#/history');
  await goto('#/annotation?source=gps-v2&record='+encodeURIComponent(origins.gpsId));
  await page.locator('[data-ax-editor]').waitFor({timeout:20000});
  await page.locator('[data-ax-field]').selectOption('mentalExperience');
  await page.locator('[data-ax-form] select[name="answer"]').selectOption('UNSURE');
  await page.locator('[data-ax-save]').click();
  await page.waitForFunction(async r=>{
   const s=await import('/ui/annotationStore.js'),o=await s.openAnnotationStore();
   if(!o.ok)return false;
   try{
    const thread=await s.readAnnotationThread(o.value.db,r,'mentalExperience');
    return thread.ok&&thread.value.length===1&&thread.value[0].payload?.answer==='UNSURE';
   }finally{o.value.db.close();}
  },ref,{timeout:20000});
  const snapshot=()=>page.evaluate(async r=>{
   const [c,g,a,read]=await Promise.all([import('/ui/manualRunCanonical.js'),
    import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js')]);
   const gps=await g.readGpsV2Summaries(),canonical=await c.readCanonical(),opened=await a.openAnnotationStore();
   if(!gps.ok||!canonical.ok||!opened.ok)throw Error('source unreadable');
   try{
    const before=await a.readAnnotationThread(opened.value.db,r,'rofAfter');
    const mental=await a.readAnnotationThread(opened.value.db,r,'mentalExperience');
    const effective=await read.readEffectiveAnnotation(opened.value.db,r,'rofAfter');
    return {gpsRaw:JSON.stringify(gps.records),manualRaw:canonical.raw,
     rofEvents:before.value,mentalEvents:mental.value,
     effectiveStatus:effective.ok?effective.value.status:effective.code,
     notes:localStorage.getItem('runload-v2-exploration-notes-v1')};
   }finally{opened.value.db.close();}
  },ref);
  const baseline=await snapshot();
  assert.equal(baseline.gpsRaw,origins.gpsRaw,'post-hoc must not change original GPS or Reference-100');
  assert.equal(baseline.manualRaw,origins.manualRaw,'post-hoc must not change unrelated manual run');
  assert.equal(baseline.rofEvents[0].payload.score,0);
  assert.equal(baseline.mentalEvents[0].payload.answer,'UNSURE');
  assert.equal(baseline.effectiveStatus,'ACTIVE');
  await goto('#/result?gps='+encodeURIComponent(origins.gpsId)+'&view=fatigue');
  // Test fixture saved directly to IndexedDB, bypassing app's normal GPS
  // save handler (which refreshes its in-memory summary list). Reload to
  // model opening that saved result in a new app session.
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.rv4-fatigue').waitFor({state:'attached',timeout:20000});
  assert.match(await page.locator('.rv4-fatigue').innerText(),/0/);
  assert.equal(await page.locator('.rv4-next-path').count(),0,
   'no result-only exploration CTA; Explore navigation remains available');
  // Preserve explicit GPS_V2 identity when the user opens the corresponding
  // independent inquiry. Never silently substitute a manually saved run.
  await goto('#/exploration-tree?source=gps-v2&record='+encodeURIComponent(origins.gpsId)+
   '&category=01&topic='+encodeURIComponent('自分が感じた疲れ'));
  await page.locator('[data-gps-inquiry-bridge]').waitFor({timeout:15000});
  const bridge=await page.locator('[data-gps-inquiry-bridge]').innerText();
  assert.match(bridge,/出所：GPSの保存記録/,'inquiry must identify the actual saved GPS origin');
  assert.doesNotMatch(bridge,/GPS新形式|GPS_V1/,'public inquiry must not show obsolete internal version labels');
  assert.match(bridge,/運動前 0／運動後 未回答/,'post-hoc 0 must not overwrite original null');
  assert.match(bridge,/自動的には関連づけません/);
  assert.equal(await page.locator('[data-ex-action="note"]').count(),0);
  await page.locator('[data-gps-inquiry-bridge] a[href^="#/exploration-tree"]').click();
  // The old GPS bridge and new general inquiry both use .ex-page.
  // Wait for the old bridge to leave instead of accepting stale content.
  await page.locator('[data-gps-inquiry-bridge]').waitFor({state:'detached',timeout:15000});
  assert.equal(await page.locator('[data-gps-inquiry-bridge]').count(),0);
  assert.equal(await page.locator('.ex-record-return').count(),0);
  await goto('#/learning?lesson=effort-fatigue-recovery');
  // Lessons open only their first chapter. The learner explicitly opens
  // the quiz chapter before answering, rather than bypassing disclosure.
  await page.locator('.lr-chapter:has([data-lf-quiz]) > summary').click();
  await page.locator('[data-lf-quiz]').waitFor();
  await page.locator('[data-lr-quiz-all]').click();
  await page.locator('[name="f1"][value="1"]').check();
  await page.locator('[data-lf-quiz] button[type=submit]').click();
  await page.locator('[data-lf-feedback=f1]').waitFor({state:'visible'});
  assert.deepEqual(await snapshot(),baseline,'learning and inquiry cannot mutate parent or append-only annotation history');
  const backup=await page.evaluate(async()=>{
   const [c,p]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/portableDataV2.js')]);
   const without=await c.snapshotTask(localStorage,s=>p.exportPortableBackup(s,{includeGps:false}));
   const full=await c.snapshotTask(localStorage,s=>p.exportPortableBackup(s,{includeGps:true}));
   if(!without.ok||!full.ok)throw Error('portable export refused '+JSON.stringify({without,full}));
   const a=JSON.parse(without.text),b=JSON.parse(full.text);
   const bad=structuredClone(b),target=bad.annotations.events.find(e=>e.fieldKey==='rofAfter');
   if(!target)throw Error('no GPS post-hoc event');
   target.payload.score=10; // deliberately corrupt 1 of the signed append-only contents
   const corrupt=JSON.stringify(bad), inspected=p.inspectPortableBackup(corrupt);
   const rejected=await c.snapshotTask(localStorage,s=>p.preflightPortableRestore(s,corrupt));
   return {withoutCount:a.annotations.events.length,withCount:b.annotations.events.length,
    withoutGps:a.gps===null,
    gpsIncluded:!!b.gps,expectedSource:b.annotations.events.map(e=>e.recordRef.sourceType),
    rejected:!rejected.ok,code:rejected.code||'',invalidShape:!inspected.ok};
  });
  assert.equal(backup.withoutCount,0,'default optout must not include GPS posthoc');
  assert.equal(backup.withCount,2,'GPS optin contains both append-only answers');
  assert.equal(backup.withoutGps,true);
  assert.equal(backup.gpsIncluded,true);
  assert.deepEqual(backup.expectedSource,['GPS_V2','GPS_V2']);
  assert.equal(backup.rejected,true,'tampered bundle must be rejected before restore');
  assert.deepEqual(await snapshot(),baseline,'failed import must not change parents, notes or post-hoc streams');
  await goto('#/exploration-tree?source=manual&record='+encodeURIComponent(origins.gpsId));
  await page.locator('[data-ex-inquiry-error]').waitFor();
  assert.equal(await page.locator('[data-gps-inquiry-bridge]').count(),0);
  assert.deepEqual(await snapshot(),baseline);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'I1-GPS-POSTHOC-EXPORT-INTEGRATION',engine:engineName,width,status:'PASS',
   originalRofZero:true,posthocZero:true,gpsInquiryReadonly:true,sourceMismatchBlocked:true,
   optOutExcludesGps:true,corruptRestoreRejected:true,scienceParentUnchanged:true}));
  await ctx.close();
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
