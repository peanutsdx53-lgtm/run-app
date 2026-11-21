/** U-20261115-03/04: take Chromium/WebKit screenshots of condition, milestones, course and Learning surfaces.
 * All checks use isolated browser storage; scientific calculations and saved data are unchanged.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const output=resolve(root,'audit-output','focus-ui-'+engine);
await mkdir(output,{recursive:true});
const origin='http://127.0.0.1:'+server.address().port;
const findings=[];
const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
async function capture(page,name,lang,width){
 const info=await page.evaluate(()=>{
  const selectors=['.hx-dialog','.hx-dialog-head','.hx-dialog-head h2','.hx-dialog-close','.hx-ach-help','.rv-head','.rv-back','.rv-course-step','.lr-root','.lr-course'];
  const elements=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].slice(0,8).map(e=>{
   const r=e.getBoundingClientRect();return {selector,text:(e.innerText||'').slice(0,60),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
  }));
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,elements};
 });
 assert.ok(info.document<=width+2&&info.body<=width+2,name+' horizontal overflow '+JSON.stringify(info));
 for(const e of info.elements)if(e.width>0&&e.height>0)assert.ok(e.left>=-2&&e.right<=width+2,name+' visible control overflow '+JSON.stringify(e));
 await page.screenshot({path:resolve(output,name+'-'+lang+'-'+width+'.png'),fullPage:name.startsWith('course')||['learning','learning-lesson'].includes(name),animations:'disabled'});
 findings.push({engine,width,lang,name,...info});
 console.log('PASS FOCUSED',engine,width,lang,name);
}
try{
 for(const width of [320,390,768,1440]){
  for(const lang of ['ja','en']){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844},locale:lang==='ja'?'ja-JP':'en-US',reducedMotion:'reduce',serviceWorkers:'block'});
   await context.addInitScript(language=>{
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language}));
   },lang);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/#/home',{waitUntil:'networkidle'});
   await page.locator('.home-v3').waitFor();
   const shortcuts=page.locator('.hx-shortcuts');
   for(const dest of ['course','learning','consultation'])assert.equal(await shortcuts.locator('a[href="#/'+dest+'"]').count(),1,'shortcut '+dest);
   assert.equal(await shortcuts.locator('a[href="#/simulation"]').count(),0,'retired shortcut absent');
   assert.equal(await page.locator('.mobile-nav .mobile-link').count(),5,'five mobile navigation links');
   await page.locator('[data-condition-open]').click();
   const cond=page.locator('.hx-condition-dialog');await cond.waitFor();
   let measure=await cond.evaluate(e=>{
    const r=e.getBoundingClientRect(),h=e.querySelector('.hx-dialog-head'),b=h.getBoundingClientRect(),close=h.querySelector('button').getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,headerBottom:b.bottom,headerBackground:getComputedStyle(h).backgroundColor,close:{top:close.top,bottom:close.bottom,left:close.left,right:close.right}};
   });
   assert.ok(measure.left>=-1&&measure.right<=width+1,'condition modal fits');
   assert.ok(measure.close.top>=measure.top&&measure.close.bottom<=measure.headerBottom+1,'condition close within header');
   assert.ok(measure.headerBackground!=='rgba(0, 0, 0, 0)','condition header opaque');
   if(width<=800)assert.ok(measure.top>=82,'condition header below iOS top chrome '+JSON.stringify(measure));
   await capture(page,'condition',lang,width);
   await cond.locator('[data-home-close]').first().click();
   await page.locator('[data-achievement-open]').click();
   const ach=page.locator('.hx-ach-dialog');await ach.waitFor();
   assert.equal(await ach.locator('.hx-ach-milestone').count(),4,'four milestones');
   if(lang==='en'){
    const copy=await ach.locator('.hx-ach-summary').innerText();
    assert.match(copy,/Total Running Distance/,'English aggregate label');
    assert.match(copy,/0 Runs/,'English manual-run count');
    assert.doesNotMatch(copy,/累計走行距離| 件/,'untranslated aggregation');
   }
   assert.equal(await ach.locator('.hx-ach-limit').count(),0,'no always-visible long caveats');
   assert.equal(await ach.locator('.hx-ach-help[open]').count(),0,'details default closed');
   measure=await ach.evaluate(e=>({top:e.getBoundingClientRect().top,headBg:getComputedStyle(e.querySelector('.hx-dialog-head')).backgroundColor}));
   assert.ok(measure.headBg!=='rgba(0, 0, 0, 0)','achievement header opaque');
   if(width<=800)assert.ok(measure.top>=82,'milestones header below top chrome');
   await capture(page,'achievement',lang,width);
   if(width===390){
    await ach.locator('.hx-ach-help summary').click();
    assert.ok(await ach.locator('.hx-ach-help p').isVisible(),'limits can be read on demand');
    const helpBox=await ach.evaluate(dialog=>{
     const d=dialog.getBoundingClientRect(),h=dialog.querySelector('.hx-ach-help>p').getBoundingClientRect();
     return {dialog:{left:d.left,right:d.right},help:{left:h.left,right:h.right}};
    });
    assert.ok(helpBox.help.left>=helpBox.dialog.left-1&&helpBox.help.right<=helpBox.dialog.right+1,'milestone help must not be clipped '+JSON.stringify(helpBox));
    await capture(page,'achievement-help',lang,width);
   }
   await page.goto(origin+'/#/course',{waitUntil:'networkidle'});
   const course=page.locator('.rv-course');await course.waitFor();
   assert.equal(await course.locator('.rv-save-caption,.rv-commit-help').count(),0,'redundant course captions removed');
   assert.equal(await course.locator('.rv-course-step').count(),3,'course three sections remain');
   assert.equal(await course.locator('.rv-screen-help').count(),1,'course explanation accessible');
   if(lang==='en'){
    const bounds=await course.locator('.rv-condition-pair .rv-choice').evaluateAll(nodes=>nodes.map(e=>({text:e.innerText,scroll:e.scrollWidth,client:e.clientWidth})));
    for(const b of bounds)assert.ok(b.scroll<=b.client+2,'English choice label clipped: '+JSON.stringify(b));
   }
   if(lang==='en'&&width<=390){
    const grade=course.locator('.rv-step-slope .rv-choice-row.rv-four .rv-choice');
    const mode=course.locator('.rv-step-surface .rv-choice-row .rv-choice');
    assert.deepEqual(await grade.allInnerTexts(),['Unknown','Flat','By %','Segments']);
    await page.waitForFunction(()=>document.querySelector('[data-rv-grade="SUMMARY"]')?.getAttribute('aria-label')==='Set Uphill and Downhill Distance Shares',null,{timeout:9000});
    assert.equal(await course.locator('[data-rv-surface-mode="MIXED"]').getAttribute('aria-label'),'Set Distance Shares for Multiple Surfaces');
    assert.deepEqual(await mode.allInnerTexts(),['Unknown','Single','Mixed %']);
    const rects=async sel=>course.locator(sel).evaluateAll(els=>els.map(el=>{
     const r=el.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height,scroll:el.scrollWidth,client:el.clientWidth};
    }));
    const four=await rects('.rv-step-slope .rv-choice-row.rv-four .rv-choice');
    const three=await rects('.rv-step-surface .rv-choice-row .rv-choice');
    assert.ok(Math.max(...four.map(x=>x.y))-Math.min(...four.map(x=>x.y))<2,
     'normal English grade should fit one row '+JSON.stringify(four));
    assert.ok(Math.max(...three.map(x=>x.y))-Math.min(...three.map(x=>x.y))<2,
     'normal English surface mode should fit one row '+JSON.stringify(three));
    await course.locator('[data-rv-surface-mode="MIXED"]').click();
    const tiles=await rects('.rv-step-surface .rv-surface-tile');
    assert.equal(tiles.length,8,'surface options remain eight');
    assert.ok(Math.abs(tiles[0].y-tiles[1].y)<2,
     'surface tiles use two columns at normal text '+JSON.stringify(tiles));
    assert.ok(tiles.every(x=>x.scroll<=x.client+2),'surface tile text is not cut');
    assert.equal(await course.locator('[data-rv-surface="soil"]').getAttribute('aria-label'),'Compacted Dirt',
     'full surface name is available to assistive technology');
    await capture(page,'course-mixed',lang,width);
    await course.locator('[data-rv-surface-mode="UNKNOWN"]').click();
    await course.locator('[data-rv-grade="SUMMARY"]').click();
    const selectedStyle=await course.locator('[data-rv-grade="SUMMARY"]').evaluate(el=>{
     const x=getComputedStyle(el);return {fg:x.color,bg:x.backgroundColor,pressed:el.getAttribute('aria-pressed')};
    });
    assert.deepEqual(selectedStyle,{fg:'rgb(5, 41, 57)',bg:'rgb(57, 207, 208)',pressed:'true'});
    await page.waitForFunction(()=>document.querySelector('.rv-step-slope .rv-fine-top>strong')?.textContent==='Adjust Uphill',null,{timeout:9000});
    assert.equal(await course.locator('[data-rv-slope-number]').getAttribute('placeholder'),'—',
     'zoomed numeric blank placeholder must fit without implying zero');
    await capture(page,'course-selected',lang,width);
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    const zoom=await rects('.rv-step-slope .rv-choice-row.rv-four .rv-choice');
    assert.ok(zoom.every(x=>x.scroll<=x.client+2),'font200 labels fit '+JSON.stringify(zoom));
    await capture(page,'course-font200',lang,width);
    await page.evaluate(()=>document.documentElement.style.fontSize='');
    await course.locator('[data-rv-grade="UNKNOWN"]').click();
   }
   await capture(page,'course',lang,width);
   if(width===390){
    await course.locator('.rv-screen-help summary').click();
    assert.ok(await course.locator('.rv-screen-help p').isVisible());
    await capture(page,'course-help',lang,width);
   }
   await page.goto(origin+'/#/learning',{waitUntil:'networkidle'});
   const learning=page.locator('#runload-learning .lr-catalog');await learning.waitFor();
   assert.equal(await learning.locator('.lr-course').count(),3,'three approved core lessons remain');
   await capture(page,'learning',lang,width);
   if(width===390){
    await page.goto(origin+'/#/learning?lesson=pace-basics',{waitUntil:'networkidle'});
    await page.locator('#runload-learning .lr-lesson').waitFor();
    await capture(page,'learning-lesson',lang,width);
   }
   await page.goto(origin+'/#/simulation',{waitUntil:'networkidle'});
   await page.locator('.home-v3').waitFor();
   assert.equal(await page.locator('[data-sim-page]').count(),0,'retired URL never renders removed feature');
   assert.deepEqual(errors,[],'uncaught page errors '+lang+' '+width);
   await context.close();
  }
 }
 await writeFile(resolve(output,'measurements.json'),JSON.stringify({engine,scenarios:findings.length,findings},null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
