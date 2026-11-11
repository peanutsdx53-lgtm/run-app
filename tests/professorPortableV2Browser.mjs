/** Current portable backup: manual and saved GPS parents, annotations and post-commit restore.
 * Synthetic records only; preserve conflict and privacy checks.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(name==='/m3-check'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><meta charset="utf-8"><title>M3 storage-only acceptance</title></html>');return;}
  const path=resolve(root,'.'+name);if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('content-type',{'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(ok=>server.listen(4286,'127.0.0.1',ok));
const browserType=engine==='webkit'?webkit:chromium;
let browser;
try{
 browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4286/m3-check',{waitUntil:'networkidle'});
 const seeded=await page.evaluate(async()=>{
  const [canonical,manual,gps2,annotations]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/annotationStore.js')]);
  if(!(await canonical.initialize()).ok)throw Error('manual IDB initialize');
  const draft={date:'2026-11-08',distance:'6',hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'本人のM3仮想記録',shoeName:'',courseName:''};
  const m=await canonical.mutate(s=>manual.saveManualRun(s,draft));if(!m.ok)throw Error('manual save failed '+m.reason);
  const t=1700000000000,track=[0,.015,.03].map((km,i)=>({lat:37+i*.001,lon:139.5,ele:null,
   altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'}));
  const session={phase:'finished',activity:'RUNNING',distanceM:30,elapsedMs:10000,accepted:3,rejected:0,
   track,trackSimplified:false,replayTrackAvailable:true,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
  const g2=await gps2.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-08'});
  if(!g2.ok)throw Error('gps2 save '+g2.reason);
  const ann=await annotations.openAnnotationStore();if(!ann.ok)throw Error('annotation open');
  const refs=[{sourceType:'MANUAL',recordId:m.record.id},{sourceType:'GPS_V2',recordId:g2.summary.id}];
  for(let i=0;i<refs.length;i++){
   const req={recordRef:refs[i],fieldKey:i===1?'rofAfter':'mentalExperience',operation:'ADD',
    payload:i===1?{score:0}:{answer:i===0?'FELT':'UNSURE'},expectedHeadEventId:null,expectedRevision:0,
    eventId:'evt-m3-00000'+i,clientRequestId:'req-m3-00000'+i,
    declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:'2026-11-08T02:00:00.000Z'};
   const r=await annotations.appendAnnotation(ann.value.db,req);if(!r.ok)throw Error('annotation '+i+': '+r.reason);
  }
  ann.value.db.close();
  return {refs};
 });
 const exportCheck=await page.evaluate(async()=>{
  const [portable,canonical]=await Promise.all([import('/ui/portableDataV2.js'),import('/ui/manualRunCanonical.js')]);
  const exportOne=async gps=>canonical.snapshotTask(localStorage,s=>portable.exportPortableBackup(s,{includeGps:gps}));
  const without=await exportOne(false),full=await exportOne(true);
  if(!without.ok||!full.ok)throw Error('V2 export failed '+JSON.stringify({without,full}));
  const a=JSON.parse(without.text),b=JSON.parse(full.text);
  if(a.version!==2||b.version!==2||a.gps!==null||a.annotations.events.length!==1||
   b.annotations.events.length!==2||full.annotationCount!==2||without.excludedGpsAnnotationCount!==1)
   throw Error('incorrect scope, privacy or format');
  const parsed=portable.inspectPortableBackup(full.text);
  if(!parsed.ok||parsed.annotationCount!==2)throw Error('valid v2 backup rejected');

  // M7 T-048: fully signed orphan must be refused unless quarantine is explicit.
  const orphan=JSON.parse(full.text);
  const schema=await import('/ui/annotationSchema.js');
  const e=orphan.annotations.events.find(x=>x.recordRef.sourceType==='MANUAL');
  if(!e)throw Error('T048 lacks manual event');
  const oldStream=e.streamKey,newRef={sourceType:'MANUAL',recordId:'run-v1-'+crypto.randomUUID()};
  e.recordRef=newRef;e.recordKey=schema.recordKeyOf(newRef);e.streamKey=schema.streamKeyOf(newRef,e.fieldKey);
  e.requestDigest=await schema.digestAnnotationInput({...e,expectedHeadEventId:e.predecessorEventId});
  const h=orphan.annotations.heads.find(x=>x.streamKey===oldStream);if(!h)throw Error('T048 head missing');
  h.streamKey=e.streamKey;
  orphan.annotations.meta.totalBytes=orphan.annotations.events.reduce((n,v)=>n+schema.annotationUtf8Bytes(JSON.stringify(v)),0);
  const orphanText=JSON.stringify(orphan);
  const valid=await (await import('/ui/annotationBackup.js')).inspectAnnotationBundle(orphan.annotations);
  if(!valid.ok)throw Error('T048 signed event invalid '+JSON.stringify(valid));
  const orphanBefore48=await canonical.readCanonical();
  const blocked48=await portable.preflightPortableRestore(localStorage,orphanText);
  if(blocked48.ok||blocked48.code!=='ORPHANED')throw Error('T048 default reject missing '+JSON.stringify(blocked48));
  const deniedConsent48=await portable.isolateOrphanBackup(localStorage,orphanText);
  if(deniedConsent48.ok||deniedConsent48.code!=='CONSENT_REQUIRED')throw Error('T048 consent barrier missing');
  const isolated=await portable.isolateOrphanBackup(localStorage,orphanText,{consent:true});
  if(!isolated.ok||isolated.count!==1||isolated.restorable!==false||isolated.writeCount!==0||
     !JSON.parse(isolated.isolatedText).orphanRecordKeys.includes(e.recordKey))
   throw Error('T048 isolation contract violated '+JSON.stringify(isolated));
  if(portable.inspectPortableBackup(isolated.isolatedText).ok)throw Error('T048 sidecar importable');
  const orphanAfter48=await canonical.readCanonical();
  if(!orphanBefore48.ok||!orphanAfter48.ok||orphanBefore48.raw!==orphanAfter48.raw)throw Error('T048 source changed');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-048',status:'PASS',
   orphanSigned:true,defaultReject:true,explicitConsent:true,nonRestorable:true,unchanged:true}));
  // M7 T-080: precisely one ASCII byte in a validated event timestamp,
  // changing no event size or semantic type. This must reach SHA-256 validation
  // (rather than being rejected only by generic JSON/payload parsing).
  const oneByte=JSON.parse(full.text);
  const oldTime=oneByte.annotations.events[0].enteredAt;
  if(!oldTime.includes('02:00:00'))throw Error('M7 T-080 initial event time not expected');
  oneByte.annotations.events[0].enteredAt=oldTime.replace('02:00:00','02:01:00');
  const changed=JSON.stringify(oneByte);
  const countDiff=(a,b)=>a.length===b.length?[...a].filter((c,i)=>c!==b[i]).length:Infinity;
  if(countDiff(full.text,changed)!==1)throw Error('M7 T-080 modified more or less than one byte');
  const shape=portable.inspectPortableBackup(changed);
  if(!shape.ok)throw Error('M7 T-080 must preserve JSON schema to test hash mismatch');
  const checkHash=await portable.preflightPortableRestore(localStorage,changed);
  if(checkHash.ok||checkHash.code!=='BAD_EVENT'||!checkHash.reason.includes('ハッシュ'))
   throw Error('M7 T-080 failed to identify actual hash mismatch '+JSON.stringify(checkHash));
  const parentBefore=await canonical.readCanonical();
  const blocked=await canonical.portableMutation(localStorage,store=>portable.restorePortableBase(store,changed));
  if(blocked.ok)throw Error('M7 T-080 one-byte corruption was actually restored');
  const parentAfter=await canonical.readCanonical();
  if(!parentBefore.ok||!parentAfter.ok||parentAfter.raw!==parentBefore.raw)
   throw Error('M7 T-080 corrupted original parent even though preflight rejected it');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-080',status:'PASS',oneByteModified:1,code:checkHash.code}));
  // M7 T-046: v2 backup envelope with a VALID but different record under
  // the SAME manual ID must fail entirely before any data-store mutation.
  const conflict=JSON.parse(full.text);
  const manualKey=(await import('/ui/manualRunStore.js')).MANUAL_RUN_KEY;
  const payload=JSON.parse(conflict.local[manualKey]);
  const oldId=payload.records[0].id;
  payload.records[0].memo='同一IDで異なる有効な本人メモ';
  payload.records[0].draft.memo=payload.records[0].memo;
  conflict.local[manualKey]=JSON.stringify(payload);
  const conflictText=JSON.stringify(conflict);
  const acceptableShape=portable.inspectPortableBackup(conflictText);
  if(!acceptableShape.ok)throw Error('T-046 case must be a VALID v2 envelope '+JSON.stringify(acceptableShape));
  const oldData=await canonical.readCanonical();
  if(!oldData.ok)throw Error('T-046 cannot read existing parent');
  const rejected=await canonical.snapshotTask(localStorage,store=>portable.preflightPortableRestore(store,conflictText));
  if(rejected.ok||!rejected.reason.includes('同じ記録ID'))throw Error('T-046 did not detect same-ID diff-content '+JSON.stringify(rejected));
  const attempted=await canonical.portableMutation(localStorage,store=>portable.restorePortableBase(store,conflictText));
  if(attempted.ok)throw Error('T-046 corrupted merge passed restore');
  const current=await canonical.readCanonical();
  if(!current.ok||current.raw!==oldData.raw)throw Error('T-046 mutated original on preflight conflict');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-046',status:'PASS',
   version:2,originalId:oldId,preflightRejected:true,restoreRejected:true,originalIdentical:true}));
  const missing={...b};delete missing.annotations;
  if(portable.inspectPortableBackup(JSON.stringify(missing)).ok)throw Error('missing annotation property accepted');
  const corrupted=JSON.parse(full.text);corrupted.annotations.events[0].payload.answer='NOT_FELT';
  if((await portable.preflightPortableRestore(localStorage,JSON.stringify(corrupted))).ok)
   throw Error('tampered digest was accepted in preflight');
  // M7 T-020: reject a future mental answer and dictionary schema both
  // on attempted append and while previewing an actual portable-v2 restore.
  const annotations=await import('/ui/annotationStore.js');
  const invalidCases=[
   {name:'unknown-mental-code',payload:{answer:'FUTURE_MENTAL_CHOICE'},extra:null,expected:'BAD_VALUE'},
   {name:'future-dictionary-version',payload:{answer:'FELT'},extra:{dictionaryVersion:2},expected:'BAD_EVENT'}
  ];
  const opened=await annotations.openAnnotationStore();
  if(!opened.ok)throw Error('M7 T-020 cannot inspect original annotation database');
  for(let i=0;i<invalidCases.length;i++){
   const v=invalidCases[i];
   const request={recordRef:b.annotations.events[0].recordRef,fieldKey:'mentalExperience',operation:'ADD',
    payload:v.payload,expectedHeadEventId:null,expectedRevision:0,
    eventId:'m7T020ev'+i+'000000',clientRequestId:'m7T020req'+i+'000000',
    declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:'2026-11-08T02:00:00.000Z',
    ...(v.extra||{})};
   const refused=await annotations.appendAnnotation(opened.value.db,request);
   if(refused.ok||refused.code!==v.expected)
    throw Error('M7 T-020 unsafe append '+v.name+' '+JSON.stringify(refused));
  }
  const stillValid=await annotations.inspectAnnotationStore(opened.value.db);
  opened.value.db.close();
  if(!stillValid.ok||stillValid.value.eventCount!==2)
   throw Error('M7 T-020 invalid append modified original annotation history');
  for(const v of invalidCases){
   const future=JSON.parse(full.text);
   if(v.name==='unknown-mental-code')future.annotations.events[0].payload.answer=v.payload.answer;
   else future.annotations.events[0].dictionaryVersion=2;
   const invalidText=JSON.stringify(future);
   const inspected=portable.inspectPortableBackup(invalidText);
   if(inspected.ok)throw Error('M7 T-020 sync backup accepted '+v.name);
   const preflight=await portable.preflightPortableRestore(localStorage,invalidText);
   if(preflight.ok)throw Error('M7 T-020 restore preview accepted '+v.name);
   const oldOriginal=await canonical.readCanonical();
   if(!oldOriginal.ok)throw Error('M7 T-020 cannot read prior original');
   const restore=await canonical.portableMutation(localStorage,s=>portable.restorePortableBase(s,invalidText));
   if(restore.ok)throw Error('M7 T-020 actual restore accepted '+v.name);
   const afterInvalid=await canonical.readCanonical();
   if(!afterInvalid.ok||oldOriginal.raw!==afterInvalid.raw)
    throw Error('M7 T-020 failed restore changed canonical parent '+v.name);
  }
  const unchanged=await canonical.readCanonical();
  if(!unchanged.ok||unchanged.read.records.length!==1)
   throw Error('M7 T-020 corrupted original when rejecting a future dictionary');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-020',status:'PASS',scope:'invalid append and preflight restore before any writes'}));
  const checks=await portable.preflightPortableRestore(localStorage,full.text);
  if(!checks.ok||checks.annotationCount!==2||checks.annotationAdditions!==0)
   throw Error('exact existing archive cannot be previewed: '+JSON.stringify(checks));
  window.__m3Backup=full.text;
  return {version:b.version,without:without.annotationCount,withGps:full.annotationCount,
   excluded:without.excludedGpsAnnotationCount,textBytes:new Blob([full.text]).size};
 });
 assert.deepEqual({...exportCheck}, {...exportCheck,version:2,without:1,withGps:2,excluded:1});
 const life=await page.evaluate(async refs=>{
  const [portable,canonical,st,model,gps2,manual]=await Promise.all([
   import('/ui/portableDataV2.js'),import('/ui/manualRunCanonical.js'),import('/ui/annotationStore.js'),
   import('/ui/annotationReadModel.js'),import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/manualRunStore.js')]);
  const backup=window.__m3Backup;
  const beforeDelete=await canonical.readCanonical();if(!beforeDelete.ok)throw Error('baseline canonical');
  const clearing=await canonical.portableMutation(localStorage,s=>portable.removeAllPortableBase(s));
  const cleared=await portable.removeAllPortableAnnotations(clearing);
  if(!cleared.ok)throw Error('delete all failed '+cleared.reason);
  const empty=await canonical.readCanonical();if(!empty.ok||empty.read.records.length!==0)throw Error('manual not deleted');
  const annEmpty=await st.openAnnotationStore();if(!annEmpty.ok)throw Error('cannot inspect after delete');
  const inspect=await st.inspectAnnotationStore(annEmpty.value.db);annEmpty.value.db.close();
  if(!inspect.ok||inspect.value.eventCount!==0)throw Error('annotations not deleted');
  // M7 T-049: all four independent stores must be empty; no silent success
  // when the old GPS, new GPS, or isolated annotation store remains populated.
  const deletedV2=await gps2.readGpsV2Summaries();
  if(!deletedV2.ok||deletedV2.records.length!==0)
   throw Error('T-049 either GPS source survived whole-app deletion');
  if(!empty.read||empty.read.records.length!==0)throw Error('T-049 manual source survived deletion');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-049',status:'PASS',
   manualDeleted:true,gpsDeleted:true,annotationsDeleted:true,
   note:'Individual stores verified separately after whole-app deletion; restore test follows'}));

  const preflight=await portable.preflightPortableRestore(localStorage,backup);
  if(!preflight.ok||preflight.annotationAdditions!==2)throw Error('empty restore preflight rejected: '+JSON.stringify(preflight));
  const original=await canonical.portableMutation(localStorage,s=>portable.restorePortableBase(s,backup));
  if(!original.ok)throw Error('original restore failed: '+original.reason);
  // Simulate annotation DB denial AFTER the canonical parent commit.
  // Report partial completion, preserve source records, then retry annotation only.
  const priorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  let partial;
  try{partial=await portable.restorePortableAnnotations(backup,original);}
  finally{if(priorDescriptor)Object.defineProperty(globalThis,'indexedDB',priorDescriptor);else delete globalThis.indexedDB;}
  if(partial?.ok!==false||partial.partial!==true||!partial.reason.includes('補助回答'))
   throw Error('annotation storage denial was not labeled as partial: '+JSON.stringify(partial));
  const savedParent=await canonical.readCanonical();
  if(!savedParent.ok||savedParent.read.records.length!==1)throw Error('partial annotation failure corrupted the original');
  const finish=await portable.restorePortableAnnotations(backup,original);
  if(!finish.ok||finish.annotationsAdded!==2)throw Error('annotation restore failed '+JSON.stringify(finish));
  const now=await canonical.readCanonical();
  if(!now.ok||now.raw!==beforeDelete.raw||now.read.records.length!==1)throw Error('original manual changed');
  const gpsNow=await gps2.readGpsV2Summaries();if(!gpsNow.ok||gpsNow.records.length!==1)throw Error('GPS2 missing');
  const opened=await st.openAnnotationStore();if(!opened.ok)throw Error('annotation DB not reopened');
  for(const [i,ref] of refs.refs.entries()){
   const field=i===1?'rofAfter':'mentalExperience';
   const read=await model.readEffectiveAnnotation(opened.value.db,ref,field);
   if(!read.ok||read.value.status!=='ACTIVE'||(i===1?read.value.latest.payload.score!==0:!read.value.latest.payload.answer))
    throw Error('restored note invalid '+JSON.stringify(read));
  }
  opened.value.db.close();
  const again=await portable.preflightPortableRestore(localStorage,backup);
  if(!again.ok||again.annotationAdditions!==0)throw Error('idempotent restore preview failed');
  const repeat=await portable.restorePortableAnnotations(backup,{ok:true});
  if(!repeat.ok||repeat.annotationsAdded!==0)throw Error('duplicate import changed history');
  return {deletedAll:true,restoredOriginal:true,annotationsRestored:finish.annotationsAdded,idempotent:true,gpsV2:true};
 },seeded);
 assert.deepEqual(life,{deletedAll:true,restoredOriginal:true,annotationsRestored:2,idempotent:true,gpsV2:true});
 // M7 T-081: includeGps=false while GPS-linked annotations exist.
 // Verify per-source selection and the exact opt-out count, without losing originals.
 const gpsPrivacy=await page.evaluate(async refs=>{
  const [annotations,portable,canonical,gps2]=await Promise.all([
   import('/ui/annotationStore.js'),import('/ui/portableDataV2.js'),import('/ui/manualRunCanonical.js'),
   import('/ui/gpsReplayIndexedDbStore.js')]);
  const store=await annotations.openAnnotationStore();
  if(!store.ok)throw Error('T-081 annotation DB open');
  const r=await annotations.appendAnnotation(store.value.db,{
   recordRef:refs.refs[1],fieldKey:'bodyObservation',operation:'ADD',payload:{text:'本人の追加身体観察'},
   expectedHeadEventId:null,expectedRevision:0,eventId:'m7T081gpsEvent000000',
   clientRequestId:'m7T081gpsRequest000',declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',
   assessedAt:null,enteredAt:'2026-11-08T04:00:00.000Z'
  });
  if(!r.ok)throw Error('T-081 third GPS annotation save '+JSON.stringify(r));
  const count=await annotations.inspectAnnotationStore(store.value.db);
  store.value.db.close();
  if(!count.ok||count.value.eventCount!==3)throw Error('T-081 original store should contain exactly three annotations');
  const without=await canonical.snapshotTask(localStorage,s=>portable.exportPortableBackup(s,{includeGps:false}));
  const withGps=await canonical.snapshotTask(localStorage,s=>portable.exportPortableBackup(s,{includeGps:true}));
  if(!without.ok||!withGps.ok)throw Error('T-081 export failure');
  const a=JSON.parse(without.text),b=JSON.parse(withGps.text);
  if(without.excludedGpsAnnotationCount!==2||without.annotationCount!==1||
   withGps.annotationCount!==3||a.annotations.events.length!==1||
   a.annotations.events[0].recordRef.sourceType!=='MANUAL'||a.gps!==null||
   b.annotations.events.length!==3||
   b.annotations.events.filter(e=>e.recordRef.sourceType!=='MANUAL').length!==2)
   throw Error('T-081 GPS privacy count or original event scope incorrect');
  if(!(await gps2.readGpsV2Summaries()).ok)
   throw Error('T-081 GPS originals not preserved');
  return {excluded:without.excludedGpsAnnotationCount,kept:without.annotationCount,
   full:withGps.annotationCount};
 },seeded);
 assert.deepEqual(gpsPrivacy,{excluded:2,kept:1,full:3});
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-081',engine,status:'PASS',...gpsPrivacy}));

 // M7 real GPS detail input is added AFTER M3 canonical multi-store
 // delete/re-import cycle, leaving the established restore fixture intact.
 const locationFixture=await page.evaluate(async()=>{
  const gps2=await import('/ui/gpsReplayIndexedDbStore.js');
  const t=1700000000000,track=[0,.015,.03].map((km,i)=>({
   lat:37+i*.001,lon:139.5,ele:null,altitudeAccuracy:null,
   altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'
  }));
  const session={phase:'finished',activity:'RUNNING',distanceM:30,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,
   replayTrackAvailable:true,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
  const saved=await gps2.saveGpsV2Run(session,{saveDetails:true,date:'2026-11-08'});
  if(!saved.ok||!saved.summary?.detailSaved)throw Error('GPS route fixture was not stored');
  const data=await gps2.readGpsV2Detail(saved.summary.id);
  if(!data.ok||!data.detail?.route?.length)throw Error('GPS route not readable after save');
  return {id:saved.summary.id,points:data.detail.route.length};
 });
 assert.ok(locationFixture.points>=3,'GPS v2 route coordinates must be real saved points');
 // M7 T-045 and T-091: actual app settings, actual opt-in download,
 // GPS V2 positions in an unencrypted JSON, and the opt-out route.
 await page.evaluate(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 await page.goto('http://127.0.0.1:4286/#/settings',{waitUntil:'networkidle'});
 await page.locator('[data-dm-ui]').waitFor({state:'attached',timeout:20000});
 const backupPanel=page.locator('.s2-item').filter({has:page.locator('[data-dm-include-gps]')});
 await backupPanel.locator(':scope > summary').click();
 const area=page.locator('[data-dm-ui]'),warning=await area.innerText();
 assert.match(warning,/位置情報/);
 assert.match(warning,/暗号化されません/);
 assert.match(warning,/第三者と共有せず/);
 const include=area.locator('[data-dm-include-gps]');
 assert.equal(await include.isChecked(),false,'T-045/T-091 GPS must be opt-in');
 const withoutDownload=await Promise.all([
  page.waitForEvent('download',{timeout:9000}).catch(async()=>{
   const status=await area.locator('[role="status"]').allInnerTexts();
   const state=await page.evaluate(async()=>{
    const [canonical,portable]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/portableDataV2.js')]);
    return canonical.snapshotTask(localStorage,s=>portable.exportPortableBackup(s,{includeGps:false}));
   });
   throw Error('M7 GPS optout UI did not download: notices='+JSON.stringify(status)+'; direct export='+JSON.stringify({ok:state.ok,reason:state.reason,code:state.code}));
  }),
  area.locator('[data-dm-export]').click()
 ]);
 const withoutText=await readFile(await withoutDownload[0].path(),'utf8');
 const withoutData=JSON.parse(withoutText);
 assert.equal(withoutData.version,2);
 assert.equal(withoutData.gps,null);
 // The download event precedes the async click handler's final render.
 // Do not race the in-progress guard with the next export operation.
 await page.waitForFunction(()=>document.querySelector('[data-dm-ui]')?.textContent?.includes('ファイルの保存を開始しました'),null,{timeout:12000});
 await include.check();
 assert.equal(await include.isChecked(),true);
 const includedDownload=await Promise.all([
  page.waitForEvent('download',{timeout:12000}).catch(async()=>{
   const status=await area.locator('[role="status"]').allInnerTexts();
   const r=await page.evaluate(async()=>{
    const [canonical,portable]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/portableDataV2.js')]);
    const x=await canonical.snapshotTask(localStorage,s=>portable.exportPortableBackup(s,{includeGps:true}));
    return {ok:x.ok,reason:x.reason,code:x.code};
   });
   throw Error('M7 GPS optin UI did not download: notices='+JSON.stringify(status)+' directExport='+JSON.stringify(r));
  }),
  area.locator('[data-dm-export]').click()
 ]);
 const includedText=await readFile(await includedDownload[0].path(),'utf8');
 const included=JSON.parse(includedText);
 assert.equal(included.version,2);
 assert.ok(included.gps?.details?.length>=1,'GPS stored detail must be included');
 const containsPosition=includedText.includes('139.5')&&includedText.includes('"lat"');
 assert.equal(containsPosition,true,'real GPS coordinates retained in unencrypted readable v2');
 assert.ok(included.gps.summaries.some(x=>x.detailSaved),'route source retained');
 assert.equal(await include.isChecked(),true);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-045',engine,status:'PASS',
  gpsDefault:false,explicitlySelected:true,routeCoordinatesPresent:containsPosition,warningDisplayed:true}));
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-091',engine,status:'PASS',
  portableVersion:2,unencryptedPlainJSON:true,manualOptIn:true,noGpsByDefault:true,printUnaffected:true}));

 // M7 T-048 UI: the real picker rejects a signed orphan by default.
 const orphanUi=await page.evaluate(async text=>{
  const doc=JSON.parse(text),sch=await import('/ui/annotationSchema.js');
  const e=doc.annotations.events.find(ev=>ev.recordRef.sourceType==='MANUAL');
  if(!e)throw Error('T048 missing manual event');
  const previous=e.streamKey,ref={sourceType:'MANUAL',recordId:'run-v1-'+crypto.randomUUID()};
  e.recordRef=ref;e.recordKey=sch.recordKeyOf(ref);e.streamKey=sch.streamKeyOf(ref,e.fieldKey);
  e.requestDigest=await sch.digestAnnotationInput({...e,expectedHeadEventId:e.predecessorEventId});
  const head=doc.annotations.heads.find(h=>h.streamKey===previous);
  if(!head)throw Error('T048 no head');
  head.streamKey=e.streamKey;
  doc.annotations.meta.totalBytes=doc.annotations.events
   .reduce((sum,v)=>sum+sch.annotationUtf8Bytes(JSON.stringify(v)),0);
  return JSON.stringify(doc);
 },includedText);
 await area.locator('[data-dm-file]').setInputFiles({
  name:'M7-orphan.json',mimeType:'application/json',buffer:Buffer.from(orphanUi)});
 const consent=area.locator('[data-dm-orphan-consent]'),save=area.locator('[data-dm-isolate]');
 await consent.waitFor({timeout:20000});
 assert.equal(await save.isDisabled(),true,'orphan quarantine requires consent');
 assert.equal(await area.locator('[data-dm-restore]').count(),0,'orphan cannot restore');
 assert.match(await area.innerText(),/通常復元は拒否/);
 await consent.check();assert.equal(await save.isEnabled(),true);
 const [dl]=await Promise.all([page.waitForEvent('download',{timeout:12000}),save.click()]);
 assert.match(dl.suggestedFilename(),/隔離された補助回答/);
 const isolation=JSON.parse(await readFile(await dl.path(),'utf8'));
 assert.equal(isolation.format,'runload-v2-orphan-quarantine-inspection-only');
 assert.equal(isolation.events.length,1);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-048',
  engine,status:'PASS',uiOptIn:true,normalRestoreDenied:true,quarantineDownload:true}));
 await page.reload({waitUntil:'networkidle'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({gate:'professor-M3-portable-v2-browser',engine,result:'PASS',
  annotations:2,gpsOptOutExcluded:1,restoredAfterCanonicalCommit:true,sourceSchemasUnchanged:true,
  tamperedHashRejected:true,partialFailureExposed:true,preReleaseMigrationRequired:false}));
 await context.close();
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
