import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=resolve(process.env.RUNLOAD_ROOT||'.'),out=resolve('audit-output/ux20'),engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');const f=path===root?resolve(root,'index.html'):path;res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end('not found')}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const host='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const rows=[],failures=[];
try{for(const width of [768,1440])for(const font of [100,200]){
 const key=width+'-'+font,ctx=await browser.newContext({viewport:{width,height:900},locale:'ja-JP',reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true}),page=await ctx.newPage();
 await ctx.addInitScript(()=>{if(!localStorage.getItem('runload-v2-introduction-preview-v1'))localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));});
 const errors=[],events=[];page.on('pageerror',e=>errors.push(e.message));
 const go=async(route,sel)=>{await page.goto(host+'#/'+route,{waitUntil:'networkidle'});await page.locator(sel).first().waitFor();if(font===200)await page.addStyleTag({content:'html{font-size:200%!important}'})};
 const capture=async(name)=>{const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,width:innerWidth,lang:document.documentElement.lang,focus:document.activeElement?.outerHTML?.slice(0,220)}));rows.push({key,engine,name,...size});await page.screenshot({path:resolve(out,key+'-'+name+'.png'),fullPage:true,animations:'disabled'});assert.ok(size.doc<=size.width+3,name+' overflow '+JSON.stringify(size));};
 const tab=async(sel)=>{const loc=page.locator(sel).first();await loc.waitFor({state:'visible',timeout:10000});for(let i=0;i<180;i++){if(await loc.evaluate(el=>document.activeElement===el)){events.push({sel,tabs:i,focus:await loc.evaluate(el=>({focusVisible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineStyle,outlineWidth:getComputedStyle(el).outlineWidth}))});return loc}await page.keyboard.press('Tab')}throw Error('keyboard could not reach '+sel)};
 const enter=async(sel,key='Enter')=>{await tab(sel);await page.keyboard.press(key)};
 const canon=()=>page.evaluate(async()=>{const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw});
 const protectedRaw=()=>page.evaluate(()=>Object.fromEntries(['runload-v2-user-profile-v1','runload-v2-life-condition-v1','runload-v2-exploration-notes-v1'].map(k=>[k,localStorage.getItem(k)])));
 const motion=()=>page.evaluate(()=>{const secs=s=>s.split(',').map(x=>{const n=parseFloat(x);return x.trim().endsWith('ms')?n:n*1000});const moving=[];for(const el of document.querySelectorAll('.ex-page *')){if(!el.getClientRects().length)continue;for(const pseudo of [null,'::before','::after']){const s=getComputedStyle(el,pseudo);if(pseudo&&(s.content==='none'||s.content==='normal'))continue;if((s.animationName!=='none'&&secs(s.animationDuration).some(n=>n>1))||secs(s.transitionDuration).some(n=>n>1))moving.push({tag:el.tagName,cls:String(el.className),pseudo,animation:s.animationName,duration:s.animationDuration,transition:s.transitionDuration})}}return {media:matchMedia('(prefers-reduced-motion: reduce)').matches,app:document.documentElement.classList.contains('rl-reduce-motion'),moving:moving.slice(0,40)}});
 const check=async(name,fn)=>{try{await fn()}catch(e){failures.push({key,name,error:String(e)})}};
 const original='記録',memo='記録 / 原文のまま',shoe='シューズ',note='記録 / 自分の問い';
 await check('keyboard-and-fixtures',async()=>{
  await go('settings','[data-settings-v2]');
  await enter('.s2-heading .rl-screen-help>summary');assert.equal(await page.locator('.s2-heading .rl-screen-help').evaluate(e=>e.open),true);await capture('settings-help-ja');await enter('.s2-heading .rl-screen-help>summary');
  const motionSel='details.s2-item:has([data-settings-motion])>summary';await enter(motionSel);await enter('[data-settings-motion="system"]');assert.equal(await page.locator('[data-settings-motion="system"]').getAttribute('aria-pressed'),'true');
  await enter('details.s2-item:has(.s3-profile-form)>summary');await tab('#s3-nickname');await page.keyboard.insertText(original);await enter('.s3-profile-form button[type="submit"]');
  await page.waitForFunction(v=>JSON.parse(localStorage.getItem('runload-v2-user-profile-v1')||'{}').nickname===v,original);
  await capture('profile-saved-ja');
  const seed=await page.evaluate(async({memo,shoe,original})=>{const [c,m,h]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),import('/ui/homeExperience.js')]);await c.refresh();const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');const saved=await c.mutate(s=>m.saveManualRun(s,{date,distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:4,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',courseName:original,shoeName:shoe,memo}));const life=h.saveCondition(localStorage,{date,feeling:'ふつう',memo:original,sleepMinutes:420,sleepSource:'duration'});return {id:saved.record?.id,date,ok:saved.ok&&life.ok,reason:saved.reason||life.reason}},{memo,shoe,original});assert.equal(seed.ok,true,seed.reason);ctx.seed=seed;
  await go('exploration-tree?record='+encodeURIComponent(seed.id),'.ex-page');await enter('.ex-node[data-ex-category="01"]');assert.equal(await page.locator('.ex-focus h2').evaluate(el=>document.activeElement===el),true,'selected topic receives focus');await capture('explore-keyboard-ja');const os=await motion();rows.push({key,name:'os-reduced-motion',...os});assert.equal(os.media,true);assert.deepEqual(os.moving,[],'OS reduced motion still animates');
  await enter('.ex-heading [data-ex-action="field-help"]');await page.locator('.ex-dialog').waitFor();await capture('explore-help-ja');await enter('.ex-dialog [data-ex-action="close"]');assert.equal(await page.locator('.ex-dialog').count(),0);
  const noteButton=page.locator('[data-ex-action="note"]').first();await noteButton.waitFor();await enter('[data-ex-action="note"]');await tab('#ex-note');await page.keyboard.insertText(note);await enter('.ex-dialog [data-ex-action="save-note"]');await page.waitForFunction(t=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').some(n=>n.text===t),note);
  await enter('[data-ex-action="memories"]');await page.locator('.ex-saved p').filter({hasText:note}).waitFor();await capture('explore-note-ja');await enter('.ex-dialog [data-ex-action="close"]');
  ctx.raw=await canon();ctx.protected=await protectedRaw();
 });
 await check('keyboard-language-and-original',async()=>{
  assert.ok(ctx.seed,'fixture missing');await go('settings','[data-settings-v2]');await enter('details.s2-item:has([data-settings-language])>summary');await enter('[data-settings-language="en"]');await page.waitForFunction(()=>document.documentElement.lang==='en');await capture('settings-en');
  await enter('details.s2-item:has(.s3-profile-form)>summary');assert.equal(await page.locator('#s3-nickname').inputValue(),original);await capture('profile-en');
  await go('history','#runload-history-v2');assert.ok((await page.locator('#runload-history-v2').evaluate(h=>[...h.shadowRoot.querySelectorAll('.entry-title')].map(e=>e.textContent))).includes(original));await capture('history-en');
  await go('result?record='+encodeURIComponent(ctx.seed.id),'#runload-result-v4');assert.ok((await page.locator('.rv4-note p').allTextContents()).includes(memo));assert.equal(await page.locator('.rv4-mobile-tabs [data-tab]').count(),3);await capture('result-en');
  await go('condition','.cj-panel');assert.equal(await page.locator('.cj-day-memo [data-user-authored]').innerText(),original);await capture('condition-en');
  await go('exploration-tree?record='+encodeURIComponent(ctx.seed.id),'.ex-page');await enter('[data-ex-action="memories"]');assert.equal(await page.locator('.ex-saved p').filter({hasText:note}).innerText(),note);await capture('explore-note-en');await enter('.ex-dialog [data-ex-action="close"]');
  await go('consultation','#runload-consultation');assert.equal(await page.locator('[data-share="notes"]').isChecked(),false);await tab('#cp-purpose');await page.keyboard.insertText(original);await enter('[data-share="notes"]','Space');assert.equal(await page.locator('[data-share="notes"]').isChecked(),true);if(width<=800)await enter('[data-switch="preview"]');assert.equal(await page.locator('[data-report-purpose]').innerText(),original);await capture('consultation-note-en');
  await go('learning?lesson=pace-basics','.lr-lesson-title');const collapsed=page.locator('.lr-chapter:not([open])>summary').first();await collapsed.waitFor();const selector='.lr-chapter:not([open])>summary';await enter(selector);assert.ok(await page.locator('.lr-chapter[open]').count()>=2);await capture('learning-keyboard-en');
  await go('settings','[data-settings-v2]');await enter('details.s2-item:has([data-settings-language])>summary');await enter('[data-settings-language="ja"]');await page.waitForFunction(()=>document.documentElement.lang==='ja');
  assert.equal(await canon(),ctx.raw,'canonical run changed on language switch');assert.deepEqual(await protectedRaw(),ctx.protected,'personal stores changed on language switch');await capture('settings-return-ja');
 });
 await check('app-reduced-motion',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await go('settings','[data-settings-v2]');await enter('details.s2-item:has([data-settings-motion])>summary');await enter('[data-settings-motion="reduce"]');assert.equal(await page.locator('[data-settings-motion="reduce"]').getAttribute('aria-pressed'),'true');
  await go('exploration-tree','.ex-page');await enter('.ex-node[data-ex-category="02"]');const app=await motion();rows.push({key,name:'app-reduced-motion',...app});assert.equal(app.app,true);await capture('explore-app-reduced');assert.deepEqual(app.moving,[],'App reduced motion still animates');
 });
 rows.push({key,name:'keyboard-events',events,errors});if(errors.length)failures.push({key,name:'pageerrors',errors});await ctx.close();
}}finally{await browser.close();await new Promise(done=>server.close(done));await writeFile(resolve(out,'summary.json'),JSON.stringify({engine,root,rows,failures},null,2))}
console.log('UX20 '+engine+' '+JSON.stringify({rows:rows.length,failures}));assert.deepEqual(failures,[]);
