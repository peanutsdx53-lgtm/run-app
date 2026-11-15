/** U-20261115-03/04: take real Chromium/WebKit screenshots of four revised surfaces.
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
  const selectors=['.hx-dialog','.hx-dialog-head','.hx-dialog-head h2','.hx-dialog-close','.hx-ach-help','.rv-head','.rv-back','.sm-heading','.sm-back','.sm-back svg','.sm-steps','.rv-course-step','.sm-panel'];
  const elements=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].slice(0,8).map(e=>{
   const r=e.getBoundingClientRect();return {selector,text:(e.innerText||'').slice(0,60),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
  }));
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,elements};
 });
 assert.ok(info.document<=width+2&&info.body<=width+2,name+' horizontal overflow '+JSON.stringify(info));
 for(const e of info.elements)if(e.width>0&&e.height>0)assert.ok(e.left>=-2&&e.right<=width+2,name+' visible control overflow '+JSON.stringify(e));
 await page.screenshot({path:resolve(output,name+'-'+lang+'-'+width+'.png'),fullPage:name==='course'||name==='simulation',animations:'disabled'});
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
   await capture(page,'course',lang,width);
   if(width===390){
    await course.locator('.rv-screen-help summary').click();
    assert.ok(await course.locator('.rv-screen-help p').isVisible());
    await capture(page,'course-help',lang,width);
   }
   await page.goto(origin+'/#/simulation',{waitUntil:'networkidle'});
   const sim=page.locator('.sm-page');await sim.waitFor();
   assert.equal(await sim.locator('.sm-step-head').count(),4,'all simulation steps remain');
   assert.equal(await sim.locator('.sm-note').count(),0,'duplicate simulation captions removed');
   const back=await sim.locator('.sm-back').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('svg').getBoundingClientRect();return {boxCenter:[r.left+r.width/2,r.top+r.height/2],glyphCenter:[s.left+s.width/2,s.top+s.height/2],width:r.width,height:r.height}});
   assert.ok(Math.abs(back.boxCenter[0]-back.glyphCenter[0])<=1&&Math.abs(back.boxCenter[1]-back.glyphCenter[1])<=1,'SVG back arrow centered '+JSON.stringify(back));
   await capture(page,'simulation',lang,width);
   if(width===390){
    await sim.locator('.rl-screen-help summary').click();
    assert.ok(await sim.locator('.rl-screen-help p').isVisible());
    await capture(page,'simulation-help',lang,width);
   }
   assert.deepEqual(errors,[],'uncaught page errors '+lang+' '+width);
   await context.close();
  }
 }
 await writeFile(resolve(output,'measurements.json'),JSON.stringify({engine,scenarios:findings.length,findings},null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
