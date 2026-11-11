/* Professor M6 cross-browser acceptance: exact inquiry, provenance and default-private exports. */
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
await new Promise(done=>server.listen(4392,'127.0.0.1',done));
const browser=await engine.launch({headless:true}),base='http://127.0.0.1:4392/';
try{
 const ctx=await browser.newContext({viewport:{width:320,height:840},acceptDownloads:true,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/record',{waitUntil:'networkidle'});
 await page.locator('[data-draft="distance"]').first().fill('6');await page.locator('[data-draft="minutes"]').first().fill('33');await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.goto(base+'#/record-review',{waitUntil:'networkidle'});
 await page.locator('[data-manual-run-save]').click();await page.waitForURL(/#\/result\?record=run-v1-/,{timeout:20000});
 const id=decodeURIComponent(new URL(page.url()).hash.split('record=')[1]),result=page.locator('#runload-result-v4');
 // M7 T-058: no Learning PR dependency or professor answer is needed.
 // Every top-level tab and each of the three body views must really switch.
 await result.locator('[data-source-distance]').waitFor({timeout:20000});
 const topTabs=await result.locator('.rv4-mobile-tabs [data-tab]').evaluateAll(nodes=>nodes.map(x=>x.dataset.tab));
 assert.deepEqual(topTabs,['body','fatigue','radar']);
 for(const tab of topTabs){
  await result.locator('[data-tab="'+tab+'"]').click();
  assert.equal(await result.locator('[data-tab="'+tab+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await result.locator('.rv4-grid').getAttribute('data-tab-state'),tab);
 }
 await result.locator('[data-tab="body"]').click();
 const views=await result.locator('.rv4-view-tabs [data-view]').evaluateAll(nodes=>nodes.map(x=>x.dataset.view));
 assert.equal(views.length,3);
 assert.equal(new Set(views).size,3,'three independent body views without extra pseudo-tabs');
 for(const view of views){
  await result.locator('[data-view="'+view+'"]').click();
  assert.equal(await result.locator('[data-view="'+view+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await result.locator('[data-tab="body"]').getAttribute('aria-pressed'),'true');
 }
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-058',engine:engineName,
  status:'PASS',topTabs,bodyViews:views,learningFeatureUsed:false}));

 assert.match(await result.locator('[data-source-distance]').innerText(),/本人入力/);
 assert.match(await result.locator('[data-source-pace]').innerText(),/算出/);
 await result.locator('.rv4-export-menu summary').click();
 assert.equal(await result.locator('[data-export-date]').isChecked(),false);
 assert.equal(await result.locator('[data-export-rof]').isChecked(),false);
 const png=await Promise.all([page.waitForEvent('download'),result.locator('[data-download]').click()]);assert.match(png[0].suggestedFilename(),/\.png$/);
 await page.emulateMedia({media:'print'});
 const privacy=await result.evaluate(el=>{const r=el.shadowRoot;return {
  fatigue:getComputedStyle(r.querySelector('.rv4-fatigue')).display,
  mental:getComputedStyle(r.querySelector('.rv4-mental')).display,
  extras:getComputedStyle(r.querySelector('.rv4-details:not(.rv4-region-evidence)')).display
 };});
 assert.equal(privacy.fatigue,'none','ROF-J must not print without explicit opt-in');assert.equal(privacy.mental,'none','mental must not print');assert.equal(privacy.extras,'none','private memo must not print');
 await page.emulateMedia({media:'screen'});
 await result.locator('[data-export-rof]').check();
 await page.emulateMedia({media:'print'});
 assert.notEqual(await result.locator('.rv4-fatigue').evaluate(el=>getComputedStyle(el).display),'none','explicitly opted-in ROF may print');
 await page.emulateMedia({media:'screen'});
 // Close the opt-in More menu before switching tabs; otherwise an open
 // menu rightly receives pointer events over the content beneath it.
 await result.locator('.rv4-export-menu > summary').click();
 await result.locator('[data-tab="fatigue"]').click();
 assert.equal(await result.locator('.rv4-next-path').count(),0,'Explore is a permanent navigation destination, not a duplicate result CTA');
 await page.goto(base+'#/exploration-tree?source=manual&record='+encodeURIComponent(id)+
  '&category=01&topic='+encodeURIComponent('自分が感じた疲れ'),{waitUntil:'networkidle'});
 await page.locator('[data-experience-v3]').waitFor({timeout:20000});
 assert.match(page.url(),/#\/exploration-tree\?source=manual&record=run-v1-/);
 assert.match(await page.locator('[data-experience-v3]').innerText(),/走る前後の疲れを、自分ではどのように感じましたか/);
 assert.match(await page.locator('.ex-record-return').innerText(),/この走行から調べています/);
 const t02Manual=page.locator('[data-e-inquiry="T02"]');
 assert.equal(await t02Manual.getAttribute('data-e-state'),'VERIFIED');
 assert.equal(await t02Manual.getAttribute('data-e-source'),'MANUAL');
 assert.match(await t02Manual.innerText(),/ROF-J（本人回答）/);
 assert.match(await t02Manual.innerText(),/実際の評価時刻/);
 assert.match(await t02Manual.innerText(),/正解・不正解はありません/);
 await page.locator('.ex-learning [data-ex-action="note"]').click();
 assert.equal(await page.locator('#ex-note').count(),1,'inquiry opens legacy optional memo without a new store');
 await page.locator('.ex-dialog [data-ex-action="close"]').click();

 console.log(JSON.stringify({gate:'E1-inquiry',caseId:'E-T02-MANUAL',engine:engineName,status:'PASS'}));

 const bad='gps-v2-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 await page.goto(base+'#/exploration-tree?source=gps-v2&record='+bad+'&category=01&topic='+encodeURIComponent('自分が感じた疲れ'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-inquiry-error]').waitFor({timeout:20000});
 assert.match(await page.locator('[data-ex-inquiry-error]').innerText(),/指定した保存済み走行記録がありません/);
 assert.equal(await page.locator('.ex-record-return').count(),0);

 // M7 T-050: both sources are actual saved records. No attribution by guessed kind.
 const gpsFor50=await page.evaluate(async()=>{
  const s=await import('/ui/gpsReplayIndexedDbStore.js'),t=1700000000000;
  const track=[0,.0125,.025].map((km,i)=>({lat:37.5+i*.00005,lon:139.91,ele:null,
   altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,
   breakBefore:i===0,activity:'RUNNING'}));
  const run={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,flags:[],track,trackSimplified:false,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true};
  const saved=await s.saveGpsV2Run(run,{saveDetails:true,date:new Date().toISOString().slice(0,10)});
  return {ok:saved.ok,id:saved.summary?.id,reason:saved.reason};
 });
 assert.equal(gpsFor50.ok,true,gpsFor50.reason);
 await page.reload({waitUntil:'networkidle'});

 // E1 T02 accepts an actual saved GPS_V2 parent without pretending it is manual.
 await page.goto(base+'#/exploration-tree?source=gps-v2&record='+encodeURIComponent(gpsFor50.id)
  +'&category=01&topic='+encodeURIComponent('自分が感じた疲れ'),{waitUntil:'networkidle'});
 const gpsInquiry=page.locator('[data-gps-inquiry-bridge] [data-e-inquiry="T02"]');
 await gpsInquiry.waitFor({timeout:20000});
 assert.equal(await gpsInquiry.getAttribute('data-e-state'),'VERIFIED');
 assert.equal(await gpsInquiry.getAttribute('data-e-source'),'GPS_V2');
 assert.match(await gpsInquiry.innerText(),/GPSの保存記録/);
 assert.match(await gpsInquiry.innerText(),/運動前 未回答 ／ 運動後 未回答/);
 assert.equal(await page.locator('.ex-learning [data-ex-action="note"]').count(),0,
  'GPS record cannot be rebound to the legacy manual note editor');
 console.log(JSON.stringify({gate:'E1-inquiry',caseId:'E-T02-GPS_V2',engine:engineName,status:'PASS'}));


 // M7 T-085: a real saved GPS route and mental free text must not enter copy.
 const sensitive=await page.evaluate(async id=>{
  const [gps,st,mental]=await Promise.all([
   import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/annotationStore.js'),
   import('/ui/mentalExperience.js')]);
  const detail=await gps.readGpsV2Detail(id);
  if(!detail.ok)return {ok:false,reason:'GPS detail missing '+JSON.stringify(detail)};
  const made=mental.makeMentalAppendRequest({sourceType:'GPS_V2',recordId:id},{
   answer:'FELT',declaredPhase:'AFTER',timeBasis:'RECALLED',
   freeText:'PRIVATE-MENTAL-DO-NOT-COPY',open:false});
  if(!made.ok)return made;
  const opened=await st.openAnnotationStore();if(!opened.ok)return opened;
  const saved=await st.appendAnnotation(opened.value.db,made.request);opened.value.db.close();
  return {ok:saved.ok,reason:saved.reason,detailBytes:JSON.stringify(detail).length};
 },gpsFor50.id);
 assert.equal(sensitive.ok,true,sensitive.reason);
 assert.ok(sensitive.detailBytes>250,'GPS detailed route must be persisted');
 await page.goto(base+'#/exploration-tree?category=01&topic='+encodeURIComponent('自分が感じた疲れ'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-action="share"]').waitFor({timeout:20000});
 await page.evaluate(()=>{
  window.__m7Copied=null;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__m7Copied=String(value);}}});
 });
 await page.locator('[data-ex-action="share"]').click();
 await page.locator('[data-ex-action="copy"]').click();
 await page.waitForFunction(()=>typeof window.__m7Copied==='string',{timeout:12000});
 const copied=await page.evaluate(()=>window.__m7Copied);
 assert.match(copied,/話したいテーマ|相談したいこと/);
 assert.doesNotMatch(copied,/PRIVATE-MENTAL-DO-NOT-COPY|139\.91|37\.5/);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-085',engine:engineName,status:'PASS',mentalStored:true,routeStored:true,copyPrivate:false}));
 await page.goto(base+'#/consultation',{waitUntil:'networkidle'});
 const gpsOpt=page.locator('[data-consultation-gps-v2]');
 await gpsOpt.waitFor({timeout:20000});assert.equal(await gpsOpt.isChecked(),false);
 await gpsOpt.check();await page.locator('[data-mode-button="period"]').click();
 const methods50=await page.locator('[data-activity-source]').innerText();
 assert.match(methods50,/手入力 1件/);assert.match(methods50,/GPSの保存記録 1件/);
 assert.doesNotMatch(methods50,/manual 1件|GPS計測値.*手入力/);
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-050',engine:engineName,status:'PASS',twoSources:true}));
 await page.locator('[data-mode-button="single"]').click();
 for(const key of ['rof','notes','condition']){
  const c=page.locator('[data-share="'+key+'"]');await c.waitFor({timeout:20000});assert.equal(await c.isChecked(),false,'private consultation section initially excluded: '+key);
 }
 await page.locator('[data-share="rof"]').check();
 assert.equal(await page.locator('[data-share="rof"]').isChecked(),true);
 assert.equal(errors.length,0,'unexpected page exceptions: '+errors.join(' / '));
 console.log(JSON.stringify({gate:'M6-private-report-and-exact-inquiry',engine:engineName,status:'PASS',manual:id,printDefault:privacy}));
 await ctx.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
