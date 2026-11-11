import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('outside project');
  const file=p===root?resolve(root,'index.html'):p;
  res.setHeader('content-type',types[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const host='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host+'#/learning?lesson=record-origin-missing',{waitUntil:'networkidle'});
  await page.locator('.lr-chapter').evaluateAll(chapters=>chapters.forEach(ch=>ch.open=true));
  await page.locator('#lo-review [data-lo-quiz]').waitFor({timeout:20000});
  assert.match(await page.locator('.lr-lesson-title').innerText(),/記録の出所・欠測・後日申告/);
  assert.equal(await page.locator('[data-lo-quiz] fieldset').count(),4);
  assert.match(await page.locator('#lo-missing').innerText(),/0、未回答、読取失敗は違う/);
  const before=await page.evaluate(()=>({keys:Object.keys(localStorage).sort(),manual:localStorage.getItem('runload-v2-manual-runs-v2'),notes:localStorage.getItem('runload-v2-exploration-notes-v1')}));
  const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
  assert.ok(layout.document<=layout.viewport+3,'L2 horizontal overflow '+width+' '+JSON.stringify(layout));
  if(width<=390){
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const zoom=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
   assert.ok(zoom.document<=zoom.viewport+3,'L2 zoom overflow '+width+' '+JSON.stringify(zoom));
   await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  }
  // No answer is a distinct state; never a health or self-understanding grade.
  await page.locator('[data-lo-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lo-feedback]:visible').count(),4);
  assert.match(await page.locator('[data-lo-feedback=o1]').innerText(),/未回答/);
  const selected=await page.locator('#lo-origin-choice');
  await selected.selectOption('input');
  await page.locator('[data-lo-practice] button[type=submit]').click();
  assert.match(await page.locator('[data-lo-practice-feedback]').innerText(),/手入力/);
  await selected.selectOption('derived');
  await page.locator('[data-lo-practice] button[type=submit]').click();
  assert.match(await page.locator('[data-lo-practice-feedback]').innerText(),/正解です/);
  await page.locator('[data-lo-hint]').click();
  assert.match(await page.locator('[data-lo-hint-text]').innerText(),/33÷6/);
  for(const q of ['o1','o2','o3','o4'])await page.locator('[name='+q+'][value="0"]').check();
  await page.locator('[data-lo-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lo-quiz] [data-lo-relearn]:visible').count(),4);
  const route=await page.evaluate(()=>location.hash);
  await page.locator('[data-lo-relearn="lo-origin"]').first().click();
  assert.equal(await page.evaluate(()=>location.hash),route,'relearn must not change hash');
  for(const [q,v] of [['o1','1'],['o2','1'],['o3','2'],['o4','1']])await page.locator('[name='+q+'][value="'+v+'"]').check();
  await page.locator('[data-lo-quiz] button[type=submit]').click();
  assert.equal(await page.locator('[data-lo-quiz] [data-lo-relearn]:visible').count(),0);
  assert.equal(await page.locator('[data-lo-feedback][data-correct=true]').count(),4);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>location.hash),route,'section navigation must not corrupt app hash');
  const after=await page.evaluate(()=>({keys:Object.keys(localStorage).sort(),manual:localStorage.getItem('runload-v2-manual-runs-v2'),notes:localStorage.getItem('runload-v2-exploration-notes-v1')}));
  assert.deepEqual(after,before,'learning must never write or mutate user record stores');
  await page.locator('#lo-explore a[href^="#/exploration-tree"]').click();
  await page.locator('.ex-page').waitFor();
  assert.doesNotMatch(await page.evaluate(()=>location.hash),/record=/);
  assert.equal(await page.locator('.ex-record-return').count(),0);
  await page.goto(host+'#/learning?lesson=pace-basics',{waitUntil:'networkidle'});
  await page.locator('.lr-chapter').evaluateAll(chapters=>chapters.forEach(ch=>ch.open=true));
  await page.locator('#lr-first').waitFor();
  await page.goto(host+'#/learning?lesson=unpublished-future',{waitUntil:'networkidle'});
  // SPA hashchange awaits canonical.refresh(): do not read the preceding lesson DOM.
  await page.locator('#runload-learning h1').getByText('この授業はまだ利用できません').waitFor({timeout:15000});
  assert.match(await page.locator('#runload-learning').innerText(),/まだ利用できません/);
  assert.deepEqual(errors,[],'L2 browser errors at '+width);
  await context.close();
  console.log(JSON.stringify({gate:'L2-K04-K05',browser:engineName,width,status:'PASS',noMutation:true}));
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
