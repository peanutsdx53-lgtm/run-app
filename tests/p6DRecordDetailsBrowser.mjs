/** P6-D: independent headless browser evidence of secondary recording views.
 * All records are disposable browser-only data, not research participants.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'screenshots','p6d');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),p=resolve(root,'.'+name);
  if(p!==root&&!p.startsWith(root+sep))throw Error('invalid path');
  const target=p===root?resolve(root,'index.html'):p;
  res.setHeader('Content-Type',types[extname(target)]||'application/octet-stream');res.end(await readFile(target));
 }catch{res.statusCode=404;res.end('not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const observations=[];
async function audit(page,width,label){
 const d=await page.evaluate(()=>{
  return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,height:document.documentElement.scrollHeight};
 });
 assert.ok(d.document<=width+3&&d.body<=width+3,label+' horizontal overflow '+JSON.stringify(d));
 return d;
}
async function shot(page,name,width){await page.screenshot({path:resolve(out,name+'-'+width+'.png'),fullPage:false,animations:'disabled'});}
async function checkHelp(page,selector,phrase){
 const el=page.locator(selector);assert.equal(await el.count(),1,'single header help');
 const trigger=el.locator('summary');assert.equal(await trigger.getAttribute('aria-label')!==null,true);
 await trigger.click();assert.match(await el.innerText(),phrase);await trigger.click();
}
async function zoomNav(page,width,label){
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 await audit(page,width,label+' at 200%-text');
 const nav=await page.evaluate(()=>{
  const menu=document.querySelector('.mobile-nav'),m=menu?.getBoundingClientRect();
  return {top:m?.top,bottom:m?.bottom,screenHeight:innerHeight,labels:[...(menu?.querySelectorAll('.mobile-link')||[])].map(x=>{
   const n=[...x.childNodes].find(v=>v.nodeType===Node.TEXT_NODE&&v.textContent.trim());
   if(!n)return null;
   const rg=document.createRange();rg.selectNodeContents(n);const b=rg.getBoundingClientRect();
   return {top:b.top,bottom:b.bottom,text:n.textContent.trim()};
  })};
 });
 assert.equal(nav.labels.length,6,'all six mobile routes');
 assert.ok(nav.top>=-1&&nav.bottom<=nav.screenHeight+1,label+' nav fits '+JSON.stringify(nav));
 assert.ok(nav.labels.every(x=>x&&x.top>=nav.top-1&&x.bottom<=nav.bottom-2),label+' nav labels fit '+JSON.stringify(nav));
 await shot(page,label+'-200percent',width);
 await page.evaluate(()=>{document.documentElement.style.fontSize=''});
}
try{
 for(const width of [320,390,430,768,1024,1440,1920]){
  const height=width>=1440?900:width>=768?1024:844;
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const go=async hash=>page.goto(base+hash,{waitUntil:'networkidle'});
  await go('#/record');await page.locator('.rv-manual').waitFor();
  await page.locator('[data-draft="date"]').fill('2026-10-24');
  await page.locator('[data-draft="distance"]').fill('5.20');
  await page.locator('[data-draft="minutes"]').fill('32.5');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  // S05: three ordered steps, a separately applied run and saved reusable course.
  await go('#/record-course');await page.locator('.rv-course').waitFor();
  assert.equal(await page.locator('.rv-course-step').count(),3);
  assert.equal(await page.locator('[data-rv-apply]').count(),1);
  assert.equal(await page.locator('[data-course-save]').count(),1);
  assert.equal(await page.locator('[data-rv-grade="FLAT"]').count(),1);
  await checkHelp(page,'.rv-course > .rv-head .rv-screen-help',/不明な条件/);
  await audit(page,width,'course');
  await shot(page,'course',width);
  if(width===320||width===390)await zoomNav(page,width,'course');
  await page.locator('[data-rv-grade="FLAT"]').click();
  await page.locator('[data-rv-apply]').click();
  await page.locator('.rv-manual').waitFor();
  // S06: five original ROF images; anchor reading never changes score.
  await go('#/record-rof');await page.locator('[data-rof-v4-root]').waitFor();
  const rof=page.locator('[data-rof-v4-root]');
  assert.equal(await rof.locator('[data-rof-v4-anchor]').count(),5);
  assert.equal(await rof.locator('[data-rof-v4-tick]').count(),11);
  assert.equal(await rof.locator('[data-rof-v4-phase]').count(),2);
  assert.equal(await rof.locator('.rv4-optional-meta').count(),1);
  assert.equal(await rof.locator('.rv4-rights').count(),1);
  await checkHelp(page,'.rv4-head .rv-screen-help',/代表イラストは説明用/);
  await rof.locator('[data-rof-v4-range]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0');
  await rof.locator('[data-rof-v4-anchor="4"]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0','illustration is read-only');
  await rof.locator('[data-rof-v4-phase="after"]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—','after score initially absent');
  await rof.locator('[data-rof-v4-phase="before"]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0');
  await audit(page,width,'rof');
  await shot(page,'rof',width);
  if(width===320||width===390)await zoomNav(page,width,'rof');
  // S07 gait: provenance and mixed run/walk restrictions are retained.
  await go('#/record-compare');await page.locator('[data-g4-page]').waitFor();
  const gait=page.locator('[data-g4-page]');
  assert.equal(await gait.locator('[data-g4-source]').count(),3);
  assert.equal(await gait.locator('[data-g4-format]').count(),3);
  assert.equal(await gait.locator('[data-g4-apply]').count(),1);
  await checkHelp(page,'.gait-v4 > .rv-head .rv-screen-help',/GPSから歩数を推定しません/);
  await gait.locator('[data-g4-format="RUN_WALK"]').click();
  await gait.locator('[data-g4-runwalk]').waitFor({state:'visible'});
  assert.match(await gait.locator('[data-g4-runwalk]').innerText(),/12部位文献参考値を算出せず/);
  await audit(page,width,'gait');
  await shot(page,'gait',width);
  if(width===320||width===390)await zoomNav(page,width,'gait');
  // S07 environment: choices are not saved until the user explicitly appends them.
  await go('#/record-environment');await page.locator('[data-e4-page]').waitFor();
  const env=page.locator('[data-e4-page]');
  assert.equal(await env.locator('[data-e4-weather]').count(),4);
  assert.equal(await env.locator('[data-e4-flag]').count(),2);
  assert.equal(await env.locator('[data-e4-commit]').count(),1);
  await checkHelp(page,'.environment-v4 > .rv-head .rv-screen-help',/移動や再読み込みで消えます/);
  const original=await env.locator('[data-draft="environmentNote"]').inputValue();
  await env.locator('[data-e4-weather="SUN"]').click();
  assert.equal(await env.locator('[data-draft="environmentNote"]').inputValue(),original,'no silent edit');
  assert.equal(await env.locator('[data-e4-commit]').isEnabled(),true);
  await env.locator('[data-e4-commit]').click();
  assert.notEqual(await env.locator('[data-draft="environmentNote"]').inputValue(),original,'explicit commit adds subjective note');
  await audit(page,width,'environment');
  await shot(page,'environment',width);
  if(width===320||width===390)await zoomNav(page,width,'environment');
  // S07 body: 12 regions across three views, optional note remains explicitly controlled.
  await go('#/record-reflection');await page.locator('[data-cx-page]').waitFor();
  const body=page.locator('[data-cx-page]');
  assert.equal(await body.locator('[data-map-view]').count(),3);
  assert.equal(await body.locator('[data-append-name]').isDisabled(),true);
  await checkHelp(page,'.cx-header .cx-screen-help',/診断や文献参考値の判定ではありません/);
  assert.doesNotMatch(await body.innerText(),/BODY MAP|走行ID|識別ID/);
  await body.locator('[data-picker-toggle]').click();
  await body.locator('[data-picker-id]').first().click();
  assert.equal(await body.locator('[data-draft="bodyObservation"]').inputValue(),'','no implicit note');
  await body.locator('[data-append-name]').click();
  assert.match(await body.locator('[data-draft="bodyObservation"]').inputValue(),/気になった部位/);
  await audit(page,width,'body');
  await shot(page,'body',width);
  if(width===320||width===390)await zoomNav(page,width,'body');
  // Legacy S07 additional section remains reachable rather than silently deleted.
  await go('#/record-more');await page.locator('.rv-aux').waitFor();
  assert.equal(await page.locator('.rv-aux .rv-screen-help').count(),1);
  assert.ok(await page.locator('.rv-aux .record-extra-section').count()>0);
  const legacy=await page.locator('.rv-aux .record-extra-section').first().evaluate(el=>{
   const bg=getComputedStyle(el).backgroundColor,summary=el.querySelector('summary');
   return {bg,color:getComputedStyle(summary).color};
  });
  assert.notEqual(legacy.color,'rgb(41, 77, 102)','legacy summary is now legible on dark');
  await audit(page,width,'record-more');
  await shot(page,'record-more',width);
  await page.locator('.rv-aux .record-extra-section > summary').first().click();
  assert.equal(await page.locator('.rv-aux .record-extra-section').first().getAttribute('open'),'');
  await audit(page,width,'record-more-open');
  await shot(page,'record-more-open',width);
  if(width===320||width===390)await zoomNav(page,width,'record-more');
  assert.deepEqual(errors,[],'no script errors at '+width);
  observations.push({width,height,course:3,rof:{ticks:11,anchors:5},gait:true,environmentExplicit:true,bodyViews:3,legacyMore:true,errors:0});
  await ctx.close();
 }
 console.log('P6D REAL SECONDARY RECORD EVIDENCE '+JSON.stringify(observations));
}finally{await browser.close();await new Promise(done=>server.close(done));}
