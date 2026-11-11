/** M2 real Chromium + WebKit IndexedDB acceptance. Synthetic records only.
 * Tests atomic event/head/meta, 2 tabs, deletion, offline and tamper detection.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=4268,engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(name==='/m2-check'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><title>M2 internal test</title><body>M2 storage-only</body></html>');return;}
  const path=resolve(root,'.'+name);if(path!==root&&!path.startsWith(root+sep))throw Error('denied');
  res.setHeader('content-type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(port,'127.0.0.1',done));
const browserType=engine==='webkit'?webkit:chromium;
let browser;
try{
 browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',x=>errors.push(x.message));
 const origin=`http://127.0.0.1:${port}/m2-check`;
 await page.goto(origin,{waitUntil:'networkidle'});
 const seeded=await page.evaluate(async()=>{
  const [canonical,manual,gps2,annotations,ref]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js'),
   import('/ui/annotationStore.js'),import('/ui/recordRef.js')]);
  const r=await canonical.refresh();if(!r.ok)throw Error('cannot use authoritative manual IndexedDB');
  const draft={date:'2026-11-08',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'M2 source',courseName:'',shoeName:''};
  const a=await canonical.mutate(storage=>manual.saveManualRun(storage,draft));
  const b=await canonical.mutate(storage=>manual.saveManualRun(storage,{...draft,memo:'second same-day run'}));
  if(!a.ok||!b.ok)throw Error('manual saves failed');
  const start=1700000000000;
  const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
   altitudeQuality:'missing',km,t:start+i*5000,breakBefore:i===0,activity:'RUNNING'}));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,accepted:3,rejected:0,
   track,trackSimplified:false,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true,flags:[]};
  const current=await gps2.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-08'});
  if(!current.ok)throw Error('gps v2 save failed');
  const opening=await annotations.openAnnotationStore();if(!opening.ok)throw Error('annotation store unavailable: '+opening.reason);
  const empty=await annotations.inspectAnnotationStore(opening.value.db);
  if(!empty.ok||empty.value.eventCount!==0)throw Error('new store not pristine');
  const refs={manual:{sourceType:'MANUAL',recordId:a.record.id},other:{sourceType:'MANUAL',recordId:b.record.id},
   gps2:{sourceType:'GPS_V2',recordId:current.summary.id}};
  for(const r of Object.values(refs))if(!(await ref.resolveRecord(r)).ok)throw Error('parent missing: '+r.sourceType);
  const baseline=await canonical.readCanonical();if(!baseline.ok)throw Error('manual source readback failed');
  refs.__baselineManual=baseline.raw;
  const v2=await gps2.readGpsV2Summaries();if(!v2.ok)throw Error('GPS v2 baseline missing');
  refs.__baselineGpsV2=JSON.stringify(v2.records.find(x=>x.id===current.summary.id));
  return refs;
 });

 // M7 T-036: a successful authoritative IDB parent commit is deliberately
 // treated as unacknowledged, followed by readback and same-ID retry.
 const uncertain=await page.evaluate(async()=>{
  const [c,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const requestId='run-v1-'+crypto.randomUUID();
  const draft={date:'2026-11-08',distance:'5',hours:'',minutes:'30',seconds:'',
   rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'uncertain parent',shoeName:'',courseName:''};
  const before=await c.readCanonical();
  if(!before.ok)throw Error('cannot read before');
  const first=await c.mutate(s=>manual.saveManualRun(s,draft,{requestId}));
  if(!first.ok)throw Error('first commit failed');
  // Simulate that the browser never saw first.ok.
  const reloaded=await c.refresh();
  if(!reloaded.ok||!reloaded.read.records.some(x=>x.id===requestId))throw Error('cannot safely reconcile');
  const replay=await c.mutate(s=>manual.saveManualRun(s,draft,{requestId}));
  const conflict=await c.mutate(s=>manual.saveManualRun(s,{...draft,memo:'different'},{requestId}));
  const after=await c.refresh();
  return {duplicate:replay.duplicate,conflict:conflict.code,
   actualCount:after.read.records.filter(r=>r.id===requestId).length,
   additions:after.read.records.length-before.read.records.length,
   parentUnchanged:JSON.stringify(after.read.records.find(r=>r.id===requestId))===JSON.stringify(first.record)};
 });
 assert.deepEqual(uncertain,{duplicate:true,conflict:'REQUEST_CONFLICT',
  actualCount:1,additions:1,parentUnchanged:true});
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-036',
  engine,status:'PASS',sourceRechecked:true,noNewParentOnUnknownAck:true}));
 // The first M2 fixture snapshot was taken before the intentional T-036
 // test-created parent; refresh it once so later annotation immutability
 // assertions compare to the true post-T-036 authoritative baseline.
 const adjusted=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');const r=await c.readCanonical();
  if(!r.ok)throw Error('manual fixture readback failed');return r.raw;
 });
 seeded.__baselineManual=adjusted;

 const stage=await page.evaluate(async refs=>{
  const [st,model,ref]=await Promise.all([import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js'),import('/ui/recordRef.js')]);
  const opening=await st.openAnnotationStore();if(!opening.ok)throw Error(opening.reason);const db=opening.value.db;
  const when='2026-11-08T01:00:00.000Z';
  const make=(n,recordRef,fieldKey,payload,op='ADD',head=null,rev=0)=>({recordRef,fieldKey,payload,operation:op,
   expectedHeadEventId:head,expectedRevision:rev,clientRequestId:'req-m2-'+String(n).padStart(8,'0'),
   eventId:'evt-m2-'+String(n).padStart(8,'0'),declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:when});
  const a=make(1,refs.manual,'mentalExperience',{answer:'FELT'});
  const added=await st.appendAnnotation(db,a);
  if(!added.ok||added.value.duplicate)throw Error('initial annotation not saved '+JSON.stringify(added));
  const retry=await st.appendAnnotation(db,a);
  if(!retry.ok||!retry.value.duplicate||retry.value.event.eventId!==a.eventId)throw Error('idempotence failed');
  const clash=await st.appendAnnotation(db,{...a,payload:{answer:'UNSURE'}});
  if(clash.code!=='REQUEST_CONFLICT')throw Error('digest collision did not fail');
  const badManual=await st.appendAnnotation(db,make(2,refs.manual,'rofBefore',{score:0}));
  if(badManual.code!=='BAD_FIELD')throw Error('manual ROF incorrectly accepted');
  const wrongRef=await st.appendAnnotation(db,make(3,{sourceType:'MANUAL',recordId:refs.gps2.recordId},'memo',{text:'a'}));
  if(wrongRef.code!=='SOURCE_MISMATCH')throw Error('wrong source was not rejected');
  const missing=await st.appendAnnotation(db,make(4,{sourceType:'GPS_V2',recordId:'gps-v2-unknown01'},'memo',{text:'a'}));
  if(missing.code!=='NOT_FOUND')throw Error('orphan event was created');
  const read1=await model.readEffectiveAnnotation(db,refs.manual,'mentalExperience');
  if(!read1.ok||read1.value.status!=='ACTIVE'||read1.value.latest.payload.answer!=='FELT')throw Error('read model wrong');
  const absent=await model.readEffectiveAnnotation(db,refs.other,'mentalExperience');
  if(!absent.ok||absent.value.status!=='NO_ANSWER')throw Error('same-day record reused another answer');
  const edited=await st.appendAnnotation(db,make(5,refs.manual,'mentalExperience',{answer:'UNSURE'},'CORRECT',a.eventId,1));
  if(!edited.ok||edited.value.event.sequence!==2)throw Error('correction failed '+JSON.stringify(edited));
  const badOldHead=await st.appendAnnotation(db,make(6,refs.manual,'mentalExperience',{answer:'NOT_FELT'},'CORRECT',a.eventId,1));
  if(badOldHead.code!=='HEAD_CONFLICT')throw Error('stale head was accepted');
  const retracted=await st.appendAnnotation(db,make(7,refs.manual,'mentalExperience',null,'RETRACT',edited.value.event.eventId,2));
  if(!retracted.ok)throw Error('retract failed');
  const deleted=await model.readEffectiveAnnotation(db,refs.manual,'mentalExperience');
  if(!deleted.ok||deleted.value.status!=='RETRACTED')throw Error('retraction became no answer');
  const resumed=await st.appendAnnotation(db,make(8,refs.manual,'mentalExperience',{answer:'NOT_FELT'},'ADD',retracted.value.event.eventId,3));
  if(!resumed.ok)throw Error('re-add failed');
  const lateRetry=await st.appendAnnotation(db,a);
  if(!lateRetry.ok||!lateRetry.value.duplicate)throw Error('old idempotent request was rejected after newer head');
  const gpsRof=await st.appendAnnotation(db,make(9,refs.gps2,'rofAfter',{score:0}));
  if(!gpsRof.ok)throw Error('GPS ROF zero rejected');
  const gpsSummary=await st.appendAnnotation(db,make(10,refs.gps2,'memo',{text:'post-hoc self report'}));
  if(!gpsSummary.ok)throw Error('GPS v2 added note rejected');
  const grade=await st.appendAnnotation(db,make(11,refs.manual,'gradeBundle',{gradeMode:'SUMMARY',upPercent:30,downPercent:10}));
  if(!grade.ok)throw Error('complete slope group rejected');
  const surface=await st.appendAnnotation(db,make(12,refs.manual,'surfaceBundle',{surfaceMode:'MIXED',shares:{paved:50,soil:50}}));
  if(!surface.ok)throw Error('complete surface group rejected');
  const step=await st.appendAnnotation(db,make(13,refs.manual,'stepsBundle',{steps:0,stepsProvenance:'UNKNOWN'}));
  if(!step.ok)throw Error('valid steps zero rejected');
  const badGroup=await st.appendAnnotation(db,make(14,refs.manual,'gradeBundle',{gradeMode:'SUMMARY',upPercent:90,downPercent:90},'CORRECT',grade.value.event.eventId,1));
  if(badGroup.code!=='BAD_VALUE')throw Error('invalid group changed a valid head');
  // Actual authoritative source documents must remain byte-identical under addenda.
  const [canonical,gps2]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/gpsReplayIndexedDbStore.js')]);
  const currentManual=await canonical.readCanonical(),currentV2=await gps2.readGpsV2Summaries();
  if(!currentManual.ok||currentManual.raw!==refs.__baselineManual)throw Error('manual original changed during annotation');
  if(!currentV2.ok||JSON.stringify(currentV2.records.find(x=>x.id===refs.gps2.recordId))!==refs.__baselineGpsV2)throw Error('GPS v2 original changed during annotation');
  const validInspection=await st.inspectAnnotationStore(db);
  if(!validInspection.ok||validInspection.value.eventCount!==9)throw Error('head/meta/events inconsistent: '+JSON.stringify(validInspection));
  const copied=await st.findAnnotationByRequestId(db,a.clientRequestId);
  if(!copied.ok||copied.value.eventId!==a.eventId)throw Error('request-id recovery failed');
  const quotaDb={transaction(){throw new DOMException('QuotaExceededError','QuotaExceededError')}};
  const quotaAttempt=await st.appendAnnotation(quotaDb,make(15,refs.other,'memo',{text:'quota test'}));
  if(quotaAttempt.code!=='QUOTA')throw Error('quota failure not explicit: '+JSON.stringify(quotaAttempt));
  const noDamage=await st.inspectAnnotationStore(db);
  if(!noDamage.ok||noDamage.value.eventCount!==9)throw Error('quota failure changed real store');
  db.close();
  return {count:9,revision:4,run1:refs.manual,run2:refs.other,code:'pass'};
 },seeded);
 assert.equal(stage.count,9);
 await page.reload({waitUntil:'networkidle'});
 // Two separate browser tabs issue the same expected-head in independent IDB connections.
 const tab2=await context.newPage();tab2.on('pageerror',e=>errors.push(e.message));await tab2.goto(origin,{waitUntil:'networkidle'});
 const makeRace=async(page,ref,n,fieldKey='bodyObservation')=>page.evaluate(async({ref,n,fieldKey})=>{
  const [st,md]=await Promise.all([import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js')]);
  const opened=await st.openAnnotationStore();if(!opened.ok)throw Error(opened.reason);
  const req={recordRef:ref,fieldKey,operation:'ADD',payload:{text:'Tab '+n},
   expectedHeadEventId:null,expectedRevision:0,clientRequestId:'req-race-'+String(n).padStart(8,'0'),
   eventId:'evt-race-'+String(n).padStart(8,'0'),declaredPhase:'AFTER',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:'2026-11-08T01:00:00.000Z'};
  const result=await st.appendAnnotation(opened.value.db,req);
  opened.value.db.close();
  return {ok:result.ok,code:result.code,duplicate:result.value?.duplicate??false};
 },{ref,n,fieldKey});
 const [raceA,raceB]=await Promise.all([makeRace(page,seeded.other,1),makeRace(tab2,seeded.other,2)]);
 assert.equal([raceA,raceB].filter(r=>r.ok).length,1,'one same-stream transaction must win');
 assert.deepEqual([raceA,raceB].filter(r=>!r.ok).map(r=>r.code),['HEAD_CONFLICT']);
 const separate=await Promise.all([makeRace(page,seeded.other,3,'courseName'),makeRace(tab2,seeded.other,4,'shoeName')]);
 assert.ok(separate.every(r=>r.ok),'different streams must both commit without overwriting');
 // Modules are already loaded into this browser document. Test IndexedDB with network blocked.
 await page.evaluate(async()=>{window.__m2StoredModule=await import('/ui/annotationStore.js');});
 await context.setOffline(true);
 let offline;
 try{
  offline=await page.evaluate(async ref=>{
   const m=window.__m2StoredModule,opened=await m.openAnnotationStore();if(!opened.ok)throw Error(opened.reason);
   const req={recordRef:ref,fieldKey:'environmentNote',operation:'ADD',payload:{text:'offline post-hoc entry'},
    expectedHeadEventId:null,expectedRevision:0,clientRequestId:'req-offline-0001',eventId:'evt-offline-0001',
    declaredPhase:'AFTER',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:'2026-11-08T01:00:00.000Z'};
   const saved=await m.appendAnnotation(opened.value.db,req);
   const replay=await m.readAnnotationThread(opened.value.db,ref,'environmentNote');
   opened.value.db.close();
   return {saved:saved.ok,read:replay.ok&&replay.value.length===1&&replay.value[0].payload.text==='offline post-hoc entry'};
  },seeded.other);
 }finally{await context.setOffline(false);}
 assert.deepEqual(offline,{saved:true,read:true},'offline read/write must work with a preloaded application module');
 const after=await page.evaluate(async refs=>{
  const [st,md,gps2]=await Promise.all([import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js'),import('/ui/gpsReplayIndexedDbStore.js')]);
  const opened=await st.openAnnotationStore();if(!opened.ok)throw Error(opened.reason);
  const db=opened.value.db;
  const thread=await st.readAnnotationThread(db,refs.manual,'mentalExperience');
  if(!thread.ok||thread.value.length!==4||thread.value.at(-1).payload.answer!=='NOT_FELT')throw Error('reload lost mental history');
  const empty=await md.readEffectiveAnnotation(db,refs.other,'memo');
  if(!empty.ok||empty.value.status!=='NO_ANSWER')throw Error('unrelated notes merged');
  const sameDay=await md.readEffectiveAnnotation(db,refs.other,'mentalExperience');
  if(!sameDay.ok||sameDay.value.status!=='NO_ANSWER')throw Error('same-day records shared state');
  const gpsScore=await md.readEffectiveAnnotation(db,refs.gps2,'rofAfter');
  if(!gpsScore.ok||gpsScore.value.latest.payload.score!==0)throw Error('GPS zero was coerced to null');
  const removed=await gps2.deleteGpsV2Run(refs.gps2.recordId);
  if(!removed.ok)throw Error('GPS parent removal failed');
  const orphan=await md.readEffectiveAnnotation(db,refs.gps2,'memo');
  if(!orphan.ok||orphan.value.status!=='ORPHANED'||orphan.value.eventCount!==1)throw Error('deleted parent was silently reassigned');
  const quarantine=await st.quarantineMissingParents(db);if(!quarantine.ok||quarantine.value.count!==1||quarantine.value.inspectionOnly!==true)throw Error('orphan count was not identified');
  const roots=await st.inspectAnnotationStore(db);
  if(!roots.ok||roots.value.eventCount!==13)throw Error('cross-tab update lost meta');
  const old=await st.readAnnotationThread(db,refs.manual,'gradeBundle');
  if(!old.ok||old.value.length!==1)throw Error('grade annotation missing');
  // Deliberately corrupt one stream: fail closed and retain every other stream.
  const tamper=db.transaction('events','readwrite');
  const evStore=tamper.objectStore('events');
  const target=await new Promise((res,rej)=>{const q=evStore.get(old.value[0].eventId);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  evStore.put({...target,payload:{gradeMode:'SUMMARY',upPercent:90,downPercent:90}});
  await new Promise((res,rej)=>{tamper.oncomplete=res;tamper.onerror=()=>rej(tamper.error);tamper.onabort=()=>rej(tamper.error)});
  const corrupted=await st.readAnnotationThread(db,refs.manual,'gradeBundle');
  if(corrupted.code!=='READ_FAILED')throw Error('tampered event not rejected');
  const clean=await st.readAnnotationThread(db,refs.manual,'mentalExperience');
  if(!clean.ok||clean.value.length!==4)throw Error('a bad stream changed another stream');
  const integrity=await st.inspectAnnotationStore(db);
  if(integrity.code!=='READ_FAILED')throw Error('global integrity audit missed tamper');
  db.close();return {history:4,orphaned:1,eventCount:13,corruptionRejected:true};
 },seeded);
 assert.deepEqual(after,{history:4,orphaned:1,eventCount:13,corruptionRejected:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({gate:'professor-M2-real-IDB-browser',engine,result:'PASS',events:13,concurrent:'one-winner-one-head-conflict',
  retryIdempotent:true,originalRunUnchanged:true,orphanedParentIsolated:true,storedCorruptionRejected:true}));
 await context.close();
}finally{await browser?.close();await new Promise(done=>server.close(done));}
