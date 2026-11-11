/** P10 browser acceptance: unified presentation, lesson map, isolated checklist. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const part=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+part);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid path');
  const real=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(real)]||'application/octet-stream');
  res.end(await readFile(real));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4588,'127.0.0.1',done));
const output=resolve(root,'audit-output','p10-learning');
await mkdir(output,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const origin='http://127.0.0.1:4588/#/';
const reports=[];
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?920:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function capture(name){
   const x=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth}));
   assert.ok(x.doc<=width+3,name+' horizontal overflow '+JSON.stringify(x));
   await page.screenshot({path:resolve(output,engine+'-'+width+'-'+name+'.png'),
    fullPage:!name.includes('question'),animations:'disabled'});
   reports.push({engine,width,name,ok:true,...x});
  }
  await page.goto(origin+'learning',{waitUntil:'networkidle'});
  const rootUI=page.locator('#runload-learning');
  await rootUI.locator('.lr-catalog').waitFor();
  assert.equal(await rootUI.locator('.lr-course').count(),3);
  assert.equal(await rootUI.locator('.lr-hero,.lr-progress-panel').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-learning-checklist-v1')),null);
  await capture('catalogue');
  await page.locator('a[href="#/learning?lesson=pace-basics"]').click();
  await rootUI.locator('.lr-chapter').first().waitFor();
  assert.equal(await rootUI.locator('.lr-lesson-map').count(),0);
  assert.equal(await rootUI.locator('.lr-chapter').first().evaluate(el=>el.open),true);
  assert.equal(await rootUI.locator('.lr-lesson .lr-hero,.lr-progress-panel').count(),0);
  assert.equal(await rootUI.locator('[data-lr-jump]').count(),0);
  assert.equal(await rootUI.locator('.lr-chapter-controls').count(),0);
  await rootUI.locator('.lr-chapter:has([data-lr-quiz]) > summary').click();
  assert.equal(await rootUI.locator('.lr-chapter').first().evaluate(el=>el.open),true);
  const quiz=rootUI.locator('[data-lr-quiz]');
  assert.equal(await quiz.locator('fieldset.lr-question').count(),4);
  assert.equal(await quiz.locator('fieldset.lr-question:visible').count(),4);
  assert.equal(await quiz.locator('legend:visible').first().innerText(),'問 1');
  assert.match(await quiz.locator('.lr-question-prompt:visible').first().innerText(),/6 kmを33分/);
  await capture('questions-visible');
  assert.equal(await quiz.locator('fieldset.lr-question:visible').count(),4);
  await capture('questions-all');
  for(const [id,v] of [['q1','1'],['q2','1'],['q3','0'],['q4','1']])
   await quiz.locator('[name='+id+'][value="'+v+'"]').check();
  await quiz.locator('button[type=submit]').click();
  assert.equal(await quiz.locator('[data-lr-feedback][data-correct=true]').count(),4);
  assert.equal(await rootUI.locator('.lr-progress-panel,[data-lr-progress-toggle]').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-learning-checklist-v1')),null);
   await page.goto(origin+'learning',{waitUntil:'networkidle'});
   await rootUI.locator('.lr-catalog').waitFor();
   assert.equal(await rootUI.locator('.lr-hero,.lr-progress-panel').count(),0);
   await capture('catalogue-return');
   if(width===390){
   await page.locator('a[href="#/learning?lesson=pace-basics"]').click();
   await rootUI.locator('.lr-chapter').first().waitFor();
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   await capture('font200');
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  for(const lessonId of ['running-motion-basics','effort-fatigue-recovery','record-origin-missing']){
   await page.goto(origin+'learning?lesson='+lessonId,{waitUntil:'networkidle'});
   await rootUI.locator('.lr-chapter').first().waitFor();
   assert.equal(await rootUI.locator('.lr-lesson-map').count(),0);
   assert.equal(await rootUI.locator('.lr-question-prompt').count(),4);
   await rootUI.locator('.lr-chapter:has(fieldset.lr-question) > summary').click();
   assert.equal(await rootUI.locator('fieldset.lr-question:visible').count(),4);
   await capture('lesson-'+lessonId);
  }
  assert.deepEqual(await page.evaluate(()=>({
   runs:localStorage.getItem('runload-v2-manual-runs-v2'),
   notes:localStorage.getItem('runload-v2-exploration-notes-v1')
  })),{runs:null,notes:null},'learning completion never writes running data');
  assert.deepEqual(errors,[],'page errors '+width);
  await ctx.close();
 }
 await writeFile(resolve(output,engine+'-results.json'),JSON.stringify({
  scope:'Learning density: no intro/checklist cards and all quiz questions visible, not device acceptance',
  sha:process.env.GITHUB_SHA||'',reports
 },null,2));
 console.log('P10 learning reflow, quiz, navigation and local progress PASS '+engine+' '+reports.length);
}finally{await browser.close();await new Promise(done=>server.close(done));}
