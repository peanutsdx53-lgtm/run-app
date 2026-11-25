import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(process.env.RUNLOAD_BATCH_ROOT||'.'),out=resolve('audit-output/ux16-19-batch'),engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');const f=path===root?resolve(root,'index.html'):path;res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end('not found')}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const host='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const phoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const rows=[],failures=[];
const trialCSS={
 ux16: '@media screen{.cp-app .cp-panel h2,.cp-app .cp-preview-top h2{font-size:max(15px,.9rem)}.cp-app .cp-description,.cp-app .cp-label,.cp-app .cp-sensitive,.cp-app .cp-note,.cp-app .cp-preview-top p{font-size:max(12px,.76rem);line-height:1.5}.cp-app .cp-mode-button span,.cp-app .cp-check{font-size:max(13px,.82rem);line-height:1.45}.cp-app .cp-mode-button small{font-size:max(12px,.73rem);line-height:1.45}.cp-app .cp-mobile-switch button,.cp-app .cp-button{font-size:max(13px,.82rem);min-height:44px}.cp-app .cp-select,.cp-app .cp-field{font-size:max(16px,.85rem)!important}.cp-app .cp-check{min-width:0;overflow-wrap:anywhere}.cp-app .cp-item-grid,.cp-app .cp-mode-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))}.cp-app .cp-check.is-off{opacity:1}}',
 ux17: '@media(max-width:480px){.lr-root .lr-course{padding:12px;gap:7px}.lr-root .lr-course-top{gap:8px;align-items:center}.lr-root .lr-course-meta{min-width:0}.lr-root .lr-course .lr-number{overflow-wrap:break-word}.lr-root .lr-course p{line-height:1.45}.lr-root .lr-formula{padding:10px;overflow-wrap:break-word}}',
 ux18: '@media(max-width:480px){.s2-page .s2-item>summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px 9px}.s2-page .s2-item-copy{grid-column:2;grid-row:1;min-width:0}.s2-page .s2-item-icon{grid-column:1;grid-row:1;align-self:start}.s2-page .s2-chevron{grid-column:3;grid-row:1}.s2-page .s2-indicator{grid-column:2;grid-row:2;justify-self:start;white-space:normal;max-width:100%}.s2-page .s2-item-copy small{overflow-wrap:break-word;word-break:normal}}'
};
const geometry=page=>page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,scroll:e.scrollWidth,client:e.clientWidth,text:(e.innerText||'').slice(0,300)}};return {width:innerWidth,doc:document.documentElement.scrollWidth,root:getComputedStyle(document.documentElement).fontSize,controls:[...document.querySelectorAll('.cp-edit button,.cp-check,.cp-label,.cp-description,.cp-preview-top button,.lr-course,.lr-formula,.s2-item>summary,.s2-item-copy small,[data-gps-action],.gps-live-info')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(box)}});
try{for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const font of [100,200]){
 const key=lang+'-'+width+'-'+font,ctx=await browser.newContext({viewport:{width,height:844},locale:lang==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'}),page=await ctx.newPage();
 await ctx.addInitScript(l=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:l}));localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:l,textSize:'standard',motion:'system'}));},lang);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const zoom=async p=>{if(font===200)await p.addStyleTag({content:'html{font-size:200%!important}'})};
 const go=async(route,sel)=>{await page.goto(host+'#/'+route,{waitUntil:'networkidle'});await page.locator(sel).first().waitFor();await zoom(page);await page.waitForFunction(l=>document.documentElement.lang===l,lang)};
 const capture=async(p,round,state,variant)=>{await p.waitForTimeout(80);const m=await geometry(p);rows.push({key,engine,round,state,variant,...m});await p.screenshot({path:resolve(out,key+'-'+round+'-'+state+'-'+variant+'.png'),fullPage:true,animations:'disabled',timeout:18000});return m};
 const check=async(round,fn)=>{try{await fn()}catch(e){failures.push({key,round,error:String(e)})}};
 await check('ux16',async()=>{
  await go('consultation','#runload-consultation');await capture(page,'ux16','empty','A');
  const record=await page.evaluate(async()=>{const c=await import('./ui/manualRunCanonical.js'),m=await import('./ui/manualRunStore.js');await c.refresh();const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');const x=await c.mutate(s=>m.saveManualRun(s,{date,distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:4,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'本人原文'}));return x.ok;});assert.equal(record,true);
  await page.reload({waitUntil:'networkidle'});await page.locator('#runload-consultation').waitFor();await zoom(page);
  for(const k of ['rof','condition','course','notes'])assert.equal(await page.locator('[data-share="'+k+'"]').isChecked(),false,k+' must default off');
  assert.equal(await page.locator('#cp-target option').count()>0,true);
  await capture(page,'ux16','single','A');const style=await page.addStyleTag({content:trialCSS.ux16});
  await capture(page,'ux16','single','B');await page.locator('[data-mode-button="period"]').click();await capture(page,'ux16','period','B');
  for(const k of ['rof','condition','course','notes'])assert.equal(await page.locator('[data-share="'+k+'"]').isChecked(),false,k+' after mode change');
  await page.locator('#cp-purpose').fill('本人原文 / Private note');assert.equal(await page.locator('[data-share="notes"]').isChecked(),false);
  if(width<=800)await page.locator('[data-switch="preview"]').click();await capture(page,'ux16','preview-excluded','B');assert.equal(await page.locator('[data-report-purpose]').isVisible(),false);
  await style.evaluate(e=>e.remove());await capture(page,'ux16','preview-excluded','A');
 });
 await check('ux17',async()=>{
  await go('learning','.lr-catalog');await capture(page,'ux17','catalog','A');const before=await page.locator('.lr-catalog').innerText();const style=await page.addStyleTag({content:trialCSS.ux17});await capture(page,'ux17','catalog','B');assert.equal(await page.locator('.lr-catalog').innerText(),before);await style.evaluate(e=>e.remove());
  for(const id of ['pace-basics','running-motion-basics','effort-fatigue-recovery','record-origin-missing']){
   await go('learning?lesson='+id,'.lr-lesson-title');await page.locator('.lr-chapter').evaluateAll(xs=>xs.forEach(x=>x.open=true));await capture(page,'ux17',id,'A');const original=await page.locator('.lr-root').innerText();const trial=await page.addStyleTag({content:trialCSS.ux17});await capture(page,'ux17',id,'B');assert.equal(await page.locator('.lr-root').innerText(),original);await trial.evaluate(e=>e.remove());
  }
 });
 await check('ux18',async()=>{
  await go('settings','[data-settings-v2]');await capture(page,'ux18','overview','A');const original=await page.locator('[data-settings-v2]').innerText();const style=await page.addStyleTag({content:trialCSS.ux18});await capture(page,'ux18','overview','B');assert.equal(await page.locator('[data-settings-v2]').innerText(),original);
  const backup=page.locator('details.s2-item').filter({has:page.locator('[data-dm-export]')});await backup.locator('summary').first().click();assert.equal(await backup.locator('[data-dm-include-gps]').isChecked(),false);assert.equal(await backup.locator('.dm-critical').first().isVisible(),true);await capture(page,'ux18','backup','B');await backup.locator('summary').first().click();
  const del=page.locator('details.s2-item').filter({has:page.locator('[data-dm-delete-confirm]')});await del.locator('summary').first().click();assert.equal(await del.locator('[data-dm-delete-confirm]').isDisabled(),true);await del.locator('[data-dm-delete-word]').fill(lang==='en'?'DELETE':'削除');assert.equal(await del.locator('[data-dm-delete-confirm]').isDisabled(),true);await del.locator('[data-dm-delete-agree]').check();assert.equal(await del.locator('[data-dm-delete-confirm]').isEnabled(),true);await del.locator('[data-dm-delete-agree]').uncheck();assert.equal(await del.locator('[data-dm-delete-confirm]').isDisabled(),true);await capture(page,'ux18','deletion','B');await style.evaluate(e=>e.remove());
 });
 await check('ux19-desktop',async()=>{await go('measurement','.main-content');await capture(page,'ux19','desktop','A');assert.equal(await page.locator('[data-gps-action="start"]').count(),0,'desktop must not offer GPS measurement');});
 if(errors.length)failures.push({key,round:'pageerrors',errors});await ctx.close();
 await check('ux19-mobile',async()=>{
  const mc=await browser.newContext({viewport:{width,height:844},locale:lang==='en'?'en-US':'ja-JP',userAgent:phoneUA,isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
  try{await mc.addInitScript(l=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:l}));localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:l,textSize:'standard',motion:'system'}));let i=0;const obs=new Map();Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition:(ok,err)=>{obs.set(++i,{ok,err});return i},clearWatch:id=>obs.delete(id)}});window.__ux19Fix=(lat,t)=>{for(const h of obs.values())h.ok({timestamp:t,coords:{latitude:lat,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}})};},lang);
   const p=await mc.newPage();await p.goto(host+'#/measurement',{waitUntil:'networkidle'});await p.locator('[data-phase="ready"]').waitFor();await zoom(p);await capture(p,'ux19','ready','A');await p.locator('.gps-live-info summary').click();await capture(p,'ux19','scope','A');await p.locator('[data-gps-action="start"]').click();await p.locator('[data-gps-consent-confirm]').waitFor();await capture(p,'ux19','consent','A');await p.locator('[data-gps-consent-confirm]').click();await p.locator('[data-phase="running"]').waitFor();const now=Date.now();await p.evaluate(t=>window.__ux19Fix(37.5,t),now);await p.evaluate(t=>window.__ux19Fix(37.50025,t),now+5000);await p.waitForTimeout(300);await capture(p,'ux19','running','A');await p.locator('[data-gps-action="pause"]').click();await capture(p,'ux19','paused','A');await p.locator('[data-gps-action="finish"]').click();await p.locator('[data-gps-finish-dialog]').waitFor({state:'visible'});await capture(p,'ux19','finish','A');
  }finally{await mc.close()}
 });
}}finally{await browser.close();await new Promise(done=>server.close(done));await writeFile(resolve(out,'summary.json'),JSON.stringify({engine,base:process.env.RUNLOAD_BATCH_ROOT,rows,failures,trialCSS},null,2))}
console.log('UX16-19 batch '+engine+' captures '+rows.length+' failures '+JSON.stringify(failures));assert.deepEqual(failures,[]);
