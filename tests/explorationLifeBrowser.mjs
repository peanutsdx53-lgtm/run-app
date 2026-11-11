/* E6 T06 browser proof: actual saved run + independently stored life/rest dates. */
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
await new Promise(done=>server.listen(4394,'127.0.0.1',done));
const browser=await engine.launch({headless:true}),base='http://127.0.0.1:4394/';
const topic=encodeURIComponent('日々のコンディション');
const route=(source,id)=>base+'#/exploration-tree?source='+source+'&record='+encodeURIComponent(id)+'&category=05&topic='+topic;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/exploration-tree?category=05&topic='+topic,{waitUntil:'networkidle'});
 const panel=page.locator('[data-e-life-inquiry="T06"]');
 const expectLifeState=async expected=>{
  // Route hashchanges render asynchronously: do not read stale prior screen.
  await page.waitForFunction(value=>document.querySelector('[data-e-life-inquiry="T06"]')
   ?.getAttribute('data-e-state')===value,expected,{timeout:20000});
  assert.equal(await panel.getAttribute('data-e-state'),expected);
 };

 await panel.waitFor({timeout:20000});
 await expectLifeState('NO_RUN');
 assert.equal(await panel.locator('[data-e-life-kind]').count(),0);
 assert.equal(await page.locator('.ex-observation-guide').count(),1,'original life guide');
 const created=await page.evaluate(async()=>{
  const [c,m,home,rests,gps2]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/homeExperience.js'),import('/ui/restDayStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js')]);
  await c.refresh();
  const run=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-11-08',distance:'6',hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',
   memo:'',shoeName:'',courseName:''
  }));
  const life=home.saveCondition(localStorage,{date:'2026-11-08',sleepMinutes:450,
   sleepSource:'duration',feeling:'良い',memo:'E6-LIFE-PRIVATE-20261108'});
  const rest=rests.saveRestDay(localStorage,{date:'2026-11-08',
   memo:'E6-REST-PRIVATE-20261108',bodyObservation:'E6-REST-BODY-PRIVATE',
   environmentNote:'E6-REST-ENV-PRIVATE',shoeName:''});
  const t=1700000000000,point=(i,km)=>({lat:37.501+i*.00005,lon:139.91,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,
   breakBefore:i===0,activity:'RUNNING'}),track=[point(0,0),point(1,.0125),point(2,.025)];
  const v2=await gps2.saveGpsV2Run({
   phase:'finished',activity:'RUNNING',distanceM:25,accepted:3,rejected:0,
   elapsedMs:10000,flags:[],track,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,trackSimplified:false
  },{saveDetails:false,date:'2026-11-08',experience:{
   source:'USER_REPORTED',rofBefore:0,rofAfter:null,beforeCapturedAt:null,afterCapturedAt:null,memo:''
  }});
  const original=await c.readCanonical();
  return {ok:run.ok&&life.ok&&rest.ok&&v2.ok&&original.ok,
   manual:run.record?.id,v2:v2.summary?.id,
   original:original.raw,lifeRaw:localStorage.getItem(home.CONDITION_KEY),
   restRaw:localStorage.getItem(rests.REST_DAY_KEY),
   reason:run.reason||life.reason||rest.reason||v2.reason||original.reason};
 });
 assert.equal(created.ok,true,created.reason);
 await page.reload({waitUntil:'networkidle'});
 const variants=[
  {source:'manual',id:created.manual},
  {source:'gps-v2',id:created.v2}
 ];
 for(const item of variants){
  await page.goto(route(item.source,item.id),{waitUntil:'networkidle'});
  await panel.waitFor({timeout:20000});
  await expectLifeState('NEED_SELECTION');
  assert.doesNotMatch(await panel.innerText(),/E6-(LIFE|REST)-PRIVATE|450分/);
  assert.equal(await panel.locator('[data-e-life-kind]').count(),2);
  assert.match(await panel.innerText(),/同じ日付というだけで/);
  // Choosing a date is an independent, affirmative action, even on the SAME day.
  await panel.locator('[data-e-life-date]').fill('2026-11-08');
  await panel.locator('[data-e-life-kind="life"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-e-life-inquiry]')?.getAttribute('data-e-state')==='READY',null,{timeout:20000});
  assert.match(await panel.innerText(),/E6-LIFE-PRIVATE-20261108/);
  assert.match(await panel.innerText(),/本人申告の睡眠時間/);
  assert.match(await panel.innerText(),/450分/);
  assert.doesNotMatch(await panel.innerText(),/E6-REST-PRIVATE/);
  assert.match(await panel.innerText(),/日付が同じでも/);
  assert.doesNotMatch(await panel.innerText(),/睡眠のおかげ|回復した|睡眠によって改善|原因と判定/);
  if(item.source!=='manual'){
   assert.equal(await page.locator('[data-gps-inquiry-bridge]').count(),1);
   assert.doesNotMatch(await page.locator('[data-gps-inquiry-bridge]').innerText(),/ROF-J（本人回答）：運動前/);
   assert.match(await page.locator('[data-gps-inquiry-bridge] a').last().getAttribute('href'),/category=05/);
  }else{
   assert.equal(await page.locator('.ex-observation-guide').count(),1);
   assert.equal(await panel.locator('[data-ex-action="note"]').count(),0);
  }
  await panel.locator('[data-e-life-date]').fill('2026-11-08');
  await panel.locator('[data-e-life-kind="rest"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-e-life-inquiry]')?.textContent?.includes('E6-REST-PRIVATE-20261108'),null,{timeout:20000});
  assert.match(await panel.innerText(),/休養日/);
  assert.match(await panel.innerText(),/E6-REST-BODY-PRIVATE/);
  assert.doesNotMatch(await panel.innerText(),/E6-LIFE-PRIVATE/);
  assert.match(await panel.innerText(),/一切走らなかったことを測定した記録ではありません/);
  await page.emulateMedia({media:'print'});
  assert.equal(await panel.evaluate(el=>getComputedStyle(el).display),'none');
  await page.emulateMedia({media:'screen'});
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const box=await panel.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
    doc:document.documentElement.scrollWidth}));
   assert.ok(box.scroll<=box.client+2&&box.doc<=width+2,
    'T06 200% reflow '+width+' '+JSON.stringify(box));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  await page.setViewportSize({width:390,height:844});
  console.log(JSON.stringify({gate:'E6-inquiry',caseId:'E-T06-'+item.source,
   engine:engineName,status:'PASS',sameDayNotAutoJoined:true,sourceSelected:true}));
 }
 // A new navigation without the user selection stays unlinked.
 const manRoute=route('manual',created.manual);
 await page.goto(manRoute,{waitUntil:'networkidle'});
 await expectLifeState('NEED_SELECTION');
 assert.doesNotMatch(await panel.innerText(),/E6-LIFE-PRIVATE|E6-REST-PRIVATE/);
 // Never select a nearby date in place of a missing exact chosen date.
 await page.goto(manRoute+'&lifeKind=life&lifeDate=2026-11-07',{waitUntil:'networkidle'});
 await expectLifeState('MISSING');
 assert.doesNotMatch(await panel.innerText(),/E6-LIFE-PRIVATE/);
 await page.goto(manRoute+'&lifeKind=rest&lifeDate=2026-11-07',{waitUntil:'networkidle'});
 await expectLifeState('MISSING');
 await page.goto(manRoute+'&lifeKind=life&lifeDate=2026-11-08&lifeDate=2026-11-08',{waitUntil:'networkidle'});
 await expectLifeState('BAD_SELECTION');
 await page.goto(manRoute+'&lifeKind=life&lifeDate=2026-02-30',{waitUntil:'networkidle'});
 await expectLifeState('BAD_SELECTION');
 // At least one selected source can fail without substituting the other.
 const broken=await page.evaluate(()=>{
  const before=localStorage.getItem('runload-v2-life-condition-v1');
  localStorage.setItem('runload-v2-life-condition-v1','{corrupted');
  return before;
 });
 assert.equal(broken,created.lifeRaw);
 await page.goto(manRoute+'&lifeKind=life&lifeDate=2026-11-08',{waitUntil:'networkidle'});
 await expectLifeState('READ_ERROR');
 assert.doesNotMatch(await panel.innerText(),/E6-LIFE-PRIVATE|450分/);
 // Restore only the test fixture, then prove source deletion does not relink.
 await page.evaluate(x=>localStorage.setItem('runload-v2-life-condition-v1',x),created.lifeRaw);
 await page.goto(manRoute+'&lifeKind=rest&lifeDate=2026-11-08',{waitUntil:'networkidle'});
 await expectLifeState('READY');
 await page.reload({waitUntil:'networkidle'});
 const original=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  return (await c.readCanonical()).raw;
 });
 assert.equal(original,created.original,'no run IDB write by T06');
 const memory=await page.evaluate(()=>({
  life:localStorage.getItem('runload-v2-life-condition-v1'),
  rest:localStorage.getItem('runload-v2-rest-days-v1')
 }));
 assert.equal(memory.life,created.lifeRaw);
 assert.equal(memory.rest,created.restRaw);
 // Existing note remains the only note-writing control for the manual topic.
 await page.goto(manRoute,{waitUntil:'networkidle'});
 await page.locator('.ex-observation-guide [data-ex-action="note"]').click();
 await page.locator('#ex-note').fill('E6：自分で選んだ生活記録について次の疑問を考えた');
 await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===1,null,{timeout:15000});
 const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]')[0]);
 assert.equal(note.recordId,created.manual);
 assert.deepEqual(errors,[],'no unexpected SPA errors');
 console.log(JSON.stringify({gate:'E6-inquiry',caseId:'E-T06-MISSING-FAULT',
  engine:engineName,status:'PASS',noImplicitPair:true,storedOriginalsStable:true,legacyNotePreserved:true}));
 await context.close();
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
console.log('E6 T06 explicit life/rest inquiry acceptance PASSED');
