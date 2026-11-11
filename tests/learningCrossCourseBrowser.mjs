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
 const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(p!==root&&!p.startsWith(root+sep))throw Error('invalid path');
 const file=p===root?resolve(root,'index.html'):p;
 res.setHeader('content-type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
const cases=[
 {id:'pace-basics',selector:'#lr-explore',key:'distance-time-pace',title:'平均ペースと区間ペース',noRecord:true},
 {id:'running-motion-basics',selector:'#lm-explore',key:'body-movement',title:'走るときの脚の動き',noRecord:false},
 {id:'effort-fatigue-recovery',selector:'#lf-explore',key:'fatigue-reading',title:'走っているときのきつさ・疲労感・休養',noRecord:true},
 {id:'record-origin-missing',selector:'#lo-explore',key:'distance-time-pace',title:'記録の出所・欠測・後日申告',noRecord:true}
];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/learning',{waitUntil:'networkidle'});
  await page.locator('.lr-page-heading').waitFor({timeout:20000});
  await page.locator('.lr-screen-help>summary').click();
  const card=await page.locator('.lr-screen-help-content').textContent();
  assert.match(card,/走る速さ/);assert.match(card,/身体の動き/);assert.match(card,/疲労感/);
  const runs=await page.evaluate(async()=>{
   const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const ready=await c.refresh();if(!ready.ok)return ready;
   const make=(date,distance,minutes,rofBefore)=>({
    date,distance,hours:'',minutes,seconds:'',rofBefore,rofAfter:null,
    steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',memo:'',shoeName:'',courseName:''
   });
   const prior=await c.mutate(s=>m.saveManualRun(s,make('2026-11-04','4','28',2)));
   const later=await c.mutate(s=>m.saveManualRun(s,make('2026-11-08','6','33',0)));
   const snap=await c.readCanonical();
   return {ok:prior.ok&&later.ok&&snap.ok,prior:prior.record?.id,later:later.record?.id,raw:snap.raw,reason:prior.reason||later.reason};
  });
  assert.equal(runs.ok,true,runs.reason);
  assert.ok(runs.prior&&runs.later);
  // Control: ordinary legacy exploration without entry=learning retains the historic latest-run preview.
  await page.goto(base+'#/exploration-tree?category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
  await page.locator('[data-ex-learning="distance-time-pace"]').waitFor();
  assert.match(await page.locator('[data-ex-learning="distance-time-pace"]').innerText(),/最新の保存済み走行/);
  assert.match(await page.locator('[data-ex-learning="distance-time-pace"]').innerText(),/6\.00/);
  assert.equal(await page.locator('[data-ex-learning-entry]').count(),0);
  for(const example of cases){
   await page.goto(base+'#/learning?lesson='+example.id,{waitUntil:'networkidle'});
   await page.locator('.lr-chapter:has('+example.selector+') > summary').click();
   await page.locator(example.selector+' a[href^="#/exploration-tree"]').waitFor({timeout:15000});
   assert.match(await page.locator('.lr-lesson-title').innerText(),new RegExp(example.title));
   const link=await page.locator(example.selector+' a[href^="#/exploration-tree"]').getAttribute('href');
   assert.match(link,/entry=learning/);
   assert.doesNotMatch(link,/record=|source=|gps=/);
   await page.locator(example.selector+' a[href^="#/exploration-tree"]').click();
   await page.locator('[data-ex-learning-entry]').waitFor({timeout:15000});
   const query=await page.evaluate(()=>{const p=new URLSearchParams(location.hash.split('?')[1]);return {entry:p.get('entry'),hasRecord:p.has('record')};});
   assert.equal(query.entry,'learning');
   assert.equal(query.hasRecord,false);
   assert.equal(await page.locator('.ex-record-return').count(),0);
   await page.locator('[data-ex-learning="'+example.key+'"]').waitFor({timeout:15000});
   const text=await page.locator('[data-ex-learning="'+example.key+'"]').innerText();
   assert.doesNotMatch(text,/最新の保存済み走行|保存済み走行：2026-11-08|6\.00 km、経過時間/);
   assert.doesNotMatch(text,/運動前 0 ／ 運動後/);
   if(example.noRecord)assert.equal(await page.locator('[data-ex-no-auto-record]').count(),1);
   const raw=await page.evaluate(async()=>{const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw;});
   assert.equal(raw,runs.raw,'learning-origin inquiry must not modify saved runs');
   assert.deepEqual(errors,[],'browser errors '+example.id+' '+width);
  }
  // Explicit typed run choice always wins, including if entry=learning appears.
  await page.goto(base+'#/exploration-tree?source=manual&record='+encodeURIComponent(runs.prior)+
   '&category=01&topic='+encodeURIComponent('距離・時間・ペース')+'&entry=learning',{waitUntil:'networkidle'});
  await page.locator('.ex-record-return').waitFor({timeout:15000});
  assert.equal(await page.locator('[data-ex-learning-entry]').count(),0);
  assert.match(await page.locator('[data-ex-learning="distance-time-pace"]').innerText(),/4\.00/);
  assert.doesNotMatch(await page.locator('[data-ex-learning="distance-time-pace"]').innerText(),/最新の保存済み走行/);
  const notes=await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1'));
  assert.equal(notes,null,'route changes cannot create personal notes');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'L6-CROSS-COURSE',browser:engineName,width,status:'PASS',savedRuns:2,topicLinks:4,explicitRefPreserved:true}));
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
