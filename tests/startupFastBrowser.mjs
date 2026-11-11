// Isolated startup behavior: a throttled module waterfall, timeout messaging,
// startup-failure recovery, and a fully rendered first-use screen.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside project');
  const real=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(real)]||'application/octet-stream');
  res.end(await readFile(real));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/#/home';
const browser=await engine.launch({headless:true,...(engineName==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const evidence=[];
try{
 // Fresh origin. Module requests each pay simulated latency. The original
 // 48-serial awaits would accumulate this latency; Promise.all overlaps it.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 let slowRequests=0,workerBeforeReady=false;
 await page.route('**/ui/*.js*',async route=>{
  slowRequests++;
  await new Promise(ok=>setTimeout(ok,125));
  await route.continue();
 });
 page.on('request',req=>{if(/\/sw\.js(?:\?|$)/.test(req.url())&&!page.isClosed()){workerBeforeReady=true;}});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('.app-shell').waitFor({timeout:18000});
 const startup=await page.evaluate(()=>({ready:window.runloadBoot?.isReady,loading:!!document.querySelector('#boot-screen'),timing:performance.now(),onboarding:!!document.querySelector('[data-onboard-overlay]')}));
 assert.equal(startup.ready,true,'boot must settle only after first real screen');
 assert.equal(startup.loading,false,'loading screen must disappear after ready');
 assert.equal(startup.onboarding,true,'first-use flow remains available');
 assert.deepEqual(errors,[],'no browser execution errors');
 assert.ok(slowRequests>=35,'simulate latency across the module graph: '+slowRequests);
 evidence.push({scenario:'throttled-125ms-per-JS-request',engine:engineName,requests:slowRequests,...startup});
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 await page.screenshot({path:resolve(root,'screenshots','startup-'+engineName+'-ready-390.png')});
 await context.close();

 // An import failure must not strand the user at "読み込み中" indefinitely.
 const broken=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
 const bp=await broken.newPage();
 await bp.route('**/ui/homeExperience.js*',r=>r.abort('failed'));
 await bp.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await bp.locator('#boot-retry:visible').waitFor({timeout:15000});
 assert.match(await bp.locator('#boot-status').innerText(),/開けませんでした/);
 assert.match(await bp.locator('#boot-help').innerText(),/記録を削除する必要はありません/);
 assert.equal(await bp.locator('#boot-screen').getAttribute('data-state'),'failed');
 await bp.screenshot({path:resolve(root,'screenshots','startup-'+engineName+'-failed-390.png')});
 evidence.push({scenario:'failed-import-visible-retry',engine:engineName,passed:true});
 await broken.close();

 // Block one dependency >4 seconds to ensure the user receives an honest
 // "still loading" status, without a false progress percentage or data reset.
 const slow=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce',serviceWorkers:'block'});
 const sp=await slow.newPage();
 await sp.route('**/ui/homeExperience.js*',async route=>{await new Promise(ok=>setTimeout(ok,4800));await route.continue();});
 await sp.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await sp.locator('#boot-screen').waitFor({state:'visible',timeout:9000});
 await sp.getByText('画面の準備を続けています').waitFor({timeout:10000});
 assert.equal(await sp.locator('#boot-retry').isVisible(),false);
 assert.equal(await sp.locator('#boot-status').innerText(),'画面の準備を続けています');
 await sp.locator('.app-shell').waitFor({timeout:18000});
 assert.equal(await sp.evaluate(()=>window.runloadBoot.isReady),true);
 evidence.push({scenario:'4-second-honest-slow-status',engine:engineName,passed:true});
 await slow.close();
 await writeFile(resolve(root,'screenshots','startup-'+engineName+'-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('STARTUP_ACCEPTANCE_PASS '+JSON.stringify(evidence));
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
