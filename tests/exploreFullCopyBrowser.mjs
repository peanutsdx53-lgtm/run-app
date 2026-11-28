/* English Explore surface inventory for 7 categories / 27 topics.
 * Diagnoses untranslated SYSTEM text and accessibility labels, in each
 * normal, help and explicit-run context. Never flags user-authored text.
 * Visuals: focused screenshots for iPhone and 1024px; no edits to records.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','explore-copy-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
async function ux14Geometry(page){return page.evaluate(()=>{
 const map=document.querySelector('.ex-map'), focus=document.querySelector('.ex-focus');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const m=rect(map),c=rect(map.querySelector('.ex-core')),f=rect(focus);
 const rangeRects=e=>{const range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}))};
 const nodes=[...map.querySelectorAll('.ex-node')].map(el=>{const full=el.querySelector('.ex-node-title'),compact=el.querySelector('.ex-node-compact'),label=compact&&getComputedStyle(compact).display!=='none'?compact:full;const brokenWords=[];const walk=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);for(let node=walk.nextNode();node;node=walk.nextNode()){for(const match of node.textContent.matchAll(/[A-Za-z]+/g)){const r=document.createRange();r.setStart(node,match.index);r.setEnd(node,match.index+match[0].length);if([...r.getClientRects()].filter(x=>x.width>0&&x.height>0).length>1)brokenWords.push(match[0]);}}return {id:el.dataset.exCategory,aria:el.getAttribute('aria-label'),title:label.textContent,fullTitle:full.textContent,source:el.dataset.exSource,pressed:el.getAttribute('aria-pressed'),box:rect(el),orb:rect(el.querySelector('.ex-node-orb')),text:rangeRects(label),brokenWords};});
 const inside=(a,b,t=1)=>a.x>=b.x-t&&a.y>=b.y-t&&a.right<=b.right+t&&a.bottom<=b.bottom+t;
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
 const clipped=[],collisions=[];
 for(const n of nodes){if(!inside(n.box,m,1))clipped.push(n.id+':button');for(const t of n.text)if(!inside(t,n.box,1)||!inside(t,m,1))clipped.push(n.id+':text');if(overlap(n.box,c))collisions.push(n.id+':core');}
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(overlap(nodes[i].box,nodes[j].box))collisions.push(nodes[i].id+':'+nodes[j].id);
 const coreText=[...map.querySelectorAll('.ex-core span,.ex-core strong')].flatMap(rangeRects);for(const t of coreText)if(!inside(t,c,1))clipped.push('core:text');
 return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),map:m,core:c,focus:f,documentHeight:document.documentElement.scrollHeight,focusOffset:Math.round(f.y-m.y),columns: getComputedStyle(map.closest('.ex-orbit-workspace')).gridTemplateColumns, nodes,clipped:[...new Set(clipped)],collisions,questionCount:focus.querySelectorAll('.ex-inquiry-start h3').length,stages:focus.querySelectorAll('.ex-inquiry-stage').length,linkCount:map.querySelectorAll('.ex-constellation-link').length,relatedCount:map.querySelectorAll('.ex-node.is-related').length,artVisible:getComputedStyle(map.querySelector('.ex-art')).display!=='none',brokenWords:nodes.flatMap(n=>n.brokenWords.map(w=>n.id+':'+w))};
})}
const server=createServer(async(req,res)=>{
try{
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(path!==root&&!path.startsWith(root+sep))throw Error('blocked');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
 res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const raw=await readFile(resolve(root,'app.js'),'utf8');
const categories=[...raw.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
assert.equal(categories.length,7);
assert.equal(categories.reduce((n,x)=>n+x.topics.length,0),27);
const bad=/[\u3041-\u30ff\u3400-\u9fff]/u;
const reports=[],errors=[];
async function scan(page,mode,category,topic,state){
 await page.waitForTimeout(45);
 const res=await page.locator('[data-experience-v3]').evaluate((root)=>{
  const re=/[\u3041-\u30ff\u3400-\u9fff]/u,out=[],attrs=[],japanese=content=>re.test(content||'');
  const skipped=el=>!!el.closest('[data-user-authored],textarea,[contenteditable],[data-report-purpose]');
  const displayed=el=>{
   if(!el||skipped(el))return false;
   if(el.closest('details:not([open])'))return false;
   for(let p=el;p&&p!==root.parentElement;p=p.parentElement){
    const st=getComputedStyle(p);
    if(st.display==='none'||st.visibility==='hidden'||st.opacity==='0')return false;
   }
   return el.getClientRects().length>0;
  };
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walk.nextNode();node;node=walk.nextNode()){
   const el=node.parentElement,txt=node.textContent.trim().replace(/\s+/g,' ');
   if(txt&&japanese(txt)&&displayed(el))
    out.push({tag:el.tagName,cls:String(el.className||'').slice(0,64),text:txt.slice(0,360)});
  }
  for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]')){
   if(!displayed(el))continue;
   for(const name of ['aria-label','title','placeholder']){
    const val=el.getAttribute(name);
    if(val&&japanese(val))attrs.push({name,tag:el.tagName,cls:String(el.className||'').slice(0,60),text:val.slice(0,300)});
   }
  }
  return {out,attrs,scroll:document.documentElement.scrollWidth,viewport:window.innerWidth,
   questions:root.querySelectorAll('.ex-inquiry-start h3').length,
   sourceDisclosure:root.querySelectorAll('.ex-inquiry-details,.ex-e-boundary-disclosure').length,
   mapLegend:root.querySelectorAll('.ex-map-card .ex-legend').length,
   selectedTag:root.querySelectorAll('.ex-related-label').length};
 });
 const result={engine,mode,category,topic,state,...res};reports.push(result);
 if(res.scroll>res.viewport+3)errors.push({type:'overflow',mode,category,topic,width:res.viewport,scroll:res.scroll});
 return result;
}
try{
 for(const width of [390,1024]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'en'}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:'en'}));
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({type:'js',error:String(error)}));
  let selectedRun=null;
  if(width===390){
   await page.goto(base+'#/home',{waitUntil:'networkidle'});
   selectedRun=await page.evaluate(async()=>{
    const [canonical,store]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
    const prep=await canonical.refresh();
    if(!prep.ok)throw Error('canonical seed: '+prep.reason);
    const response=await canonical.mutate(st=>store.saveManualRun(st,{
     date:'2026-11-20',distance:'5',hours:'',minutes:'35',seconds:'',
     activityGait:'RUNNING',runningFormat:'UNKNOWN',
     rofBefore:2,rofAfter:8,steps:'',stepsProvenance:'UNKNOWN',
     gradeMode:'SUMMARY',upPercent:'20',downPercent:'10',
     courseName:'audit',bodyObservation:'',
     temperatureC:'',environmentNote:''
    }));
    if(!response.ok)throw Error('saved run seed: '+response.reason);
    return response.record.id;
   });
  }
  for(const cat of categories){
   for(const topic of cat.topics){
    for(const mode of width===390?['general','selected-run']:['general']){
     const params=new URLSearchParams({category:cat.id,topic});
     if(mode==='selected-run'){params.set('source','manual');params.set('record',selectedRun)}
     await page.goto(base+'#/exploration-tree?'+params.toString(),{waitUntil:'networkidle'});
     await page.locator('[data-experience-v3] .ex-inquiry-start h3').first().waitFor({state:'visible',timeout:14000});
     await page.waitForFunction(()=>document.documentElement.lang==='en');
     await scan(page,mode,cat.id,topic,'visible');
     const details=page.locator('[data-experience-v3] .ex-inquiry-details,[data-experience-v3] .ex-e-boundary-disclosure');
     const n=await details.count();
     for(let i=0;i<n;i++)await details.nth(i).evaluate(el=>{el.open=true});
     await scan(page,mode,cat.id,topic,'expanded');
     if(cat.id==='03'&&topic==='上り坂・下り坂'||cat.id==='04'&&topic==='疲れの感じ方'){
      if(width===390&&mode==='selected-run'){
       await page.locator('.ex-focus').screenshot({path:resolve(out,'focus-'+cat.id+'-'+mode+'-'+width+'.png'),animations:'disabled'});
      }
     }
     if(cat.id==='03'&&topic==='上り坂・下り坂'){
      await page.locator('[data-ex-action="field-help"]').first().click();
      await page.locator('.ex-dialog').waitFor({state:'visible'});
      await scan(page,mode,cat.id,topic,'field-help');
      await page.locator('.ex-dialog [data-ex-action="close"]').click();
     }
     if(await page.locator('[data-ex-action="learn-help"]').count()){
      const sourceButton=page.locator('[data-ex-action="learn-help"]').first();
      await sourceButton.evaluate(el=>{const parent=el.closest('details');if(parent)parent.open=true});
      await sourceButton.click();
      await page.locator('.ex-dialog').waitFor({state:'visible'});
      await scan(page,mode,cat.id,topic,'learn-help');
      await page.locator('.ex-dialog [data-ex-action="close"]').click();
     }
    }
   }
  }
  // Stage 3: explicitly choose an independent day with no sleep input.
  // Verify the real English DOM and the exact-day link rather than a static copy fixture.
  if(width===390){
   const saved=await page.evaluate(async()=>{
    const home=await import('/ui/homeExperience.js');
    const result=home.saveCondition(localStorage,{date:'2026-11-19',sleepMinutes:null,feeling:'',memo:'良い',dailyState:{choices:['focus','motivation'],recordedAt:'2026-11-19T01:02:03.000Z'}});
    if(!result.ok)throw Error(result.reason);
    return localStorage.getItem(home.CONDITION_KEY);
   });
   const query=new URLSearchParams({category:'05',topic:'日々のコンディション',source:'manual',record:selectedRun});
   await page.goto(base+'#/exploration-tree?'+query.toString(),{waitUntil:'networkidle'});
   const panel=page.locator('[data-e-life-inquiry="T06"]');
   await page.waitForFunction(()=>document.querySelector('[data-e-life-inquiry="T06"]')?.dataset.eState==='NEED_SELECTION');
   assert.equal(await panel.locator('[data-user-authored]').count(),0);
   assert.doesNotMatch(await panel.innerText(),/Difficulty concentrating|Low motivation/);
   await panel.locator('[data-e-life-date]').fill('2026-11-19');
   await panel.locator('[data-e-life-kind="life"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-e-life-inquiry="T06"]')?.dataset.eState==='READY'&&document.querySelector('[data-e-life-evidence]')?.textContent.includes('Selected daily record'));
   assert.equal(await panel.locator('[data-e-life-date]').inputValue(),'2026-11-19');
   assert.equal(await panel.locator('[data-user-authored]').innerText(),'良い');
   const generated=await panel.locator('[data-e-life-evidence]').evaluate(el=>{
    const copy=el.cloneNode(true);copy.querySelectorAll('[data-user-authored]').forEach(n=>n.remove());return copy.textContent;
   });
   assert.doesNotMatch(generated,/[\u3041-\u30ff\u3400-\u9fff]|MANUAL|GPS_V2/);
   for(const label of ['Selected run','Selected daily record','2026-11-19','Not Entered','Difficulty concentrating','Low motivation','Response saved at'])assert.ok(generated.includes(label),label);
   const link=panel.locator('a[href="#/condition?date=2026-11-19"]');
   assert.equal(await link.count(),1);
   assert.equal(await page.locator('.ex-focus a[href="#/condition"]').count(),0);
   await panel.screenshot({path:resolve(out,'stage3-selected-life-en-390.png'),animations:'disabled'});
   await link.click();
   await page.locator('[data-cj-daily-date]').waitFor({state:'visible'});
   assert.equal(await page.locator('[data-cj-daily-date]').inputValue(),'2026-11-19');
   assert.equal(await page.locator('.cj-daily-record [data-user-authored]').innerText(),'良い');
   assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-life-condition-v1')),saved);
   await page.locator('.cj-daily-history').screenshot({path:resolve(out,'stage3-exact-day-en-390.png'),animations:'disabled'});
   console.log('STAGE3 DAILY COPY PASS '+engine+' selected day, English, raw note, exact-day link, unchanged source');
   // Stage 3 note provenance: protect only the user's text, not its interface.
   await page.goto(base+'#/exploration-tree?category=05&topic='+encodeURIComponent('日々のコンディション'),{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.documentElement.lang==='en');
   const noteRaw=await page.evaluate(()=>{
    const key='runload-v2-exploration-notes-v1',note={id:'stage3-copy-note',category:'05',topicId:'life-daily',text:'良い',createdAt:'2026-11-20T00:00:00.000Z',updatedAt:'2026-11-21T00:00:00.000Z',revisions:[{text:'削除',editedAt:'2026-11-21T00:00:00.000Z'}]};
    if(localStorage.getItem(key)!==null)throw Error('fixture must not overwrite existing notes');
    const raw=JSON.stringify([note]);localStorage.setItem(key,raw);return raw;
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('.ex-note-preview [data-user-authored]').waitFor();
   assert.equal(await page.locator('.ex-note-preview [data-user-authored]').innerText(),'良い');
   await page.locator('[data-ex-action="memories"]').click();
   const dialog=page.locator('.ex-dialog'),card=dialog.locator('.ex-saved');
   await page.waitForFunction(()=>document.querySelector('.ex-saved [data-ex-edit]')?.textContent==='Edit');
   assert.match(await card.innerText(),/Standalone Note/);
   assert.match(await card.innerText(),/Edited/);
   assert.equal(await card.locator('[data-user-authored]').innerText(),'良い');
   assert.equal(await card.locator('[data-ex-edit]').getAttribute('aria-label'),'Edit This Note');
   assert.equal(await card.locator('[data-ex-delete]').innerText(),'Delete');
   await dialog.screenshot({path:resolve(out,'stage3-note-memory-en-390.png'),animations:'disabled'});
   await card.locator('[data-ex-edit]').click();
   await dialog.locator('details summary').click();
   assert.equal(await dialog.locator('details [data-user-authored]').innerText(),'削除');
   assert.equal(await dialog.locator('textarea').inputValue(),'良い');
   await dialog.screenshot({path:resolve(out,'stage3-note-revision-en-390.png'),animations:'disabled'});
   await dialog.locator('[data-ex-action="close"]').click();
   await page.locator('[data-ex-action="memories"]').click();
   await card.locator('[data-ex-delete]').click();
   assert.equal(await dialog.locator('blockquote[data-user-authored]').innerText(),'良い');
   await dialog.screenshot({path:resolve(out,'stage3-note-deletion-en-390.png'),animations:'disabled'});
   await dialog.locator('[data-ex-action="cancel-delete-note"]').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')),noteRaw);
   await dialog.locator('[data-ex-action="close"]').click();
   console.log('STAGE3 NOTE COPY PASS '+engine+' labels, authored text, revision, delete cancellation, unchanged note');
  }
  await context.close();
 }
 // UX13: all 16 language/width/root-font states per engine, with the same
 // general slope topic, no saved run, and exact semantic labels (not just no Japanese).
 const ux13Matrix=[],ux14Matrix=[];
 for(const language of ['ja','en'])for(const width of [320,390,768,1440])for(const percent of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await ctx.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
   },language);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push({type:'ux13-js',language,width,percent,error:String(e)}));
   const query=new URLSearchParams({category:'03',topic:'上り坂・下り坂'});
   await page.goto(base+'#/exploration-tree?'+query.toString(),{waitUntil:'networkidle'});
   await page.locator('.ex-inquiry-start h3').waitFor({state:'visible',timeout:14000});
   if(percent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   const expected=language==='en'?['7 Areas','Topics','Uphill Movement','Use Records or Experience as Clues','Sources & Limits','Background & Research Sources']:['7つの分野','読むテーマ','上りの動き','記録や経験を手がかりにする','情報の出所と限界','参考知識と研究出典'];
   await page.waitForFunction(labels=>{
    const q=s=>document.querySelector(s)?.textContent.trim();
    return q('.ex-core span')===labels[0]&&q('.ex-topic-controls>strong')===labels[1]&&q('.ex-tool-result>strong')===labels[2]&&q('.ex-inquiry-stage>h4')===labels[3]&&[...document.querySelectorAll('.ex-inquiry-details>summary')].some(e=>e.textContent.trim()===labels[4])&&q('.ex-knowledge-reference>summary')===labels[5];
   },expected,{timeout:14000});
   const geometry=await page.locator('[data-experience-v3]').evaluate(el=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(document.documentElement).fontSize),areas:el.querySelectorAll('.ex-node').length,questions:el.querySelectorAll('.ex-inquiry-start h3').length,stages:el.querySelectorAll('.ex-inquiry-stage').length,stepper:el.querySelectorAll('[data-ex-topic-step]').length,note:el.querySelectorAll('[data-ex-action="note"]').length,share:el.querySelectorAll('[data-ex-consultation]').length,history:el.querySelectorAll('[data-ex-action="memories"]').length}));
   assert.ok(geometry.scroll<=width+3,'UX13 whole page overflow '+JSON.stringify({language,width,percent,geometry}));
   assert.equal(geometry.font,percent===200?32:16,'UX13 root font');
   assert.deepEqual([geometry.areas,geometry.questions,geometry.stages,geometry.stepper,geometry.note,geometry.share,geometry.history],[7,1,3,2,1,1,1],'UX13 preserves discovery and optional actions');
   const filename='ux13-'+language+'-'+width+'-'+percent+'.png';
   await page.screenshot({path:resolve(out,filename),fullPage:true,animations:'disabled',timeout:20000});
   ux13Matrix.push({engine,language,width,percent,filename,expected,...geometry});
   const g=await ux14Geometry(page);
   const actions=[];
   // Test the exact same seven actual controls using real pointer clicks, not synthetic dispatch.
   // Failed/occluded targets are observations, not silently bypassed with force clicks.
   for(const id of ['01','02','03','04','05','06','07']){
    const n=page.locator('.ex-node[data-ex-category="'+id+'"]');
    try{await n.click({timeout:2200});await page.locator('.ex-node[data-ex-category="'+id+'"][aria-pressed="true"]').waitFor({timeout:2200});const state=await page.evaluate(()=>({active:document.activeElement?.getAttribute('data-ex-category')||document.activeElement?.tagName,activeIsHeading:document.activeElement===document.querySelector('.ex-focus h2'),heading:document.querySelector('.ex-focus h2')?.textContent,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top,scrollY:scrollY,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory}));actions.push({id,ok:state.selected===id,...state});}catch(e){actions.push({id,ok:false,error:String(e).split('\n')[0].slice(0,300)})}
   }
   const keyboard=[];
   for(const id of ['03','07']){const n=page.locator('.ex-node[data-ex-category="'+id+'"]');await n.focus();await page.keyboard.press('Enter');keyboard.push(await page.evaluate(id=>({id,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory,activeTag:document.activeElement?.tagName,activeIsHeading:document.activeElement===document.querySelector('.ex-focus h2'),headingTop:document.querySelector('.ex-focus h2')?.getBoundingClientRect().top,headingBottom:document.querySelector('.ex-focus h2')?.getBoundingClientRect().bottom,activeCategory:document.activeElement?.dataset?.exCategory||null,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top}),id))}
   let disclosure=null;
   {
    const toggle=page.locator('[data-ex-action="toggle-map"]'),map=page.locator('.ex-map'),before=await ux14Geometry(page);
    await toggle.click();const closed=await map.isHidden(),expandedClosed=await toggle.getAttribute('aria-expanded'),focusClosed=await toggle.evaluate(e=>e===document.activeElement);
    await page.locator('[data-ex-action="change-area"]').click();const open=await map.isVisible(),expandedOpen=await toggle.getAttribute('aria-expanded'),active=await page.evaluate(()=>document.activeElement?.dataset?.exCategory),selected=await page.locator('.ex-node[aria-pressed="true"]').getAttribute('data-ex-category');
    disclosure={closed,expandedClosed,focusClosed,open,expandedOpen,active,selected,initialArt:before.artVisible};
   }
   // UPR-02: absence of the old preview, then real saved-run provenance and geometry.
   await page.locator('.ex-heading [data-ex-action="field-help"]').click();const help=await page.locator('.ex-dialog').innerText();await page.keyboard.press('Escape');
   assert.equal(await page.locator('[data-ex-action="sample"]').count(),0,'No simulated highlight control');
   assert.equal((await ux14Geometry(page)).relatedCount,0,'No fabricated relevance for empty records');
   const realId=await page.evaluate(async()=>{
    const [canonical,store]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
    const prep=await canonical.refresh();if(!prep.ok)throw Error(prep.reason);
    const result=await canonical.mutate(st=>store.saveManualRun(st,{date:'2026-11-20',distance:'5',hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:2,rofAfter:8,steps:'',stepsProvenance:'UNKNOWN',gradeMode:'SUMMARY',upPercent:'20',downPercent:'10',courseName:'audit',bodyObservation:'',temperatureC:'',environmentNote:''}));
    if(!result.ok)throw Error(result.reason);return result.record.id;
   });
   query.set('source','manual');query.set('record',realId);
   await page.goto(base+'#/exploration-tree?'+query.toString(),{waitUntil:'networkidle'});
   await page.locator('.ex-inquiry-start h3').waitFor({state:'visible',timeout:14000});
   if(percent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   await page.waitForFunction(()=>document.querySelectorAll('.ex-node.is-related[data-ex-source="saved-run"]').length===3);
   const realGeometry=await ux14Geometry(page);
   await page.locator('.ex-map-card').screenshot({path:resolve(out,'upr-real-'+language+'-'+width+'-'+percent+'.png'),animations:'disabled',timeout:20000});
    const label=JSON.stringify({language,width,percent});
    assert.deepEqual(g.clipped,[],'C clipped '+label);assert.deepEqual(g.collisions,[],'C collision '+label);assert.deepEqual(g.brokenWords,[],'C mid-word wrap '+label);
    assert.ok(g.scrollWidth<=width+3,'C page overflow '+label);
    assert.ok(g.nodes.every(n=>n.box.w>=44&&n.box.h>=44&&n.aria&&n.aria.includes(n.fullTitle)),'C control geometry or full accessible label '+label);
    assert.equal(actions.filter(x=>x.ok&&x.activeIsHeading).length,7,'C pointer focus '+label);
    assert.equal(keyboard.filter(x=>x.selected===x.id&&x.activeIsHeading&&x.headingTop>=-1&&x.headingBottom<=900).length,2,'C keyboard focus '+label);
    assert.ok(disclosure.closed&&disclosure.expandedClosed==='false'&&disclosure.focusClosed&&disclosure.open&&disclosure.expandedOpen==='true'&&disclosure.active===disclosure.selected,'C map disclosure '+label);
    assert.ok(realGeometry.relatedCount===3&&realGeometry.clipped.length===0&&realGeometry.collisions.length===0&&realGeometry.brokenWords.length===0,'Real highlight geometry '+label);
    assert.ok(realGeometry.nodes.every(n=>n.aria&&n.aria.includes(n.fullTitle)),'Real highlight accessible names '+label);
    assert.deepEqual(realGeometry.nodes.filter(n=>n.source==='saved-run').map(n=>n.id),['01','03','04'],'Real saved-run provenance '+label);
    assert.equal(await page.locator('[data-ex-action="sample"]').count(),0,'Sample remains absent with real records');
    assert.ok(language==='en'?/not.*(priority|ranking|burden)|not indicate|not.*load/i.test(help):help.includes('優先順位や身体への負担の大きさを示すものではありません'),'C relevance explanation '+label);
    assert.equal(g.columns.trim().split(/\s+/).length,width===1440&&percent===100?2:1,'C width/font column contract '+label);

   ux14Matrix.push({engine,language,width,percent,...g,actions,keyboard,disclosure,realGeometry});

  }finally{await ctx.close();}
 }
 // New end-to-end consultation handoff: no implicit record, no private transfer, exact return.
 for(const language of ['ja','en']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await context.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
   },language);
   const page=await context.newPage();page.on('pageerror',e=>errors.push({type:'consultation-handoff',error:String(e)}));
   await page.goto(base+'#/home',{waitUntil:'networkidle'});
   const ids=await page.evaluate(async()=>{
    const [canonical,store]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
    await canonical.refresh();const ids=[];
    for(const [date,distance] of [['2026-11-18','5'],['2026-11-20','6']]){
     const response=await canonical.mutate(st=>store.saveManualRun(st,{date,distance,hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:2,rofAfter:8,steps:'',stepsProvenance:'UNKNOWN',memo:'PRIVATE-CONSULTATION-FIXTURE'}));
     if(!response.ok)throw Error(response.reason);ids.push(response.record.id);
    }return ids;
   });
   const query=new URLSearchParams({category:'03',topic:'上り坂・下り坂'});
   const go=async hash=>{await page.goto(base+hash,{waitUntil:'networkidle'});await page.locator('[data-ex-consultation]').waitFor({timeout:20000});};
   const verifyPrivate=async expected=>{
    await page.locator('#consultation-root').waitFor({timeout:20000});
    assert.equal(await page.locator('#cp-target').inputValue(),expected);
    for(const key of ['rof','notes','condition'])assert.equal(await page.locator('[data-share="'+key+'"]').isChecked(),false);
    for(const id of ['purpose','observation','question'])assert.equal(await page.locator('#cp-'+id).inputValue(),'');
    assert.doesNotMatch(await page.locator('#consultation-root').innerText(),/PRIVATE-CONSULTATION/);
    assert.equal(await page.locator('.cp-back').getAttribute('aria-label'),language==='en'?'Return to Explore':'探究に戻る');
   };
   await go('#/exploration-tree?'+query.toString());
   await page.locator('[data-ex-slope="down"]').click();
   await page.locator('[data-ex-action="note"]').click();
   await page.locator('#ex-note').fill('PRIVATE-CONSULTATION 自分のメモ');
   await page.locator('[data-ex-action="save-note"]').click();
   await page.locator('.ex-note-preview [data-user-authored]').waitFor();
   const stored=await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1'));
   await page.locator('.ex-inquiry-last').screenshot({path:resolve(out,'consultation-entry-'+language+'.png'),animations:'disabled'});
   await page.locator('[data-ex-consultation]').click();await verifyPrivate('');
   await page.locator('.cp-back').click();await page.locator('[data-ex-consultation]').waitFor();
   assert.equal(await page.locator('[data-ex-slope="down"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')),stored);
   query.set('source','manual');query.set('record',ids[0]);
   await go('#/exploration-tree?'+query.toString());
   await page.locator('[data-ex-consultation]').click();await verifyPrivate(ids[0]);
   await page.locator('.cp-back').click();await page.locator('[data-ex-consultation]').waitFor();
   assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('record'),ids[0]);
   // A direct/reloaded link has no in-memory selection; never infer one from recent data.
   await page.goto(base+'#/consultation?from=explore',{waitUntil:'networkidle'});
   await page.reload({waitUntil:'networkidle'});await verifyPrivate('');
   assert.equal(await page.locator('.cp-back').getAttribute('href'),'#/exploration-tree');
   assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')),stored);
  }finally{await context.close();}
 }
 assert.equal(ux13Matrix.length,16,'UX13 complete per-engine matrix');
 await writeFile(resolve(out,'ux13-matrix.json'),JSON.stringify(ux13Matrix,null,2));
 assert.equal(ux14Matrix.length,16);
 await writeFile(resolve(out,'ux14-matrix.json'),JSON.stringify(ux14Matrix,null,2));
 console.log('UX14-MATRIX '+engine+' '+ux14Matrix.length+' states');
 console.log('UX13-MATRIX '+engine+' '+ux13Matrix.length+' states');
 const untranslated=reports.flatMap(r=>[...r.out,...r.attrs].map(x=>({...x,category:r.category,topic:r.topic,mode:r.mode,state:r.state})));
 const grouped=Object.create(null);
 for(const e of untranslated){const key=e.text;const row=grouped[key]||{text:key,count:0,places:[]};row.count++;if(row.places.length<4)row.places.push({category:e.category,topic:e.topic,mode:e.mode,state:e.state});grouped[key]=row;}
 const sorted=Object.values(grouped).sort((a,b)=>b.count-a.count);
 const result={engine,cases:reports.length,uniqueUntranslated:sorted.length,visibleOccurrences:untranslated.length,errors,rows:sorted};
 await writeFile(resolve(out,'report.json'),JSON.stringify(result,null,2));
 console.log('EXPLORE-COPY-SUMMARY '+JSON.stringify({engine,cases:result.cases,uniqueUntranslated:result.uniqueUntranslated,
  visibleOccurrences:result.visibleOccurrences,errors:result.errors}).slice(0,1200));
 console.log('EXPLORE-COPY-UNTRANSLATED '+JSON.stringify(sorted.slice(0,80)).slice(0,12000));
 assert.deepEqual(errors,[],'Explore must have no browser exceptions or whole-page horizontal overflow');
 if(process.env.RUNLOAD_EXPLORE_STRICT==='1')assert.deepEqual(sorted,[],'all generated Explore UI copy must be English');
}finally{await browser.close();await new Promise(done=>server.close(done));}
