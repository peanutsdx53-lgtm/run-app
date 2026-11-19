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
  const svg=one('.rv4-body-svg');
  const regions=svg?[...svg.querySelectorAll('[data-region]')].map(x=>{const b=x.getBBox();return {id:x.dataset.region,selected:x.classList.contains('selected'),x:b.x,y:b.y,w:b.width,h:b.height}}):[];
  const parts=['.rv4-hero','.rv4-notice','.rv4-body-figure','.rv4-body-svg','.rv4-reading','.rv4-reference-scale-section','.rv4-fatigue','.rv4-history','.rv4-method-disclosure'].map(s=>({selector:s,rect:rect(one(s))}));
  return {viewport:innerWidth,documentWidth:doc.scrollWidth,bodyWidth:document.body.scrollWidth,rootFont:getComputedStyle(doc).fontSize,scrollHeight:doc.scrollHeight,
    nav:nav&&getComputedStyle(nav).display!=='none'?rect(nav):null,
    navComputed:nav?{height:getComputedStyle(nav).height,grid:getComputedStyle(nav).gridTemplateColumns,
      resultSelectorMatches:!!document.querySelector('.app-shell:has(#runload-result-v4) .mobile-nav'),
      firstLinkStyle:(()=>{const item=nav.querySelector('.mobile-link');return item?{fontSize:getComputedStyle(item).fontSize,display:getComputedStyle(item).display,whiteSpace:getComputedStyle(item).whiteSpace,rect:rect(item),html:item.outerHTML.slice(0,350)}:null;})()}:null,
    parts,controls,leaks,regions};
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
     const sources=result.locator('.rv4-hero-sources');
     await sources.locator('summary').click();
     assert.equal(await sources.evaluate(e=>e.open),true,'provenance explanation opens only by user action');
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
