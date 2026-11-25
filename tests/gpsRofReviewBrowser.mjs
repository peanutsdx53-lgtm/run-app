/** GPS user journey: only real (mock-received) GPS points are measured;
 * ROF-J responses stay separate and survive saving + page reload.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
 if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file))
 }catch{res.statusCode=404;res.end('missing')}});
await new Promise(ok=>server.listen(4226,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','gps-mobile');await mkdir(out,{recursive:true});
const phoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
try{
 for(const width of [320,390,414,768,1440]){
  const phone=width<800;
  const opts={viewport:{width,height:900},reducedMotion:'reduce',locale:'ja-JP'};
  if(phone){opts.userAgent=phoneUA;opts.isMobile=true;opts.hasTouch=true;}
  const ctx=await browser.newContext(opts);
  await ctx.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   const watches=new Map();
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    watchPosition:ok=>{const id=watches.size+1;watches.set(id,ok);return id;},
    clearWatch:id=>watches.delete(id)
   }});
   window.__sampleGps=(lat,t)=>{for(const fn of watches.values())fn({
    timestamp:t,coords:{latitude:lat,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}
   });};
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const host='http://127.0.0.1:4226/#/';
  const shot=async tag=>{await page.screenshot({path:resolve(out,engine+'-'+width+'-'+tag+'.png'),fullPage:true,animations:'disabled',timeout:15000});};
  const safe=async tag=>{
    const metrics=await page.evaluate(()=>{
      const step=[...document.querySelectorAll('.gps-live-steps span')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom}});
      return {w:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,step};
    });
    assert.ok(metrics.scroll<=metrics.w+2&&metrics.body<=metrics.w+2,tag+' document overflow '+JSON.stringify(metrics));
    if(metrics.step.length===3)assert.ok(metrics.step.every(x=>Math.abs(x.top-metrics.step[0].top)<=2),tag+' 3 steps on one row');
  };
  await page.goto(host+'record-start',{waitUntil:'networkidle'});
  await shot('method-selection');
  if(!phone){
    assert.equal(await page.locator('a.rv-method-gps[href="#/measurement"]').count(),0,'PC cannot select GPS');
    assert.match(await page.locator('.rv-method-gps.is-unavailable').innerText(),/スマートフォンで利用できます/);
    assert.equal(await page.locator('.rv-method-gps.is-unavailable').getAttribute('aria-disabled'),'true','PC GPS method remains explicitly unavailable');
    await page.goto(host+'measurement',{waitUntil:'networkidle'});
    assert.match(await page.locator('.gps-platform-unavailable').innerText(),/スマートフォン専用/);
    assert.equal(await page.locator('[data-gps-action="start"]').count(),0,'PC direct URL does not start');
    await shot('desktop-blocked');
    assert.deepEqual(errors,[],'PC errors');
    await ctx.close();continue;
  }
  assert.equal(await page.locator('a.rv-method-gps[href="#/measurement"]').count(),1);
  await page.locator('a.rv-method-gps').click();
  await page.locator('[data-phase="ready"]').waitFor();
  assert.equal(await page.locator('.gps-live-steps span').count(),3);
  assert.equal(await page.locator('.gps-live-steps .is-current').count(),1);
  await safe('ready');await shot('01-ready');
  const readyRect=await page.evaluate(()=>{
   const b=document.querySelector('[data-gps-action="start"]').getBoundingClientRect();
   const n=document.querySelector('.mobile-nav').getBoundingClientRect();
   return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,navTop:n.top,h:innerHeight,w:innerWidth};
  });
  assert.ok(readyRect.top>=0&&readyRect.bottom<readyRect.navTop-8,
   'ready CTA must clear fixed navigation '+JSON.stringify(readyRect));
  assert.ok(readyRect.left>=0&&readyRect.right<=readyRect.w+1);
  await shot('stage2-ready-cta');
  const available=await page.locator('[data-gps-activity] option').evaluateAll(options=>options.map(o=>o.value));
  assert.deepEqual(available,['WALK','JOGGING','RUNNING'],'no new mixed activity option');
  for(const value of available){
   await page.locator('[data-gps-activity]').selectOption(value);
   assert.equal(await page.locator('[data-gps-activity]').inputValue(),value);
   await shot('stage1-prep-'+value.toLowerCase());
  }
  const selectedActivity=width===320?'WALK':width===390?'JOGGING':'RUNNING';
  await page.locator('[data-gps-activity]').selectOption(selectedActivity);
  assert.equal(await page.locator('[data-gps-rof="before"]').count(),0,'no inline fatigue selector');
  await page.locator('[data-gps-rof-entry="before"]').click();
  await page.locator('[data-rof-v4-root]').waitFor();
  assert.equal(await page.locator('[data-rof-v4-phase]').count(),1,'before phase only');
  assert.equal(await page.locator('.rv4-anchor').count(),5);
  await shot('01-rof-before');
  await page.locator('[data-rof-v4-range]').evaluate(el=>{
    el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal((await page.locator('[data-rof-v4-number]').innerText()).trim(),'0');
  await page.locator('.rv4-done').click();
  await page.locator('[data-phase="ready"]').waitFor();
  assert.match(await page.locator('[data-gps-rof-entry="before"]').innerText(),/0 \/ 10/);
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').waitFor();
  await shot('01-consent');
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  assert.equal(await page.locator('.mobile-nav').isVisible(),false,'active GPS must hide bottom navigation');
  const bar=page.locator('.gps-live-actions--measuring');
  assert.equal(await bar.locator('button').count(),3,'flag/pause/finish controls present');
  const checkBar=async()=>{
   const m=await bar.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,
     buttons:[...el.querySelectorAll('button')].map(b=>{const v=b.getBoundingClientRect();return {left:v.left,right:v.right,height:v.height}})};
   });
   assert.ok(m.left>=0&&m.right<=m.w+1&&m.top>=0&&m.bottom<m.h,'GPS controls fit viewport '+JSON.stringify(m));
   assert.ok(m.buttons.every(x=>x.left>=0&&x.right<=m.w+1&&x.height>=44),'control hit areas '+JSON.stringify(m));
  };
  await checkBar();
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await checkBar();await shot('stage2-controls-scrolled');
  await page.evaluate(()=>scrollTo(0,0));
  assert.match(await page.locator('[data-gps-status]').innerText(),/位置取得待ち・計測中/);
  assert.equal(await page.locator('[data-gps-accuracy]').isVisible(),false,'do not repeat GPS waiting text as accuracy');
  assert.equal(await page.locator('[data-gps-notice]').isVisible(),false,'hide redundant help when healthy');
  await page.locator('[data-gps-action="pause"]').click();
  await page.locator('[data-phase="paused"]').waitFor();
  assert.equal(await page.locator('.mobile-nav').isVisible(),false,'paused GPS keeps navigation hidden');
  assert.equal(await page.locator('.gps-live-actions--measuring button').count(),2,'paused bar has resume/end only');
  await checkBar();await shot('stage2-paused-actions');
  await page.locator('[data-gps-action="finish"]').click();
  const pausedDialog=page.locator('[data-gps-finish-dialog]');
  await pausedDialog.waitFor({state:'visible'});
  await page.locator('[data-gps-action="finish-cancel"]').click();
  assert.equal(await page.locator('[data-phase="paused"]').count(),1,'cancel from pause must retain paused state');
  await page.locator('[data-gps-action="resume"]').click();
  await page.locator('[data-gps-consent-confirm]').waitFor();
  await shot('stage2-resume-requires-consent');
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  assert.equal(await page.locator('.gps-live-actions--measuring button').count(),3,'resumed controls restored');
  await safe('running');await shot('02-measuring');
  assert.equal(await page.locator('[data-gps-segment]').count(),0,'retired mixed-activity segment switch is absent');
  assert.equal(await page.locator('[data-gps-activity]').count(),0,'activity cannot change mid-measurement');
  const t=Date.now();
  await page.evaluate(ts=>window.__sampleGps(37.5,ts),t);
  await page.evaluate(ts=>window.__sampleGps(37.50025,ts),t+5000);
  await page.locator('[data-gps-action="flag"]').click();
  assert.match(await page.locator('[data-gps-status]').innerText(),/GPS受信中・計測中/);
  assert.match(await page.locator('[data-gps-accuracy]').innerText(),/受信精度/,'show accuracy after an accepted fix');
  assert.match(await page.locator('[data-gps-map-flags]').innerText(),/1件/,'flags remain available');
  await page.waitForTimeout(1250);
  await page.locator('[data-gps-action="finish"]').click();
  const dialog=page.locator('[data-gps-finish-dialog]');
  await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.getAttribute('aria-labelledby'),'gps-finish-title');
  assert.equal(await page.locator('[data-phase="running"]').count(),1,'finish first tap cannot stop GPS');
  await shot('stage2-finish-confirm');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.isVisible(),false,'Escape dismisses native dialog');
  assert.equal(await page.locator('[data-phase="running"]').count(),1,'Escape keeps GPS active');
  await page.locator('[data-gps-action="finish"]').click();
  await dialog.waitFor({state:'visible'});
  await page.locator('[data-gps-action="finish-cancel"]').click();
  assert.equal(await page.locator('[data-phase="running"]').count(),1,'Cancel keeps measurement active');
  await page.locator('[data-gps-action="finish"]').click();
  await dialog.waitFor({state:'visible'});
  await page.locator('[data-gps-action="finish-confirm"]').click();
  await page.locator('[data-gps-review]').waitFor();
  assert.ok(page.url().includes('#/gps-review'),'finished GPS review');
  assert.match(await page.locator('.gps-review-rof-before').innerText(),/0 \/ 10/);
  assert.match(await page.locator('.gps-review-provenance').innerText(),/0は回答済み、未回答は未回答のまま保存/);
  assert.match(await page.locator('.gps-review-storage-note').innerText(),/位置情報を含むコース詳細は/);
  assert.equal(await page.locator('[data-pre-save-scope]').count(),1,'one shared review section');
  assert.equal(await page.locator('[data-pre-save-scope]').getAttribute('data-save-source'),'gps');
  assert.match(await page.locator('[data-route-consent-status]').innerText(),/保存しない（初期設定）/);
  const surfaceSelect=page.locator('[data-gps-surface]');
  assert.equal(await surfaceSelect.inputValue(),'UNKNOWN','surface is not inferred from GPS');
  const surfaceOptions=await surfaceSelect.locator('option').evaluateAll(nodes=>nodes.map(el=>el.value));
  assert.deepEqual(surfaceOptions,['UNKNOWN','paved','track','treadmill','soil','trail','naturalGrass','artificialTurf','sand'],
    'GPS reports share all manual surface categories');
  assert.match(await page.locator('.gps-review-surface').innerText(),/GPSでは測定していません/);
  assert.equal(await page.locator('.gps-review-surface details').getAttribute('open'),null,'optional explanation starts folded');
  const chosenSurface=width===320?'paved':width===390?'trail':width===414?'track':'UNKNOWN';
  await surfaceSelect.selectOption(chosenSurface);
  assert.equal(await surfaceSelect.inputValue(),chosenSurface);
  const surfaceBox=await surfaceSelect.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,w:innerWidth}});
  assert.ok(surfaceBox.left>=0&&surfaceBox.right<=surfaceBox.w+1&&surfaceBox.width>=200,'surface selector fits '+JSON.stringify(surfaceBox));
  const rofTerm=await page.locator('[data-gps-rof-entry="after"] .gps-rof-term').evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,fragments:el.getClientRects().length}));
  assert.equal(rofTerm.whiteSpace,'nowrap','ROF-J name cannot split at a hyphen in narrow layout');
  assert.equal(rofTerm.fragments,1,'ROF-J scientific term must remain a single visual fragment');
  await safe('review');await shot('03-review-empty-after');
  await page.locator('[data-gps-rof-entry="after"]').click();
  await page.locator('[data-rof-v4-root]').waitFor();
  assert.equal(await page.locator('[data-rof-v4-phase]').count(),1,'after phase only');
  await shot('03-rof-after');
  await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal((await page.locator('[data-rof-v4-number]').innerText()).trim(),'7');
  await page.locator('.rv4-done').click();
  await page.locator('[data-gps-review]').waitFor();
  assert.match(await page.locator('[data-gps-rof-entry="after"]').innerText(),/7 \/ 10/);
  assert.equal(await page.locator('[data-gps-surface]').inputValue(),chosenSurface,'return from ROF retains surface');
  await page.locator('[data-gps-note]').fill('測定後に本人が記録した気づき');
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),false);
  const saveDetails=width!==768; // one opt-in for each activity, one RUNNING opt-out
  if(saveDetails){
   await page.locator('[data-gps-save-route]').check();
   assert.match(await page.locator('[data-route-consent-status]').innerText(),/本人が選択：位置・速度・フラッグ/);
   assert.equal(await page.locator('.gps-flag-review').getAttribute('open'),null,'flag notes start folded');
   assert.equal(await page.locator('.gps-flag-review summary strong').evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap','flag summary cannot wrap mid-word');
   await page.locator('.gps-flag-review summary').click();
   assert.equal(await page.locator('.gps-flag-review').getAttribute('open'),'','flag notes are available on demand');
   await page.locator('[data-gps-flag-note]').fill('保存する地点の気づき');
   await page.locator('[data-gps-flag-note]').dispatchEvent('change');
   await shot('stage1-running-details-opt-in');
  }
  await safe('populated review');await shot('03-review-filled');
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('#activity-result').waitFor();
  const id=new URLSearchParams(page.url().split('?')[1]).get('gps');
  const stored=await page.evaluate(async()=>{const g=await import('/ui/gpsReplayIndexedDbStore.js');return g.readGpsV2Summaries();});
  assert.equal(stored.ok,true,stored.reason);
  const saved=stored.records.find(r=>r.id===id);assert.ok(saved,'saved GPS ID exists');
  assert.equal(saved.experience.source,'USER_REPORTED');
  assert.equal(saved.experience.rofBefore,0);assert.equal(saved.experience.rofAfter,7);
  assert.equal(saved.experience.memo,'測定後に本人が記録した気づき');
  assert.equal(saved.experience.surface,chosenSurface,'GPS surface preserved as optional self-report');
  assert.ok(saved.experience.beforeCapturedAt&&saved.experience.afterCapturedAt);
  assert.equal(saved.activity,selectedActivity,'saved activity matches the user selection');
  assert.equal(saved.detailSaved,saveDetails,'route storage is opt-in, never implicit');
  const dynamicGate=page.locator('#activity-result [data-gps-dynamic-gate]');
  assert.equal(await dynamicGate.count(),saveDetails?1:0,'single-activity dynamic gate depends on route consent');
  if(saveDetails){
   const restored=await page.evaluate(async id=>{
    const storage=await import('/ui/gpsReplayIndexedDbStore.js');
    return storage.readGpsV2Detail(id);
   },id);
   assert.equal(restored.ok,true,restored.reason);
   assert.equal(restored.detail.flags.length,1,'flag retained in opt-in details');
   assert.equal(restored.detail.flags[0].note,'保存する地点の気づき');
  }
  await page.reload({waitUntil:'networkidle'});
  const result=page.locator('#activity-result');
  if(!(await result.locator('[data-pane="fatigue"]').isVisible()))await result.locator('[data-tab="fatigue"]').click();
  await result.locator('[data-pane="fatigue"]').waitFor({state:'visible'});
  const fatigue=await result.locator('[data-pane="fatigue"]').innerText();
  assert.match(fatigue,/運動前/);assert.match(fatigue,/運動後/);
  assert.match(fatigue,/(^|\D)0(\D|$)/);assert.match(fatigue,/(^|\D)7(\D|$)/);
  if(width===414){
   // This is a synthetic *already-stored* legacy payload, not a newly
   // created mixed session. Restore it through the existing V2 backup path.
   const legacy=await page.evaluate(async id=>{
    const store=await import('/ui/gpsReplayIndexedDbStore.js');
    const prior=await store.readGpsV2Detail(id);
    if(!prior.ok)return {ok:false,reason:prior.reason};
    const oldId='gps-v2-legacy-20261027-mixed-01';
    const summary=structuredClone(prior.summary),detail=structuredClone(prior.detail);
    summary.id=oldId;summary.activity='MIXED';summary.energyEstimate=null;
    summary.finalReference={...summary.finalReference,state:'MIXED_NOT_SUPPORTED',
     modelVersion:null,semanticVersion:null,source:null,
     regions:summary.finalReference.regions.map(r=>({...r,value:null,
      calculationState:'NOT_CALCULABLE',reasonCode:'MIXED_NOT_SUPPORTED'}))};
    detail.id=oldId;
    const data=JSON.stringify({format:store.GPS_V2_BACKUP_FORMAT,version:2,summaries:[summary],details:[detail]});
    const check=store.inspectGpsV2Backup(data);
    if(!check.ok)return {ok:false,reason:check.reason};
    const imported=await store.importGpsV2Backup(data);
    const records=await store.readGpsV2Summaries();
    const restored=await store.readGpsV2Detail(oldId);
    return {ok:imported.ok&&records.ok&&restored.ok,added:imported.added,
     historic:records.records.some(x=>x.id===oldId&&x.activity==='MIXED'),
     state:restored.summary?.finalReference?.state,reason:imported.reason};
   },id);
   assert.equal(legacy.ok,true,legacy.reason);
   assert.equal(legacy.added,1,'old mixed record imported without changing existing IDs');
   assert.equal(legacy.historic,true,'legacy MIXED read back');
   assert.equal(legacy.state,'MIXED_NOT_SUPPORTED','old scientific refusal remains intact');
   await page.goto(host+'history',{waitUntil:'networkidle'});
   await page.reload({waitUntil:'networkidle'});
   const history=page.locator('#activity-history');await history.waitFor();
   await history.locator('.hx-scope [data-history-scope="all"]').click();
   await history.locator('[data-history-advanced]').click();
   await history.locator('[data-record-source="GPS_V2"]').click();
   const oldItem=history.locator('[data-select-id="gps-v2-legacy-20261027-mixed-01"]');
   await oldItem.waitFor();
   assert.match(await oldItem.innerText(),/走歩混在/);
   assert.match(await oldItem.innerText(),/GPS計測/);
   assert.equal(await page.locator('.gps-history-item').count(),0,'retired duplicate GPS list absent');
   await shot('stage1-legacy-mixed-history');
   await oldItem.click();
   await history.locator('[data-open-record]').click();
   await page.locator('#activity-result .rv4-header').waitFor();
   assert.equal(await page.locator('[data-gps-dynamic-gate]').count(),0,'legacy mixed must not be misrepresented as dynamic reference');
   await shot('stage1-legacy-mixed-result');
  }
  assert.deepEqual(errors,[],'no browser errors');
  await ctx.close();
 }
 // Separate English visual/layout contract: the user selects the same three
 // modes in English without enabling the real GPS sensor or persisting a route.
 for(const width of [320,390,414,768]){
  const enContext=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',
   locale:'en-US',userAgent:phoneUA,isMobile:true,hasTouch:true});
  await enContext.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'en'}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:'en',textSize:'standard',motion:'system'}));
   const locations=new Map();
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    watchPosition:(ok,err)=>{const id=locations.size+1;locations.set(id,{ok,err});return id;},
    clearWatch:id=>locations.delete(id)
   }});
   window.__gpsStage2Error=code=>{for(const watcher of locations.values())watcher.err({code})};
   window.__gpsStage2Fix=(latitude,t)=>{for(const watcher of locations.values())watcher.ok({
    timestamp:t,coords:{latitude,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}
   })};
  });
  const enPage=await enContext.newPage(),errors=[];
  enPage.on('pageerror',e=>errors.push(e.message));
  await enPage.goto('http://127.0.0.1:4226/#/measurement',{waitUntil:'networkidle'});
  await enPage.locator('[data-phase="ready"]').waitFor();
  const choices=await enPage.locator('[data-gps-activity] option').evaluateAll(nodes=>nodes.map(x=>({value:x.value,label:x.textContent.trim()})));
  assert.deepEqual(choices.map(x=>x.value),['WALK','JOGGING','RUNNING']);
  assert.equal(choices.length,3,'English options also exclude MIXED');
  assert.ok(choices.every(x=>!/[ぁ-んァ-ン一-龯]/.test(x.label)),'English choices must not contain Japanese labels: '+JSON.stringify(choices));
  for(const mode of choices){
   await enPage.locator('[data-gps-activity]').selectOption(mode.value);
   await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage1-en-prep-'+mode.value.toLowerCase()+'.png'),
    fullPage:true,animations:'disabled'});
  }

   { // All smartphone widths must review translated post-run input.
    await enPage.locator('[data-gps-activity]').selectOption('JOGGING');
    await enPage.locator('[data-gps-goal-mode]').selectOption('time');
    await enPage.locator('[data-gps-goal-value]').fill('8');
    await enPage.locator('[data-gps-action="start"]').click();
    await enPage.locator('[data-gps-consent-confirm]').waitFor();
    await enPage.locator('[data-gps-consent-confirm]').click();
    await enPage.locator('[data-phase="running"]').waitFor();
    await enPage.waitForFunction(()=>document.querySelector('[data-gps-status]')?.textContent.includes('Measuring'),null,{timeout:10000});
    assert.match(await enPage.locator('.gps-live-steps').innerText(),/Prepare/,'first step translated');
    await enPage.waitForFunction(()=>document.querySelector('[data-gps-goal]')?.textContent.includes('Goal'),null,{timeout:10000});
    await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage2-en-running.png'),fullPage:true});
    await enPage.evaluate(()=>window.__gpsStage2Error(2));
    await enPage.locator('[data-gps-notice]').waitFor({state:'visible'});
    assert.equal(await enPage.locator('.gps-live-status .gps-v2-dot--error').count(),1,'error has non-green status indicator');
    await enPage.waitForFunction(()=>document.querySelector('[data-gps-notice]')?.textContent.includes('GPS signal unavailable'),null,{timeout:10000});
    assert.equal(await enPage.locator('[data-phase="running"]').count(),1,'GPS error does not stop timer');
    await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage2-en-location-error.png'),fullPage:true});
    await enPage.evaluate(()=>window.__gpsStage2Fix(37.5,Date.now()));
    await enPage.waitForFunction(()=>document.querySelector('.gps-live-status .gps-v2-dot:not(.gps-v2-dot--error):not(.gps-v2-dot--waiting)')&&document.querySelector('[data-gps-accuracy]')?.textContent.includes('GPS accuracy'),
      null,{timeout:10000});
    await enPage.locator('[data-gps-action="finish"]').click();
    await enPage.locator('[data-gps-finish-dialog]').waitFor({state:'visible'});
    await enPage.waitForFunction(()=>document.querySelector('#gps-finish-title')?.textContent.includes('End This Measurement'),null,{timeout:10000});
    await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage2-en-finish-confirm.png'),fullPage:true});
    await enPage.locator('[data-gps-action="finish-cancel"]').click();
    assert.equal(await enPage.locator('[data-phase="running"]').count(),1,'English cancel preserves active session');
    await enPage.evaluate(()=>window.__gpsStage2Fix(37.50025,Date.now()+5000));
    await enPage.waitForTimeout(1100);
    await enPage.locator('[data-gps-action="finish"]').click();
    await enPage.locator('[data-gps-finish-dialog]').waitFor({state:'visible'});
    await enPage.locator('[data-gps-action="finish-confirm"]').click();
    await enPage.locator('[data-gps-review]').waitFor();
    await enPage.waitForFunction(()=>document.querySelector('.gps-review-surface-heading')?.textContent.includes('Not Measured by GPS'),null,{timeout:10000});
    const englishChoices=await enPage.locator('[data-gps-surface] option').evaluateAll(nodes=>nodes.map(n=>n.textContent.trim()));
    const englishFactLabels=await enPage.locator('.gps-review-facts dt').allTextContents();
    assert.deepEqual(englishFactLabels.map(x=>x.trim()),['Activity','GPS Distance','Measured Active Duration','Average Pace'],'all GPS fact labels are translated');
    assert.match(await enPage.locator('.gps-review-rof-before').innerText(),/Before Activity: Not answered/,'optional pre-fatigue is translated');
    assert.equal(englishChoices.length,9);
    assert.ok(englishChoices.every(t=>!/[ぁ-んァ-ン一-龯]/.test(t)),'untranslated English surface labels '+JSON.stringify(englishChoices));
    assert.equal(await enPage.locator('[data-gps-surface]').inputValue(),'UNKNOWN');
    await enPage.waitForFunction(()=>document.querySelector('[data-pre-save-scope]')?.textContent.includes('Review Before Saving'),null,{timeout:10000});
    const sharedEnglish=await enPage.locator('[data-pre-save-scope]').innerText();
    assert.ok(!/[ぁ-んァ-ン一-龯]/.test(sharedEnglish),'English shared review must be fully translated '+sharedEnglish);
    assert.match(sharedEnglish,/Not Saved/);
    const enGeometry=await enPage.evaluate(()=>{
      const select=document.querySelector('[data-gps-surface]'),v=select.getBoundingClientRect();
      const buttons=[...document.querySelectorAll('.gps-review button,.gps-review a')].filter(x=>x.getClientRects().length).map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right}});
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,selectLeft:v.left,selectRight:v.right,buttons};
    });
    assert.ok(enGeometry.scroll<=enGeometry.width+2,'English GPS review overflow '+JSON.stringify(enGeometry));
    assert.ok(enGeometry.selectLeft>=0&&enGeometry.selectRight<=enGeometry.width+1,'English surface selector fits '+JSON.stringify(enGeometry));
    assert.ok(enGeometry.buttons.every(x=>x.left>=-1&&x.right<=enGeometry.width+1),'English controls fit '+JSON.stringify(enGeometry));
    await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage3-en-review-empty.png'),fullPage:true,animations:'disabled'});
    await enPage.locator('[data-gps-surface]').selectOption('soil');
    await enPage.locator('.gps-review-surface details summary').click();
    await enPage.screenshot({path:resolve(out,engine+'-'+width+'-stage3-en-review-surface-help.png'),fullPage:true,animations:'disabled'});
   }
  assert.deepEqual(errors,[],'no English GPS browser errors');
  await enContext.close();
 }
 console.log('PASS mobile GPS preflight -> ROF -> measurement -> after ROF -> result, desktop blocked '+engine);
}finally{await browser.close();await new Promise(done=>server.close(done));}
