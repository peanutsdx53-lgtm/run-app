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
  const controls=[...(shadow?.querySelectorAll('.rv4-mobile-tabs button,.rv4-view-tabs button,.rv4-figure-actions button,.rv4-export-menu>summary')||[])].map(x=>({text:x.textContent.trim(),rect:rect(x),anatomy:!!x.closest('.rv4-view-tabs')}));
  const leaks=[];
  for(const x of shadow?.querySelectorAll('.rv4-reading h3,.rv4-reading small,.rv4-view-tabs button,.rv4-mobile-tabs button,.rv4-figure-actions button')||[]){
   if(!x.getClientRects().length)continue;
   const b=x.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(x);
   for(const r of range.getClientRects())if(r.width>.5&&(r.left<b.left-2||r.right>b.right+2))leaks.push({text:x.textContent.trim().slice(0,50),element:rect(x),textRect:rect({getBoundingClientRect:()=>r})});
  }
  const svg=one('.rv4-body-svg');
  const regions=svg?[...svg.querySelectorAll('[data-region]')].map(x=>{const b=x.getBBox();return {id:x.dataset.region,selected:x.classList.contains('selected'),x:b.x,y:b.y,w:b.width,h:b.height}}):[];
  const parts=['.rv4-hero','.rv4-notice','.rv4-body-figure','.rv4-body-svg','.rv4-reading','.rv4-fatigue','.rv4-history','.rv4-method-disclosure'].map(s=>({selector:s,rect:rect(one(s))}));
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
 }
 report.push({meta,metrics:m});
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
    if(tab==='body'&&[390,1440].includes(width))for(const view of ['back','sole']){
     await result.locator('[data-view="'+view+'"]').click();
     await capture(page,{language,width,zoom,tab,view});
    }
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
