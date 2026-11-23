/* UX09 browser acceptance: 5 shared optional-screen returns and environment
 * temporary→draft→eventually saved distinction. 2 languages×4 widths×2 zoom
 * ×Chromium/WebKit. Never infer weather or rewrite saved user text. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux09-environment-'+engine);await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('path escaped root');
  const f=p===root?resolve(root,'index.html'):p;
  res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const origin='http://127.0.0.1:'+server.address().port+'/';
const report=[];
const labels={
 ja:{none:'選択なし',pending:'一時選択・未反映',applied:'今回の下書きに反映済み'},
 en:{none:'No Selection',pending:'Temporary · Not Applied',applied:'Applied to Current Draft'}
};
async function state(page,lang,name){
 const status=page.locator('[data-e4-selection-status]');
 await page.waitForFunction(({label})=>document.querySelector('[data-e4-stage-label]')?.textContent.trim()===label,
  {label:labels[lang][name]},{timeout:12000});
 assert.equal(await status.getAttribute('data-state'),name);
}
async function geometry(page,width,why){
 const g=await page.evaluate(()=>{
  const sels=['.environment-v4 .e4-selection-status','.e4-stage-label',
   '.e4-save-boundary','.e4-commit','.e4-done','.rl-record-footer .rl-record-return'];
  const elements=sels.flatMap(s=>[...document.querySelectorAll(s)].slice(0,5).map(e=>{
   const r=e.getBoundingClientRect();return {selector:s,left:r.left,right:r.right,width:r.width,height:r.height};
  }));
  return {html:document.documentElement.scrollWidth,body:document.body.scrollWidth,elements};
 });
 assert.ok(g.html<=width+3&&g.body<=width+3,why+' horizontal overflow '+JSON.stringify(g));
 for(const x of g.elements)if(x.width>0&&x.height>0)
  assert.ok(x.left>=-4&&x.right<=width+4,why+' clipped '+JSON.stringify(x));
 return g;
}
async function navigate(page,route,selector){
 await page.evaluate(target=>{location.hash='#/'+target;},route);
 await page.locator(selector).waitFor({state:'visible',timeout:18000});
}
async function auditFooters(page,width,zoom,lang){
 const screens=[
  ['record-course','.rv-course','[data-rv-apply]'],
  ['record-rof','[data-rof-v4-root]','.rv4-done'],
  ['record-compare','[data-g4-page]','[data-g4-apply]'],
  ['record-environment','[data-e4-page]','[data-e4-done]'],
  ['record-reflection','[data-cx-page]','[data-apply]']
 ];
 const result=[];
 for(const [route,rootSel,buttonSel] of screens){
  await navigate(page,route,rootSel);
  assert.equal(await page.locator(rootSel+' .rl-record-footer').count(),1,route+' footer must be shared');
  assert.equal(await page.locator(rootSel+' .rl-record-return').count(),1,route+' only one primary');
  const info=await page.locator(rootSel+' .rl-record-return').evaluate(el=>{
   const s=getComputedStyle(el),b=el.getBoundingClientRect();return {
    width:b.width,height:b.height,left:b.left,right:b.right,font:s.fontSize,
    background:s.backgroundImage,disabled:el.matches(':disabled,[aria-disabled="true"]')
   };
  });
  assert.ok(info.width>0&&info.height>=48,route+' action size '+JSON.stringify(info));
  assert.ok(info.left>=-3&&info.right<=width+3,route+' clipped '+JSON.stringify(info));
  if(!info.disabled)assert.ok(info.background.includes('linear-gradient'),route+' must use original shared gradient');
  if(zoom===200)assert.ok(parseFloat(info.font)>=16,route+' footer text does not scale');
  result.push({route,width:info.width,height:info.height,font:info.font,gradient:!info.disabled});
 }
 await navigate(page,'record-environment','[data-e4-page]');
 return result;
}
async function seedTwo(page){
 return page.evaluate(async()=>{
  const canonical=await import('/ui/manualRunCanonical.js');
  const store=await import('/ui/manualRunStore.js');
  for(const [date,distance] of [['2026-11-16','5'],['2026-11-17','6']]){
   const draft={date,distance,hours:'',minutes:'30',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',stepsProvenance:'UNKNOWN',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'};
   const saved=await canonical.mutate(s=>store.saveManualRun(s,draft,{source:'manual',type:'run'}));
   if(!saved.ok)throw Error('test record not saved '+saved.reason);
  }
  const records=await canonical.readCanonical();
  if(!records.ok||records.read.records.length!==2)throw Error('two record fixture missing');
  return JSON.stringify(records.read.records);
 });
}
async function checkTwo(page,prior){
 const got=await page.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');const r=await c.readCanonical();
  if(!r.ok)throw Error('canonical read failed');return JSON.stringify(r.read.records);
 });
 assert.equal(got,prior,'environment action must not mutate saved activities');
}
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},
   locale:lang==='en'?'en-US':'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'#/record-environment',{waitUntil:'networkidle'});
  await page.locator('[data-e4-page]').waitFor({state:'visible',timeout:15000});
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.waitForFunction(language=>document.documentElement.lang===language,lang);
  await state(page,lang,'none');
  const boundary=lang==='en'?'Applying to the environment note does not save the activity record.':
   '環境メモへの反映は、走行記録の保存完了ではありません。';
  await page.waitForFunction(text=>document.querySelector('.e4-save-boundary')?.textContent.trim()===text,boundary);
  const original='本人の入力：気温0度・記録は未保存';
  await page.locator('[data-draft="temperatureC"]').fill('0');
  await page.locator('[data-draft="environmentNote"]').fill(original);
  await page.locator('[data-e4-weather="SUN"]').click();
  await state(page,lang,'pending');
  assert.equal(await page.locator('[data-draft="environmentNote"]').inputValue(),original);
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),true);
  const pending=await geometry(page,width,engine+' '+lang+' '+width+' '+zoom+' pending');
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-pending.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-e4-commit]').click();
  await state(page,lang,'applied');
  const savedDraft=await page.locator('[data-draft="environmentNote"]').inputValue();
  assert.match(savedDraft,/^本人の入力：気温0度・記録は未保存\n【本人申告の環境選択】天候：晴れ$/);
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),false);
  const notice=lang==='en'?'Selected conditions were added to the environment note. Check them before saving the activity.':
   '選択した内容を環境メモに反映しました。保存前の確認画面で確かめてください';
  await page.waitForFunction(text=>document.querySelector('[data-e4-notice]')?.textContent.trim()===text,notice);
  const applied=await geometry(page,width,engine+' '+lang+' '+width+' '+zoom+' applied');
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-applied.png'),fullPage:true,animations:'disabled'});
  const footer=await auditFooters(page,width,zoom,lang);
  // Return from an applied draft must retain note but clear transient selection.
  await page.locator('[data-e4-done]').click();
  await page.locator('.rv-manual').waitFor({state:'visible',timeout:12000});
  await navigate(page,'record-environment','[data-e4-page]');
  await state(page,lang,'none');
  assert.equal(await page.locator('[data-draft="environmentNote"]').inputValue(),savedDraft);
  if(width===390&&zoom===100){
   const two=await seedTwo(page);
   await page.locator('[data-e4-weather="RAIN"]').click();
   await state(page,lang,'pending');
   await page.locator('[data-e4-done]').click();
   const warning=page.locator('[data-e4-leave-warning]');
   await warning.waitFor({state:'visible',timeout:10000});
   assert.equal(new URL(page.url()).hash,'#/record-environment');
   await warning.locator('[data-e4-discard-return]').click();
   await page.locator('.rv-manual').waitFor({state:'visible'});
   await navigate(page,'record-environment','[data-e4-page]');
   await state(page,lang,'none');
   assert.equal(await page.locator('[data-draft="environmentNote"]').inputValue(),savedDraft,
    'discard must not modify the user-written note');
   await checkTwo(page,two);
   // The header has the same leave guard; Apply & Return is explicitly requested.
   await page.locator('[data-e4-weather="CLOUD"]').click();
   await page.locator('[data-e4-back]').click();
   await warning.waitFor({state:'visible'});
   await warning.locator('[data-e4-apply-return]').click();
   await page.locator('.rv-manual').waitFor({state:'visible'});
   await navigate(page,'record-environment','[data-e4-page]');
   await state(page,lang,'none');
   assert.match(await page.locator('[data-draft="environmentNote"]').inputValue(),/天候：くもり/);
   await checkTwo(page,two);
   // A detail opened from pre-save review must return to that review, not manual entry.
   await navigate(page,'record-review','[data-record-review]');
   await page.locator('.rr-row[data-review-link="record-environment"]').click();
   await page.locator('[data-e4-page]').waitFor({state:'visible'});
   await page.locator('[data-e4-weather="SNOW"]').click();
   await page.locator('[data-e4-done]').click();
   await warning.waitFor({state:'visible'});
   await warning.locator('[data-e4-discard-return]').click();
   await page.locator('[data-record-review]').waitFor({state:'visible'});
   assert.equal(new URL(page.url()).hash,'#/record-review');
   await checkTwo(page,two);
  }
  assert.deepEqual(errors,[],'browser errors '+JSON.stringify({engine,lang,width,zoom,errors}));
  report.push({engine,lang,width,zoom,pending,applied,footer,
   stageNames:true,noteProtected:true,manualReturnGuard:true,errors});
  await ctx.close();
 }
 assert.equal(report.length,16);
 await writeFile(resolve(out,'environment-return-matrix.json'),JSON.stringify({engine,conditions:16,report},null,2));
 console.log('UX09 ENVIRONMENT/RETURN PASS '+JSON.stringify({engine,conditions:16}));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
