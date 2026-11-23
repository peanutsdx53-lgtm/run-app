/* UX08 real-browser matrix: ROF-J 0 vs missing and body-note selection at
 * JA/EN × 320/390/768/1440 × 100/200% for Chromium and WebKit.
 * Original ROF-J illustration/scoring, user notes and storage are never rewritten.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux08-rof-body-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('path escaped root');
  const file=p===root?resolve(root,'index.html'):p;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const url='http://127.0.0.1:'+server.address().port+'/';
const results=[];
async function geometry(page,selectors){
 return page.evaluate(selectors=>{
  const items=selectors.flatMap(sel=>[...document.querySelectorAll(sel)].slice(0,8).map(el=>{
   const r=el.getBoundingClientRect();
   return {selector:sel,left:r.left,right:r.right,width:r.width,height:r.height};
  }));
  return {width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,items};
 },selectors);
}
function withinViewport(info,width,label){
 assert.ok(info.document<=width+3&&info.body<=width+3,'horizontal overflow '+label+' '+JSON.stringify(info));
 for(const x of info.items)if(x.width>0&&x.height>0)
  assert.ok(x.left>=-4&&x.right<=width+4,'clipped element '+label+' '+JSON.stringify(x));
}
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},
   locale:lang==='en'?'en-US':'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',
    JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'#/record-rof',{waitUntil:'networkidle'});
  const rof=page.locator('[data-rof-v4-root]');
  await rof.waitFor({state:'visible',timeout:20000});
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const unanswered=lang==='en'?'Not answered':'未回答',answered=lang==='en'?'Answered':'回答済み';
  await page.waitForFunction(({lang,unanswered})=>
   document.documentElement.lang===lang&&
   document.querySelector('[data-rof-v4-state]')?.textContent.trim()===unanswered,
   {lang,unanswered},{timeout:15000});
  assert.equal(await rof.locator('.rv4-current').getAttribute('data-rof-v4-selected'),'false');
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—');
  assert.equal(await rof.locator('[data-rof-v4-anchor]').count(),5,'five original representative illustrations');
  assert.equal(await rof.locator('[data-rof-v4-tick]').count(),11,'integer 0-10 axis');
  const anchorTextBounds=await rof.locator('.rv4-anchor-row').evaluate(row=>{
   const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   const rowBounds=bounds(row);
   return {row:rowBounds,anchors:[...row.querySelectorAll('.rv4-anchor')].map(el=>{
    const button=bounds(el),labels=[...el.querySelectorAll('strong,small')].map(span=>({
     text:span.textContent,bounds:bounds(span),scroll:span.scrollWidth,client:span.clientWidth,
     whitespace:getComputedStyle(span).whiteSpace
    }));
    return {button,labels};
   })};
  });
  if(width<=390){
   assert.equal(anchorTextBounds.anchors.length,5);
   for(const anchor of anchorTextBounds.anchors)for(const label of anchor.labels){
    assert.ok(label.scroll<=label.client+2,'ROF illustration label text clipping '+JSON.stringify({engine,lang,width,zoom,label}));
    assert.ok(label.bounds.left>=anchor.button.left-3&&label.bounds.right<=anchor.button.right+3,
     'ROF illustration label escapes its own anchor '+JSON.stringify({engine,lang,width,zoom,anchor}));
    assert.ok(label.bounds.bottom<=anchorTextBounds.row.bottom+3,
     'ROF illustration label overlaps following scale '+JSON.stringify({engine,lang,width,zoom,label,anchorTextBounds}));
   }
  }
  const slider=rof.locator('[data-rof-v4-range]');
  const sliderHeight=await slider.evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(sliderHeight>=44,'effective slider touch area at least 44px: '+sliderHeight);
  await slider.evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForFunction(()=>document.querySelector('[data-rof-v4-number]')?.textContent.trim()==='0');
  await page.waitForFunction(expected=>document.querySelector('[data-rof-v4-state]')?.textContent.trim()===expected,answered);
  assert.equal(await rof.locator('.rv4-current').getAttribute('data-rof-v4-selected'),'true');
  assert.equal(await rof.locator('.rv4-current').evaluate(el=>el.classList.contains('is-empty')),false);
  await rof.locator('[data-rof-v4-anchor="1"]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0',
   'original 2.5 anchor is explanatory, not a fractional score');
  await rof.locator('[data-rof-v4-phase="after"]').click();
  assert.equal(await rof.locator('.rv4-current').getAttribute('data-rof-v4-selected'),'false');
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—');
  await rof.locator('[data-rof-v4-range]').evaluate(el=>{
   el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'10');
  await rof.locator('[data-rof-v4-clear]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—');
  await rof.locator('[data-rof-v4-phase="before"]').click();
  assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0',
   'before zero must survive after clear independently');
  const optional=rof.locator('.rv4-optional-meta');
  assert.equal(await optional.getAttribute('open'),null,'optional metadata closed initially');
  await optional.locator('summary').first().click();
  const intro=lang==='en'?'Activity start/end times and the time you assessed fatigue are different fields. Both are optional.':
   '運動時刻と疲労感の回答時点は別の項目です。どちらも任意です。';
  await page.waitForFunction(expected=>document.querySelector('.rv4-meta-intro')?.textContent.trim()===expected,intro);
  assert.equal(await optional.locator('[data-rof-run-start]').count(),1);
  assert.equal(await optional.locator('[data-rof-run-end]').count(),1);
  assert.equal(await optional.locator('[data-rof-v4-timing]').inputValue(),'UNKNOWN');
  const rg=await geometry(page,['.rv4-current','.rv4-state-label','.rv4-rail',
   '.rv4-anchor','.rv4-track input','.rv4-meta-intro','.rv4-run-times-grid','.rv4-timing']);
  withinViewport(rg,width,engine+' '+lang+' '+width+' '+zoom+' ROF');
  const stateFont=await rof.locator('.rv4-state-label').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  const introFont=await rof.locator('.rv4-meta-intro').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(stateFont>=(zoom===200?18:12)&&introFont>=(zoom===200?18:12),
   'new ROF state/optional copy must visibly scale '+JSON.stringify({engine,lang,width,zoom,stateFont,introFont}));
  if(zoom===200&&(width===320||width===390||width===1440)){
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-rof-meta.png'),
    fullPage:true,animations:'disabled'});
  }
  await page.goto(url+'#/record-reflection',{waitUntil:'networkidle'});
  const body=page.locator('[data-cx-page]');
  await body.waitFor({state:'visible',timeout:20000});
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const heading=lang==='en'?'Selected on Body Map':'図で選択中';
  await page.waitForFunction(({lang,heading})=>
   document.documentElement.lang===lang&&
   document.querySelector('.cx-notes-current span')?.textContent.trim()===heading,
   {lang,heading},{timeout:15000});
  assert.equal((await body.locator('.cx-notes-current strong').innerText()).trim(),'0 / 12');
  assert.equal(await body.locator('[data-map-view]').count(),3);
  assert.equal(await body.locator('[data-append-name]').isDisabled(),true);
  await body.locator('[data-picker-toggle]').click();
  await body.locator('[data-picker-id]').first().click();
  assert.equal((await body.locator('.cx-notes-current strong').innerText()).trim(),'1 / 12');
  assert.equal(await body.locator('#cx-bodyObservation').inputValue(),'',
   'map selection does not create subjective data');
  assert.equal(await body.locator('[data-append-name]').isEnabled(),true);
  await body.locator('[data-append-name]').click();
  assert.match(await body.locator('#cx-bodyObservation').inputValue(),/気になった部位：/,
   'only explicit user action transfers selected name');
  const notice=lang==='en'?"Selected region names were added to your body observations.":"部位名を身体の自覚情報に追加しました。";
  await page.waitForFunction(text=>document.querySelector('[data-cx-page] [data-status]')?.textContent.trim()===text,notice,{timeout:15000});
  const bg=await geometry(page,['.cx-header','.cx-main-card','.cx-notes-heading',
   '.cx-notes-current','.cx-notes-current strong','.cx-selected-chip',
   '.cx-field-card','.cx-transfer','.cx-footer']);
  withinViewport(bg,width,engine+' '+lang+' '+width+' '+zoom+' Body');
  const bodyLabelFont=await body.locator('.cx-notes-current').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(bodyLabelFont>=(zoom===200?18:12),
   'body selection status must visibly scale '+JSON.stringify({engine,lang,width,zoom,bodyLabelFont}));
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-body-selection.png'),
    fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[],'uncaught browser errors '+JSON.stringify({engine,lang,width,zoom,errors}));
  results.push({engine,lang,width,zoom,sliderHeight,stateFont,introFont,bodyLabelFont,anchorTextBounds,rof:rg,body:bg,
   trueZero:true,missingDistinct:true,illustrationsUnchanged:5,
   bodySelectionNotSaved:true,errors});
  await context.close();
 }
 assert.equal(results.length,16);
 await writeFile(resolve(out,'rof-body-matrix.json'),JSON.stringify({engine,conditions:results.length,results},null,2));
 console.log('UX08 ROF/BODY PASS '+JSON.stringify({engine,conditions:results.length}));
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
