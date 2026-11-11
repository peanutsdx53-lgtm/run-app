/** Screenshot-driven bilingual acceptance of redesigned Results and optional post-hoc screen.
 * Uses only synthetic records and captures complete real SPA pages in Chromium / WebKit.
 * A pass checks geometry and semantic safety; screenshots must also be reviewed visually.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browserType=engine==='webkit'?webkit:chromium;
const output=resolve(root,'audit-output','result-annotation-bilingual',engine);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),p=decodeURIComponent(url.pathname),f=resolve(root,'.'+p);
  if(f!==root&&!f.startsWith(root+sep))throw Error('outside project');
  const file=f===root?resolve(root,'index.html'):f;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(output,{recursive:true});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port+'/';
const browser=await browserType.launch({headless:true});
const report=[],errors=[];
const widths=[320,390,768,1440];
const scenarios=[...widths.map(width=>({width,zoom:false})),{width:390,zoom:true}];
function flat(node){return node.replace(/\s+/g,' ').trim()}
async function layout(page,scene,name,locale){
 const metrics=await page.evaluate(()=>{
  const style=getComputedStyle(document.querySelector('.main-content'));
  const root=document.querySelector('[data-ax-editor]');
  const result=document.querySelector('#runload-result-v4')?.shadowRoot;
  const get=el=>el?(()=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};})():null;
  const hero=result?.querySelector('.rv4-hero'),notice=result?.querySelector('.rv4-notice');
  const hdr=result?.querySelector('.rv4-header'),tabs=result?.querySelector('.rv4-mobile-tabs');
  const source=root?.querySelector('.ax-record');
  const docWidth=document.documentElement.scrollWidth;
  const visibleLines=(root?.innerText||'').split('\n').map(x=>x.trim()).filter(x=>/[ぁ-ゟァ-ヿ一-龯]/.test(x)).slice(0,20);
  const select=root?.querySelector('[data-ax-field]');
  const opt=select?.selectedOptions?.[0];
  const clip=select&&opt?(()=>{const c=document.createElement('canvas').getContext('2d');if(!c)return false;c.font=getComputedStyle(select).font;return c.measureText(opt.textContent||'').width>select.clientWidth-42})():false;
  return {width:innerWidth,docWidth,mainBackground:style.backgroundImage,mainColor:style.color,
   pageBackground:getComputedStyle(document.body).backgroundColor,hero:get(hero),notice:get(notice),header:get(hdr),tabs:get(tabs),summary:get(source),
   exposedId:root?/(run-v1-[0-9a-f-]{20,}|記録ID|操作ID|新しいID)/.test(root.innerText):false,
   visibleJapanese:visibleLines,selectedOptionClipped:clip,
   visibleHtmlText:root?.innerText?.slice(0,1800)||'',
   rootFont:getComputedStyle(document.documentElement).fontSize
  };
 });
 report.push({engine,locale,scene,name,...metrics});
 assert.ok(metrics.docWidth<=scene.width+3,'page overflow '+JSON.stringify({engine,locale,scene,name,metrics}));
 assert.equal(metrics.exposedId,false,'internal IDs must never be shown: '+engine+' '+locale+' '+name);
 if(name==='result'){
  assert.ok(metrics.hero&&metrics.notice&&metrics.hero.top<metrics.notice.top,'result data must precede supporting status');
  assert.ok(metrics.header&&metrics.hero.top>metrics.header.top,'result header precedes the data');
 }
 if(name.startsWith('annotation')){
  assert.ok(metrics.summary,'record summary must be available');
  if(locale==='en')assert.deepEqual(metrics.visibleJapanese,[],'English annotation must not show untranslated system labels');
  assert.equal(metrics.selectedOptionClipped,false,'selected item text must fit its native picker');
  assert.match(metrics.mainBackground,/gradient/,'annotation main background must use dark in-app palette');
 }
 console.log('BILINGUAL-LAYOUT '+JSON.stringify({engine,locale,width:scene.width,zoom:scene.zoom,name,docWidth:metrics.docWidth,exposedId:metrics.exposedId,heroBeforeStatus:metrics.hero&&metrics.notice?metrics.hero.top<metrics.notice.top:null}));
 return metrics;
}
try{
 for(const language of ['ja','en']){
  for(const scene of scenarios){
   const {width,zoom}=scene;
   const key=language+'-'+width+(zoom?'-font200':'');
   const context=await browser.newContext({viewport:{width,height:width>=768?900:844},reducedMotion:'reduce',serviceWorkers:'block'});
   await context.addInitScript(lang=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
   },language);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(language+' '+key+' '+e.message));
   try{
    await page.goto(origin+'#/record',{waitUntil:'networkidle'});
    const id=await page.evaluate(async()=>{
     const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
     const ok=await canonical.initialize();if(!ok.ok)throw Error('canonical init failed');
     const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
      date:'2026-11-11',distance:'5',hours:'',minutes:'35',seconds:'',
      activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,
      steps:'',stepsProvenance:'UNKNOWN',memo:'Synthetic verification note',
      courseName:'',shoeName:''
     }));
     if(!saved.ok)throw Error('synthetic run save failed '+saved.reason);
     return saved.record.id;
    });
    await page.goto(origin+'#/result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
    const result=page.locator('#runload-result-v4');
    await result.locator('.rv4-hero').waitFor({state:'visible',timeout:20000});
    await page.waitForFunction(l=>document.documentElement.lang===l,language,{timeout:20000});
    if(zoom)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    if(language==='en')await page.waitForFunction(()=>document.querySelector('#runload-result-v4')?.shadowRoot?.querySelector('.rv4-header h1')?.textContent==='Results',null,{timeout:20000});
    assert.equal(await result.locator('[data-tab]').count(),3,'preserve the original three result tabs');
    assert.deepEqual(await result.locator('.rv4-mobile-tabs [data-tab]').allTextContents(),language==='en'?['Body','Fatigue','Compare']:['身体','疲労感','過去と比較'],'three balanced localized tab titles');
    assert.equal(await result.locator('.rv4-next-path').count(),0,'remove large duplicate Explore CTA');
    assert.equal(await result.locator('.rv4-export-menu').count(),1,'single compact More menu');
    await layout(page,scene,'result',language);
    await page.screenshot({path:resolve(output,key+'-result-full.png'),fullPage:true,animations:'disabled'});
    await result.locator('.rv4-export-menu > summary').click();
    assert.equal(await result.locator('[data-posthoc-entry]').count(),1,'preserve optional annotation entry in More');
    await page.screenshot({path:resolve(output,key+'-result-menu.png'),fullPage:false,animations:'disabled'});
    await result.locator('[data-posthoc-entry]').click();
    await page.locator('[data-ax-editor]').waitFor({state:'visible',timeout:20000});
    if(zoom)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    await page.waitForFunction(l=>document.documentElement.lang===l,language,{timeout:20000});
    if(language==='en')await page.waitForFunction(()=>document.querySelector('.ax-heading h1')?.textContent==='Add Details (Optional)',null,{timeout:20000});
    assert.equal(await page.locator('[data-ax-field]').inputValue(),'','no unexpected selected private answer');
    assert.equal(await page.locator('.ax-record code').count(),0,'record ID must not be rendered');
    await layout(page,scene,'annotation-choice',language);
    await page.screenshot({path:resolve(output,key+'-annotation-choice-full.png'),fullPage:true,animations:'disabled'});
    await page.locator('[data-ax-field]').selectOption('bodyObservation');
    await page.locator('[data-ax-form]').waitFor({state:'visible',timeout:20000});
    await layout(page,scene,'annotation-input',language);
    await page.screenshot({path:resolve(output,key+'-annotation-input-full.png'),fullPage:true,animations:'disabled'});
    if(width===390&&!zoom){
     await page.locator('.ax-record-help summary').click();
     await page.screenshot({path:resolve(output,key+'-annotation-details.png'),fullPage:true,animations:'disabled'});
     await page.locator('.ax-record-help summary').click();
    }
    assert.deepEqual(errors,[],'JavaScript errors in bilingual screenshot acceptance');
   }finally{await context.close();}
  }
 }
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(resolve(output,'layout-report.json'),JSON.stringify({engine,report,errors},null,2));
 await browser.close();
 await new Promise(done=>server.close(done));
}
console.log('BILINGUAL-VISUAL-ACCEPTANCE '+JSON.stringify({engine,scenes:report.length,errors:errors.length,output}));
