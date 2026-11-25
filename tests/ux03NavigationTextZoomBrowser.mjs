/* UX03 shared-mobile-nav / Settings text resizing regression.
 * Each browser: ja/en x widths 320/390/768/1440 x text 100/200 x six routes.
 * Read-only seeded session; no real user data, scientific computation, or saved writes.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux03-navigation-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(file!==root&&!file.startsWith(root+sep))throw Error('blocked');
  const path=file===root?resolve(root,'index.html'):file;
  res.setHeader('content-type',mime[extname(path)]||'application/octet-stream');
  res.end(await readFile(path));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const base='http://127.0.0.1:'+server.address().port+'/';
const routes=[
 ['home','home'],['record','record'],['body','record-reflection'],
 ['history','history'],['explore','exploration-tree'],['settings','settings']
];
const results=[];
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const percent of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language}));
  },lang);
  const page=await ctx.newPage();
  for(const [screen,route] of routes){
   await page.goto(base+'#/'+route,{waitUntil:'networkidle'});
   await page.locator('.app-shell .main-content').waitFor({timeout:14000});
   // WebKit can complete networkidle while the SPA is still mounting route
   // content. Sampling the shell alone produced a false "missing Settings"
   // result; wait for the actual active view before measuring any controls.
   const ready={
    home:'.home-v3',record:'.record-v3',body:'.cx-page',
    history:'#activity-history',explore:'[data-experience-v3]',
    settings:'[data-settings-v2]'
   };
   await page.locator(ready[screen]).first().waitFor({state:'visible',timeout:18000});
   if(screen==='settings')await page.locator('.s2-item-copy small').first().waitFor({state:'visible',timeout:18000});
   if(percent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   const row=await page.evaluate(()=>{
    const nav=document.querySelector('.app-shell .mobile-nav');
    const main=document.querySelector('.app-shell .main-content');
    const style=getComputedStyle(nav),rect=nav.getBoundingClientRect();
    const links=[...nav.querySelectorAll('.mobile-link')].map(el=>{
     const bounds=el.getBoundingClientRect(),range=document.createRange();
     const texts=[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim());
     for(const node of texts)range.selectNodeContents(node);
     const label=range.getBoundingClientRect();
     return {href:el.getAttribute('href'),name:el.textContent.replace(/\s+/g,' ').trim(),
      top:+bounds.top.toFixed(1),bottom:+bounds.bottom.toFixed(1),
      w:+bounds.width.toFixed(1),h:+bounds.height.toFixed(1),
      scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
      labelLeft:+label.left.toFixed(1),labelRight:+label.right.toFixed(1),
      left:+bounds.left.toFixed(1),right:+bounds.right.toFixed(1)};
    });
    const settingsSubtitle=document.querySelector('.s2-item-copy small');
    const settingsTitle=document.querySelector('.s2-item-copy strong');
    const optional=document.querySelector('.s2-panel[data-settings-tone="mint"] .s2-item:has(.s3-profile-form)>summary .s2-indicator');
    const optionalBounds=optional?.getBoundingClientRect();
    const parentBounds=optional?.closest('summary')?.getBoundingClientRect();
    return {display:style.display,rect:{top:+rect.top.toFixed(1),height:+rect.height.toFixed(1),bottom:+rect.bottom.toFixed(1)},
     rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),
     mainBottomPadding:parseFloat(getComputedStyle(main).paddingBottom),
     scrollWidth:document.documentElement.scrollWidth,links,
     settingsSubtitleSize:settingsSubtitle?parseFloat(getComputedStyle(settingsSubtitle).fontSize):null,
     settingsTitleSize:settingsTitle?parseFloat(getComputedStyle(settingsTitle).fontSize):null,
     settingsOptionalSize:optional?parseFloat(getComputedStyle(optional).fontSize):null,
     settingsOptionalFits:optionalBounds&&parentBounds?optionalBounds.left>=parentBounds.left-2&&optionalBounds.right<=parentBounds.right+2:null};
   });
   assert.equal(row.links.length,5,screen+' must preserve five navigation links');
   assert.deepEqual(row.links.map(x=>x.href),
    ['#/home','#/record-start','#/history','#/exploration-tree','#/settings'],
    'navigation order and routes cannot change');
   assert.equal(row.rootFont,percent===200?32:16,'root font setup failed');
   if(width<=800){
    assert.notEqual(row.display,'none',screen+' mobile navigation must be visible');
    assert.ok(row.rect.top>=0&&row.rect.bottom<=844+2,'nav should be within viewport: '+JSON.stringify({screen,lang,width,percent,row:row.rect}));
    assert.ok(row.mainBottomPadding>=row.rect.height+12,
     'main content must reserve nav clearance '+JSON.stringify({screen,lang,width,percent,reserved:row.mainBottomPadding,nav:row.rect.height}));
    for(const link of row.links){
     assert.ok(link.h>=44,'tap target below 44px '+JSON.stringify({screen,lang,width,percent,link}));
     assert.ok(link.scrollWidth<=link.clientWidth+2,'nav link overflow '+JSON.stringify({screen,lang,width,percent,link}));
     assert.ok(link.labelLeft>=link.left-2&&link.labelRight<=link.right+2,
      'whole destination label must remain visible: '+JSON.stringify({screen,lang,width,percent,link}));
    }
    if(width<=390){
     const rows=new Set(row.links.map(link=>Math.round(link.top/3)*3));
     assert.ok(rows.size<= (percent===200?2:1),
      'zoom navigation should use at most two rows and normal text one: '+JSON.stringify({screen,lang,width,percent,rows:[...rows]}));
     if(percent===200)assert.ok(row.rect.height<=190,'200%-font nav too tall: '+JSON.stringify({screen,lang,width,nav:row.rect.height}));
    }
   }else{
    assert.equal(row.display,'none','desktop must keep sidebar navigation');
   }
   if(screen==='settings'){
    assert.ok(row.settingsSubtitleSize!==null&&row.settingsTitleSize!==null&&row.settingsOptionalSize!==null,
      'Settings titles, descriptions, and optionality must be measurable');
     assert.ok(row.settingsOptionalFits,'optional status must fit within its summary: '+JSON.stringify({lang,width,percent}));
   }
   results.push({engine,lang,width,percent,screen,...row});
   if(percent===200&&(width<=390||width===768&&['explore','settings'].includes(screen)||width===1440&&screen==='explore'))
    await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-'+percent+'-'+screen+'.png'),
      animations:'disabled',fullPage:false});
  }
  await ctx.close();
 }
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440]){
  const current=results.find(x=>x.lang===lang&&x.width===width&&x.percent===200&&x.screen==='settings');
  const original=results.find(x=>x.lang===lang&&x.width===width&&x.percent===100&&x.screen==='settings');
  assert.ok(current.settingsSubtitleSize>=original.settingsSubtitleSize*1.6,
   'settings help copy must visibly grow at 200%: '+JSON.stringify({lang,width,at100:original.settingsSubtitleSize,at200:current.settingsSubtitleSize}));
  assert.ok(current.settingsTitleSize>=original.settingsTitleSize*1.6,
   'settings item title must visibly grow at 200%: '+JSON.stringify({lang,width,at100:original.settingsTitleSize,at200:current.settingsTitleSize}));
  assert.ok(current.settingsOptionalSize>=original.settingsOptionalSize*1.5,
   'optional status must grow at 200%: '+JSON.stringify({lang,width,at100:original.settingsOptionalSize,at200:current.settingsOptionalSize}));
 }
 assert.equal(results.length,96,'6 routes x 2 languages x 4 widths x 2 font scales');
 await writeFile(resolve(out,'nav-resize-matrix.json'),JSON.stringify({engine,tests:results.length,results},null,2));
 console.log('UX03 NAV/SETTINGS MATRIX PASS '+JSON.stringify({engine,conditions:results.length,settingsScaleChecked:8}));
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
