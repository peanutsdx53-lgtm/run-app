/** P11 complete visible-learning-copy and navigation regression at 4 widths.
 * Evaluates rendered visible text after opening every chapter. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid path');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4699,'127.0.0.1',done));
const output=resolve(root,'audit-output','p11-unified');
await mkdir(output,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const host='http://127.0.0.1:4699/#/';
const reports=[];
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width>800?920:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function audit(route,selector,tag){
   await page.goto(host+route,{waitUntil:'networkidle'});
   await page.locator(selector).waitFor({timeout:20000});
   const layout=await page.evaluate(()=>{
    const nav=document.querySelector('.mobile-nav');
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,
     navItems:[...nav.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),top:a.getBoundingClientRect().top})),
     navTop:nav.getBoundingClientRect().top,navBottom:nav.getBoundingClientRect().bottom};
   });
   assert.ok(layout.scroll<=width+3,'horizontal overflow '+tag+' '+JSON.stringify(layout));
   assert.equal(layout.navItems.length,6,'six bottom nav destinations');
   if(width<=800){
    assert.ok(layout.navItems.every(x=>Math.abs(x.top-layout.navItems[0].top)<3),
     'six tabs remain one row at '+width);
    assert.ok(layout.navTop>=-1&&layout.navBottom<=844+1,'nav remains on viewport at '+width);
   }
   assert.equal(await page.locator('.rl-tools-menu').count(),0);
   assert.equal(await page.locator('.topbar .icon-install').count(),0);
   assert.equal(await page.locator('.topbar').isVisible(),false);
   assert.equal(await page.locator('.mobile-nav a[href="#/settings"]').count(),1);
   reports.push({route,engine,width,tag,ok:true,layout});
  }
  const headingSizes={};
  const recordScreenTitle=async selector=>Number(await page.locator(selector).evaluate(
   node=>parseFloat(getComputedStyle(node).fontSize)));
  await audit('home','.hx-shortcuts','home-quick-access');
  headingSizes.home=await recordScreenTitle('.home-v3 .home-head h1');
  const actionColors=await page.evaluate(()=>({
   condition:getComputedStyle(document.querySelector('.hx-condition .hx-right')).backgroundImage,
   achievement:getComputedStyle(document.querySelector('.hx-achievement .hx-right')).backgroundImage
  }));
  assert.equal(actionColors.condition,actionColors.achievement,
   'Condition and Achievement Open buttons should share the same approved background');
  const homeButtons=page.locator('.home-heading-actions > button');
  assert.deepEqual(await homeButtons.evaluateAll(all=>all.map(e=>
    e.hasAttribute('data-home-edit')?'edit':e.hasAttribute('data-home-guide-toggle')?'help':'other')),['edit','help']);
  assert.equal((await page.locator('[data-home-guide-toggle]').innerText()).trim(),'？');
  await page.locator('[data-home-guide-toggle]').click();
  assert.match(await page.locator('#home-screen-guide').innerText(),/走行を記録する/);
  await page.locator('[data-home-guide-toggle]').click();
  for(const to of ['course','simulation','consultation'])
   assert.equal(await page.locator('.hx-shortcuts a[href="#/'+to+'"]').count(),1,
    'Home quick-access entry must remain '+to);
  await audit('learning','.lr-catalog','learning-catalogue');
  headingSizes.learning=await recordScreenTitle('.lr-root .lr-page-heading h1');
  const learning=page.locator('.lr-root');
  assert.doesNotMatch(await learning.innerText(),/runload/i);
  const colors=await learning.locator('.lr-course').first().evaluate(el=>({
   bg:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color
  }));
  assert.match(colors.bg,/linear-gradient/,'theme must use dark navy/teal');
  assert.doesNotMatch(colors.bg,/#f7fbfc|#edf6f8/i,'legacy light hero');
  // P12: single top help and three layered cards with preserved lesson links.
  const courseCards=learning.locator('.lr-course');
  assert.equal(await courseCards.count(),3);
  assert.equal(await courseCards.locator('.lr-course-icon svg').count(),3);
  assert.equal(await learning.locator('.lr-pathway .lr-help-disclosure').count(),0);
  assert.equal(await learning.locator('.lr-page-heading .rl-screen-help').count(),1);
  await learning.locator('.lr-screen-help>summary').click();
  assert.match(await learning.locator('.lr-screen-help-content').innerText(),/学習でできること/);
  await learning.locator('.lr-screen-help>summary').click();
  await page.screenshot({path:resolve(output,engine+'-'+width+'-learning.png'),fullPage:true,animations:'disabled'});
  for(const [id,label,title] of [
   ['pace-basics','pace','平均ペースと区間ペース'],
   ['running-motion-basics','motion','走るときの脚の動き'],
   ['effort-fatigue-recovery','fatigue','走っているときのきつさ・疲労感・休養'],
   ['record-origin-missing','origin','記録の出所・欠測・後日申告']]){
   // Hash-only routing can finish after the previous lesson's open chapters
   // are still in the DOM. Wait for the NEW lesson title, not generic details.
   await audit('learning?lesson='+id,'.lr-lesson-title',label);
   await page.waitForFunction(expected=>
    document.querySelector('.lr-lesson-title')?.textContent?.includes(expected),title);
   assert.equal(await page.locator('.lr-lesson .lr-hero,.lr-progress-panel').count(),0);
    assert.equal(await page.locator('.lr-chapter[open]').count(),1,
    'new lesson starts with exactly one expanded chapter');
   assert.equal(await page.locator('.lr-lesson-map,[data-lr-expand-all]').count(),0);
   await page.locator('.lr-chapter').evaluateAll(chapters=>chapters.forEach(ch=>ch.open=true));
   const text=await page.locator('.lr-root').innerText();
   assert.doesNotMatch(text,/runload/i,'banned visible learning copy at '+label);
   assert.ok(text.length>300,'all chapters must remain available '+label);
   await page.screenshot({path:resolve(output,engine+'-'+width+'-'+label+'.png'),fullPage:false,animations:'disabled'});
  }
  await audit('exploration-tree','.ex-page','exploration');
  headingSizes.exploration=await recordScreenTitle('.ex-page .ex-heading h1');
  assert.equal(await page.locator('.ex-heading .ex-header-memo').count(),0);
  assert.equal(await page.locator('.ex-heading .ex-top-help').count(),1);
  assert.equal(await page.locator('.ex-reflection-footer [data-ex-action="memories"]').count(),1);
  await page.locator('.ex-reflection-footer [data-ex-action="memories"]').click();
  await page.locator('.ex-dialog').waitFor();
  assert.match(await page.locator('.ex-dialog').innerText(),/ふり返りノート/);
  await page.locator('.ex-dialog [data-ex-action="close"]').click();
  await audit('history','#runload-history-v2','history');
  headingSizes.history=await recordScreenTitle('#runload-history-v2 .hx-title-line h1');
  const historyHelp=page.locator('#runload-history-v2 .hx-title-line .rl-screen-help');
  assert.equal(await page.locator('.gps-history-shortcut').count(),0);
  const gpsDetails=page.locator('[data-gps-history-disclosure]');
  assert.equal(await gpsDetails.count(),1);
  assert.equal(await gpsDetails.evaluate(el=>el.open),false);
  const helpBounds=await historyHelp.boundingBox();
  const titleBounds=await page.locator('#runload-history-v2 .hx-title-line h1').boundingBox();
  assert.ok(helpBounds.x>titleBounds.x+titleBounds.width+30,'History help must be right aligned');
  await gpsDetails.locator(':scope > summary').click();
  assert.equal(await page.locator('[data-gps-history-tools]').count(),1);
  assert.equal(await page.locator('[data-gps-history-tools]').evaluate(el=>el.open),false);
  await gpsDetails.locator(':scope > summary').click();
  const gpsSize=await page.locator('.gps-history-section').evaluate(el=>{
   const s=getComputedStyle(el),sum=el.querySelector('details > summary');
   return {border:s.borderTopWidth,padding:s.paddingLeft,height:sum.getBoundingClientRect().height};
  });
  assert.equal(gpsSize.border,'0px','GPS disclosure must not be nested in a second bordered card');
  assert.equal(gpsSize.padding,'0px','GPS outer section should have no extra inset');
  assert.ok(gpsSize.height<=72,'GPS summary stays compact '+JSON.stringify(gpsSize));
  assert.equal(await page.locator('#runload-history-v2 .hx-title-line .rl-screen-help').count(),1);
  await audit('settings','[data-settings-v2]','settings');
  headingSizes.settings=await recordScreenTitle('.s2-page .s2-heading h1');
  await audit('record-start','.record-v3.rv-method','record');
  headingSizes.record=await recordScreenTitle('.record-v3.rv-method .rv-head h1');
  const baseline=headingSizes.home;
  for(const [route,size] of Object.entries(headingSizes))
   assert.ok(Math.abs(size-baseline)<=1,'heading size mismatch '+route+' '+size+' vs '+baseline);
  await audit('condition','.cj-screen','condition-journey');
  const conditionPalette=await page.locator('.cj-screen .cj-panel').first().evaluate(el=>({
   bg:getComputedStyle(el).backgroundImage,
   border:getComputedStyle(el).borderTopColor
  }));
  assert.match(conditionPalette.bg,/rgb\(50, 46, 83\)/,'Condition journey should match violet Home card');
  assert.equal(await page.locator('[data-settings-v2] a[href="#/course"],[data-settings-v2] a[href="#/simulation"],[data-settings-v2] a[href="#/consultation"]').count(),0,
   'quick links must NOT be duplicated inside Settings');
  if(width===390){
   await page.goto(host+'learning?lesson=pace-basics',{waitUntil:'networkidle'});
   await learning.locator('.lr-lesson').waitFor();
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(size.scroll<=390+3,'200% learning horizontal overflow '+JSON.stringify(size));
   reports.push({route:'learning-200%',engine,width,ok:true,size});
  }
  assert.deepEqual(errors,[],'JS errors at '+width);
  await ctx.close();
 }
 await writeFile(resolve(output,engine+'-audit.json'),JSON.stringify({
  scope:'P11 rendered visible copy, six-tab shell and lesson color under browser simulation; not physical device acceptance',
  engine,sha:process.env.GITHUB_SHA||'',reports},null,2));
 console.log('P11 visible copy, shared dark theme, Home links, nav and Settings PASS '+engine+' '+reports.length);
}finally{await browser.close();await new Promise(done=>server.close(done));}
