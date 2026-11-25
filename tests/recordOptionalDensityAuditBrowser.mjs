import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),p=resolve(root,'.'+name);
 if(p!==root&&!p.startsWith(root+sep))throw Error('traversal');
 const f=p===root?resolve(root,'index.html'):p;res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
}catch{res.statusCode=404;res.end('not found');}});
await new Promise(ok=>server.listen(4362,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','record-optional-density');await mkdir(out,{recursive:true});
const host='http://127.0.0.1:4362/#/',report=[];let activeLanguage='ja';
async function take(page,w,id){
 if(activeLanguage==='en')await page.waitForTimeout(200);
 const m=await page.evaluate(()=>{
  const els=[...document.querySelectorAll('.rv-panel,.cx-main-card,.cx-field-card,.cx-transfer,.cx-toolbar,.cx-selected-chip,.rv-section-row,.e4-panel,.g4-panel,.rv4-card')];
  // Restricted to generated UI, excluding user-entered course names, free
  // text, transferred environmentNote and saved body observations.
  const bodyTextClipping=[];
  for(const el of document.querySelectorAll('.cx-header h1,.cx-context-action')){
   if(!el.getClientRects().length)continue;
   const outer=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    if(!walker.currentNode.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    for(const r of range.getClientRects()){
     if(r.width>0&&(r.left<outer.left-2||r.right>outer.right+2||
       r.top<outer.top-2||r.bottom>outer.bottom+2)){
      bodyTextClipping.push({parent:el.className||el.tagName,text:walker.currentNode.textContent.trim(),
       textBox:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},
       container:{left:outer.left,right:outer.right,top:outer.top,bottom:outer.bottom}});
     }
    }
   }
  }
  const systemNodes=[
   '.rv-section-progress','.rv-section-row-head strong','.rv-section-row-head small',
   '.rv-section-row-head button','.rv-section-fields label',
   '[data-rv-add]','[data-rv-surface-total]',
   '.rv-surface-fine .rv-fine-top strong','[data-rv-summary-surface]',
   '[data-g4-source]','[data-g4-format]','[data-g4-summary-steps]',
   '[data-g4-summary-format]','[data-g4-run-text]','[data-g4-other]',
   '[data-e4-weather]','[data-e4-flag]','[data-e4-summary]',
   '[data-selected-expand]','.cx-context-action','.cx-picker-option',
   '.rr-row[data-review-link="record-compare"] .rr-row-desc',
   '.rr-row[data-review-link="record-rof"] .rr-row-desc'
  ];
  const visibleSystemText=el=>{
   const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),bits=[];
   while(walk.nextNode()){
    const t=walk.currentNode,p=t.parentElement;
    if(p?.closest('select,option,textarea,input,[data-user-authored],[hidden],[aria-hidden="true"]'))continue;
    if(p?.getClientRects().length&&t.textContent.trim())bits.push(t.textContent.trim());
   }
   return bits.join(' ').slice(0,130);
  };
  const systemResidue=systemNodes.flatMap(selector=>[...document.querySelectorAll(selector)]
   .filter(el=>!el.closest('[hidden]')&&el.getClientRects().length)
   .map(el=>({selector,text:visibleSystemText(el)}))
   .filter(item=>/[ぁ-ゟァ-ヿ一-龯]/.test(item.text)));
  const fields=[...document.querySelectorAll('textarea,input[maxlength]')].map(e=>({name:e.id||e.dataset.draft,limit:e.maxLength,length:e.value.length,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   pageHeight:document.documentElement.scrollHeight,cardCount:els.length,
   selectedRegions:document.querySelectorAll('.cx-selected-chip').length,
   systemResidue,bodyTextClipping,
   nodes:els.map(e=>{const r=e.getBoundingClientRect();return {className:String(e.className),left:r.left,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}}),
   counters:[...document.querySelectorAll('.cx-counter')].map(e=>e.textContent),fields,
   textareaVisibleRatios:fields.filter(x=>x.scrollHeight>0&&x.clientHeight>0)
    .map(x=>({name:x.name,visibleFraction:Math.min(1,Number((x.clientHeight/x.scrollHeight).toFixed(3)))}))};
 });
 report.push({engine,language:activeLanguage,width:w,state:id,...m});
 if(activeLanguage==='en'&&m.systemResidue.length)console.warn('RECORD-LANGUAGE-RESIDUE '+engine+' '+w+' '+id+' '+JSON.stringify(m.systemResidue));
 await page.screenshot({path:resolve(out,engine+'-'+activeLanguage+'-'+w+'-'+id+'.png'),fullPage:true,animations:'disabled',timeout:20000});
 if(m.document>m.viewport+2||m.body>m.viewport+2)console.warn('OVERFLOW '+engine+' '+activeLanguage+' '+w+' '+id+': '+m.document);
 if(id.endsWith('-font200'))assert.ok(m.document<=m.viewport+2&&m.body<=m.viewport+2,'populated 200% screen must fit viewport: '+JSON.stringify({engine,language:activeLanguage,width:w,state:id,document:m.document,body:m.body}));
 if(id.endsWith('-font200'))assert.deepEqual(m.bodyTextClipping,[],'body heading and region-action text must remain in their controls at 200%');
}
async function takePopulatedZoom(page,w,id){
 if(activeLanguage!=='en'||![320,390].includes(w))return;
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 await take(page,w,id+'-font200');
 if(id==='COURSE-dense'){
  const buttons=await page.locator('.rv-course .rv-choice-row.rv-four .rv-choice').evaluateAll(nodes=>nodes.map(el=>{
   const r=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);
   const fragments=[...range.getClientRects()].filter(x=>x.width>0.1);
   return {label:el.textContent.trim(),fragmentCount:fragments.length,
    textLeft:Math.min(...fragments.map(x=>x.left)),textRight:Math.max(...fragments.map(x=>x.right)),
    left:r.left,right:r.right};
  }));
  assert.equal(buttons.length,4,'all four English course modes are available at 200%');
  assert.ok(buttons.every(x=>x.fragmentCount===1&&x.textLeft>=x.left-2&&x.textRight<=x.right+2),
   'English course-mode words must fit whole within their buttons: '+JSON.stringify(buttons));

  const tileMetrics=await page.locator('.rv-course .rv-surfaces .rv-surface-tile').evaluateAll(nodes=>nodes.map(el=>{
   const outer=el.getBoundingClientRect();
   const label=el.querySelector('span:first-child');
   if(!label)return {name:'missing',clipped:true};
   const range=document.createRange();range.selectNodeContents(label);
   const boxes=[...range.getClientRects()].filter(r=>r.width>0.1);
   return {name:label.textContent.trim(),clipped:boxes.some(r=>r.left<outer.left-2||r.right>outer.right+2),
    tileWidth:outer.width,textWidth:Math.max(...boxes.map(r=>r.width))};
  }));
  assert.equal(tileMetrics.length,8,'all eight surface choices remain accessible');
  assert.ok(tileMetrics.every(x=>!x.clipped),'surface labels must stay inside full buttons: '+JSON.stringify(tileMetrics));

  const surfaceModes=await page.locator('.rv-course .rv-step-surface [data-rv-surface-mode]').evaluateAll(nodes=>nodes.map(el=>{
   const outer=el.getBoundingClientRect(),node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE),text=node?.textContent||'';
   const words=[...text.matchAll(/\S+/g)].map(match=>{
    const r=document.createRange();r.setStart(node,match.index);r.setEnd(node,match.index+match[0].length);
    const boxes=[...r.getClientRects()].filter(x=>x.width>0.1);
    return {word:match[0],parts:boxes.length,outside:boxes.some(x=>x.left<outer.left-2||x.right>outer.right+2)};
   });
   return {label:text.trim(),words};
  }));
  assert.equal(surfaceModes.length,3,'surface input keeps all three modes');
  assert.ok(surfaceModes.every(mode=>mode.words.every(w=>w.parts===1&&!w.outside)),
   'English surface mode must keep every word whole within its button: '+JSON.stringify(surfaceModes));
  const surfaceHeader=await page.locator('.rv-course .rv-surface-head').evaluate(el=>{
   const title=el.querySelector('h3').getBoundingClientRect(),total=el.querySelector('strong').getBoundingClientRect();
   return {titleBottom:title.bottom,totalTop:total.top,overlap:total.top<title.bottom-2};
  });
  assert.equal(surfaceHeader.overlap,false,'surface ratio total must follow its heading without overlap at 200%');


 }
 await page.evaluate(()=>{document.documentElement.style.fontSize='';});
}
async function enter(page,route,selector,w,id){
 await page.goto(host+route,{waitUntil:'networkidle'});await page.locator(selector).waitFor({timeout:12000});await take(page,w,id+'-empty');
}
try{
 for(const language of ['ja','en'])for(const w of [320,390,768,1440]){
  activeLanguage=language;
  const ctx=await browser.newContext({viewport:{width:w,height:w===1440?900:844},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
  },language);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'record','.rv-manual',w,'MANUAL');
  await page.locator('[data-draft="distance"]').fill('8.25');
  await page.locator('[data-draft="minutes"]').fill('54');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await enter(page,'record-course','.rv-course',w,'COURSE');
  const flowRail=await page.locator('.rv-course .rv-flow-rail').evaluate(el=>getComputedStyle(el).display);
  assert.equal(flowRail,w<=480?'none':'grid','S05 collapses duplicate tiny steps on phone');
  assert.equal(await page.locator('.rv-course-step .rv-step-index').count(),3,'all card headings keep 01–03 step labels');
  await page.locator('[data-draft="courseName"]').fill('川沿い周回・橋を渡るコース');
  await page.locator('[data-rv-grade="SECTIONS"]').click();
  for(let k=0;k<5;k++){
    await page.locator('[data-rv-add]').click();
    await page.locator('[data-draft="sectionShare'+k+'"]').fill('20');
    await page.locator('[data-draft="sectionGrade'+k+'"]').fill(String(k+1));
  }
  await page.locator('[data-rv-surface-mode="MIXED"]').click();
  const surfaces=await page.locator('[data-rv-surface]').evaluateAll(e=>e.map(x=>x.dataset.rvSurface).slice(0,2));
  for(const id of surfaces)await page.locator('[data-rv-surface="'+id+'"]').click();
  await page.locator('[data-rv-surface-focus="'+surfaces[0]+'"]').click();
  await page.locator('[data-rv-surface-value="'+surfaces[0]+'"]').fill('60');
  await page.locator('[data-rv-surface-focus="'+surfaces[1]+'"]').click();
  await page.locator('[data-rv-surface-value="'+surfaces[1]+'"]').fill('40');
  assert.match(await page.locator('[data-rv-surface-total]').innerText(),/100%/);
  assert.equal(await page.locator('[data-rv-surface-pick-value="'+surfaces[0]+'"]').innerText(),'60%');
  assert.equal(await page.locator('[data-rv-surface-pick-value="'+surfaces[1]+'"]').innerText(),'40%');
  assert.equal(await page.locator('.rv-surface-fine [data-rv-surface-step]').count(),2,'step controls mirror slope');
  await take(page,w,'COURSE-dense');
  await takePopulatedZoom(page,w,'COURSE-dense');
  assert.equal(await page.locator('.rv-inline-preset-tools').count(),0,'new course has no edit/copy controls');
  await page.locator('.rv-course-summary [data-course-save]').click();
  await page.locator('.rv-inline-preset-tools').waitFor({state:'visible',timeout:6000});
  assert.equal(await page.locator('.rv-course-setup [data-course-save]').count(),1,'existing preset can be edited in first card');
  assert.equal(await page.locator('.rv-course-setup [data-course-save-new]').count(),1,'existing preset can be copied in first card');
  assert.equal(await page.locator('[data-rv-apply]').count(),1,'record application is still a separate action');
  assert.ok(await page.evaluate(()=>{
    const c=document.querySelector('.rv-course-setup').getBoundingClientRect();
    const a=document.querySelector('.rv-inline-preset-tools').getBoundingClientRect();
    const n=document.querySelector('.rv-course-conditions').getBoundingClientRect();
    return a.top>=c.top&&a.bottom<=c.bottom+2&&a.bottom<n.top;
  }),'preset follow-up actions appear in the first card before conditions');
  assert.equal(await page.locator('.rv-course-summary [data-course-save]').count(),0,'saved preset has no duplicate lower save');
  assert.equal(await page.locator('.rv-course-setup [data-course-save]').count(),1,'one upper update');
  await take(page,w,'COURSE-saved-followup');
  await page.locator('.rv-preset-list [data-course-delete]').first().click();
  const confirm=page.locator('.rv-course-confirm');await confirm.waitFor({state:'visible'});
  assert.equal(await confirm.locator('button').count(),2);
  const metrics=await confirm.evaluate(el=>{
    const p=el.getBoundingClientRect();
    return {outer:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},
      buttons:[...el.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};
  });
  const [yes,no]=metrics.buttons;
  assert.ok(yes.left>=metrics.outer.left&&no.right<=metrics.outer.right+1,'buttons inside confirmation card');
  assert.ok(Math.abs(yes.top-no.top)<=2,'confirmation buttons are side-by-side');
  assert.ok(yes.right<=no.left+1,'button rectangles do not overlap');
  await take(page,w,'COURSE-delete-confirm');
  await confirm.locator('[data-course-cancel-delete]').click();
  assert.equal(await page.locator('.rv-course-confirm').count(),0,'cancel leaves saved course untouched');
  await enter(page,'record-rof','[data-rof-v4-root]',w,'ROF');
  const range=page.locator('[data-rof-v4-range]');
  await range.evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rof-v4-phase="after"]').click();
  await range.evaluate(e=>{e.value='8';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.rv4-optional-meta > summary').click();
  await page.locator('[data-rof-run-start]').fill('08:45');
  await page.locator('[data-rof-run-end]').fill('09:39');
  await take(page,w,'ROF-populated');
  await enter(page,'record-compare','[data-g4-page]',w,'GAIT');
  await page.locator('[data-draft="steps"]').fill('12457');
  await page.locator('[data-g4-source="ESTIMATED"]').click();
  await page.locator('[data-g4-format="RUN_WALK"]').click();
  await page.locator('[data-draft="runWalkRunningDistanceKm"]').fill('6.12');
  await page.locator('[data-draft="runWalkRunningDurationMinutes"]').fill('38');
  await take(page,w,'GAIT-populated');
  await enter(page,'record-environment','[data-e4-page]',w,'ENV');
  await page.locator('[data-draft="temperatureC"]').fill('18.5');
  await page.locator('[data-draft="environmentNote"]').fill('向かい風の体感があった。'.repeat(26));
  await page.locator('[data-e4-weather="CLOUD"]').click();
  await page.locator('[data-e4-flag="WIND"]').click();
  await page.locator('[data-e4-selection-status][data-state="pending"]').waitFor();
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),true,'uncommitted environment choice requires explicit action');
  assert.doesNotMatch(await page.locator('[data-draft="environmentNote"]').inputValue(),/【本人申告の環境選択】/,'choosing alone does not write the note');
  await take(page,w,'ENV-selected');
  await page.locator('[data-e4-commit]').click();
  await page.locator('[data-e4-selection-status][data-state="applied"]').waitFor();
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),false,'same applied choice cannot be copied twice');
  assert.match(await page.locator('[data-draft="environmentNote"]').inputValue(),/【本人申告の環境選択】天候：くもり、風が強い/);
  await take(page,w,'ENV-committed');
  await enter(page,'record-reflection','[data-cx-page]',w,'BODY');
  await page.locator('#cx-bodyObservation').fill('走行後の感覚を本人の言葉で記録。'.repeat(15));
  await page.locator('#cx-shoeName').fill('使用したシューズ名・'.repeat(9).slice(0,100));
  await page.locator('#cx-memo').fill('その日の走行と生活で感じたこと。'.repeat(28).slice(0,490));
  for(const view of ['front','back','sole']){
    await page.locator('[data-map-view="'+view+'"]').click();
    await page.locator('[data-picker-toggle]').click();
    const ids=await page.locator('[data-picker-id]').evaluateAll(xs=>xs.map(x=>x.dataset.pickerId));
    for(const id of ids)await page.locator('[data-picker-id="'+id+'"]').click();
  }
  assert.equal(await page.locator('.cx-selected-chip').count(),3,'initial twelve-region display compact');
  assert.match(await page.locator('[data-selected-expand]').innerText(),/9/);
  await take(page,w,'BODY-12-regions-compact');
  await page.locator('[data-selected-expand]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),12,'expand reveals all selections without loss');
  await take(page,w,'BODY-12-regions-expanded');
  await takePopulatedZoom(page,w,'BODY-12-regions-expanded');
  await page.locator('[data-selected-expand]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),3,'collapse does not discard selected regions');
  const shoeBefore=await page.locator('#cx-shoeName').evaluate(el=>({limit:el.maxLength,length:el.value.length}));
  assert.equal((await page.locator('[data-counter="shoeName"]').innerText()),shoeBefore.length+'/100');
  for(const name of ['bodyObservation','memo']){
    const m=await page.locator('#cx-'+name).evaluate(el=>({height:el.getBoundingClientRect().height,scrollHeight:el.scrollHeight}));
    assert.ok(m.height>=170,'long text expands: '+name+' '+JSON.stringify(m));
    assert.ok(m.height<=242,'long text bounded: '+name);
  }
  await take(page,w,'BODY-12-regions-long-fields');
  await page.locator('[data-append-name]').click();
  await take(page,w,'BODY-appended');
  const max=await page.locator('#cx-shoeName').evaluate(e=>e.maxLength);
  const count=await page.locator('[data-counter="shoeName"]').innerText();
  report.push({engine,width:w,state:'shoe-counter-mismatch-check',max,count});
  await page.locator('[data-apply]').click();await page.locator('.rv-manual').waitFor();
  await take(page,w,'MANUAL-populated-summary');
  // Persist the user's original text plus the explicitly transferred choice.
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  const reviewText=await page.locator('[data-record-review]').innerText();
  if(language==='ja')assert.match(reviewText,/本人申告：天候：くもり、風が強い/,'pre-save summary exposes the explicit self-report');
  else assert.ok(reviewText.includes('くもり')||reviewText.includes('Cloud'),'English review keeps explicitly entered weather self-report');
  if(language==='ja')assert.match(reviewText,/全文は編集画面で確認/,'long original notes are summarized, not truncated in storage');
  assert.ok(reviewText.length<5000,'review remains reachable even with long optional notes: '+reviewText.length);
  await take(page,w,'REVIEW-environment-saved-draft');
  await takePopulatedZoom(page,w,'REVIEW-environment-saved-draft');
  const button=page.locator('[data-manual-run-save]');
  assert.equal(await button.isEnabled(),true,'complete optional context must not block valid run save');
  await button.click();
  await page.waitForFunction(()=>location.hash.startsWith('#/result?record='),null,{timeout:12000});
  const getSaved=()=>page.evaluate(async()=>{
   const {readCanonical}=await import('/ui/manualRunCanonical.js');
   const result=await readCanonical();
   return result.ok?result.read.records.at(-1):null;
  });
  const saved=await getSaved();
  assert.ok(saved,'saved run exists in IndexedDB');
  assert.match(saved.draft.environmentNote,/向かい風の体感があった/);
  assert.match(saved.draft.environmentNote,/【本人申告の環境選択】天候：くもり、風が強い/);
  assert.equal(saved.draft.temperatureC,'18.5');
  assert.ok(saved.id.startsWith('run-v1-'));
  await take(page,w,'RESULT-environment-saved');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#activity-result').waitFor();
  assert.equal((await getSaved())?.id,saved.id,'reloading retains the same record identity');
  assert.equal((await getSaved())?.draft.environmentNote,saved.draft.environmentNote,'reloading retains the personally asserted context');
  await take(page,w,'RESULT-environment-reloaded');
  assert.deepEqual(errors,[],'JS page errors '+language+' '+w);
  await ctx.close();
 }
 console.log('AUDIT COMPLETE '+engine+' '+report.length+' bilingual states');
}finally{
 await writeFile(resolve(out,engine+'-report.json'),JSON.stringify(report,null,2));
 await browser.close();await new Promise(ok=>server.close(ok));
}
