import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(path!==root&&!path.startsWith(root+sep))throw Error('outside');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:820},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/learning',{waitUntil:'networkidle'});
  await page.locator('.lr-catalog').waitFor();
  assert.equal(await page.locator('.lr-course').count(),3);
  assert.equal(await page.locator('.lr-coming').count(),0);
  assert.equal(await page.locator('a[href="#/learning?lesson=effort-fatigue-recovery"]').count(),1);
  const before=await page.evaluate(()=>({keys:Object.keys(localStorage).sort(),manual:localStorage.getItem('runload-v2-manual-runs-v2'),notes:localStorage.getItem('runload-v2-exploration-notes-v1')}));
  await page.locator('a[href="#/learning?lesson=effort-fatigue-recovery"]').click();
  await page.locator('.lr-chapter').evaluateAll(chapters=>chapters.forEach(ch=>ch.open=true));
  await page.locator('#lf-review [data-lf-quiz]').waitFor({timeout:15000});
  assert.match(await page.locator('.lr-lesson-title').innerText(),/きつさ・疲労感・休養/);
  assert.equal(await page.locator('.lr-fatigue-cycle article').count(),3);
  assert.equal(await page.locator('[data-lf-quiz] fieldset').count(),4);
  assert.match(await page.locator('#lf-recovery').innerText(),/自転車運動/);
  assert.match(await page.locator('#lf-sleep').innerText(),/競技者/);
  const dim=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
  assert.ok(dim.document<=dim.viewport+3,'L5 horizontal overflow '+width+' '+JSON.stringify(dim));
  if(width<=390){
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const zoom=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
   assert.ok(zoom.document<=zoom.viewport+3,'L5 200% overflow '+width+' '+JSON.stringify(zoom));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  // No answer must not be interpreted as fatigue 0 or a user health record.
  await page.locator('[data-lf-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lf-feedback]:visible').count(),4);
  assert.match(await page.locator('[data-lf-feedback=f1]').innerText(),/未回答/);
  await page.locator('[data-lf-hint]').click();
  assert.match(await page.locator('[data-lf-hint-text]').innerText(),/別の情報/);
  await page.locator('#lf-practice-choice').selectOption('equal');
  await page.locator('[data-lf-practice] button[type=submit]').click();
  assert.equal(await page.locator('[data-lf-practice-feedback]').getAttribute('data-correct'),'false');
  await page.locator('#lf-practice-choice').selectOption('different');
  await page.locator('[data-lf-practice] button[type=submit]').click();
  assert.equal(await page.locator('[data-lf-practice-feedback]').getAttribute('data-correct'),'true');
  for(const id of ['f1','f2','f3','f4'])await page.locator('[name='+id+'][value="2"]').check();
  await page.locator('[data-lf-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lf-quiz] [data-lf-relearn]:visible').count(),4);
  const hash=await page.evaluate(()=>location.hash);
  await page.locator('[data-lf-relearn="lf-recovery"]').click();
  assert.equal(await page.evaluate(()=>location.hash),hash);
  for(const [id,v] of [['f1','1'],['f2','0'],['f3','1'],['f4','0']])await page.locator('[name='+id+'][value="'+v+'"]').check();
  await page.locator('[data-lf-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lf-feedback][data-correct=true]').count(),4);
  assert.equal(await page.locator('[data-lf-quiz] [data-lf-relearn]:visible').count(),0);
  assert.equal(await page.evaluate(()=>location.hash),hash);
  const after=await page.evaluate(()=>({keys:Object.keys(localStorage).sort(),manual:localStorage.getItem('runload-v2-manual-runs-v2'),notes:localStorage.getItem('runload-v2-exploration-notes-v1')}));
  assert.deepEqual(after,before,'lesson and general quiz cannot mutate personal data');
  await page.screenshot({path:resolve(root,'screenshots','learning-fatigue-'+width+'-lesson.png'),fullPage:false,animations:'disabled'});
  await page.locator('#lf-explore a[href^="#/exploration-tree"]').click();
  await page.locator('.ex-page').waitFor({timeout:15000});
  assert.doesNotMatch(await page.evaluate(()=>location.hash),/record=/);
  assert.equal(await page.locator('.ex-record-return').count(),0);
  await context.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'L5-FATIGUE-RECOVERY',browser:engineName,width,status:'PASS',recordless:true}));
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
