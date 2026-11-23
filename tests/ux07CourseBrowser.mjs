/* UX07 real-browser acceptance: bilingual, 320/390/768/1440px, 100/200% root font,
 * Chromium/WebKit; inspect course concepts, five segments, course-preset safety.
 * Physical device and usability-efficacy evaluation are not claimed.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const output=resolve(root,'audit-output','ux07-course-'+engine);
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('path escaped root');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const origin='http://127.0.0.1:'+server.address().port;
const outcomes=[];
function checkNoOverflow(g,width,label){
 assert.ok(g.htmlWidth<=width+3&&g.bodyWidth<=width+3,label+' horizontal overflow '+JSON.stringify(g));
 for(const x of g.elements)if(x.width>0&&x.height>0){
  assert.ok(x.left>=-3&&x.right<=width+3,label+' element clipped '+JSON.stringify(x));
 }
}
async function dimensions(page){
 return page.evaluate(()=>{
  const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,height:b.height}};
  const watch=['.rv-course-setup','.rv-course-name-inline','.rv-course-conditions',
   '.rv-course-summary','.rv-section-progress','.rv-section-row',
   '.rv-section-row-head button','.rv-section-fields input','.rv-section-fields select',
   '.rv-course-return .rv-main-button'];
  const elements=watch.flatMap(selector=>
   [...document.querySelectorAll(selector)].slice(0,12).map(el=>({selector,...rect(el)})));
  return {htmlWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
   viewport:innerWidth,elements};
 });
}
async function seedTwoRuns(page){
 return page.evaluate(async()=>{
  const canonical=await import('/ui/manualRunCanonical.js');
  const store=await import('/ui/manualRunStore.js');
  for(const [date,distance] of [['2026-11-16','5'],['2026-11-17','6']]){
   const draft={date,distance,hours:'',minutes:'30',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',stepsProvenance:'UNKNOWN',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'};
   const saved=await canonical.mutate(s=>store.saveManualRun(s,draft,{source:'manual',type:'run'}));
   if(!saved.ok)throw Error('synthetic record '+date+' rejected '+saved.reason);
  }
  const read=await canonical.readCanonical();
  if(!read.ok||read.read.records.length!==2)throw Error('two synthetic saved records missing');
  return JSON.stringify(read.read.records);
 });
}
async function assertTwoRunsSame(page,expected){
 const actual=await page.evaluate(async()=>{
  const canonical=await import('/ui/manualRunCanonical.js');
  const read=await canonical.readCanonical();
  if(!read.ok)throw Error('canonical record read failed');
  return JSON.stringify(read.read.records);
 });
 assert.equal(actual,expected,'course operations must not change either saved run');
}
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const font of [100,200]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},
   locale:lang==='en'?'en-US':'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',
    JSON.stringify({language,textSize:'standard',motion:'system'}));
  },lang);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/record-course',{waitUntil:'networkidle'});
  await page.locator('.rv-course').waitFor({state:'visible',timeout:20000});
  if(font===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  await page.waitForFunction(language=>{
   const title=document.querySelector('.rv-course-setup h2')?.textContent.trim();
   return document.documentElement.lang===language&&
    title===(language==='en'?'Saved Courses and This Entry':'保存コース・今回の入力');
  },lang,{timeout:15000});
  const pageText=await page.locator('.rv-course').innerText();
  if(lang==='en'){
   assert.ok(pageText.includes('Use a Saved Course for This Entry'));
   assert.ok(pageText.includes('Required to Save or Update a Course'));
   assert.ok(pageText.includes('Conditions for This Activity'));
   assert.ok(pageText.includes('Save as a Reusable Course Only If Needed Later'));
   assert.doesNotMatch(pageText,/保存コース・今回の入力|保存コースの保存・更新時のみ必須|今回の走行条件/);
  }else{
   assert.ok(pageText.includes('保存コース・今回の入力'));
   assert.ok(pageText.includes('保存コースの保存・更新時のみ必須'));
  }
  assert.equal(await page.locator('[data-draft="courseName"]').getAttribute('required'),null,
   'courseName is optional for an actual run');
  const empty=await dimensions(page);
  checkNoOverflow(empty,width,engine+' '+lang+' '+width+' '+font+' empty');
  await page.locator('[data-rv-grade="SECTIONS"]').click();
  await page.locator('[data-rv-section-progress]').waitFor();
  assert.equal(await page.locator('.rv-section-row').count(),0);
  for(let i=0;i<5;i++){
   await page.locator('[data-rv-add]').click();
   const input=page.locator('[data-draft="sectionShare'+i+'"]');
   await input.fill('20');
   assert.equal(await input.inputValue(),'20');
  }
  assert.equal(await page.locator('.rv-section-row').count(),5);
  assert.equal(await page.locator('[data-rv-add]').isDisabled(),true);
  assert.ok(await page.locator('[data-rv-section-progress]').evaluate(el=>el.classList.contains('is-complete')),
   'sum of five filled shares is 100%');
  const filled=await dimensions(page);
  checkNoOverflow(filled,width,engine+' '+lang+' '+width+' '+font+' five');
  if(font===200&&(width===320||width===390||width===1440)){
   await page.screenshot({path:resolve(output,engine+'-'+lang+'-'+width+'-five-segments.png'),
    fullPage:true,animations:'disabled'});
  }
  if(width===390&&font===100){
   // Blank is not recorded 0; deleting the middle segment shifts the following fields.
   await page.locator('[data-draft="sectionShare4"]').fill('');
   assert.ok(!(await page.locator('[data-rv-section-progress]').evaluate(el=>el.classList.contains('is-complete'))));
   await page.locator('[data-rv-apply]').click();
   assert.equal(await page.locator('.rv-course').count(),1,'incomplete shares must stay in the editor');
   assert.ok(await page.locator('.rv-error').count()>0,'incomplete shares must explain the rejection');
   await page.locator('[data-draft="sectionShare4"]').fill('20');
   await page.locator('[data-draft="sectionDirection4"]').selectOption('UPHILL');
   await page.locator('[data-rv-remove="1"]').click();
   assert.equal(await page.locator('.rv-section-row').count(),4);
   assert.equal(await page.locator('[data-draft="sectionDirection3"]').inputValue(),'UPHILL',
    'removal shifts later section identity together with its values');
   assert.equal(await page.locator('[data-rv-add]').isDisabled(),false);
   await page.locator('[data-rv-add]').click();
   await page.locator('[data-draft="sectionShare4"]').fill('20');
   assert.ok(await page.locator('[data-rv-section-progress]').evaluate(el=>el.classList.contains('is-complete')));
   if(lang==='ja'){
    const twoRuns=await seedTwoRuns(page);
    await page.locator('[data-draft="courseName"]').fill('川沿いの5区間');
    await page.locator('[data-course-save]').click();
    const first=await page.evaluate(async()=>{
     const c=await import('/ui/coursePresetStore.js');
     const saved=c.readCoursePresets(localStorage);
     if(!saved.ok)throw Error(saved.reason);
     return saved.records;
    });
    assert.equal(first.length,1);
    assert.equal(first[0].data.gradeMode,'SECTIONS');
    assert.equal(first[0].data.sectionShare4,'20');
    await assertTwoRunsSame(page,twoRuns);
    await page.locator('[data-rv-grade="FLAT"]').click();
    await page.locator('[data-rv-surface-mode="SINGLE"]').click();
    await page.locator('[data-rv-surface="paved"]').click();
    await page.locator('[data-course-save]').click();
    const updated=await page.evaluate(async()=>{
     const c=await import('/ui/coursePresetStore.js');const read=c.readCoursePresets(localStorage);
     if(!read.ok)throw Error(read.reason);return read.records;
    });
    assert.equal(updated.length,1);
    assert.equal(updated[0].id,first[0].id,'update retains saved-course ID');
    assert.equal(updated[0].data.gradeMode,'FLAT');
    assert.equal(updated[0].data.sectionShare0,'','hidden section value must not persist');
    assert.equal(updated[0].data.surfaceMode,'SINGLE');
    assert.equal(updated[0].data.primarySurface,'paved');
    await assertTwoRunsSame(page,twoRuns);
    await page.locator('[data-course-delete]').click();
    await page.locator('[data-course-confirm-delete]').click();
    const count=await page.evaluate(async()=>{
     const c=await import('/ui/coursePresetStore.js');return c.readCoursePresets(localStorage).records.length;
    });
    assert.equal(count,0,'preset deletion must be separate from saved records');
    await assertTwoRunsSame(page,twoRuns);
    await page.locator('[data-rv-apply]').click();
    await page.locator('.rv-manual').waitFor();
    await assertTwoRunsSame(page,twoRuns);
   }
  }
  assert.deepEqual(errors,[],'browser runtime errors '+JSON.stringify({engine,lang,width,font,errors}));
  outcomes.push({engine,lang,width,font,emptyWidth:empty.htmlWidth,fiveWidth:filled.htmlWidth,
   segmentCount:5,share100:true,noOverflow:true,errors});
  await context.close();
 }
 assert.equal(outcomes.length,16,'16 screen states per engine');
 await writeFile(resolve(output,'course-matrix.json'),JSON.stringify({engine,conditions:outcomes.length,outcomes},null,2));
 console.log('UX07 COURSE PASS '+JSON.stringify({engine,conditions:outcomes.length}));
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}
