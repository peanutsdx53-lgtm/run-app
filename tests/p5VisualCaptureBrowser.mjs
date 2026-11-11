/** P5 real browser screenshots (not a mock). No personal saved records. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=resolve(root,'screenshots','p5');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const candidate=resolve(root,'.'+name);if(candidate!==root&&!candidate.startsWith(root+sep))throw Error('outside');const actual=candidate===root?resolve(root,'index.html'):candidate;res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));}catch{res.statusCode=404;res.end('not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const evidence=[];
try{
 for(const width of [320,390,768,1440]){
  const height=width===1440?900:width===768?1024:844;
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const goto=async(hash)=>page.goto(base+hash,{waitUntil:'networkidle'});
  await goto('#/learning');
  await page.locator('.lr-catalog .lr-course').first().waitFor();
  assert.equal(await page.locator('.lr-catalog .lr-course').count(),3);
  assert.equal(await page.locator('.mobile-nav .mobile-link').count(),6);
  let dims=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,nav:[...document.querySelectorAll('.mobile-nav .mobile-link')].map(e=>({y:e.getBoundingClientRect().y,h:e.getBoundingClientRect().height}))}));
  assert.ok(dims.doc<=dims.w+3,'learning horizontal overflow '+JSON.stringify({width,dims}));
  if(width<=800){
   assert.ok(dims.nav.every(x=>Math.abs(x.y-dims.nav[0].y)<=2),'mobile nav breaks into multiple rows '+width);
   assert.equal(await page.locator('.rl-tools-menu').count(),0,'old menu removed');
   assert.equal(await page.locator('.topbar .icon-install').count(),0,'header down arrow removed');
   assert.equal(await page.locator('.mobile-nav a[href="#/settings"]').count(),1,'settings restored to bottom nav');
  }
  await page.screenshot({path:resolve(dir,'learning-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:resolve(dir,'learning-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  await goto('#/exploration-tree');
  await page.locator('.ex-map-card').waitFor();
  assert.equal(await page.locator('.ex-node').count(),7);
  assert.ok(await page.locator('.ex-top-help').isVisible());
  await page.screenshot({path:resolve(dir,'exploration-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:resolve(dir,'exploration-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  await page.locator('.ex-top-help').click();
  await page.locator('[data-ex-overlay] .ex-dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-ex-overlay]').waitFor({state:'detached'});
  await goto('#/exploration-tree?category=01&topic='+encodeURIComponent('距離・時間・ペース'));
  await page.locator('.ex-related-learning[href="#/learning?lesson=pace-basics"]').waitFor({state:'attached'});
  await goto('#/learning?lesson=pace-basics');
  await page.locator('#lr-basics').waitFor();
  if(width===390||width===1440){await page.screenshot({path:resolve(dir,'lesson-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});}
  assert.deepEqual(errors,[],'unhandled browser errors '+width);
  evidence.push({width,height,learningCards:3,mobileTabs:5,learningDocumentWidth:dims.doc,explorationNodes:7,errors:0});
  await context.close();
 }
 console.log('P5 REAL BROWSER SCREENSHOTS '+JSON.stringify(evidence));
}finally{await browser.close();await new Promise(done=>server.close(done));}
