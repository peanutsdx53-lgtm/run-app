/** P8: actual IDB records: empty, reread, deleted ref, corrupt canonical, recovery.
 * These are browser integration states, not synthetic DOM screenshots. Tests run
 * in isolated Playwright contexts. No real user's data is touched.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const width=Number(process.env.RUNLOAD_P8_ABNORMAL_WIDTH||390);
if(![390,1024].includes(width))throw Error('Unexpected abnormal-state viewport');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('out of root');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(4498,'127.0.0.1',ok));
const output=resolve(root,'audit-output','p8-abnormal-states');
await mkdir(output,{recursive:true});
let browser;
const results=[];
const base='http://127.0.0.1:4498/#/';
try{
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
 });
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const go=async path=>{await page.goto(base+path,{waitUntil:'networkidle'});};
 async function evidence(id,{scaled=false}={}){
  if(scaled)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  const layout=await page.evaluate(()=>({
   viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   font:getComputedStyle(document.documentElement).fontSize
  }));
  await page.screenshot({path:resolve(output,engine+'-'+width+'-'+id+(scaled?'-font200':'')+'.png'),fullPage:true,animations:'disabled'});
  if(scaled)await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  const ok=layout.doc<=layout.viewport+3&&layout.body<=layout.viewport+3;
  results.push({caseId:id,scaled,layout,ok,engine,width});
  assert.ok(ok,'abnormal state must not cause page overflow: '+id+' '+JSON.stringify(layout));
  assert.deepEqual(errors,[],'unexpected script exceptions at '+id);
 }
 // 1. Empty authoritative store: absence is verified, not a storage failure.
 await go('history');
 const history=page.locator('#runload-history-v2');
 await history.locator('.stage').waitFor();
 assert.match(await history.locator('.stage').innerText(),/保存した記録はまだありません/);
 assert.equal(await history.locator('[data-history-unconnected="false"]').count(),1);
 await evidence('empty-history');if(width===390)await evidence('empty-history',{scaled:true});
 // 2. A real saved record survives a full-page revisit, with three result tabs.
 const saved=await page.evaluate(async()=>{
  const [c,m]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const initial=await c.refresh();
  if(!initial.ok)return {ok:false,reason:initial.reason};
  const r=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-10-28',distance:'6',hours:'',minutes:'36',seconds:'',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',
   rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   courseName:'',shoeName:'',memo:'P8-SAVED-PRIVATE-NOTE'
  }));
  const raw=(await c.readCanonical()).raw;
  return {ok:r.ok,id:r.record?.id,raw,reason:r.reason};
 });
 assert.equal(saved.ok,true,saved.reason);
 await go('result?record='+encodeURIComponent(saved.id));
 const result=page.locator('#runload-result-v4');
 await result.locator('[data-tab]').first().waitFor({state:'attached'});
 assert.equal(await result.locator('[data-tab]').count(),3);
 assert.equal(await result.locator('.rv4-mobile-tabs').isVisible(),width<=800,
  'results switcher is visible on mobile only; desktop shows all three panes');
 await page.reload({waitUntil:'networkidle'});
 await result.locator('[data-tab]').first().waitFor({state:'attached'});
 assert.equal(await result.locator('[data-tab]').count(),3);
 await evidence('saved-revisit');if(width===390)await evidence('saved-revisit',{scaled:true});
 // 3. Explicit invalid IDs fail closed and never silently fall back to saved run.
 const unknown='run-v1-not-a-saved-record';
 await go('result?record='+unknown);
 await result.locator('.gd-empty').waitFor();
 const missing=await result.innerText();
 assert.match(missing,/指定された保存済み走行記録が見つかりません/);
 assert.equal(await result.locator('[data-tab]').count(),0);
 assert.doesNotMatch(missing,/6\.00|P8-SAVED-PRIVATE-NOTE/);
 await evidence('unknown-record');
 // 4. Remove only the saved manual row through the validated canonical
 // transaction, representing a legitimate previously saved/now deleted ref.
 const deleted=await page.evaluate(async id=>{
  const [c,m]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  await c.refresh();
  const out=await c.mutate(s=>{
   const old=m.readManualRuns(s);
   if(!old.ok)return old;
   if(!old.records.some(r=>r.id===id))return {ok:false,reason:'ID not found'};
   const next={version:2,revision:old.revision+1,
    records:old.records.filter(r=>r.id!==id)};
   s.setItem(m.MANUAL_RUN_KEY,JSON.stringify(next));
   return {ok:true};
  });
  return {ok:out.ok,reason:out.reason,raw:(await c.readCanonical()).raw};
 },saved.id);
 assert.equal(deleted.ok,true,deleted.reason);
 await go('result?record='+encodeURIComponent(saved.id));
 await result.locator('.gd-empty').waitFor();
 assert.equal(await result.locator('[data-tab]').count(),0);
 assert.match(await result.innerText(),/見つかりません/);
 await evidence('deleted-record-link');
 // 5. Corrupt the actual authoritative IDB (test context only). A UI read
 // error must never be treated as zero runs or rewrite the corrupt bytes.
 await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open(c.MANUAL_DB,1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readwrite');
   tx.objectStore(c.MANUAL_STORE).put('{P8-damaged',c.MANUAL_ENTRY);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  db.close();
 });
 await go('history');
 await history.locator('[data-history-unconnected="true"]').waitFor();
 const unavailable=await history.locator('.stage').innerText();
 assert.match(unavailable,/保存した履歴をこの画面では確認できません/);
 assert.doesNotMatch(unavailable,/保存した記録はまだありません/);
 assert.equal(await history.locator('.entry').count(),0);
 const damaged=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const result=await c.refresh();
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open(c.MANUAL_DB,1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  const raw=await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readonly');
   const req=tx.objectStore(c.MANUAL_STORE).get(c.MANUAL_ENTRY);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  db.close();return {ok:result.ok,raw};
 });
 assert.equal(damaged.ok,false,'corrupt canonical must fail closed');
 assert.equal(damaged.raw,'{P8-damaged','app may not silently overwrite invalid raw data');
 // Saving must also fail closed; do not initialize an empty envelope or
 // overwrite corrupt authoritative data under a misleading zero-record state.
 const refused=await page.evaluate(async()=>{
  const [c,m]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const result=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-10-29',distance:'3',hours:'',minutes:'18',seconds:'',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',
   rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   courseName:'',shoeName:'',memo:'P8-FAIL-SAVE-SENTINEL'
  }));
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(c.MANUAL_DB,1);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const raw=await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readonly');
   const request=tx.objectStore(c.MANUAL_STORE).get(c.MANUAL_ENTRY);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  return {ok:result.ok,reason:result.reason,raw};
 });
 assert.equal(refused.ok,false,'corrupt canonical must reject subsequent save');
 assert.match(refused.reason,/読み取れません|保存領域|確認できません/);
 assert.equal(refused.raw,'{P8-damaged','failed save must not overwrite corrupted source');
 await evidence('read-failure');if(width===390)await evidence('read-failure',{scaled:true});
 // 6. Explicit test fixture repair and revisit; no automatic migration.
 const recovered=await page.evaluate(async valid=>{
  const c=await import('/ui/manualRunCanonical.js');
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open(c.MANUAL_DB,1);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readwrite');
   tx.objectStore(c.MANUAL_STORE).put(valid,c.MANUAL_ENTRY);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  db.close();return (await c.refresh()).ok;
 },deleted.raw);
 assert.equal(recovered,true,'restoration of validated bytes must work');
 await page.reload({waitUntil:'networkidle'});
 await history.locator('[data-history-unconnected="false"]').waitFor();
 assert.match(await history.locator('.stage').innerText(),/保存した記録はまだありません/);
 await evidence('recovered-empty');
 await ctx.close();
 const cases=results.map(r=>r.caseId+(r.scaled?':200%':''));
 await writeFile(resolve(output,engine+'-'+width+'-abnormal.json'),
  JSON.stringify({source_sha:process.env.GITHUB_SHA||'',scope:'P8_actual_IDB_abnormal_UI_not_device_acceptance',
   engine,width,cases,results},null,2));
 console.log('PASS P8 ABNORMAL '+JSON.stringify({engine,width,cases}));
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
