/** L1 offline acceptance: origin is genuinely unavailable after installation.
 * This is separate from Playwright's simulated browser offline switch,
 * which has raised an internal WebKit error and failed SW fetch interception.
 * The server is shut down and a Node request must confirm unreachability.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('path escaped project');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const host='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
let serverStopped=false;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(host+'#/learning?lesson=pace-basics',{waitUntil:'networkidle'});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('#lr-first').waitFor();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:25000});
 const before=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.ready;
  const keys=await caches.keys(),name=keys.find(k=>k.startsWith('runload-ui-next-shell-'));
  if(!name)throw Error('installed shell cache missing');
  const cache=await caches.open(name);
  const match=async path=>!!(await cache.match(new URL(path,location.href)));
  return {registered:!!reg.active,controlled:!!navigator.serviceWorker.controller,
   shell:await match('./index.html'),
   app:await match('./app.js?v=20261111-i18n-final-coverage-v1'),
   js:await match('./ui/learningExperience.js?v=20261110-p11-unified-v1'),
   css:await match('./ui/learningExperience.css?v=20261110-p11-unified-v1')};
 });
 assert.deepEqual(before,{registered:true,controlled:true,shell:true,app:true,js:true,css:true});
 // Drop the *origin server* entirely, not just a mocked fetch response.
 const stopped=new Promise(done=>server.close(done));
 server.closeAllConnections();
 await stopped;
 serverStopped=true;
 let unreachable=false;
 try{await fetch(host+'index.html',{signal:AbortSignal.timeout(4000)});}catch{unreachable=true;}
 assert.equal(unreachable,true,'server must be unreachable from outside browser');
 // This reload actually requests a document again; it cannot reuse old DOM.
 await page.reload({waitUntil:'load',timeout:25000});
 await page.locator('[data-lr-expand-all]').waitFor({timeout:15000});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('#lr-first').waitFor({timeout:15000});
 assert.equal(await page.locator('#lr-running-profiles .lr-pace-profile').count(),3);
 assert.equal(await page.locator('.lr-question').count(),4);
 assert.match(await page.locator('.lr-hero h1').innerText(),/平均ペースと区間ペース/);
 const network=await page.evaluate(async()=>{
  const paths=['./ui/learningExperience.js?v=20261110-p11-unified-v1',
   './ui/learningExperience.css?v=20261110-p11-unified-v1'];
  const responses=await Promise.all(paths.map(async path=>{
   try{const response=await fetch(path,{cache:'no-store'});return response.ok;}catch{return false;}
  }));
  return {responses,controlled:!!navigator.serviceWorker.controller};
 });
 assert.deepEqual(network,{responses:[true,true],controlled:true},
  'SW must deliver JS/CSS on network requests with origin fully unavailable');
 await page.goto(host+'#/learning',{waitUntil:'load',timeout:20000});
 await page.locator('.lr-catalog').waitFor();
 assert.equal(await page.locator('.lr-course').count(),3);
 await page.goto(host+'#/learning?lesson=pace-basics',{waitUntil:'load',timeout:20000});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('#lr-first').waitFor();
 await page.goto(host+'#/learning?lesson=record-origin-missing',{waitUntil:'load',timeout:20000});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('[data-lo-quiz]').waitFor();
 assert.equal(await page.locator('[data-lo-quiz] fieldset').count(),4);
 await page.goto(host+'#/learning?lesson=running-motion-basics',{waitUntil:'load',timeout:20000});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('#lm-review [data-lm-quiz]').waitFor();
 assert.equal(await page.locator('[data-lm-quiz] fieldset').count(),4);
 await page.goto(host+'#/learning?lesson=effort-fatigue-recovery',{waitUntil:'load',timeout:20000});
 await page.locator('[data-lr-expand-all]').click();
 await page.locator('#lf-review [data-lf-quiz]').waitFor();
 assert.equal(await page.locator('[data-lf-quiz] fieldset').count(),4);
 assert.deepEqual(errors,[],'offline webkit/chromium must not raise JS page errors');
 const fresh=await browser.newContext({serviceWorkers:'allow'});
 const newPage=await fresh.newPage();
 let blankFailed=false;
 try{await newPage.goto(host+'#/learning',{waitUntil:'domcontentloaded',timeout:6000});}
 catch{blankFailed=true;}
 assert.equal(blankFailed,true,'uncached, distinct browser context cannot obtain an app with server down');
 await fresh.close();
 await context.close();
 console.log(JSON.stringify({gate:'L1-OFFLINE-ORIGIN-DOWN',browser:engineName,status:'PASS',
  serverActuallyStopped:true,swControlled:true,offlineReload:true,
  cachedNetworkRequests:true,catalogueAndLesson:true,virginUnavailable:true}));
}finally{
 await browser.close();
 if(!serverStopped)await new Promise(done=>{server.close(done);server.closeAllConnections();});
}
