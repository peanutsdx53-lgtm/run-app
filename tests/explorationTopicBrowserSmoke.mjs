/** Browser-level editorial-stage smoke: screenshots, saved context, offline guide and note, 320/390/1440. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');const file=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
 catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4196,'127.0.0.1',done));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:850},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const prefix=`exploration-theme-${engine===webkit?'webkit':'chromium'}-${width}`;

  // E1 T02 - unlinked inquiry works on mobile and desktop, with old memo CRUD.
  await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=01&topic='+encodeURIComponent('自分が感じた疲れ'),{waitUntil:'networkidle'});
  const t02=page.locator('[data-e-inquiry="T02"]');
  await t02.waitFor({timeout:12000});
  assert.equal(await t02.getAttribute('data-e-state'),'NO_RECORD');
  assert.match(await t02.innerText(),/走行記録を指定していません/);
  assert.match(await t02.innerText(),/実際の評価時刻/);
  assert.doesNotMatch(await t02.innerText(),/運動前 0/);
  await page.locator('.ex-learning [data-ex-action="note"]').click();
  assert.equal(await page.locator('#ex-note').count(),1);
  await page.locator('.ex-dialog [data-ex-action="close"]').click();

  // Actual keyboard operation, focus restoration, and 200% enlarged T02 card.
  const inquiryButton=page.locator('.ex-learning [data-ex-action="note"]');
  assert.equal(await inquiryButton.evaluate(el=>document.activeElement===el),true,'modal close restores T02 focus');
  await page.keyboard.press('Enter');
  await page.locator('#ex-note').waitFor({timeout:10000});
  await page.keyboard.press('Escape');
  assert.equal(await inquiryButton.evaluate(el=>document.activeElement===el),true,'Escape restores T02 focus');
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  const zoom=await page.locator('.ex-learning').evaluate(el=>{
   const button=el.querySelector('[data-ex-action="note"]');
   const a=el.getBoundingClientRect(),b=button.getBoundingClientRect();
   return {client:el.clientWidth,scroll:el.scrollWidth,buttonLeft:b.left,buttonRight:b.right,cardLeft:a.left,cardRight:a.right,
    questionVisible:el.textContent.includes('走る前後の疲れを、自分ではどのように感じましたか？')};
  });
  assert.ok(zoom.scroll<=zoom.client+2&&zoom.buttonLeft>=zoom.cardLeft-2&&
   zoom.buttonRight<=zoom.cardRight+2&&zoom.questionVisible,
   '200% enlarged inquiry must fit without clipped action at width '+width+': '+JSON.stringify(zoom));
  await page.evaluate(()=>{document.documentElement.style.fontSize='';});


  // The weather-specific private inquiry belongs inside the chosen theme, never above the category picker.
  await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=03&topic='+encodeURIComponent('気温・天候'),{waitUntil:'networkidle'});
  await page.locator('.ex-observation-guide [data-e-condition-inquiry="T05"]').waitFor();
  const order=await page.evaluate(()=>{
   const root=document.querySelector('.ex-page');
   const picker=root.querySelector('.ex-switch'),selected=root.querySelector('.ex-focus');
   const inquiry=root.querySelector('[data-e-condition-inquiry="T05"]');
   return {inside:selected.contains(inquiry),afterPicker:!!(picker.compareDocumentPosition(inquiry)&Node.DOCUMENT_POSITION_FOLLOWING),
    openingQuestion:selected.querySelector('.ex-inquiry-start h3')?.textContent,
    sourceState:inquiry.getAttribute('data-e-state'),
    prompts:selected.querySelectorAll('.ex-inquiry-start h3').length};
  });
  assert.equal(order.inside,true,'weather inquiry is integrated into the selected area');
  assert.equal(order.afterPicker,true,'dedicated inquiry is not inserted above navigation');
  assert.equal(order.sourceState,'NO_RECORD','no weather report is inferred');
  assert.equal(order.prompts,1,'only one introductory question');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-weather-inquiry.png'),fullPage:true});
  await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ'),{waitUntil:'domcontentloaded'});
  await page.locator('.ex-observation-guide').waitFor();
  // Browser check: no mid-word split or clipping on 320/390/1440 and Chromium/WebKit.
  const purpose=await page.locator('[data-ex-category="07"] .ex-node-title').evaluate(el=>{
   const chunks=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE);
   const rectangles=chunks.map(n=>{const r=document.createRange();r.selectNodeContents(n);return [...r.getClientRects()].filter(x=>x.width>0);});
   const map=el.closest('.ex-map').getBoundingClientRect();
   return {parts:chunks.map(n=>n.textContent),fragments:rectangles.map(a=>a.length),fits:rectangles.every(a=>a.every(r=>r.left>=map.left-2&&r.right<=map.right+2))};
  });
  assert.deepEqual(purpose.parts,['目的と','楽しみ方'],'purpose label words '+width);
  assert.deepEqual(purpose.fragments,[1,1],'purpose label must not split a word '+width);
  assert.equal(purpose.fits,true,'purpose label must not clip '+width);
  const guide=await page.locator('.ex-observation-guide').innerText();
  assert.match(guide,/観察ガイド/);assert.match(guide,/専門解説は出典審査前/);
  assert.match(guide,/情報の出所と読み取れる範囲/);assert.match(guide,/気づきを残す/);
  const dimensions=await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,inner:innerWidth,panels:[...document.querySelectorAll('.ex-inquiry-stage')].map(el=>({w:el.getBoundingClientRect().width,scroll:el.scrollWidth}))}));
  assert.ok(dimensions.body<=width+2&&dimensions.html<=width+2,'page has no horizontal overflow: '+JSON.stringify(dimensions));
  for(const cell of dimensions.panels)assert.ok(cell.scroll<=cell.w+2&&cell.w>140,'card content fits: '+JSON.stringify(cell));
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-observation-guide.png'),fullPage:true});
  await page.locator('.ex-learning [data-ex-action="learn-help"]').click();
  await page.locator('.ex-dialog').waitFor();
  assert.match(await page.locator('.ex-dialog').innerText(),/科学的な解説としての出典審査はまだ完了していません/);
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'close','opening modal moves focus inside');
  // Only one interactive control on this unreviewed theme: Tab must not leave the dialog.
  for(let n=0;n<3;n++){
   await page.keyboard.press(n===1?'Shift+Tab':'Tab');
   assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('.ex-dialog')),true,'Tab remains inside inquiry dialog');
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.ex-dialog').count(),0,'Escape closes dialog');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'learn-help','focus returns to source button');
  await page.keyboard.press('Enter');
  await page.locator('.ex-dialog').waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'close','keyboard can reopen modal');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-source-status.png'),fullPage:true});
  await page.locator('.ex-dialog [data-ex-action="close"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'learn-help','click close restores focus');
  if(width===390){
   for(const entry of [
    {category:'02',topic:'12部位の参考値の見方',expected:'測定量・適用条件は部位ごとに異なります'},
    {category:'01',topic:'自分が感じた疲れ',expected:'日本語版ROF-Jは大学生85人'},
    {category:'02',topic:'足・膝・股関節',expected:'習慣的に走る28人'},
    {category:'03',topic:'上り坂・下り坂',expected:'成人19人'},
    {category:'01',topic:'過去の走りとの比較',expected:'質的に調べました'},
    {category:'01',topic:'気付きと次の確認',expected:'中断・再開'},
    {category:'07',topic:'自分に合う記録の使い方',expected:'中断・再開'},
    {category:'05',topic:'睡眠',expected:'専門家コンセンサス'}
   ]){
    await page.goto('http://127.0.0.1:4196/#/exploration-tree?category='+entry.category+'&topic='+encodeURIComponent(entry.topic),{waitUntil:'domcontentloaded'});
    await page.locator('.ex-knowledge-reference summary').click();
     await page.locator('.ex-learning [data-ex-action="learn-help"]').click();
    await page.locator('.ex-dialog').waitFor();
    const help=await page.locator('.ex-dialog').innerText();
    assert.ok(help.includes(entry.expected),entry.topic+' accurate provenance');
    if(entry.topic==='上り坂・下り坂')assert.match(help,/傾斜角0・±5・±10度/);
    if(entry.topic!=='12部位の参考値の見方')assert.match(help,/研究の対象・使える範囲/);
    assert.doesNotMatch(help,/このテーマは距離と経過時間による算術上の定義を説明します/);
    if(entry.topic==='上り坂・下り坂'){
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'close');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement?.closest('.ex-dialog')?.tagName),'SECTION','backward Tab stays in sourced modal');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.exAction),'close','Tab cycles back to the close button');
    }
    await page.screenshot({path:resolve(root,'screenshots',prefix+'-source-'+entry.category+'.png'),fullPage:true});
   }
   await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ'),{waitUntil:'domcontentloaded'});
   await page.locator('.ex-observation-guide').waitFor();
  }
  await page.locator('.ex-learning [data-ex-action="note"]').click();
  await page.locator('#ex-note').fill('次は走る前の気持ちを記録する');
  await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
  await page.waitForFunction(()=>{
   const raw=localStorage.getItem('runload-v2-exploration-notes-v1');
   if(!raw)return false;
   try{return JSON.parse(raw)?.length===1}catch{return false}
  },null,{timeout:15000});
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')));
  assert.equal(record.length,1);assert.equal(record[0].topicId,'practice-warmup');
  await page.locator('[data-ex-action="memories"]').click();
  await page.locator('[data-ex-edit]').click();
  await page.locator('#ex-note-edit').fill('以前の問いを見直し、次は走り始める前の気持ちも記録する');
  await page.locator('[data-ex-action="save-edited-note"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]')[0]?.revisions?.length===1);
  const edited=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1'))[0]);
  assert.equal(edited.id,record[0].id);
  assert.equal(edited.revisions[0].text,'次は走る前の気持ちを記録する');
  await page.locator('[data-ex-action="close"]').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.ex-note-preview').waitFor();
  assert.match(await page.locator('.ex-note-preview').innerText(),/以前の問いを見直し、次は走り始める前の気持ちも記録する/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-saved-guide.png'),fullPage:true});
  if(engine===chromium&&width===390){
   // HTTP loopback QA registers the worker explicitly (the live app uses HTTPS).
   await page.evaluate(async()=>{
    await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    await navigator.serviceWorker.ready;
   });
   await page.waitForTimeout(200);
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('.ex-observation-guide').waitFor();
   assert.match(await page.locator('.ex-observation-guide').innerText(),/観察ガイド/);
   assert.match(await page.locator('.ex-note-preview').innerText(),/以前の問いを見直し、次は走り始める前の気持ちも記録する/);
   await page.screenshot({path:resolve(root,'screenshots',prefix+'-offline-guide.png'),fullPage:true});
  }
  assert.deepEqual(errors,[],prefix+' browser errors');
  await context.close();
 }

 // M7 T-005, release-before-first-use: no saved running records at all.
 // A general inquiry and the legacy standalone memo still work in that state.
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4196/#/exploration-tree',{waitUntil:'networkidle'});
  const empty=await page.evaluate(async()=>{
   const canonical=await import('/ui/manualRunCanonical.js');
   const r=await canonical.readCanonical();
   return {ok:r.ok,count:r.read?.records?.length,rawLength:r.raw?.length};
  });
  assert.equal(empty.ok,true,'T-005 canonical data must be accessible');
  assert.equal(empty.count,0,'T-005 must begin with zero saved running records');
  await page.locator('[data-ex-category="01"]').click();
  const stepper=page.locator('.ex-topic-stepper');
  await stepper.locator('[data-ex-topic-step="-1"]').waitFor();
  assert.equal(await stepper.locator('[data-ex-topic-step="-1"]').isDisabled(),true);
  await stepper.locator('[data-ex-topic-step="1"]').click();
  assert.equal((await page.locator('.ex-topic-position').innerText()).startsWith('2 / '),true);
  assert.equal(await page.locator('.ex-topic.is-picked').count(),1);
  await stepper.locator('[data-ex-topic-step="-1"]').click();
  assert.equal((await page.locator('.ex-topic-position').innerText()).startsWith('1 / '),true);
  assert.equal(await stepper.locator('[data-ex-topic-step="-1"]').isDisabled(),true);
  const topic=page.locator('[data-ex-learning="distance-time-pace"]');
  await topic.waitFor({timeout:20000});
  assert.match(await topic.innerText(),/保存済みの走行はまだありません/,'explicit zero-record state');
  assert.match(await topic.innerText(),/記録を手がかりにする/,'personal inquiry remains available');
  await topic.locator('[data-ex-action="note"]').click();
  assert.match(await page.locator('.ex-dialog').innerText(),/走行記録には自動で関連づけません/);
  await page.locator('#ex-note').fill('記録はまだないけれど、次回は自分の感じ方を確かめたい');
  await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
  await page.waitForFunction(()=>{
   try{return JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===1;}catch{return false;}
  });
  const note=await page.evaluate(()=>{
   const arr=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
   return arr[0]||null;
  });
  assert.ok(note,'T-005 must save a standalone note');
  assert.equal(Object.hasOwn(note,'recordId'),false,'no inferred saved-run link');
  assert.match(note.text,/記録はまだないけれど/);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-ex-action="memories"]').click();
  assert.match(await page.locator('.ex-dialog').innerText(),/単独メモ/,'standalone note survives reload');
  assert.match(await page.locator('.ex-dialog').innerText(),/次回は自分の感じ方を確かめたい/);
  const stillEmpty=await page.evaluate(async()=>{
   const canonical=await import('/ui/manualRunCanonical.js');
   const r=await canonical.readCanonical();
   return r.ok?r.read.records.length:-1;
  });
  assert.equal(stillEmpty,0,'writing a legacy note never silently creates a run');
  assert.deepEqual(errors,[],'T-005 no SPA errors');
  console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-005',engine:engine===webkit?'webkit':'chromium',status:'PASS',savedRuns:0,standaloneNoteId:note.id}));
  await context.close();
 }

 // E2 T08 end-to-end: two real authoritative IDB runs, explicit pair, and
 // legacy note bound only to the selected/current run, not the earlier one.
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:4196/';
  await page.goto(base+'#/exploration-tree',{waitUntil:'networkidle'});
  const saved=await page.evaluate(async()=>{
   const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const ready=await c.refresh();if(!ready.ok)return ready;
   const make=(date,distance,minutes,rofBefore)=>({
    date,distance,hours:'',minutes,seconds:'',rofBefore,rofAfter:null,
    steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',memo:'',shoeName:'',courseName:''
   });
   const earlier=await c.mutate(s=>m.saveManualRun(s,make('2026-11-04','4','28',2)));
   const current=await c.mutate(s=>m.saveManualRun(s,make('2026-11-08','6','33',0)));
   const r=await c.readCanonical();
   return {ok:earlier.ok&&current.ok&&r.ok,earlier:earlier.record?.id,
    current:current.record?.id,original:r.raw,reason:earlier.reason||current.reason};
  });
  assert.equal(saved.ok,true,saved.reason);
  await page.reload({waitUntil:'networkidle'});
  const topic=encodeURIComponent('過去の走りとの比較');
  // Prior pair must be user-selected in the result: no default picker inference.
  await page.goto(base+'#/result?record='+encodeURIComponent(saved.current)+'&view=compare',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#runload-result-v4 .rv4-next-path').count(),0,
   'results no longer duplicate the permanent Explore navigation');
  await page.goto(base+'#/result?record='+encodeURIComponent(saved.current)+
   '&compare='+encodeURIComponent(saved.earlier)+'&view=compare',{waitUntil:'networkidle'});
  // T08 still requires an explicitly chosen earlier record. Never infer it
  // from the result tab merely because the separate Explore CTA was removed.
  assert.equal(await page.locator('#runload-result-v4 .rv4-history .rv4-learn-link').count(),0);
  await page.goto(base+'#/exploration-tree?source=manual&record='+encodeURIComponent(saved.current)+
   '&category=01&topic='+topic+'&compare='+encodeURIComponent(saved.earlier),{waitUntil:'networkidle'});
  const q=page.locator('[data-e-inquiry="T08"]');
  await q.waitFor({timeout:20000});
  assert.equal(await q.getAttribute('data-e-state'),'READY');
  assert.match(await q.innerText(),/2026-11-04/);
  assert.match(await q.innerText(),/2026-11-08/);
  assert.match(await q.innerText(),/文献参考値|同一部位/);
  assert.match(await q.innerText(),/実際の走行順を証明しません/);
  assert.match(await page.locator('.ex-inquiry-start').innerText(),/二つの走行で、印象に残る違いはありましたか/);
  // A real note is linked to the current manual parent only.
  assert.equal(await q.locator('[data-ex-action="note"]').count(),0,
   'T08 must not duplicate the existing optional memo control');
  await page.locator('.ex-learning [data-ex-action="note"]').click();
  await page.locator('#ex-note').fill('E2：コースの条件を見直したい。理由はまだ分からない。');
  await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===1);
  const after=await page.evaluate(async()=>{
   const c=await import('/ui/manualRunCanonical.js');
   const r=await c.readCanonical(),notes=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
   return {ok:r.ok,raw:r.raw,notes};
  });
  assert.equal(after.ok,true);
  assert.equal(after.raw,saved.original,'T08 note never modifies either saved parent');
  assert.equal(after.notes[0].recordId,saved.current,'note relates only to current run');
  assert.notEqual(after.notes[0].recordId,saved.earlier,'never binds to the other run');
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const reflow=await q.evaluate(el=>({
    inner:innerWidth,scroll:el.scrollWidth,client:el.clientWidth,
    left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,
    documentScroll:document.documentElement.scrollWidth}));
   assert.ok(reflow.scroll<=reflow.client+2&&reflow.documentScroll<=width+2,
    'T08 200% reflow '+width+' '+JSON.stringify(reflow));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  const assertState=async expected=>{
   await page.waitForFunction(value=>document.querySelector('[data-e-inquiry="T08"]')
    ?.getAttribute('data-e-state')===value,expected,{timeout:20000});
   assert.equal(await q.getAttribute('data-e-state'),expected);
  };
  const route=base+'#/exploration-tree?source=manual&record='+encodeURIComponent(saved.current)+
   '&category=01&topic='+topic;
  await page.goto(route,{waitUntil:'networkidle'});
  await assertState('NEED_SELECTION');
  assert.equal(await q.locator('[data-ex-action="note"]').count(),0,
   'unselected pair has no pair-specific memo action');
  await page.goto(route+'&compare='+encodeURIComponent(saved.current),{waitUntil:'networkidle'});
  await assertState('INELIGIBLE');
  await page.goto(route+'&compare='+encodeURIComponent('run-v1-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),{waitUntil:'networkidle'});
  await assertState('MISSING');
  assert.doesNotMatch(await q.innerText(),/2026-11-04/);
  await page.goto(route+'&compare='+encodeURIComponent(saved.earlier)+'&compare='+encodeURIComponent(saved.earlier),{waitUntil:'networkidle'});
  await assertState('UNVERIFIED');
  await page.goto(base+'#/exploration-tree?category=01&topic='+topic,{waitUntil:'networkidle'});
  await assertState('NO_RECORD');
  assert.deepEqual(errors,[],'E2 inquiry routes cause no browser errors');
  console.log(JSON.stringify({gate:'E2-inquiry',caseId:'E-T08',engine:engine===webkit?'webkit':'chromium',
   status:'PASS',manualPair:true,explicitSelection:true,noAutoReplace:true,legacyNotesPreserved:true}));
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('Exploration editorial browser smoke PASSED');
