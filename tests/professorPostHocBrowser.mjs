/* M5 real SPA and IndexedDB regression. Chrome + WebKit, no user data fixtures. */
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
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),f=resolve(root,'.'+path);if(!(f===root||f.startsWith(root+sep)))throw Error('forbidden');const actual=f===root?resolve(root,'index.html'):f;res.setHeader('content-type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));}catch{res.writeHead(404);res.end('not found')}});
await new Promise(done=>server.listen(4387,'127.0.0.1',done));
const browser=await engine.launch({headless:true}),base='http://127.0.0.1:4387/';
const launch=async(w=390)=>{const context=await browser.newContext({viewport:{width:w,height:844},reducedMotion:'reduce'});await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#/record',{waitUntil:'networkidle'});return {context,page,errors}};
const openEditor=async(page,ref)=>{const source={MANUAL:'manual',GPS_V2:'gps-v2'}[ref.sourceType];await page.goto(base+'#/annotation?source='+source+'&record='+encodeURIComponent(ref.recordId),{waitUntil:'networkidle'});await page.locator('[data-ax-editor]').waitFor({timeout:20000})};
const choose=async(page,field)=>{await page.locator('[data-ax-field]').selectOption(field);await page.locator('[data-ax-form]').waitFor({timeout:20000});};
const waitEventCount=async(page,ref,field,count)=>page.waitForFunction(async({ref,field,count})=>{const m=await import('/ui/annotationStore.js');const opened=await m.openAnnotationStore();if(!opened.ok)return false;try{const t=await m.readAnnotationThread(opened.value.db,ref,field);return t.ok&&t.value.length===count;}finally{opened.value.db.close();}},{ref,field,count},{timeout:20000});
const readThread=async(page,ref,field)=>page.evaluate(async({ref,field})=>{const [store,core,canonical]=await Promise.all([import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js'),import('/ui/manualRunCanonical.js')]);const db=(await store.openAnnotationStore()).value.db;const t=await store.readAnnotationThread(db,ref,field),v=await core.readEffectiveAnnotation(db,ref,field);db.close();return {thread:t.ok?t.value:null,status:v.ok?v.value.status:v.code,latest:v.ok?v.value.latest:null,raw:(await canonical.readCanonical()).raw}},{ref,field});
try{
 const {context,page,errors}=await launch();
 await page.locator('[data-draft="distance"]').first().fill('6');await page.locator('[data-draft="minutes"]').first().fill('33');await page.locator('[data-manual-gait="RUNNING"]').click();await page.goto(base+'#/record-review',{waitUntil:'networkidle'});await page.locator('[data-manual-run-save]').click();await page.waitForURL(/#\/result\?record=run-v1-/, {timeout:20000});
 const id=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]),ref={sourceType:'MANUAL',recordId:id};
 // T-033: create one separate genuine saved RUNNING record so that the
 // comparison's other RecordRef is real, not a fabricated in-memory fixture.
 const otherId=await page.evaluate(async()=>{
  const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const draft={date:'2026-10-16',distance:'4',hours:'',minutes:'28',seconds:'',
   rofBefore:0,rofAfter:2,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'比較の元記録',
   shoeName:'',courseName:''};
  const saved=await canonical.mutate(s=>manual.saveManualRun(s,draft));
  if(!saved.ok)throw Error('T-033 second saved record failed '+saved.reason);
  return saved.record.id;
 });
 const referenceSignature=async()=>page.evaluate(async({id,otherId})=>{
  const [c,science,compare]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/core/activity/activityReference.js'),
   import('/ui/runReflection.js')]);
  const r=await c.readCanonical();
  if(!r.ok)throw Error('T-033 cannot read canonical');
  const a=r.read.records.find(x=>x.id===id),b=r.read.records.find(x=>x.id===otherId);
  if(!a||!b)throw Error('T-033 missing one saved source');
  const scienceValue=science.calculateActivityReference(a);
  const compareValue=compare.compareSavedRuns(a,b);
  if(compareValue.status!=='ready')throw Error('T-033 same-gait comparison not ready');
  return {science:JSON.stringify(scienceValue),comparison:JSON.stringify(compareValue),
   identity:[a.id,b.id],raw:r.raw};
 },{id,otherId});
 const beforePostHoc=await referenceSignature();
 assert.deepEqual(beforePostHoc.identity,[id,otherId]);
 const original=(await page.evaluate(async()=>{const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw;}));
 const sourceHost=page.locator('#runload-result-v4');await sourceHost.locator('.rv4-export-menu > summary').click();await sourceHost.locator('[data-posthoc-entry]').waitFor({timeout:20000});await sourceHost.locator('[data-posthoc-entry]').click();await page.locator('[data-ax-editor]').waitFor({timeout:20000});assert.match(page.url(),/#\/annotation\?source=manual&record=run-v1-/);
 await choose(page,'stepsBundle');await page.locator('[data-ax-form] input[name="steps"]').fill('0');await page.locator('[data-ax-form] select[name="stepsProvenance"]').selectOption('DEVICE_MEASURED');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('歩数・取得方法',{exact:false}).waitFor({timeout:20000});
 const first=await readThread(page,ref,'stepsBundle');assert.equal(first.status,'ACTIVE');assert.equal(first.thread.length,1);assert.equal(first.latest.payload.steps,0);assert.equal(first.raw,original,'original canonical source byte-identical');
 await page.locator('[data-ax-form] input[name="steps"]').fill('6300');await page.locator('[data-ax-save]').click();await page.waitForFunction(()=>document.querySelector('[data-ax-editor]')?.textContent?.includes('6300歩'),null,{timeout:20000});const second=await readThread(page,ref,'stepsBundle');assert.equal(second.thread.length,2);assert.equal(second.thread[1].operation,'CORRECT');assert.equal(second.raw,original);
 await page.locator('[data-ax-retract]').click();await page.waitForFunction(()=>document.querySelector('[data-ax-editor]')?.textContent?.includes('取り消されました'),null,{timeout:20000});let third=await readThread(page,ref,'stepsBundle');assert.equal(third.status,'RETRACTED');assert.equal(third.thread.length,3);
 await page.locator('[data-ax-form] input[name="steps"]').fill('0');await page.locator('[data-ax-save]').click();await waitEventCount(page,ref,'stepsBundle',4);for(let check=0;check<30;check++){third=await readThread(page,ref,'stepsBundle');if(third.thread?.length===4)break;await new Promise(done=>setTimeout(done,75));}assert.equal(third.thread?.length,4,'the post-retraction ADD must be visible in a fresh, stable transaction');assert.equal(third.thread[3].operation,'ADD');assert.equal(third.raw,original);
 await choose(page,'gradeBundle');await page.locator('[data-ax-form] select[name="gradeMode"]').selectOption('SUMMARY');await page.locator('[data-ax-form] input[name="upPercent"]').fill('70');await page.locator('[data-ax-form] input[name="downPercent"]').fill('40');await page.locator('[data-ax-save]').click();assert.match(await page.locator('.ax-error').innerText(),/合計100%以下/);let fail=await readThread(page,ref,'gradeBundle');assert.equal(fail.status,'NO_ANSWER');
 await page.locator('[data-ax-form] input[name="downPercent"]').fill('20');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('坂道・傾斜',{exact:false}).waitFor({timeout:20000});let grade=await readThread(page,ref,'gradeBundle');assert.equal(grade.latest.payload.upPercent,70);assert.equal(grade.latest.payload.downPercent,20);
 await choose(page,'surfaceBundle');await page.locator('[data-ax-form] select[name="surfaceMode"]').selectOption('MIXED');await page.locator('[data-ax-form] input[name="surf_paved"]').fill('60');await page.locator('[data-ax-form] input[name="surf_track"]').fill('40');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('路面の割合',{exact:false}).waitFor({timeout:20000});const surface=await readThread(page,ref,'surfaceBundle');assert.deepEqual(surface.latest.payload.shares,{paved:60,track:40});assert.equal(surface.raw,original);
 const afterPostHoc=await referenceSignature();
 assert.equal(afterPostHoc.raw,beforePostHoc.raw,'T-033 original exact canonical bytes unchanged by grade+surface');
 assert.equal(afterPostHoc.science,beforePostHoc.science,'T-033 reference-100 JSON snapshot unchanged byte-for-byte');
 assert.equal(afterPostHoc.comparison,beforePostHoc.comparison,'T-033 same-method comparison signature unchanged byte-for-byte');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-033',engine:engineName,
  status:'PASS',regions:'12 model snapshot unchanged',scienceBytes:afterPostHoc.science.length,
  comparisonBytes:afterPostHoc.comparison.length,sourceIds:afterPostHoc.identity}));
 await choose(page,'runWalkBundle');await page.locator('[data-ax-form] select[name="runningFormat"]').selectOption('RUN_WALK');await page.locator('[data-ax-form] input[name="runWalkRunningDistanceKm"]').fill('7');await page.locator('[data-ax-form] input[name="runWalkRunningDurationMinutes"]').fill('20');await page.locator('[data-ax-save]').click();assert.match(await page.locator('.ax-error').innerText(),/総距離・総時間/);await page.locator('[data-ax-form] input[name="runWalkRunningDistanceKm"]').fill('4');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('走行と歩行',{exact:false}).waitFor({timeout:20000});assert.equal((await readThread(page,ref,'runWalkBundle')).latest.payload.runningFormat,'RUN_WALK');
 const options=await page.locator('[data-ax-field] option').allTextContents();assert.ok(!options.some(x=>x.includes('ROF-J')),'manual ROF is corrected through authoritative flow');assert.match(await page.locator('.ax-help').innerText(),/正式な訂正履歴/);
 await page.goto(base+'#/history',{waitUntil:'networkidle'});const hx=page.locator('#runload-history-v2');await hx.locator('[data-select-id="'+id+'"]').click();await hx.locator('[data-annotate-record]').click();await page.locator('[data-ax-editor]').waitFor({timeout:20000});assert.match(page.url(),new RegExp(id));
 await page.goto(base+'#/annotation?source=manual&record=run-v1-00000000-0000-0000-0000-000000000000',{waitUntil:'networkidle'});await page.locator('#runload-annotation-editor [role="alert"]').waitFor({timeout:20000});assert.equal(await page.locator('[data-ax-editor]').count(),0);assert.match(await page.locator('#runload-annotation-editor [role="alert"]').innerText(),/見つかりません/);
 await openEditor(page,ref);await choose(page,'temperatureC');await page.context().setOffline(true);await page.locator('[data-ax-form] input[name="celsius"]').fill('18');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('気温',{exact:false}).waitFor({timeout:20000});assert.equal((await readThread(page,ref,'temperatureC')).latest.payload.celsius,18);await page.context().setOffline(false);
 // Current GPS summary: location, fatigue and optional annotations have distinct sources.
 const gps=await page.evaluate(async()=>{
  const v2=await import('/ui/gpsReplayIndexedDbStore.js');
  const t=1700000000000,point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'});
  const track=[point(0,0),point(1,.0125),point(2,.025)];
  const session={phase:'finished',activity:'RUNNING',distanceM:25,accepted:3,rejected:0,elapsedMs:10000,flags:[],track,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true,trackSimplified:false};
  const saved=await v2.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-08',experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
  return {ok:saved.ok,newId:saved.summary?.id,error:saved.reason};
 });
 assert.equal(gps.ok,true,gps.error);
 // M7 T-022: no surface, mental choice or mood can be inferred from GPS.
 // All three were unmeasured for BOTH saved GPS formats.
 const unmeasured=await page.evaluate(async({gps})=>{
  const [g2,store,readModel]=await Promise.all([import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/annotationStore.js'),import('/ui/annotationReadModel.js')]);
  const current=await g2.readGpsV2Summaries();
  if(!current.ok)throw Error('GPS record unavailable');
  const parent=current.records.find(r=>r.id===gps.newId);
  if(!parent)throw Error('GPS fixture missing');
  for(const field of ['surfaceMode','mentalExperience','mood'])if(Object.hasOwn(parent,field))throw Error('invented '+field);
  const opened=await store.openAnnotationStore();if(!opened.ok)throw Error('annotation store unavailable');
  const status=[];
  for(const field of ['surfaceBundle','mentalExperience']){
   const result=await readModel.readEffectiveAnnotation(opened.value.db,{sourceType:'GPS_V2',recordId:gps.newId},field);
   if(!result.ok||result.value.status!=='NO_ANSWER')throw Error('invented answer '+field);
   status.push({field,status:result.value.status});
  }
  opened.value.db.close();return status;
 },{gps});
 assert.equal(unmeasured.length,2);
 await openEditor(page,{sourceType:'GPS_V2',recordId:gps.newId});
 assert.match(await page.locator('.ax-record').textContent(),/GPSから疲労感、路面、坂道を推定しません/);
 await choose(page,'surfaceBundle');
 assert.match(await page.locator('.ax-compare').innerText(),/後日申告/);
 assert.match(await page.locator('.ax-compare').innerText(),/まだ後日の申告がありません/);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-022',engine:engineName,status:'PASS',unmeasured}));
 await openEditor(page,{sourceType:'GPS_V2',recordId:gps.newId});await choose(page,'rofBefore');assert.match(await page.locator('.ax-compare').innerText(),/0 \/ 10/);await page.locator('input[name="score"]').fill('4');await page.locator('[data-ax-save]').click();await page.locator('[data-ax-notice]').getByText('運動前',{exact:false}).waitFor({timeout:20000});await waitEventCount(page,{sourceType:'GPS_V2',recordId:gps.newId},'rofBefore',1);assert.equal((await readThread(page,{sourceType:'GPS_V2',recordId:gps.newId},'rofBefore')).latest.payload.score,4);
 // M7 T-025: original GPS-v2 ROF-J=2 vs later voluntary ROF-J=0.
 // Neither the scientific reference nor the parent summary is rewritten.
 const case25=await page.evaluate(async()=>{
  const store=await import('/ui/gpsReplayIndexedDbStore.js');
  const date=new Date(Date.now()-24*3600*1000).toISOString().slice(0,10);
  const t=1700000000000,point=(i,km)=>({
   lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
   altitudeQuality:'missing',km,t:t+i*5000,breakBefore:i===0,activity:'RUNNING'
  }),track=[point(0,0),point(1,.0125),point(2,.025)];
  const session={phase:'finished',activity:'RUNNING',distanceM:25,accepted:3,rejected:0,
   elapsedMs:10000,flags:[],track,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,trackSimplified:false};
  const saved=await store.saveGpsV2Run(session,{saveDetails:false,date,
   experience:{source:'USER_REPORTED',rofBefore:2,rofAfter:null,
    beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
  return {ok:saved.ok,id:saved.summary?.id,date,reason:saved.reason};
 });
 assert.equal(case25.ok,true,case25.reason);
 const newRef={sourceType:'GPS_V2',recordId:case25.id};
 await openEditor(page,newRef);await choose(page,'rofBefore');
 assert.match(await page.locator('.ax-compare').innerText(),/2 \/ 10/,'the actual original GPS ROF-J is 2');
 await page.locator('[data-ax-form] input[name="score"]').fill('0');
 await page.locator('[data-ax-form] select[name="declaredPhase"]').selectOption('BEFORE');
 await page.locator('[data-ax-form] select[name="timeBasis"]').selectOption('RECALLED');
 await page.locator('[data-ax-save]').click();
 await waitEventCount(page,newRef,'rofBefore',1);
 await page.waitForFunction(async ref=>{const m=await import('/ui/annotationReadModel.js');
  const st=await import('/ui/annotationStore.js'),o=await st.openAnnotationStore();
  if(!o.ok)return false;
  try{const v=await m.readEffectiveAnnotation(o.value.db,ref,'rofBefore');return v.ok&&v.value.status==='ACTIVE';}
  finally{o.value.db.close();}},newRef,{timeout:20000});
 const append25=await readThread(page,newRef,'rofBefore');
 assert.equal(append25.status,'ACTIVE');
 assert.equal(append25.latest.payload.score,0,'a true reported zero, not missing');
 assert.equal(append25.latest.declaredPhase,'BEFORE');
 assert.equal(append25.latest.timeBasis,'RECALLED');
 assert.equal((Date.parse(append25.latest.enteredAt.slice(0,10)+'T00:00:00.000Z')-Date.parse(case25.date+'T00:00:00.000Z'))/86400000,1,'T-025 explicit post-hoc zero entered on next calendar day');
 await page.locator('.ax-posthoc-meta > summary').click();
 const details25=await page.locator('.ax-compare').innerText();
 assert.match(details25,/記録時（原本の情報）/);
 assert.match(details25,/後日申告（科学計算に未使用）/);
 assert.match(details25,/2 \/ 10/);
 assert.match(details25,/0 \/ 10/);
 assert.ok(details25.includes(append25.latest.enteredAt),'real entry-operation time is disclosed');
 assert.match(details25,/端末の時刻は体験の発生時刻の実測ではありません/);
 const intact25=await page.evaluate(async id=>{
  const store=await import('/ui/gpsReplayIndexedDbStore.js');
  const read=await store.readGpsV2Summaries();
  if(!read.ok)throw Error('cannot reread original GPS summary');
  const original=read.records.find(x=>x.id===id);
  return {found:!!original,originalBefore:original?.experience?.rofBefore,
   originalAfter:original?.experience?.rofAfter};
 },case25.id);
 assert.deepEqual(intact25,{found:true,originalBefore:2,originalAfter:null},
  'M7 T-025 GPS original never replaced by later zero');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-025',engine:engineName,
  status:'PASS',originalRof:2,postHocRof:0,sourceId:case25.id,enteredAt:append25.latest.enteredAt}));
 // M7 T-027: original *valid* ROF-J 0, later explicitly corrected to 3
 // by the formal canonical correction API, retaining the old zero and time.
 const correction=await page.evaluate(async()=>{
  const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const date='2026-11-07';
  const draft={date,distance:'6',hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',
   memo:'零点の訂正前',shoeName:'',courseName:''};
  const first=await canonical.mutate(s=>manual.saveManualRun(s,draft));
  if(!first.ok)throw Error('T027 original zero save failed '+first.reason);
  const original=first.record;
  const changedAt=new Date().toISOString();
  const corrected=await canonical.mutate(s=>manual.correctSavedRof(s,original.id,'before',3,{
   changedAt,reason:'元の回答0から本人が明示的に訂正',timeBasis:'RECALLED',assessedAt:null
  }));
  if(!corrected.ok)throw Error('T027 correction failed '+corrected.reason);
  const reopened=await canonical.readCanonical();
  if(!reopened.ok)throw Error('T027 canonical not readable after correction');
  const actual=reopened.read.records.find(r=>r.id===original.id);
  return {original,actual,id:original.id,changedAt,revision:reopened.read.revision};
 });
 assert.equal(correction.original.rofBefore,0);
 assert.equal(correction.original.rofEvidence.before.score,0);
 assert.equal(correction.actual.rofBefore,3);
 assert.equal(correction.actual.rofCorrections.length,1);
 const edit=correction.actual.rofCorrections[0];
 assert.equal(edit.phase,'before');assert.equal(edit.from,0);assert.equal(edit.to,3);
 assert.equal(edit.old.score,0);assert.equal(edit.next.score,3);
 assert.equal(edit.changedAt,correction.changedAt);
 assert.equal(edit.next.timeBasis,'RECALLED');
 assert.equal(edit.next.assessedAt,null);
 await page.goto(base+'#/result?record='+encodeURIComponent(correction.id),{waitUntil:'networkidle'});
 const correctedResult=page.locator('#runload-result-v4');
 await correctedResult.locator('[data-tab="fatigue"]').click();
 assert.match(await correctedResult.locator('.rv4-fatigue-numbers').innerText(),/3/);
 await correctedResult.locator('.rv4-fatigue-method > summary').click();
 assert.match(await correctedResult.locator('.rv4-rof-audit').innerText(),/訂正履歴 1件/);
 await correctedResult.locator('.rv4-rof-audit details > summary').click();
 const historyText=await correctedResult.locator('.rv4-rof-audit details').innerText();
 assert.match(historyText,/0 → 3/);
 assert.match(historyText,/元の回答0から本人が明示的に訂正/);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-027',engine:engineName,
  status:'PASS',recordId:correction.id,from:0,to:3,corrections:1}));
 assert.deepEqual(errors,[], 'no SPA page errors');

 // M7 T-029: a next-day volunteered body observation is not a stored original memo.
 const case29=await page.evaluate(async()=>{
  const [c,store]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const date=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const draft={date,distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:null,rofAfter:null,
   steps:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',shoeName:'',courseName:''};
  const r=await c.mutate(storage=>store.saveManualRun(storage,draft));
  return {ok:r.ok,reason:r.reason,id:r.record?.id,date};
 });
 assert.equal(case29.ok,true,case29.reason);
 const scienceBefore29=await page.evaluate(async id=>{
  const [c,science]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/core/activity/activityReference.js')]);
  const state=await c.readCanonical();
  return JSON.stringify(science.calculateActivityReference(state.read.records.find(r=>r.id===id)));
 },case29.id);

 const bodyRef29={sourceType:'MANUAL',recordId:case29.id};
 await openEditor(page,bodyRef29);await choose(page,'bodyObservation');
 assert.match(await page.locator('.ax-compare').innerText(),/後日申告（科学計算に未使用）/);
 await page.locator('[data-ax-form] textarea[name="text"]').fill('M7-BODY-OBSERVATION-ONLY');
 await page.locator('[data-ax-save]').click();
 await waitEventCount(page,bodyRef29,'bodyObservation',1);
 await page.waitForFunction(async ref=>{const m=await import('/ui/annotationReadModel.js');
  const st=await import('/ui/annotationStore.js'),o=await st.openAnnotationStore();
  if(!o.ok)return false;
  try{const v=await m.readEffectiveAnnotation(o.value.db,ref,'bodyObservation');return v.ok&&v.value.status==='ACTIVE';}
  finally{o.value.db.close();}},bodyRef29,{timeout:20000});
 const bodyRead29=await readThread(page,bodyRef29,'bodyObservation');
 assert.equal(bodyRead29.status,'ACTIVE');
 assert.equal(bodyRead29.latest.payload.text,'M7-BODY-OBSERVATION-ONLY');
 assert.equal((Date.parse(bodyRead29.latest.enteredAt.slice(0,10)+'T00:00:00Z')-Date.parse(case29.date+'T00:00:00Z'))/86400000,1);
 await page.waitForFunction(()=>document.querySelector('.ax-compare')?.textContent?.includes('M7-BODY-OBSERVATION-ONLY'),null,{timeout:15000});
 assert.match(await page.locator('.ax-compare').innerText(),/M7-BODY-OBSERVATION-ONLY/);
 const unchanged29=await page.evaluate(async id=>{
  const c=await import('/ui/manualRunCanonical.js');const read=await c.readCanonical();
  const parent=read.read.records.find(r=>r.id===id);
  return {body:parent?.draft?.bodyObservation||'',memo:parent?.memo||'',id:parent?.id};
 },case29.id);
 assert.deepEqual(unchanged29,{body:'',memo:'',id:case29.id});
 await page.reload({waitUntil:'networkidle'});await choose(page,'bodyObservation');
 await page.waitForFunction(()=>document.querySelector('.ax-compare')?.textContent?.includes('M7-BODY-OBSERVATION-ONLY'),null,{timeout:15000});
 assert.match(await page.locator('.ax-compare').innerText(),/M7-BODY-OBSERVATION-ONLY/);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-029',engine:engineName,status:'PASS',nextDay:true,sourceImmutable:true}));
 // M7 T-053: the result, not just the editor, presents original and post-hoc
 // side-by-side and leaves the original scientific computation byte-identical.
 await page.goto(base+'#/result?record='+encodeURIComponent(bodyRef29.recordId),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#runload-result-v4')?.shadowRoot
  ?.querySelector('[data-posthoc-summary]')?.textContent?.includes('M7-BODY-OBSERVATION-ONLY'),null,{timeout:20000});
 const visible53=await page.locator('#runload-result-v4 [data-posthoc-summary]').innerText();
 assert.match(visible53,/記録時（原本）/);
 assert.match(visible53,/後日申告（科学計算に未使用）/);
 assert.match(visible53,/M7-BODY-OBSERVATION-ONLY/);
 const scienceAfter29=await page.evaluate(async id=>{
  const [c,science]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/core/activity/activityReference.js')]);
  const state=await c.readCanonical();
  return JSON.stringify(science.calculateActivityReference(state.read.records.find(r=>r.id===id)));
 },case29.id);
 assert.equal(scienceAfter29,scienceBefore29,'the post-hoc body note did not change original science');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-053',
  engine:engineName,status:'PASS',resultOriginal:true,resultPostHoc:true,scienceUnchanged:true}));
 await openEditor(page,bodyRef29);await choose(page,'bodyObservation');


 // M7 T-064: Enter/Escape focus restoration in real post-hoc UI, then keyboard return.
 const sourceDisclosure=page.locator('.ax-record details');
 await sourceDisclosure.locator('summary').focus();await page.keyboard.press('Enter');
 assert.equal(await sourceDisclosure.getAttribute('open'),'');
 await page.keyboard.press('Escape');
 assert.equal(await sourceDisclosure.getAttribute('open'),null);
 assert.equal(await sourceDisclosure.locator('summary').evaluate(el=>document.activeElement===el),true);
 const meta=page.locator('.ax-posthoc-meta');
 await meta.locator('summary').focus();await page.keyboard.press('Enter');
 assert.equal(await meta.getAttribute('open'),'');
 await page.keyboard.press('Escape');
 assert.equal(await meta.getAttribute('open'),null);
 assert.equal(await meta.locator('summary').evaluate(el=>document.activeElement===el),true);
 await page.locator('.ax-back').focus();await page.keyboard.press('Enter');
 await page.waitForURL(/#\/history/,{timeout:20000});
 await page.locator('#runload-history-v2').waitFor({timeout:20000});
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-064',engine:engineName,status:'PASS',keyboard:true,restoredFocus:true}));



 // The same record holds a genuine mental answer, separately from its body note.
 const mental63=await page.evaluate(async ref=>{
  const [st,m]=await Promise.all([import('/ui/annotationStore.js'),import('/ui/mentalExperience.js')]);
  const made=m.makeMentalAppendRequest(ref,{answer:'UNSURE',declaredPhase:'UNSPECIFIED',
   timeBasis:'RECALLED',freeText:'M7-PRIVATE-MENTAL-200',open:false});
  if(!made.ok)return made;
  const db=await st.openAnnotationStore();if(!db.ok)return db;
  const r=await st.appendAnnotation(db.value.db,made.request);db.value.db.close();return r;
 },bodyRef29);
 assert.equal(mental63.ok,true,mental63.reason);
 // M7 T-063: actual 200% text enlargement at all three requested widths.
 // Verify source, separate observation, and saving feedback remain readable.
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  await openEditor(page,bodyRef29);await choose(page,'mentalExperience');
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  await page.waitForFunction(()=>document.querySelector('.ax-compare')?.textContent?.includes('よく分からない'),null,{timeout:20000});
  assert.match(await page.locator('.ax-compare').innerText(),/よく分からない/);
  await choose(page,'bodyObservation');
  await page.waitForFunction(()=>document.querySelector('.ax-compare')?.textContent?.includes('M7-BODY-OBSERVATION-ONLY'));
  await page.locator('[data-ax-form] textarea[name="text"]').fill('M7-BODY-OBSERVATION-ONLY-ZOOM-'+width);
  await page.locator('[data-ax-save]').click();
  await page.waitForFunction(()=>document.querySelector('[data-ax-notice]')?.textContent?.includes('保存しました'),null,{timeout:20000});
  const zoom=await page.evaluate(()=>{
   const ax=document.querySelector('.ax-page'),compare=document.querySelector('.ax-compare');
   const note=document.querySelector('[data-ax-notice]'),head=document.querySelector('.ax-record');
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    compareWidth:compare.getBoundingClientRect().width,sourceWidth:head.getBoundingClientRect().width,
    textSize:getComputedStyle(ax).fontSize,
    postHocText:compare.textContent.includes('M7-BODY-OBSERVATION-ONLY'),
    sourceText:head.textContent.includes('原本を照合済み'),
    savingNotice:note?.textContent?.includes('保存しました')===true};
  });
  assert.ok(zoom.scrollWidth<=width+2,'M7 200% horizontal overflow '+width+': '+JSON.stringify(zoom));
  assert.ok(zoom.compareWidth>100&&zoom.sourceWidth>100&&zoom.postHocText&&zoom.sourceText&&zoom.savingNotice,JSON.stringify(zoom));
  console.log(JSON.stringify({gate:'M7-screen-zoom',caseId:'T-063',engine:engineName,width,scale:'200%',status:'PASS'}));
  await page.evaluate(()=>{document.documentElement.style.fontSize='';});
 }
 await context.close();
 console.log(JSON.stringify({gate:'M5-real-SPA-all-sources',engine:engineName,result:'PASS',manual:'ADD/CORRECT/RETRACT/ADD',grouped:['steps0','grade','surface','runwalk'],parentImmutable:true,offline:true,historyAndResult:true,gpsV2:true}));
}finally{await browser.close();await new Promise(done=>server.close(done))}
