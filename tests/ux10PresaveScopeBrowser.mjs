/* UX10 review-to-scope accessibility & preservation.
 * 2 languages x 4 viewport widths x 2 root font sizes x Chromium/WebKit.
 * A jump to existing scope is never a save/consent/record mutation.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const output=resolve(root,'audit-output','ux10-presave-'+engine);
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('path escaped root');
  const f=p===root?resolve(root,'index.html'):p;
  res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');
  res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const url='http://127.0.0.1:'+server.address().port+'/';
const conditions=[];
async function snapshot(page,width,label){
 const data=await page.evaluate(()=>{
  const selectors=['.rr-summary','.rr-summary-jump','.rr-jump-scope',
   '.rr-save-target','.sv4-review','.sv4-review dt','.sv4-review dd',
   '.rr-foot','.rr-save','.rr-alert','.rr-required-status'];
  const elements=selectors.flatMap(s=>[...document.querySelectorAll(s)].slice(0,10).map(e=>{
   const r=e.getBoundingClientRect();return {selector:s,left:r.left,right:r.right,width:r.width,height:r.height};
  }));
  const nav=document.querySelector('[data-review-jump-scope]');
  return {viewport:innerWidth,html:document.documentElement.scrollWidth,
   body:document.body.scrollWidth,buttonFont:nav?parseFloat(getComputedStyle(nav).fontSize):null,
   buttonRect:nav?.getBoundingClientRect().toJSON(),elements};
 });
 assert.ok(data.html<=width+3&&data.body<=width+3,label+' horizontal overflow '+JSON.stringify(data));
 for(const e of data.elements)if(e.width>0&&e.height>0)
  assert.ok(e.left>=-4&&e.right<=width+4,label+' clipping '+JSON.stringify(e));
 return data;
}
async function seedTwoRuns(page){
 return page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const store=await import('/ui/manualRunStore.js');
  for(const [date,distance] of [['2026-11-16','5'],['2026-11-17','6']]){
   const draft={date,distance,hours:'',minutes:'30',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',stepsProvenance:'UNKNOWN',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'};
   const saved=await c.mutate(s=>store.saveManualRun(s,draft,{source:'manual',type:'run'}));
   if(!saved.ok)throw Error('test fixture failed '+date+' '+saved.reason);
  }
  const x=await c.readCanonical();
  if(!x.ok||x.read.records.length!==2)throw Error('two run fixture not present');
  return JSON.stringify(x.read.records);
 });
}
async function confirmTwoRuns(page,before){
 const after=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const z=await c.readCanonical();if(!z.ok)throw Error('canonical failure');
  return JSON.stringify(z.read.records);
 });
 assert.equal(after,before,'focus/scroll/edit navigation must never alter saved run IDs/contents');
}
async function jump(page,language){
 const btn=page.locator('[data-review-jump-scope]');
 assert.equal(await btn.count(),1,'one review shortcut');
 assert.equal(await btn.getAttribute('aria-controls'),'rr-save-scope');
 assert.equal(await btn.getAttribute('type'),'button');
 const target=page.locator('#rr-save-scope');
 assert.equal(await target.getAttribute('tabindex'),'-1');
 const before=new URL(page.url()).hash;
 await btn.click();
 assert.equal(new URL(page.url()).hash,before,'jump must not navigate the SPA or save');
 const focus=await page.evaluate(()=>document.activeElement?.id);
 assert.equal(focus,'rr-save-scope','keyboard focus must reach review scope');
 assert.equal(await page.locator('[data-pre-save-scope]').count(),1);
 assert.equal(await page.locator('[data-route-consent-status]').innerText(),
  language==='en'?'Not Saved':'保存しない');
}
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},
   locale:lang==='en'?'en-US':'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url+'#/record',{waitUntil:'networkidle'});
  await page.locator('.rv-manual').waitFor({state:'visible',timeout:20000});
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.locator('[data-draft="distance"]').fill('6');
  await page.locator('[data-draft="minutes"]').fill('42');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor({state:'visible',timeout:20000});
  const label=lang==='en'?'Review What Will Be Saved and Its Source':'保存する内容と出所を確認する';
  await page.waitForFunction(expected=>
   document.querySelector('[data-review-jump-scope]')?.textContent.includes(expected),label,{timeout:12000});
  assert.equal(await page.locator('[data-review-link]').count(),5);
  assert.equal(await page.locator('[data-required-ok="true"]').count(),3);
  assert.equal(await page.locator('.rr-alert').count(),0);
  assert.equal(await page.locator('[data-manual-run-save]').isEnabled(),true);
  assert.equal(await page.locator('[data-pre-save-scope]').getAttribute('data-save-source'),'manual');
  const head=await snapshot(page,width,engine+' '+lang+' '+width+' '+zoom+' initial');
  if(zoom===200&&[320,390,1440].includes(width))
   await page.screenshot({path:resolve(output,engine+'-'+lang+'-'+width+'-before-jump.png'),fullPage:true,animations:'disabled'});
  if(zoom===200)assert.ok(head.buttonFont>=18,'shortcut must scale with root font '+head.buttonFont);
  await jump(page,lang);
  assert.equal(await page.locator('[data-manual-run-save]').isEnabled(),true);
  // The existing privacy explanation stays accessible; no new consent is invented.
  assert.equal(await page.locator('.sv4-review-help').getAttribute('open'),null);
  await page.locator('.sv4-review-help summary').click();
  assert.equal(await page.locator('.sv4-review-help').getAttribute('open'),'');
  const help=await page.locator('.sv4-review-help p').innerText();
  assert.ok(help.length>20,'privacy detail remains readable: '+JSON.stringify({engine,lang,width,zoom,help}));
  assert.match(help,lang==='en'?/user|medical|reported|manually/i:/本人|診断|申告/);
  const after=await snapshot(page,width,engine+' '+lang+' '+width+' '+zoom+' expanded');
  if(zoom===200&&[320,390,1440].includes(width))
   await page.screenshot({path:resolve(output,engine+'-'+lang+'-'+width+'-privacy-expanded.png'),fullPage:true,animations:'disabled'});
  if(width===390&&zoom===100){
   const two=await seedTwoRuns(page);
   // Return from a long optional section preserves the saved IDs and draft status.
   await page.locator('[data-review-link="record-environment"]').click();
   await page.locator('[data-e4-page]').waitFor({state:'visible'});
   await page.locator('[data-e4-done]').click();
   await page.locator('[data-record-review]').waitFor({state:'visible'});
   await jump(page,lang);
   await confirmTwoRuns(page,two);
   await page.locator('.rr-back').click();
   await page.locator('.rv-manual').waitFor({state:'visible'});
   await page.locator('[data-draft="distance"]').fill('0');
   await page.locator('[data-demo-save]').click();
   await page.locator('[data-record-review]').waitFor({state:'visible'});
   assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),true);
   assert.equal(await page.locator('#rr-review-validation[role="alert"]').count(),1);
   assert.equal(await page.locator('[data-required-ok="false"]').count(),1);
   await jump(page,lang);
   assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),true,'jump never unlocks invalid save');
   await confirmTwoRuns(page,two);
  }
  assert.deepEqual(errors,[],'page errors '+JSON.stringify({engine,lang,width,zoom,errors}));
  conditions.push({engine,lang,width,zoom,head,after,shortcutFocus:true,routeStable:true,errors});
  await context.close();
 }
 assert.equal(conditions.length,16);
 await writeFile(resolve(output,'review-scope-matrix.json'),JSON.stringify({engine,count:conditions.length,conditions},null,2));
 console.log('UX10 PRESAVE REVIEW PASS '+JSON.stringify({engine,conditions:conditions.length}));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
