import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','s09-deep-'+engine);
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep))throw Error('outside root');
 const actual=file===root?resolve(root,'index.html'):file;
 res.setHeader('content-type',mime[extname(actual)]||'application/octet-stream');
 res.end(await readFile(actual));}
 catch{res.statusCode=404;res.end('Not found')}
});
await mkdir(out,{recursive:true});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/#/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const report=[],failures=[];
async function capture(page,meta){
 await page.waitForTimeout(140);
 const m=await page.evaluate(()=>{
  const shadow=document.querySelector('#runload-result-v4')?.shadowRoot;
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const one=s=>shadow?.querySelector(s),doc=document.documentElement;
  const nav=document.querySelector('.mobile-nav');
  const controls=[...(shadow?.querySelectorAll('.rv4-mobile-tabs button,.rv4-view-tabs button,.rv4-figure-actions button,.rv4-export-menu>summary')||[])].map(x=>({text:x.textContent.trim(),rect:rect(x),anatomy:!!x.closest('.rv4-view-tabs'),toggle:x.matches('[data-label-toggle]')}));
  const leaks=[];
  for(const x of shadow?.querySelectorAll('.rv4-reading h3,.rv4-reading small,.rv4-view-tabs button,.rv4-mobile-tabs button,.rv4-figure-actions button')||[]){
   if(!x.getClientRects().length)continue;
   const b=x.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(x);
   for(const r of range.getClientRects())if(r.width>.5&&(r.left<b.left-2||r.right>b.right+2))leaks.push({text:x.textContent.trim().slice(0,50),element:rect(x),textRect:rect({getBoundingClientRect:()=>r})});
  }
  // T01: measure actual computed type, not only CSS declarations or screenshots.
  const typography=['.rv4-card-heading p','.rv4-hero-report>span',
   '.rv4-reading>small','.rv4-body .rv4-figure-actions span',
   '.rv4-fatigue-caption'].map(selector=>{
    const e=one(selector);
    return {selector,exists:!!e,fontPx:e?parseFloat(getComputedStyle(e).fontSize):null,
     lineHeight:e?getComputedStyle(e).lineHeight:null};
   });
  const svg=one('.rv4-body-svg');
  const regions=svg?[...svg.querySelectorAll('[data-region]')].map(x=>{const b=x.getBBox();return {id:x.dataset.region,selected:x.classList.contains('selected'),x:b.x,y:b.y,w:b.width,h:b.height}}):[];
  const parts=['.rv4-hero','.rv4-notice','.rv4-body-figure','.rv4-body-svg','.rv4-reading','.rv4-reference-scale-section','.rv4-fatigue','.rv4-history','.rv4-method-disclosure'].map(s=>({selector:s,rect:rect(one(s))}));
  return {viewport:innerWidth,documentWidth:doc.scrollWidth,bodyWidth:document.body.scrollWidth,rootFont:getComputedStyle(doc).fontSize,scrollHeight:doc.scrollHeight,
    nav:nav&&getComputedStyle(nav).display!=='none'?rect(nav):null,
    navComputed:nav?{height:getComputedStyle(nav).height,grid:getComputedStyle(nav).gridTemplateColumns,
      resultSelectorMatches:!!document.querySelector('.app-shell:has(#runload-result-v4) .mobile-nav'),
      firstLinkStyle:(()=>{const item=nav.querySelector('.mobile-link');return item?{fontSize:getComputedStyle(item).fontSize,display:getComputedStyle(item).display,whiteSpace:getComputedStyle(item).whiteSpace,rect:rect(item),html:item.outerHTML.slice(0,350)}:null;})()}:null,
    parts,controls,leaks,regions,typography};
 });
 const filename=[engine,meta.language,meta.width,meta.zoom,meta.tab,meta.view].join('-');
 await page.screenshot({path:resolve(out,filename+'-full.png'),animations:'disabled',fullPage:true,timeout:25000});
 if([320,390].includes(meta.width)&&meta.zoom===200&&meta.tab==='body'&&meta.view==='front'){
  await page.screenshot({path:resolve(out,filename+'-viewport.png'),animations:'disabled'});
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.screenshot({path:resolve(out,filename+'-bottom.png'),animations:'disabled'});
 }
 // A long label can still spill into its neighbour even when document width is valid.
 if(m.nav&&meta.width<=800){
  assert.ok(m.nav.height<=90,meta.width+' '+meta.language+' navigation grew beyond one row');
  assert.equal(m.navComputed.grid.trim().split(/\s+/).length,5,'keep five labeled navigation destinations');
 }
 if(meta.tab==='body'){
  // The same labels must grow with document root zoom without disappearing.
  for(const item of m.typography){
   assert.ok(item.exists,'T01 supporting text absent: '+item.selector);
   const floor=meta.zoom===200?17.5:12.5;
   assert.ok(item.fontPx>=floor,'T01 supporting text stayed too small: '+JSON.stringify({meta,item,floor}));
  }
  const views=m.controls.filter(x=>x.anatomy);
  assert.equal(views.length,3,'all anatomy views stay reachable');
  for(const v of views)assert.ok(v.rect.height>=43,'anatomy view target too small: '+v.text+' '+meta.width);
  const toggle=m.controls.find(x=>x.toggle);
  assert.ok(toggle&&toggle.rect.height>=43.5,'S09 number toggle needs 44px hit area: '+meta.width+' '+meta.zoom);
 }
 report.push({meta,metrics:m});
 if(meta.tab==='body'&&meta.view==='front'&&[320,375,390,414].includes(meta.width)){
  const scale=m.parts.find(x=>x.selector==='.rv4-reference-scale-section')?.rect;
  const selected=m.parts.find(x=>x.selector==='.rv4-reading')?.rect;
  if(scale&&selected){
   assert.ok(scale.top>=selected.bottom-2,'reference color scale must come after the selected region and free narrow card space');
   assert.ok(scale.width>=selected.width,'reference color scale must not be squeezed into selected region column');
  }
  const fig=m.parts.find(x=>x.selector==='.rv4-body-figure')?.rect;
  const reading=m.parts.find(x=>x.selector==='.rv4-reading')?.rect;
  assert.ok(fig&&reading,'body diagram and selected region card are present');
  if(meta.width===320){
   assert.ok(reading.top>=fig.bottom-2,'320px must use accessible stacked layout at '+meta.zoom+'%');
  }else{
   assert.ok(reading.left>=fig.right-2,'375–414px should display the diagram and reading side by side at '+meta.width+'px '+meta.zoom+'%');
   assert.ok(reading.top<fig.bottom&&fig.top<reading.bottom,'body diagram and region card need shared viewing height');
  }
  // Static full-page screenshots always show a fixed bottom nav at its initial scroll
  // position. Check the actual viewport after scrolling, not just document geometry.
  if(meta.zoom===200&&[375,390].includes(meta.width)){
   const visible=await page.evaluate(()=>{
    const host=document.querySelector('#runload-result-v4'),shadow=host?.shadowRoot;
    const target=shadow?.querySelector('.rv4-body-content');
    const nav=document.querySelector('.mobile-nav');
    if(!target||!nav)return null;
    scrollTo(0,Math.max(0,scrollY+target.getBoundingClientRect().top-72));
    const fig=shadow.querySelector('.rv4-body-figure')?.getBoundingClientRect();
    const read=shadow.querySelector('.rv4-reading')?.getBoundingClientRect();
    const foot=nav.getBoundingClientRect();
    return {figure:{top:fig.top,bottom:fig.bottom},reading:{top:read.top,bottom:read.bottom},navTop:foot.top,scrollY};
   });
   assert.ok(visible&&visible.figure.top>=-1,'diagram should be in visible viewport');
   assert.ok(visible.reading.top>=-1,'selected value should be in visible viewport');
   assert.ok(Math.max(visible.figure.bottom,visible.reading.bottom)<=visible.navTop-5,
     'diagram and selected value must both fit above fixed navigation after scrolling: '+JSON.stringify(visible));
   await page.screenshot({path:resolve(out,filename+'-co-readable-viewport.png'),animations:'disabled',fullPage:false});
   await page.evaluate(()=>scrollTo(0,0));
  }
 }
}

/* C1 evidence gate: all official SVG selections, labels and saved-state cases.
 * A grayscale screenshot supports review; it cannot prove user comprehension. */
async function auditC1Body(page,result,language,width,zoom){
 if(width<=800)await result.locator('[data-tab="body"]').click();
 const seen=[];
 for(const view of ['front','back','sole']){
  await result.locator('[data-view="'+view+'"]').click();
  const toggle=result.locator('[data-label-toggle]');
  if(await toggle.getAttribute('aria-pressed')!=='true')await toggle.click();
  const metrics=await result.evaluate(host=>{
   const svg=host.shadowRoot.querySelector('.rv4-body-svg');
   const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
   const paths=[...svg.querySelectorAll('.rv4-region[data-region]')];
   return {ids:paths.map(p=>p.dataset.region),available:paths.filter(p=>p.dataset.referenceState==='available').length,
    accessibility:paths.map(p=>({name:p.getAttribute('aria-label'),clipped:!!p.closest('g[clip-path]')})),
    clip:svg.querySelector('clipPath path')?.getAttribute('d'),
    outline:svg.querySelector('.rv4-silhouette-outline')?.getAttribute('d'),svg:r(svg),
    badges:[...svg.querySelectorAll('[data-body-reference-label]')].map(g=>({
     id:g.dataset.bodyReferenceLabel,value:g.dataset.bodyReferenceValue,
     box:r(g.querySelector('rect')),text:r(g.querySelector('text'))}))};
  });
  assert.equal(metrics.outline,metrics.clip,'B02: clip and original silhouette must coincide');
  assert.ok(metrics.accessibility.every(x=>x.name?.length>4&&x.clipped),
   'B02/B12: selectable path keeps a meaningful accessible label and silhouette clipping');
  assert.equal(metrics.badges.length,metrics.available,'B09: number display matches authorized values');
  for(const x of metrics.badges){
   assert.ok(metrics.ids.includes(x.id),'B09: badge refers to an actual region');
   assert.match(x.value,/^-?\d+\.\d$/,'B09: badge contains a finite one-decimal reading');
   const b=x.box,t=x.text,s=metrics.svg;
   assert.ok(b.left>=s.left-2&&b.right<=s.right+2&&b.top>=s.top-2&&b.bottom<=s.bottom+2,
    'B09: badge outside SVG viewport '+x.id);
   assert.ok(t.left>=b.left-2&&t.right<=b.right+2&&t.top>=b.top-2&&t.bottom<=b.bottom+2,
    'B09: text outside badge '+x.id);
  }
  for(let i=0;i<metrics.badges.length;i++)for(let j=i+1;j<metrics.badges.length;j++){
   const a=metrics.badges[i].box,b=metrics.badges[j].box;
   assert.ok(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,
    'B09: adjacent number badges overlap');
  }
  for(const id of metrics.ids){
   const path=result.locator('.rv4-body-svg .rv4-region[data-region="'+id+'"]');
   await path.focus();await path.press('Enter');
   const state=await result.evaluate(host=>{
    const root=host.shadowRoot,selected=[...root.querySelectorAll('.rv4-body-svg .rv4-region.selected')],p=selected[0];
    return {count:selected.length,id:p?.dataset.region,pressed:p?.getAttribute('aria-pressed'),
     focused:root.activeElement===p,referenceId:root.querySelector('.rv4-big-score')?.dataset.referenceRegion,
     aria:p?.getAttribute('aria-label')||'',value:root.querySelector('.rv4-big-score')?.textContent?.trim(),
     availability:p?.dataset.referenceState};
   });
   assert.deepEqual([state.count,state.id,state.pressed,state.focused,state.referenceId],
    [1,id,'true',true,id],'B02: every selected outline, keyboard focus and card agree');
   assert.ok(state.aria.length>4,'B12: region name exists independently of color');
   if(state.availability==='available')
    assert.ok(state.aria.includes(state.value),'B12: accessible name includes the numerical reading');
   else assert.equal(state.value,'—','I11: unavailable regions never show fabricated numbers');
   seen.push(id);
   if(language==='ja'&&width===390&&zoom===100)
    await page.screenshot({path:resolve(out,engine+'-c1-select-'+id+'.png'),animations:'disabled',fullPage:true});
  }
  if(language==='en'&&width===1440&&zoom===200){
   await result.evaluate(host=>{host.shadowRoot.querySelector('.rv4-body').style.filter='grayscale(1)'});
   await page.screenshot({path:resolve(out,engine+'-c1-grayscale-'+view+'.png'),animations:'disabled',fullPage:true});
   await result.evaluate(host=>{host.shadowRoot.querySelector('.rv4-body').style.filter=''});
  }
 }
 assert.equal(seen.length,12,'B02: all twelve anatomical regions are covered');
 assert.equal(new Set(seen).size,12,'B02: no duplicate anatomical region ID');
}
async function auditC1SavedStates(page,result,language){
 const cases=[
  {key:'nine',expected:9,gait:'RUNNING',format:'UNKNOWN',distance:'6',hours:'0',minutes:'38',seconds:'28'},
  {key:'twelve',expected:12,gait:'WALK',format:'UNKNOWN',distance:'3',hours:'0',minutes:'33',seconds:'20'},
  {key:'unknown',expected:0,reason:'GAIT_NOT_SELECTED',gait:'UNKNOWN',format:'UNKNOWN',distance:'6',hours:'0',minutes:'33',seconds:'0'},
  {key:'mixed',expected:0,reason:'MIXED_GAIT_NOT_QUANTIFIED',gait:'RUNNING',format:'RUN_WALK',distance:'6',hours:'0',minutes:'33',seconds:'0'},
  {key:'outside',expected:0,gait:'RUNNING',format:'UNKNOWN',distance:'1',hours:'2',minutes:'0',seconds:'0'}
 ];
 for(const t of cases){
  const stored=await page.evaluate(async v=>{
   const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
   const a=await import('/core/activity/activityReference.js');
   const saved=await c.mutate(s=>m.saveManualRun(s,{date:'2026-11-17',distance:v.distance,
    hours:v.hours,minutes:v.minutes,seconds:v.seconds,
    activityGait:v.gait==='UNKNOWN'?'RUNNING':v.gait,
    runningFormat:v.format,
    runWalkRunningDistanceKm:v.format==='RUN_WALK'?'4':'',
    runWalkRunningDurationMinutes:v.format==='RUN_WALK'?'20':'',
    rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN'}));
   if(!saved.ok)throw Error(saved.reason);
   // New saves require a selected gait. UNKNOWN is a historically valid
   // stored state; create it only via a validated IDB test fixture.
   let record=saved.record;
   if(v.gait==='UNKNOWN'){
    const changed=await c.mutate(storage=>{
     const envelope=JSON.parse(storage.getItem(m.MANUAL_RUN_KEY));
     const item=envelope.records.find(x=>x.id===saved.record.id);
     if(!item)return {ok:false,reason:'missing fixture'};
     item.draft.activityGait='UNKNOWN';
     envelope.revision++;
     storage.setItem(m.MANUAL_RUN_KEY,JSON.stringify(envelope));
     return {ok:true,record:item};
    });
    if(!changed.ok)throw Error(changed.reason);
    record=changed.record;
   }
   const reference=a.calculateActivityReference(record);
   return {id:record.id,count:reference.count,reason:reference.reason||null};
  },t);
  assert.equal(stored.count,t.expected,'I11: calculated 0/9/12 scientific applicability '+t.key);
  if(t.reason)assert.equal(stored.reason,t.reason,'I11: exclusion reason '+t.key);
  await page.goto(base+'result?record='+encodeURIComponent(stored.id),{waitUntil:'networkidle'});
  await result.locator('.rv4-body-svg').waitFor({state:'attached'});
  let count=0;
  for(const view of ['front','back','sole']){
   await result.locator('[data-view="'+view+'"]').click();
   const state=await result.evaluate(host=>{
    const root=host.shadowRoot,paths=[...root.querySelectorAll('.rv4-body-svg .rv4-region')];
    return {count:paths.filter(p=>p.dataset.referenceState==='available').length,
     value:root.querySelector('.rv4-big-score')?.textContent?.trim(),
     labels:paths.map(p=>p.getAttribute('aria-label'))};
   });
   count+=state.count;
   assert.ok(state.labels.every(Boolean),'I11: saved-region labels are never blank');
   if(t.expected===0)assert.equal(state.value,'—','I11: no calculated reference means a dash, not zero');
  }
  assert.equal(count,t.expected,'I11: save/reload visual has matching '+t.key+' count');
  await writeFile(resolve(out,engine+'-c1-I11-'+language+'-'+t.key+'.json'),
   JSON.stringify({case:t.key,expected:count,reason:stored.reason},null,2));
 }
}

try{
 for(const language of ['ja','en'])for(const width of [320,375,390,414,768,1024,1440])for(const zoom of [100,200]){
  const context=await browser.newContext({viewport:{width,height:width>=1024?900:850},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await context.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
   },language);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'home',{waitUntil:'networkidle'});
   const id=await page.evaluate(async()=>{
    const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
    const started=await c.initialize();if(!started.ok)throw Error(started.reason);
    const result=await c.mutate(s=>m.saveManualRun(s,{date:'2026-11-15',distance:'6',hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN'}));
    if(!result.ok)throw Error(result.reason);return result.record.id;
   });
   await page.reload({waitUntil:'networkidle'});
   await page.goto(base+'result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
   const result=page.locator('#runload-result-v4');
   await result.locator('[data-tab="body"]').waitFor({state:'attached',timeout:15000});
   if(zoom===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   await page.waitForFunction(lang=>document.documentElement.lang===lang,language,{timeout:12000});
   assert.equal(await result.locator('[data-tab]').count(),3);
   for(const tab of ['body','fatigue','radar']){
    if(width<=800)await result.locator('[data-tab="'+tab+'"]').click();
    await capture(page,{language,width,zoom,tab,view:'front'});
    if(tab==='body'){
     const caption=await result.locator('.rv4-reading > small').innerText();
     assert.equal(caption,language==='en'?'Selected Region':'選択中の部位',
      'T10: result reference card represents one region in either language');

     const sources=result.locator('.rv4-hero-sources');
     if(width===320&&zoom===200)assert.equal(await sources.evaluate(e=>e.open),false,
       'T02: long source descriptions must not be permanently exposed on a narrow screen');
     await sources.locator('summary').click();
     assert.equal(await sources.evaluate(e=>e.open),true,'provenance explanation opens only by user action');
     if(width===320&&zoom===200){
      const audit=await result.evaluate(el=>{
       const root=el.shadowRoot,grid=root.querySelector('.rv4-hero-source-grid');
       const fields=['distance','duration','pace','rof-detail'].map(k=>root.querySelector('[data-source-'+k+']'));
       const textOverflows=fields.flatMap(e=>{
        if(!e)return ['missing source'];
        const box=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);
        return [...range.getClientRects()].filter(r=>r.width>.5&&(r.left<box.left-2||r.right>box.right+2))
         .map(r=>({value:e.textContent,left:r.left,right:r.right,containerLeft:box.left,containerRight:box.right}));
       });
       return {values:fields.map(e=>e?.textContent.trim()||''),fontPx:fields.map(e=>e?parseFloat(getComputedStyle(e).fontSize):0),
        columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,overflows:textOverflows};
      });
      assert.equal(audit.values.length,4,'T02: source rows must remain distinct for distance/duration/pace/ROF-J');
      assert.ok(audit.values.every(v=>v.length>5),'T02: every source meaning must remain available after expansion');
      assert.notEqual(audit.values[0],audit.values[2],'T02: manually entered distance and calculated pace are not the same source');
      assert.equal(audit.columns,1,'T02: expanded sources use one readable column at 320px');
      assert.deepEqual(audit.overflows,[],'T02: long source labels wrap inside their own rows');
      assert.ok(audit.fontPx.every(v=>v>=17.5),'T02: detailed source copy follows 200% root text size');

      const reference=result.locator('.rv4-method-disclosure');
      const heading=reference.locator('summary');
      const textLabel=heading.locator('.rv4-method-label');
      const label=(await textLabel.textContent()).trim();
      if(language==='en')assert.equal(label,'Reference Scope & Limits','T06: concise English header');
      else assert.equal(label,'文献参考値の条件と限界','T06: Japanese meaning preserved');
      const layout=await heading.evaluate(el=>{
       const r=el.getBoundingClientRect(),visibleText=el.querySelector('.rv4-method-label');
       if(!visibleText)throw Error('T06: accessible heading text is missing');
       const range=document.createRange();range.selectNodeContents(visibleText);
       const textRects=[...range.getClientRects()].filter(r=>r.width>.5);
       return {height:r.height,fontPx:parseFloat(getComputedStyle(visibleText).fontSize),
        summaryFont:parseFloat(getComputedStyle(el).fontSize),
        textStyle:visibleText.getAttribute('style'),priority:visibleText.style.getPropertyPriority('font-size'),
        rootFont:getComputedStyle(document.documentElement).fontSize,
        escapes:textRects.filter(x=>x.left<r.left-2||x.right>r.right+2).length};
      });
      assert.ok(layout.height>=43.5,'T06: reference disclosure remains a 44px minimum touch target');
      assert.ok(layout.fontPx>=17.5,'T06: visible reference heading scales with 200% root text: '+JSON.stringify({language,width,zoom,layout}));
      assert.equal(layout.escapes,0,'T06: reference heading fits without text overflow');
      assert.equal(await reference.evaluate(el=>el.open),false,'reference evidence is optional until opened');
      await heading.click();
      const evidenceText=await reference.locator('p').textContent();
      assert.match(evidenceText,/100/,'reference basis is unchanged');
      assert.ok(evidenceText.length>60,'T06: the full applicability and risk-limitation details remain available');
      await heading.click();
      assert.equal(await reference.evaluate(el=>el.open),false,'T06: detail remains dismissible');
     }
     const evidence=result.locator('.rv4-region-evidence');
     await evidence.locator('summary').click();
     assert.equal(await evidence.evaluate(e=>e.open),true,'selected-region evidence opens by user choice');
     // A redraw must preserve the exact keyboard target, at normal and 200% text.
     const toggle=result.locator('[data-label-toggle]');
     await toggle.focus();await toggle.press('Enter');
     assert.equal(await toggle.evaluate(el=>el.getRootNode().activeElement===el),true,'number toggle should remain focused after redraw');
     await toggle.press('Enter');
     assert.equal(await toggle.evaluate(el=>el.getRootNode().activeElement===el),true,'number toggle focus after hide');
     assert.equal(await sources.evaluate(e=>e.open),true,'provenance disclosure remains open on redraw');
     assert.equal(await evidence.evaluate(e=>e.open),true,'evidence disclosure remains open on redraw');
     const rofDraft=result.locator('[data-rof-correct-score]');
     if(await rofDraft.count()){
      const method=result.locator('.rv4-fatigue-method');
      await method.evaluate(el=>el.open=true);
      await rofDraft.evaluate(el=>el.value='4');
      await toggle.press('Enter');
      assert.equal(await rofDraft.inputValue(),'4','unsaved ROF-J correction is not discarded by a body redraw');
      assert.equal(await method.evaluate(el=>el.open),true,'ROF-J explanation remains open without submitting a correction');
     }
     const path=result.locator('.rv4-body-svg [data-region]').first();
     const regionId=await path.getAttribute('data-region');
     await path.focus();await path.press('Enter');
     assert.equal(await result.locator('.rv4-body-svg [data-region="'+regionId+'"]').evaluate(el=>el.getRootNode().activeElement===el),true,
       'selected anatomy path should stay keyboard-focused');
     await result.locator('[data-picker-toggle]').click();
     const choice=result.locator('.rv4-choices [data-region]').first();
     const choiceId=await choice.getAttribute('data-region');
     await choice.focus();await choice.press('Enter');
     assert.equal(await result.locator('.rv4-choices [data-region="'+choiceId+'"]').evaluate(el=>el.getRootNode().activeElement===el),true,
       'region picker choice should stay focused');
     await result.locator('[data-picker-toggle]').click();
     assert.equal(await sources.evaluate(el=>el.open),true,'source disclosure survives region picker');
     assert.equal(await evidence.evaluate(el=>el.open),true,'region evidence remains visible after changing region');
    }
    if(tab==='fatigue'&&width===390&&zoom===200){
     const optional=result.locator('.rv4-mental-details');
     if(await optional.count()){
      assert.equal(await optional.evaluate(e=>e.open),false,'no optional response is forced open');
      await optional.locator('summary').click();
      assert.equal(await optional.evaluate(e=>e.open),true,'optional response is reachable by user action');
      await page.screenshot({path:resolve(out,engine+'-'+language+'-390-200-fatigue-optional-open.png'),animations:'disabled',fullPage:true});
      await optional.locator('summary').click();
     }
    }
    if(tab==='body'&&[390,1440].includes(width))for(const view of ['back','sole']){
     await result.locator('[data-view="'+view+'"]').click();
     await capture(page,{language,width,zoom,tab,view});
    }
   }

   if((width===390&&zoom===100)||(width===1440&&zoom===200)){
    await auditC1Body(page,result,language,width,zoom);
    if(width===390&&zoom===100)await auditC1SavedStates(page,result,language);
   }

   if(width===320&&zoom===200){
    // User-reported case: exercise names inside composite choices/cards and
    // fixed same-region labels must be bilingual without translating user data.
    const secondId=await page.evaluate(async()=>{
     const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
     const v=await c.mutate(state=>m.saveManualRun(state,{date:'2026-11-16',
      distance:'5',hours:'',minutes:'28',seconds:'',activityGait:'RUNNING',
      runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN'}));
     if(!v.ok)throw Error(v.reason);return v.record.id;
    });
    await page.goto(base+'result?record='+encodeURIComponent(secondId),{waitUntil:'networkidle'});
    await result.locator('[data-tab="radar"]').click();
    await result.locator('[data-compare-select]').selectOption(id);
    await result.locator('.rv4-region-compare-stats').waitFor({state:'attached'});
    await page.waitForTimeout(250);
    const languageAudit=await result.evaluate(host=>{
     const root=host.shadowRoot;
     const read=selector=>[...root.querySelectorAll(selector)].map(e=>e.textContent.trim());
     return {choice:read('[data-compare-select] option:checked'),
      source:read('.rv4-compare-summary span'),
      labels:read('.rv4-region-compare-stats>div>small'),
      unit:read('.rv4-region-compare-change em'),
      currentDate:read('.rv4-region-compare-stats time')};
    });
    assert.equal(languageAudit.choice.length,1,'comparison record stays selected');
    assert.equal(languageAudit.source.length,2,'both saved-record sources remain');
    assert.equal(languageAudit.labels.length,3,'two reference values and a difference remain');
    assert.equal(languageAudit.unit.length,1,'difference unit remains visible');
    if(language==='en'){
     assert.match(languageAudit.choice[0],/Running/,'option activity is English');
     for(const s of [...languageAudit.choice,...languageAudit.source,
       ...languageAudit.labels,...languageAudit.unit])
      assert.doesNotMatch(s,/[ぁ-ゟァ-ヿ一-龯]/,'English comparison contains Japanese UI copy: '+s);
     assert.deepEqual(languageAudit.labels,['Comparison Record','Current Record','Reference Value Difference']);
     assert.deepEqual(languageAudit.unit,['points']);
    }else{
     assert.match(languageAudit.choice[0],/ランニング/,'Japanese option stays Japanese');
     assert.deepEqual(languageAudit.labels,['比較相手','選択中','参考値の差']);
     assert.deepEqual(languageAudit.unit,['ポイント']);
    }

    const extended=await result.evaluate(host=>{
     const root=host.shadowRoot;
     const read=selector=>[...root.querySelectorAll(selector)].map(e=>e.textContent.trim());
     return {table:read('.rv4-comparison-table th,.rv4-comparison-table td'),
      method:read('.rv4-region-compare-method p'),caution:read('.rv4-comparison-caution p'),
      memoLabels:read('.rv4-comparison-memos small'),memos:read('.rv4-comparison-memos p')};
    });
    if(language==='en'){
     for(const text of Object.values(extended).flat())
      assert.doesNotMatch(text,/[ぁ-ゟァ-ヿ一-龯]/,'untranslated comparison UI: '+text);
     assert.deepEqual(extended.memos,['No Notes','No Notes']);
     assert.ok(extended.method.some(x=>x.includes('reference values')));
    }else{
     assert.deepEqual(extended.memos,['メモなし','メモなし']);
     assert.ok(extended.table.some(x=>x.includes('比較相手 2026-11-15')));
    }
    assert.deepEqual(languageAudit.currentDate,['2026-11-15','2026-11-16'],
     'comparison dates are never translated or reordered');
    await page.screenshot({path:resolve(out,engine+'-'+language+'-320-200-comparison-language.png'),
     animations:'disabled',fullPage:false});
   }
   if(language==='ja'&&width===390&&zoom===200){
    // A separate saved run is a new mount: never carry an unsaved correction or
    // an expanded disclosure into a different record.
    const nextId=await page.evaluate(async()=>{
     const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
     const res=await c.mutate(state=>m.saveManualRun(state,{date:'2026-11-16',distance:'3',hours:'',minutes:'18',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:2,rofAfter:null,stepsProvenance:'UNKNOWN'}));
     if(!res.ok)throw Error(res.reason);
     return res.record.id;
    });
    await page.goto(base+'result?record='+encodeURIComponent(nextId),{waitUntil:'networkidle'});
    await result.locator('.rv4-hero-sources').waitFor({state:'attached'});
    assert.equal(await result.locator('.rv4-hero-sources').evaluate(el=>el.open),false,
      'disclosure state must not leak to another saved record');
    const newCorrection=result.locator('[data-rof-correct-score]');
    if(await newCorrection.count())assert.equal(await newCorrection.inputValue(),'',
      'unsaved ROF-J draft must not leak to another saved record');
   }
   assert.deepEqual(errors,[]);
  }catch(error){failures.push({language,width,zoom,error:String(error)});}
  finally{await context.close();}
 }
}finally{
 await writeFile(resolve(out,engine+'-measurements.json'),JSON.stringify({engine,report,failures,totals:{captures:report.length,failedScenarios:failures.length,documentOverflow:report.filter(x=>x.metrics.documentWidth>x.meta.width+2).length,textLeaks:report.filter(x=>x.metrics.leaks.length).length}},null,2));
 await browser.close();await new Promise(ok=>server.close(ok));
}
if(failures.length)throw Error('S09 scenarios '+JSON.stringify(failures));
console.log('S09 '+engine+' '+report.length+' captures');
