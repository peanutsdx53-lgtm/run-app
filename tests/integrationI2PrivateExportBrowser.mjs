/* I2: Actual result export (PNG + print CSS) with saved MANUAL and GPS_V2,
 * posthoc and optional mental information. Includes denial/failed-export paths.
 * Does not represent medical/educational efficacy or independent PDF text audit.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(p!==root&&!p.startsWith(root+sep))throw Error('outside');
 const file=p===root?resolve(root,'index.html'):p;
 res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},serviceWorkers:'block',acceptDownloads:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
  const goto=hash=>page.goto(base+hash,{waitUntil:'networkidle'});
  await goto('#/history');
  const ids=await page.evaluate(async()=>{
   const [c,m,g,mental,ann]=await Promise.all([
    import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
    import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/mentalExperience.js'),
    import('/ui/annotationStore.js')]);
   const init=await c.initialize();if(!init.ok)throw Error('manual unavailable');
   const raw={date:'2026-11-09',distance:'6',hours:'',minutes:'33',seconds:'',
    rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
    activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'PRIVATE-MEMO-I2',
    courseName:'',shoeName:'PRIVATE-SHOE-I2'};
   const manual=await c.mutate(s=>m.saveManualRun(s,raw));if(!manual.ok)throw Error('manual save '+manual.reason);
   const correction=await c.mutate(s=>m.correctSavedRof(s,manual.record.id,'after',7,{
    timeBasis:'RECALLED',assessedAt:'2026-11-09T00:00:00.000Z',
    reason:'PRIVATE-CORRECTION-REASON-I2'}));
   if(!correction.ok)throw Error('manual correction '+correction.reason);
   const t=1700000000000,track=[0,.015,.03].map((km,i)=>({lat:37.7+i*.0001,lon:139.55,
    ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:t+i*5000,
    breakBefore:i===0,activity:'RUNNING'}));
   const session={phase:'finished',activity:'RUNNING',distanceM:30,elapsedMs:10000,
    accepted:3,rejected:0,track,trackSimplified:false,replayTrackAvailable:true,
    replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
   const gps=await g.saveGpsV2Run(session,{date:'2026-11-09',saveDetails:true,
    experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,
     beforeCapturedAt:null,afterCapturedAt:null,memo:'PRIVATE-GPS-MEMO-I2'}});
   if(!gps.ok)throw Error('gps save '+gps.reason);
   const ref={sourceType:'GPS_V2',recordId:gps.summary.id};
   const mentalReq=mental.makeMentalAppendRequest(ref,{
    answer:'FELT',declaredPhase:'AFTER',timeBasis:'RECALLED',
    freeText:'PRIVATE-MENTAL-I2',open:false});
   if(!mentalReq.ok)throw Error('mental request '+mentalReq.reason);
   const opened=await ann.openAnnotationStore();if(!opened.ok)throw Error('annotation store');
   const saved=await ann.appendAnnotation(opened.value.db,mentalReq.request);opened.value.db.close();
   if(!saved.ok)throw Error('mental append '+saved.reason);
   const snapshot=await c.readCanonical(),gpsList=await g.readGpsV2Summaries();
   return {manualId:manual.record.id,gpsId:gps.summary.id,
    manualRaw:snapshot.raw,gpsRaw:JSON.stringify(gpsList.records)};
  });
  assert.ok(ids.manualId.startsWith('run-v1-')&&ids.gpsId.startsWith('gps-v2-'));
  // GPS gets a real post-hoc response in a separate append-only thread.
  await goto('#/annotation?source=gps-v2&record='+encodeURIComponent(ids.gpsId));
  await page.locator('[data-ax-editor]').waitFor();
  await page.locator('[data-ax-field]').selectOption('rofAfter');
  await page.locator('[data-ax-form] input[name="score"]').fill('0');
  await page.locator('[data-ax-form] select[name="declaredPhase"]').selectOption('AFTER');
  await page.locator('[data-ax-form] select[name="timeBasis"]').selectOption('RECALLED');
  await page.locator('[data-ax-save]').click();
  await page.waitForFunction(async id=>{
   const a=await import('/ui/annotationStore.js'),o=await a.openAnnotationStore();
   if(!o.ok)return false;
   try{const r=await a.readAnnotationThread(o.value.db,{sourceType:'GPS_V2',recordId:id},'rofAfter');return r.ok&&r.value.length===1&&r.value[0].payload.score===0;}
   finally{o.value.db.close();}
  },ids.gpsId,{timeout:20000});
  const snapshot=()=>page.evaluate(async()=>{
   const [c,g,a]=await Promise.all([import('/ui/manualRunCanonical.js'),
    import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/annotationStore.js')]);
   const m=await c.readCanonical(),r=await g.readGpsV2Summaries(),o=await a.openAnnotationStore();
   if(!m.ok||!r.ok||!o.ok)throw Error('source read failed');
   try{
    const ref={sourceType:'GPS_V2',recordId:r.records[0].id};
    const x=await a.readAnnotationThread(o.value.db,ref,'rofAfter');
    const y=await a.readAnnotationThread(o.value.db,ref,'mentalExperience');
    return {manual:m.raw,gps:JSON.stringify(r.records),posthoc:x.value,mental:y.value,
     notes:localStorage.getItem('runload-v2-exploration-notes-v1')};
   }finally{o.value.db.close();}
  });
  const baseline=await snapshot();assert.equal(baseline.manual,ids.manualRaw);assert.equal(baseline.gps,ids.gpsRaw);
  assert.equal(baseline.posthoc.length,1);assert.equal(baseline.mental.length,1);

  async function inspectPrint(result,{opted=false,mental=false}={}){
   await page.emulateMedia({media:'print'});
   const styles=await result.evaluate(el=>{
    const q=s=>el.shadowRoot.querySelector(s);
    const display=s=>q(s)?getComputedStyle(q(s)).display:null;
    return {date:display('.rv4-date'),fatigue:display('.rv4-fatigue'),
     fatigueDetails:display('.rv4-fatigue-method'),mental:display('.rv4-mental'),
     posthoc:display('.rv4-posthoc-summary'),freeText:display('.rv4-details:not(.rv4-region-evidence)'),
     exportMenu:display('.rv4-export-menu')};
   });
   assert.equal(styles.date,'none','date never enters printing (date opt-in is PNG-only)');
   assert.equal(styles.exportMenu,'none');
   assert.equal(styles.freeText,'none','private free text never prints');
   assert.equal(styles.posthoc,'none','post-hoc annotations are never permitted in print');
   if(mental)assert.equal(styles.mental,'none','mental subjective answer always excluded');
   // Chromium's print-to-PDF bytes are independently extracted, not only
   // checked by DOM/CSS. WebKit keeps the print style/interaction contract.
   if(engineName==='chromium'&&!mental){
    const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
    assert.ok(pdf.length>5000,'result PDF is physically generated');
    const extraction=spawnSync('pdftotext',['-layout','-','-'],{input:pdf,encoding:'utf8',timeout:15000});
    assert.equal(extraction.status,0,'result PDF text extraction '+String(extraction.error?.message||extraction.stderr||''));
    const printed=extraction.stdout;
    assert.doesNotMatch(printed,/PRIVATE-CORRECTION-REASON-I2|PRIVATE-MEMO-I2|PRIVATE-SHOE-I2|2026-11-09/,
      'private correction reason/date/memo must never reach the printed PDF even if details were open');
    if(opted)assert.match(printed,/疲労感の記録/,'opted-in fatigue section survives the physical PDF');
   }
   if(opted){
    assert.notEqual(styles.fatigue,'none','explicit ROF can print the score');
    assert.equal(styles.fatigueDetails,'none','ROF opt-in does not include correction times and reasons');
   }else assert.equal(styles.fatigue,'none','default print excludes ROF');
   await page.emulateMedia({media:'screen'});
  }
  async function downloadImage(result){
   await page.evaluate(()=>{window.__i2Paint=[];
    if(!CanvasRenderingContext2D.prototype.__i2Wrapped){
     const old=CanvasRenderingContext2D.prototype.fillText;
     CanvasRenderingContext2D.prototype.fillText=function(str,...args){window.__i2Paint.push(String(str));return old.call(this,str,...args);};
     CanvasRenderingContext2D.prototype.__i2Wrapped=true;
    }
   });
   const pending=page.waitForEvent('download',{timeout:20000});
   await result.locator('[data-download]').click();
   const downloaded=await pending;
   assert.match(downloaded.suggestedFilename(),/\.png$/);
   return page.evaluate(()=>window.__i2Paint.join('\n'));
  }
  await goto('#/result?record='+encodeURIComponent(ids.manualId)+'&view=fatigue');
  await page.locator('.rv4-export-menu > summary').waitFor();
  const result=page.locator('#runload-result-v4');
  await result.locator('.rv4-export-menu > summary').click();
  assert.equal(await result.locator('[data-export-date]').isChecked(),false);
  assert.equal(await result.locator('[data-export-rof]').isChecked(),false);
  assert.match(await result.locator('.rv4-fatigue-method').innerText(),/回答時刻・訂正履歴/);
  await result.locator('.rv4-fatigue-method').evaluate(el=>el.open=true);
  await inspectPrint(result);
  const noOpt=await downloadImage(result);
  assert.match(noOpt,/日付は非掲載/);
  assert.match(noOpt,/本人回答は非掲載/);
  assert.doesNotMatch(noOpt,/2026-11-09|運動前 0|運動後 7|PRIVATE-|37\.7|139\.55/);
  await result.locator('[data-export-date]').check();
  await result.locator('[data-export-rof]').check();
  await inspectPrint(result,{opted:true});
  const opt=await downloadImage(result);
  assert.match(opt,/2026-11-09/);assert.match(opt,/運動前 0 ／ 運動後 7/);
  assert.doesNotMatch(opt,/PRIVATE-|139\.55|PRIVATE-CORRECTION|MENTAL/);
  // PNG encoder failure: must visibly refuse success, not silently ignore.
  await page.evaluate(()=>{window.__i2RealToBlob=HTMLCanvasElement.prototype.toBlob;
   HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});
  await result.locator('[data-download]').click();
  await result.locator('[data-export-status]').waitFor({state:'visible',timeout:7000});
  assert.match(await result.locator('[data-export-status]').innerText(),/画像を作成できませんでした/);
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__i2RealToBlob;});
  assert.deepEqual(await snapshot(),baseline,'PNG and simulated encoder failure must not change sources');

  // Switching result resets previous explicit disclosure permission.
  await goto('#/result?gps='+encodeURIComponent(ids.gpsId)+'&view=fatigue');
  await page.reload({waitUntil:'networkidle'});
  const gpsResult=page.locator('#runload-result-v4');
  await gpsResult.locator('.rv4-export-menu > summary').waitFor({timeout:20000});
  await gpsResult.locator('.rv4-export-menu > summary').click();
  assert.equal(await gpsResult.locator('[data-export-date]').isChecked(),false);
  assert.equal(await gpsResult.locator('[data-export-rof]').isChecked(),false);
  await page.locator('.rv4-posthoc-summary').getByText('後日申告', {exact:false}).first().waitFor({timeout:20000});
  await inspectPrint(gpsResult,{mental:true});
  const gpsNo=await downloadImage(gpsResult);
  assert.doesNotMatch(gpsNo,/2026-11-09|PRIVATE-|139\.55|運動前 0 ／ 運動後 0/);
  await gpsResult.locator('[data-export-rof]').check();
  await inspectPrint(gpsResult,{opted:true,mental:true});
  const gpsOpt=await downloadImage(gpsResult);
  assert.match(gpsOpt,/運動前 0 ／ 運動後 未回答/,'original missing after is not overridden by later answer 0');
  assert.doesNotMatch(gpsOpt,/PRIVATE-|139\.55|運動後 0/);
  assert.deepEqual(await snapshot(),baseline);

  // Even after result opt-in, consultation opens with all private boxes excluded.
  await goto('#/consultation');
  await page.locator('input[data-share=rof]').waitFor({timeout:20000});
  for(const k of ['rof','notes','condition'])assert.equal(await page.locator('input[data-share="'+k+'"]').isChecked(),false);
  assert.equal(await page.locator('input[data-consultation-gps-v2]').isChecked(),false);
  // A denied clipboard must report failure and must not add user information.
  await goto('#/exploration-tree?category=01&topic='+encodeURIComponent('自分が感じた疲れ'));
  await page.locator('[data-ex-action="share"]').waitFor();
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('clipboard denied by browser');}}});
  });
  await page.locator('[data-ex-action=share]').click();
  await page.locator('[data-ex-action=copy]').click();
  await page.locator('.ex-dialog [role=alert]').waitFor({timeout:10000});
  assert.match(await page.locator('.ex-dialog [role=alert]').innerText(),/コピーできませんでした/);
  assert.doesNotMatch(await page.locator('[data-ex-draft-text]').innerText(),/PRIVATE-|139\.55|37\.7/);
  assert.deepEqual(await snapshot(),baseline,'failure and clipboard handling cannot edit the parents or private annotations');
  assert.deepEqual(errors,[],'I2 test must not generate uncaught JavaScript errors');
  console.log(JSON.stringify({gate:'I2-PRIVATE-EXPORT',engine:engineName,width,status:'PASS',
   defaultPrivate:true,explicitOnly:true,gpsOriginalRof:true,failedPngVisible:true,clipboardDeniedSafe:true}));
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
