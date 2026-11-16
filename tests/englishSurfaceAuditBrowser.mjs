/** Read-only English UI residue inventory for the actual Current screen routes.
 * Japanese legal originals, explicit Japanese-language choices, and saved user text
 * are intentionally excluded from untranslated-UI counts, not modified.
 * S19/S20 are cross-cutting states, not fictitious standalone pages.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const auditWidth=Number(process.env.RUNLOAD_ENGLISH_AUDIT_WIDTH||390);
if(![320,375,390,414,768,1024,1440].includes(auditWidth))throw Error('English audit: unexpected width');
const font200=process.env.RUNLOAD_ENGLISH_FONT200==='1';
const captureAll=process.env.RUNLOAD_STAGE7_CAPTURE_ALL==='1';
const out=resolve(root,'audit-output','english-surface-'+engine+'-'+auditWidth+(font200?'-font200':''));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const absolute=resolve(root,'.'+path);
  if(absolute!==root&&!absolute.startsWith(root+sep))throw Error('outside root');
  const file=absolute===root?resolve(root,'index.html'):absolute;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(out,{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const host='http://127.0.0.1:'+server.address().port+'/#/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const reports=[],scriptErrors=[];
let screenshotCount=0;
async function record(page,screen,route,selector){
 if(route)await page.goto(host+route,{waitUntil:'networkidle'});
 await page.locator(selector).first().waitFor({timeout:20000});
 if(font200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 await page.waitForFunction(()=>document.documentElement.lang==='en',null,{timeout:20000});
 // The locale adapter runs on microtasks after async screen/Shadow DOM mounting.
 await page.waitForTimeout(160);
 const sample=await page.evaluate(()=>{
  const jp=/[ぁ-ゟァ-ヿ一-龯]/,found=new Set();
  const ignore='script,style,code,pre,noscript,[data-onboard-language="ja"],[data-settings-language="ja"],[data-legal-backdrop],.fu-doc-scroll,[data-user-authored],.rv4-note p,.rv4-comparison-memos,.ex-note-preview,.ex-saved,.entry-caption,[data-report-purpose],[data-report-observation],[data-report-question],.cp-condition strong,#cp-target,.cp-report-mode-usertext';
  const ignored=el=>!!el?.closest(ignore);
  const shown=el=>!!el&&el.getClientRects().length>0&&!el.closest('[hidden],[aria-hidden="true"]');
  function inspect(scope){
   const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
   while(w.nextNode()){
    const el=w.currentNode.parentElement,s=w.currentNode.data.replace(/\s+/g,' ').trim();
    if(!s||!jp.test(s)||ignored(el)||!shown(el))continue;
    found.add('TEXT '+el.tagName.toLowerCase()+': '+s.slice(0,180));
   }
   const all=scope.querySelectorAll('*');
   for(const el of all){
    if(el.shadowRoot)inspect(el.shadowRoot);
    if(ignored(el)||!shown(el))continue;
    for(const attr of ['aria-label','aria-valuetext','title','alt','placeholder']){
     const s=(el.getAttribute(attr)||'').trim();
     if(s&&jp.test(s))found.add(attr.toUpperCase()+' '+el.tagName.toLowerCase()+': '+s.slice(0,180));
    }
   }
  }
  inspect(document.body);
  // Text ranges, not just the document's scrollWidth, detect the iPhone bug:
  // a nowrap label can paint *over the neighboring card* without widening
  // the page or its grid cell.
  const conditionStats=[...document.querySelectorAll('.hx-condition-stats > div')];
  const cardTextOverflow=[];
  for(let i=0;i<conditionStats.length;i++){
   const card=conditionStats[i],frame=card.getBoundingClientRect();
   for(const label of card.querySelectorAll('small,strong,.hx-wake-time')){
    if(!shown(label))continue;
    const range=document.createRange();range.selectNodeContents(label);
    for(const box of range.getClientRects()){
     if(box.width<=0)continue;
     if(box.left<frame.left+1||box.right>frame.right-1){
      cardTextOverflow.push({card:i+1,text:label.textContent.trim().slice(0,85),
       left:Math.round(box.left),right:Math.round(box.right),
       cardLeft:Math.round(frame.left),cardRight:Math.round(frame.right)});
     }
    }
   }
  }
  // Check text paint *inside* record cards. A clipped flex child may leave
  // document.scrollWidth unchanged, so page-level overflow alone is insufficient.
  const recordTextClipping=[];
  const checkTextWithin=(item,frame,context)=>{
   if(!shown(item))return;
   const range=document.createRange();range.selectNodeContents(item);
   for(const part of range.getClientRects()){
    if(part.width<=0)continue;
    if(part.left<frame.left-2||part.right>frame.right+2)
     recordTextClipping.push({context,text:item.textContent.trim().slice(0,80),
      left:Math.round(part.left),right:Math.round(part.right),
      frameLeft:Math.round(frame.left),frameRight:Math.round(frame.right)});
   }
  };
  for(const [i,card] of [...document.querySelectorAll('.rv-method-card')].entries()){
   const rect=card.getBoundingClientRect();
   for(const label of card.querySelectorAll('strong,small'))checkTextWithin(label,rect,'method '+i);
  }
  for(const badge of document.querySelectorAll('.rv-manual .rv-section-title small')){
   const panel=badge.closest('.rv-panel');
   if(panel)checkTextWithin(badge,panel.getBoundingClientRect(),'manual required/optional');
  }
  for(const label of document.querySelectorAll('.rv-manual .rv-link-content small')){
   if(shown(label)&&label.scrollWidth>label.clientWidth+3)
    recordTextClipping.push({context:'manual optional detail',text:label.textContent.trim().slice(0,80),
     scrollWidth:label.scrollWidth,clientWidth:label.clientWidth});
  }
  const overflowNodes=document.documentElement.scrollWidth>innerWidth+3
   ?[...document.body.querySelectorAll('*')].filter(el=>{
     const rect=el.getBoundingClientRect();
     return rect.right>innerWidth+3&&rect.left<innerWidth&&rect.width>0&&el.getClientRects().length;
    }).map(el=>{
     const r=el.getBoundingClientRect();
     return {tag:el.tagName.toLowerCase(),class:String(el.className?.baseVal??el.className??'').slice(0,115),
      right:Math.round(r.right),left:Math.round(r.left),width:Math.round(r.width),
      scrollWidth:el.scrollWidth,minWidth:getComputedStyle(el).minWidth,
      text:(el.textContent||'').replace(/\s+/g,' ').slice(0,90)};
    }).sort((a,b)=>b.right-a.right).slice(0,30):[];
  const latestMetricOverlap=[];
  for(const [i,card] of [...document.querySelectorAll('.hx-latest-fig>div')].entries()){
   const frame=card.getBoundingClientRect();
   for(const label of card.querySelectorAll('small,strong,em')){
    if(!shown(label))continue;
    const range=document.createRange();range.selectNodeContents(label);
    for(const box of range.getClientRects()){
     if(box.width>0&&(box.left<frame.left-2||box.right>frame.right+2))
      latestMetricOverlap.push({metric:i+1,text:label.textContent.trim().slice(0,45),left:Math.round(box.left),right:Math.round(box.right),frameLeft:Math.round(frame.left),frameRight:Math.round(frame.right)});
    }
   }
  }
  const navLabels=[...document.querySelectorAll('.mobile-nav .mobile-link')]
   .filter(el=>el.getClientRects().length>0).map(el=>{
     const text=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
     if(!text)return {text:'',fragments:0,outside:true};
     const range=document.createRange();range.selectNodeContents(text);
     const parts=[...range.getClientRects()],parent=el.getBoundingClientRect();
     return {text:text.textContent.trim(),fragments:parts.length,
      outside:parts.some(r=>r.left<parent.left-1||r.right>parent.right+1)};
   });
  const frame=el=>{if(!el)return null;const r=el.getBoundingClientRect(),c=getComputedStyle(el);
   return {left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),
    scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,minWidth:c.minWidth,
    overflowX:c.overflowX,fontSize:c.fontSize,gridColumns:c.gridTemplateColumns};
  };
  const suspectSelectors=['html','body','#app','.app-shell','.main-frame','.main-content',
   '.record-v3','.rv-head','.rv-screen-help','.rv4-page','.lr-root','.lr-lesson','.lr-page-heading',
   '.lr-screen-help','.lr-chapter'];
  const layoutDiagnostics=Object.fromEntries(suspectSelectors.map(key=>[key,frame(document.querySelector(key))]));
  const internalScroll=[...document.body.querySelectorAll('*')].filter(el=>{
    return el.clientWidth>0&&el.scrollWidth>el.clientWidth+4&&
      el.getBoundingClientRect().top<1200;
   }).map(el=>({tag:el.tagName.toLowerCase(),
    class:String(el.className?.baseVal??el.className??'').slice(0,65),
    delta:el.scrollWidth-el.clientWidth,
    rect:frame(el)})).sort((a,b)=>b.delta-a.delta).slice(0,20);
  return {remaining:[...found].sort(),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   overflowNodes,statsCount:conditionStats.length,cardTextOverflow,recordTextClipping,latestMetricOverlap,title:document.title,
   lang:document.documentElement.lang,navLabels,layoutDiagnostics,internalScroll};
 });
 reports.push({screen,route:route||'(in-place)',mode:font200?'root-font-200':'normal',...sample});
 console.log('ENGLISH-SURFACE '+engine+' '+screen+' remaining='+sample.remaining.length+' overflow='+Math.max(0,sample.scrollWidth-sample.width)+' samples='+JSON.stringify(sample.remaining.slice(0,14)));
 if(sample.overflowNodes.length)console.log('ENGLISH-OVERFLOW '+engine+' '+auditWidth+' '+screen+' '+JSON.stringify(sample.overflowNodes));
 if(sample.scrollWidth>sample.width+3)console.log('STAGE7-LAYOUT '+engine+' '+auditWidth+' '+screen+' '+JSON.stringify({frames:sample.layoutDiagnostics,inner:sample.internalScroll}));
 if(sample.cardTextOverflow.length)console.log('ENGLISH-CARD-OVERLAP '+engine+' '+auditWidth+' '+screen+' '+JSON.stringify(sample.cardTextOverflow));
 if(sample.recordTextClipping.length)console.log('RECORD-INTERNAL-CLIPPING '+engine+' '+auditWidth+' '+screen+' '+JSON.stringify(sample.recordTextClipping));
 if(captureAll || ((sample.remaining.length||sample.cardTextOverflow.length)&&screenshotCount<6)){
  screenshotCount++;
  await page.screenshot({path:resolve(out,screen.replace(/[^a-zA-Z0-9-]/g,'_')+(captureAll?'-full':'-untranslated')+'.png'),fullPage:true,animations:'disabled'});
 }
}
try{
 const first=await browser.newContext({viewport:{width:auditWidth,height:auditWidth===1440?900:844},reducedMotion:'reduce',serviceWorkers:'block'});
 const splash=await first.newPage();
 splash.on('pageerror',e=>scriptErrors.push('S01 '+e.message));
 await splash.goto(host+'home',{waitUntil:'networkidle'});
 await splash.locator('[data-onboard-language="en"]').click();
 await splash.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Display Language');
 await record(splash,'S01','', '[data-onboard-overlay]');
 await splash.locator('[data-onboard-next]').click();
 await splash.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Terms of Use and Privacy');
 await record(splash,'S01-consent','', '[data-onboard-legal-step]');
 await first.close();

 const ctx=await browser.newContext({viewport:{width:auditWidth,height:auditWidth===1440?900:844},reducedMotion:'reduce',serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'en'}));
  localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:'en'}));
 });
 const page=await ctx.newPage();page.on('pageerror',e=>scriptErrors.push(e.message));
 await page.goto(host+'home',{waitUntil:'networkidle'});
 await page.locator('.home-v3').waitFor();
 const id=await page.evaluate(async()=>{
  const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
  const ready=await c.initialize();if(!ready.ok)throw Error('canonical initialization: '+ready.reason);
  const saved=await c.mutate(s=>m.saveManualRun(s,{
   date:'2026-11-11',distance:'6',hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',
   runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   memo:'runner-authored note',courseName:'',shoeName:''
  }));
  if(!saved.ok)throw Error('saved record: '+saved.reason);return saved.record.id;
 });
 await page.reload({waitUntil:'networkidle'});
 const simple=[
  ['S02','home','.home-v3'],
  ['S03','record-start','.rv-method'],
  ['S04','record','.rv-manual'],
  ['S05','record-course','main'],
  ['S06','record-rof','[data-rof-v4-root]'],
  ['S07','record-more','main']
 ];
 for(const [screen,route,selector] of simple)await record(page,screen,route,selector);
 await page.goto(host+'record',{waitUntil:'networkidle'});
 await page.locator('[data-draft="distance"]').fill('5');
 await page.locator('[data-draft="minutes"]').fill('30');
 await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.locator('[data-demo-save]').click();
 await record(page,'S08','', '[data-record-review]');
 await record(page,'S09','result?record='+encodeURIComponent(id),'#runload-result-v4');
 await record(page,'S10','history','#runload-history-v2');
 await record(page,'S11','exploration-tree','[data-experience-v3]');
 await record(page,'S12','exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ'),'.ex-observation-guide');
 await page.locator('.ex-learning [data-ex-action="note"]').click();
 await record(page,'S13','', '.ex-dialog');
 await record(page,'S14','condition','#condition-journey');
 await record(page,'S15','consultation','#runload-consultation');
 await record(page,'S16','settings','[data-settings-v2]');
 await record(page,'S17','measurement','[data-measurement-v2],.gps-platform-unavailable');
 await page.goto(host+'result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
 await page.locator('#runload-result-v4 .rv4-export-menu summary').click();
 await record(page,'S19','', '#runload-result-v4 .rv4-export-menu');
 await page.goto(host+'settings',{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 await record(page,'S20','', '[data-settings-v2]');
 await page.evaluate(()=>{document.documentElement.style.fontSize='';});
 // The previous screen audit omitted the learning CATALOGUE, where
 // generated checklist counts and course-number subtitles were left in Japanese.
 await record(page,'LEARNING-CATALOG','learning','#runload-learning .lr-catalog');
 await record(page,'LEARNING-LESSON','learning?lesson=pace-basics','.lr-lesson');
 await ctx.close();
 const mainReports=reports.filter(x=>/^S\d\d$/.test(x.screen));
 assert.equal(mainReports.length,19,'all 19 active screen states must be observed');
 assert.equal(reports.find(x=>x.screen==='S02')?.statsCount,3,'three actual Home condition summary cards must be checked');
 assert.equal(reports.some(x=>x.screen==='LEARNING-CATALOG'),true,'learning catalogue is a mandatory English surface');
 assert.equal(reports.some(x=>x.screen==='LEARNING-LESSON'),true,'learning detail is a mandatory English surface');
 assert.deepEqual(scriptErrors,[],'browser JavaScript exceptions');
 const leftover=reports.flatMap(entry=>entry.remaining.map(text=>entry.screen+': '+text));
 assert.deepEqual(leftover,[],'all inspected visible English UI must be translated, excluding legal originals and user text');
 const cardOverlaps=reports.flatMap(entry=>entry.cardTextOverflow.map(hit=>({screen:entry.screen,...hit})));
 assert.deepEqual(cardOverlaps,[],'translated Home summary text must stay inside its own card, not overlap neighbors');
 const recordClips=reports.flatMap(entry=>entry.recordTextClipping.map(hit=>({screen:entry.screen,...hit})));
 assert.deepEqual(recordClips,[],'record method and optional information must be fully visible inside their cards');
 const overflow=reports.filter(entry=>entry.scrollWidth>entry.width+3);
 assert.deepEqual(overflow,[],'English UI must not horizontally overflow at the audited viewport');
 const metricCollisions=reports.flatMap(entry=>entry.latestMetricOverlap.map(x=>({screen:entry.screen,...x})));
 assert.deepEqual(metricCollisions,[],'Latest Run summary text must stay within its own metric card under 200% text');
 const brokenNav=reports.flatMap(entry=>entry.navLabels.filter(x=>x.fragments!==1||x.outside).map(x=>({screen:entry.screen,...x})));
 assert.deepEqual(brokenNav,[],'English mobile nav labels must not split into fragments or overflow their targets');
}finally{
 const summary={engine,width:auditWidth,font200,scope:'English displayed copy inventory; Japanese legal original and user-authored data excluded',observed:reports.length,byScreen:reports,errors:scriptErrors,
  totalUntranslated:reports.reduce((sum,x)=>sum+x.remaining.length,0),
  totalCardOverlaps:reports.reduce((sum,x)=>sum+x.cardTextOverflow.length,0),
  totalRecordTextClipping:reports.reduce((sum,x)=>sum+x.recordTextClipping.length,0),
  excludedFromCertification:['physical iOS/Android','official English legal equivalence','unvisited error and permission states','PNG content tested independently in englishUiBrowser.mjs']};
 await writeFile(resolve(out,'report.json'),JSON.stringify(summary,null,2));
 console.log('ENGLISH-SURFACE-SUMMARY '+JSON.stringify({engine,width:auditWidth,font200,observed:summary.observed,totalUntranslated:summary.totalUntranslated,errors:summary.errors}));
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
