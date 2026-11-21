import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const path=resolve(root,'.'+pathname);
 if(path!==root&&!path.startsWith(root+sep))throw Error('path');
 const f=path===root?resolve(root,'index.html'):path;
 res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');
 res.end(await readFile(f));
}catch{res.statusCode=404;res.end('not found')}});
await new Promise(ok=>server.listen(4389,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const base='http://127.0.0.1:4389/#/';
const out=resolve(root,'audit-output','stage5-history-result');
await mkdir(out,{recursive:true});
const report=[];
const sanitize=(x)=>x.replaceAll(/[^a-z0-9-]/ig,'-');
async function capture(page,width,language,stage){
 const metrics=await page.evaluate(()=>{
  const h=document.querySelector('#runload-history-v2')?.shadowRoot;
  const panel=document.querySelector('#runload-result-v4')?.shadowRoot;
  const measure=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
  const controls=[...(h?.querySelectorAll('.hx-source-controls button')||[])];
  const filterGroups=['[data-history-scope]','[data-record-source]','[data-record-kind]'].map(selector=>[...(h?.querySelectorAll(selector)||[])].map(measure));
  const searchHelp=h?.querySelector('.hx-find-help');
  const source=[...(h?.querySelectorAll('.hx-record-source')||[])];
  const tabs=[...(panel?.querySelectorAll('[data-tab]')||[])];
  return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   sources:source.length,sourceButtons:controls.map(measure),filterGroups,searchHelpClosed:!!searchHelp&&!searchHelp.open,tabs:tabs.map(measure),
   stage:measure(document.querySelector('#runload-history-v2')||document.querySelector('#runload-result-v4')||document.body),
   selected:measure(h?.querySelector('.selected-footer')||document.body),
   bottomNav:document.querySelector('.mobile-nav')?.offsetParent?measure(document.querySelector('.mobile-nav')):null
  };
 });
 assert.ok(metrics.scroll<=metrics.viewport+2&&metrics.body<=metrics.viewport+2,
  'no horizontal overflow '+engine+' '+language+' '+width+' '+stage+' '+JSON.stringify(metrics));
 assert.ok(metrics.sourceButtons.every(b=>b.left>=-2&&b.right<=metrics.viewport+2&&b.bottom-b.top>=43.5),
  'source filter targets fit view '+JSON.stringify(metrics));
 if(stage==='01-history-combined'){
  assert.equal(metrics.searchHelpClosed,true,'History filter help stays collapsed by default');
  assert.deepEqual(metrics.filterGroups.map(group=>group.length),[2,3,3],'all filter groups retain their choices');
  for(const group of metrics.filterGroups){
   const widths=group.map(b=>b.width),heights=group.map(b=>b.bottom-b.top);
   assert.ok(Math.max(...widths)-Math.min(...widths)<=2,'equal filter widths '+JSON.stringify(group));
   assert.ok(Math.max(...heights)-Math.min(...heights)<=2,'equal filter heights '+JSON.stringify(group));
   assert.ok(group.every(b=>b.left>=-2&&b.right<=metrics.viewport+2&&b.bottom-b.top>=44),'filter target bounds '+JSON.stringify(group));
  }
 }
 assert.ok(metrics.tabs.every(b=>b.left>=-2&&b.right<=metrics.viewport+2),
  'three-tab controls fit view '+JSON.stringify(metrics));
 const filename=engine+'-'+language+'-'+width+'-'+sanitize(stage)+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage:true,animations:'disabled',timeout:20000});
 report.push({engine,language,width,stage,filename,...metrics});
}
try{
 for(const language of ['ja','en']){
  for(const width of [320,390,414,768,1440]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:900},
    reducedMotion:'reduce',locale:language==='en'?'en-US':'ja-JP',serviceWorkers:'block'});
   await context.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
   },language);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'home',{waitUntil:'networkidle'});
   const saved=await page.evaluate(async()=>{
    const date=new Date().toISOString().slice(0,10);
    const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
    const g=await import('/ui/gpsReplayIndexedDbStore.js');
    const rest=await import('/ui/restDayStore.js');
    const started=await c.initialize();if(!started.ok)throw Error('canonical '+started.reason);
    const manual=await c.mutate(store=>m.saveManualRun(store,{
     date,distance:'6',hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',
     runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,
     memo:'manual entry',courseName:'River',steps:'',stepsProvenance:'UNKNOWN'
    }));
    if(!manual.ok)throw Error('manual '+manual.reason);
    const gps=await g.saveGpsV2Run({
     phase:'finished',activity:'JOGGING',distanceM:4000,elapsedMs:1800000,accepted:3,rejected:0,
     track:[],trackSimplified:false,replayTrackAvailable:false,replayTrack:[],flags:[]
    },{date,saveDetails:false,experience:{
     source:'USER_REPORTED',rofBefore:0,rofAfter:null,
     beforeCapturedAt:'2026-11-16T01:00:00.000Z',afterCapturedAt:null,
     surface:'UNKNOWN',memo:'gps self-report'
    }});
    if(!gps.ok)throw Error('gps '+gps.reason);
    const restDate=new Date(date+'T12:00:00Z');restDate.setUTCDate(restDate.getUTCDate()-1);
    const restSaved=rest.saveRestDay(localStorage,{date:restDate.toISOString().slice(0,10),memo:'rest day'});
    if(!restSaved.ok)throw Error('rest '+restSaved.reason);
    return {manualId:manual.record.id,gpsId:gps.summary.id,date};
   });
   await page.reload({waitUntil:'networkidle'});
   await page.goto(base+'history',{waitUntil:'networkidle'});
   const history=page.locator('#runload-history-v2');await history.waitFor();
   const rows=history.locator('[data-select-id]');
   assert.equal(await rows.count(),3,'one GPS, one manual run and one rest day in one history');
   if(language==='en'){
    await page.waitForFunction(()=>{
     const root=document.querySelector('#runload-history-v2')?.shadowRoot;
     const text=[...(root?.querySelectorAll('[data-history-system-caption],.datebox span')||[])];
     return text.length===6&&text.every(el=>!/[ぁ-んァ-ン一-龯]/.test(el.textContent));
    },null,{timeout:12000});
   }
   assert.equal(await history.locator('[data-record-source]').count(),3,'source filter All/Manual/GPS');
   assert.match(await history.locator('.stats').innerText(),language==='en'?/(2|Two)/:/2/,'two runs included in monthly totals');
   assert.equal(await page.locator('.gps-history-item').count(),0,'old duplicate GPS list retired');
   assert.match(await page.locator('[data-gps-history-disclosure]').innerText(),language==='en'?/GPS Data Management/:/GPS記録のデータ管理/);
   await capture(page,width,language,'01-history-combined');
   const findHelp=history.locator('.hx-find-help');
   await findHelp.locator('summary').click();
   assert.equal(await findHelp.evaluate(el=>el.open),true,'local help opens on demand');
   assert.match(await findHelp.locator('.hx-scope-hint').innerText(),language==='en'?/Searching This Month/:/この月の記録を検索中/);
   await findHelp.locator('summary').click();
   assert.equal(await findHelp.evaluate(el=>el.open),false,'local help can be closed');
   if(language==='en')assert.equal((await history.locator('[data-record-source="MANUAL"]').innerText()).trim(),'Manual');
   await history.locator('[data-record-source="GPS_V2"]').click();
   assert.equal(await rows.count(),1,'GPS filter returns one record');
   const gpsItem=history.locator('[data-select-id="'+saved.gpsId+'"]');
   await gpsItem.click();
   if(language==='en'){
    await page.waitForFunction(()=>{
     const root=document.querySelector('#runload-history-v2')?.shadowRoot;
     const title=root?.querySelector('.focus-panel h3')?.textContent||'';
     const chosen=root?.querySelector('.selected-footer strong')?.textContent||'';
     return title.includes('November')&&chosen.includes('November')&&
       !/[ぁ-んァ-ン一-龯]/.test(title+chosen);
    },null,{timeout:12000});
   }
   assert.equal(await history.locator('[data-delete-gps-record]').count(),1,'GPS selected record can be explicitly deleted');
   assert.equal(await history.locator('[data-annotate-record]').count(),1,'GPS annotation entry preserved');
   assert.match(await history.locator('.focus-panel').innerText(),language==='en'?/GPS Measurement/:/GPSで計測/);
   await capture(page,width,language,'02-history-gps-selected');
   await history.locator('[data-open-record]').click();
   await page.waitForFunction(id=>location.hash==='#/result?gps='+encodeURIComponent(id),saved.gpsId);
   const result=page.locator('#runload-result-v4');await result.locator('[data-tab="body"]').waitFor({state:'attached',timeout:15000});
   assert.equal(await result.locator('[data-tab]').count(),3,'existing result 3 tabs unchanged');
   assert.equal(await result.locator('[data-result-source]').getAttribute('data-result-source'),'GPS_V2');
   assert.equal(await result.locator('[data-gps-dynamic-gate]').count(),0,'no dynamic route when opt-out');
   if(width<=800)await result.locator('[data-tab="radar"]').click();
   else assert.equal(await result.locator('[data-pane="radar"]').isVisible(),true,'desktop presents comparison alongside body');
   assert.equal(await result.locator('[data-compare-select]').count(),0,'GPS does not compare with manual reference rows');
   assert.match(await result.locator('[data-pane="radar"]').innerText(),language==='en'?/do not automatically compare/:/自動で比較しません/);
   await capture(page,width,language,'03-result-gps-compare-unavailable');
   await result.locator('.rv4-history-back').click();
   await history.waitFor();
   await history.locator('[data-record-source="MANUAL"]').click();
   assert.equal(await rows.count(),2,'manual filter retains run and rest');
   await history.locator('[data-select-id="'+saved.manualId+'"]').click();
   assert.equal(await history.locator('[data-delete-gps-record]').count(),0,'manual record cannot be deleted as GPS');
   await capture(page,width,language,'04-history-manual-selected');
   await history.locator('[data-open-record]').click();
   await page.waitForFunction(id=>location.hash==='#/result?record='+encodeURIComponent(id),saved.manualId);
   await result.locator('[data-tab="body"]').waitFor({state:'attached',timeout:15000});
   assert.equal(await result.locator('[data-tab]').count(),3,'manual result also has exactly 3 tabs');
   assert.equal(await result.locator('[data-result-source]').getAttribute('data-result-source'),'MANUAL');
   if(width<=800)await result.locator('[data-tab="fatigue"]').click();
   else assert.equal(await result.locator('[data-pane="fatigue"]').isVisible(),true,'desktop presents fatigue alongside body');
   assert.equal(await result.locator('[data-pane="fatigue"]').isVisible(),true);
   await capture(page,width,language,'05-result-manual-fatigue');
   await page.goto(base+'result?gps=gps-v2-nonexistent-000001',{waitUntil:'networkidle'});
   await page.locator('#runload-result-v4 .gd-empty').waitFor({state:'visible',timeout:15000});
   assert.match(await page.locator('#runload-result-v4').innerText(),language==='en'?/(GPS|record)/:/指定されたGPS記録がありません/);
   assert.equal(await result.locator('[data-result-source]').count(),0,'unknown GPS must not silently show manual result');
   await capture(page,width,language,'06-unknown-gps-fail-closed');
   if(width===390){
    await page.goto(base+'history',{waitUntil:'networkidle'});
    await history.locator('[data-record-source="GPS_V2"]').click();
    await history.locator('[data-select-id="'+saved.gpsId+'"]').click();
    page.once('dialog',async d=>d.accept());
    await history.locator('[data-delete-gps-record]').click();
    await page.waitForFunction(id=>!document.querySelector('#runload-history-v2')?.shadowRoot?.querySelector('[data-select-id="'+id+'"]'),saved.gpsId);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await history.locator('[data-select-id="'+saved.gpsId+'"]').count(),0,'deletion persisted');
    await history.locator('[data-record-source="MANUAL"]').click();
    assert.equal(await history.locator('[data-select-id="'+saved.manualId+'"]').count(),1,'manual run preserved after GPS delete');
    await capture(page,width,language,'07-deleted-gps-manual-survives');
   }
   assert.deepEqual(errors,[],'no JS page errors for '+language+'/'+width);
   await context.close();
  }
 }
 await writeFile(resolve(out,engine+'-report.json'),JSON.stringify(report,null,2));
 console.log('PASS stage5 bilingual consolidated GPS/manual/rest history and result 3 tabs '+engine+' '+report.length+' captures');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
