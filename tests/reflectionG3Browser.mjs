/** G3 exact-record reflection re-visit, correction, history and orphan safety. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','g3-reflection-'+engine);
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep))throw Error('outside repo');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',types[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(out,{recursive:true});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const cases=[[320,'ja',200],[390,'ja',100],[390,'en',200],[1440,'en',100]];
const successes=[],failures=[];
try{
 for(const [width,language,zoom] of cases){
  const ctx=await browser.newContext({viewport:{width,height:width>1000?900:844},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  let stage='boot';
  try{
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.evaluate(async lang=>{
    const {LEGAL_VERSION}=await import('/ui/legalDocuments.js');
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
    localStorage.setItem('runload-v2-legal-consent-v1',JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:'2026-11-17T00:00:00Z',termsVersion:LEGAL_VERSION,privacyVersion:LEGAL_VERSION}));
   },language);
   await page.goto(origin+'#/home',{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});
   const [savedId,otherId]=await page.evaluate(async()=>{
    const canonical=await import('/ui/manualRunCanonical.js'),store=await import('/ui/manualRunStore.js');
    const init=await canonical.initialize();if(!init.ok)throw Error(init.reason||'initialize failed');
    const save=async km=>{
     const x=await canonical.mutate(s=>store.saveManualRun(s,{date:'2026-11-15',distance:String(km),hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN'}));
     if(!x.ok)throw Error(x.reason||'save failed');return x.record.id;
    };
    const a=await save(6),b=await save(7),orphan='run-v1-00000000-0000-4000-8000-999999999999';
    const createdAt='2026-11-17T11:00:00.000Z';
    const notes=[
     {id:'g3-note-a',category:'01',topicId:'voluntary-reflection',recordId:a,text:'NOTE_FOR_EXACT_A',createdAt},
     {id:'g3-old-a',category:'01',recordId:a,text:'LEGACY_NO_TOPIC_FOR_A',createdAt},
     {id:'g3-note-b',category:'01',topicId:'voluntary-reflection',recordId:b,text:'OTHER_RUN_B_PRIVATE',createdAt},
     {id:'g3-free',category:'03',text:'UNLINKED_OLD_NOTE',createdAt},
     {id:'g3-missing',category:'01',recordId:orphan,text:'ORPHAN_NO_PARENT',createdAt}
    ];
    localStorage.setItem('runload-v2-exploration-notes-v1',JSON.stringify(notes));
    return [a,b];
   });
   stage='open result';
   await page.goto(origin+'#/result?record='+encodeURIComponent(savedId),{waitUntil:'networkidle'});
   const summary=page.locator('[data-result-reflection-count]'),review=page.locator('[data-result-review-notes]');
   await summary.waitFor({state:'visible'});
   if(zoom===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
   await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
   assert.equal(await page.locator('#runload-result-v4 [data-tab]').count(),3,'three result tabs unchanged');
   assert.match(await summary.innerText(),/2/,'selected A has two linked notes including legacy');
   assert.ok(await review.isVisible(),'saved note link exists');
   const rect=await review.boundingBox();assert.ok(rect&&rect.height>=43&&rect.x>=-1&&rect.x+rect.width<=width+2,'revisit link reachable');
   assert.ok(!(await page.locator('#runload-result-v4').innerText()).includes('OTHER_RUN_B_PRIVATE'),'no private note body in Result');
   await page.screenshot({path:resolve(out,engine+'-'+language+'-'+width+'-'+zoom+'-result.png'),fullPage:true,animations:'disabled'});
   stage='open review from result';
   await review.click();
   await page.waitForURL(u=>u.hash.includes('memories=1'));
   stage='await explicit run-scoped memory dialog';
   const modal=page.locator('.ex-dialog');await modal.waitFor({state:'visible'});
   assert.match(await modal.innerText(),/NOTE_FOR_EXACT_A/);
   assert.match(await modal.innerText(),/LEGACY_NO_TOPIC_FOR_A/);
   assert.ok(!(await modal.innerText()).includes('OTHER_RUN_B_PRIVATE'),'B must not leak into run A dialog');
   assert.ok(!(await modal.innerText()).includes('UNLINKED_OLD_NOTE'),'unlinked must not be reattached to A');
   assert.ok(!(await modal.innerText()).includes('ORPHAN_NO_PARENT'),'orphan must not be rebound to A');
   stage='edit same-run memo';
   await page.locator('[data-ex-edit="g3-note-a"]').click();
   const relation=page.locator('[data-ex-note-relation]');
   await relation.waitFor({state:'visible'});
   await page.waitForFunction(lang=>document.querySelector('[data-ex-note-relation]')?.innerText.includes(lang==='en'?'Linked activity:':'関連する走行記録：'),language);
   assert.equal(await relation.locator('time').innerText(),'2026-11-15');
   const editText=await modal.innerText();
   assert.ok(!editText.includes(savedId)&&!editText.includes(otherId)&&!editText.includes('g3-note-a'),'internal identifiers are never visible in note editor');
   assert.doesNotMatch(editText,/元の走行ID|メモID|Original Run ID|Note ID/i);
   await page.screenshot({path:resolve(out,engine+'-'+language+'-'+width+'-'+zoom+'-note-edit.png'),fullPage:true,animations:'disabled'});
   await page.locator('#ex-note-edit').fill('A_REVISED_BY_THE_USER');
   await page.locator('[data-ex-action="save-edited-note"]').click();
   await page.waitForFunction(id=>{
    try{const n=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').find(n=>n.id==='g3-note-a');return n?.recordId===id&&n?.text==='A_REVISED_BY_THE_USER'&&n.revisions?.[0]?.text==='NOTE_FOR_EXACT_A'}catch{return false}
   },savedId);
   await page.locator('[data-ex-action="close"]').click();
   await page.locator('.ex-record-return a[href^="#/result?record="]').click();
   await page.waitForURL(u=>u.hash.startsWith('#/result?record='));
   await summary.waitFor({state:'visible'});
   assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('record'),savedId,'exact same result after edit');
   assert.match(await summary.innerText(),/2/);
   stage='open history';
   await page.goto(origin+'#/history',{waitUntil:'networkidle'});
   const chosen=page.locator('[data-select-id="'+savedId+'"]');await chosen.waitFor({state:'visible'});await chosen.click();
   const historyNotes=page.locator('[data-history-reflection-count]');await historyNotes.waitFor({state:'visible'});
   assert.match(await historyNotes.innerText(),/2/);
   const historyText=await page.locator('#runload-history-v2').innerText();
   assert.ok(!historyText.includes('OTHER_RUN_B_PRIVATE')&&!historyText.includes('A_REVISED_BY_THE_USER'),'history never auto-discloses memo body');
   stage='open review from history';
   await page.locator('[data-open-reflections]').click();
   await page.locator('.ex-dialog').waitFor({state:'visible'});
   assert.match(await page.locator('.ex-dialog').innerText(),/A_REVISED_BY_THE_USER/);
   assert.ok(!(await page.locator('.ex-dialog').innerText()).includes('OTHER_RUN_B_PRIVATE'));
   // User can explicitly view all historical notes from general inquiry; missing parents retain identity.
   stage='open global all-notes view';
   await page.goto(origin+'#/exploration-tree?category=01&topic='+encodeURIComponent('気付きと次の確認')+'&memories=1',{waitUntil:'networkidle'});
   await page.locator('.ex-dialog').waitFor({state:'visible'});
   const all=await page.locator('.ex-dialog').innerText();
   assert.match(all,/OTHER_RUN_B_PRIVATE/);assert.match(all,/UNLINKED_OLD_NOTE/);assert.match(all,/ORPHAN_NO_PARENT/);
   assert.deepEqual(errors,[],'no browser runtime exception');
   successes.push({width,language,zoom,selectedRunOnly:true,legacyVisible:true,revisionKept:true,historyLinked:true,orphanNotRebound:true});
  }catch(e){
   const context=await page.evaluate(()=>({hash:location.hash,explore:!!document.querySelector('.ex-page'),dialog:!!document.querySelector('.ex-dialog'),invalid:document.querySelector('[data-ex-inquiry-error]')?.innerText||'',text:(document.querySelector('#app')?.innerText||'').slice(0,600)})).catch(()=>null);
   failures.push({width,language,zoom,stage,context,error:String(e)});
  }finally{await ctx.close();}
 }
}finally{await writeFile(resolve(out,'summary.json'),JSON.stringify({engine,successes,failures},null,2));await browser.close();await new Promise(done=>server.close(done))}
assert.deepEqual(failures,[],'G3 saved reflection revisit browser failures');
console.log('G3 '+engine+' '+successes.length+' saved note review round trips PASS');
