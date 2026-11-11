/** P6 batch-A real-screen, breakpoint and large-text acceptance, isolated test data only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'screenshots','p6');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const candidate=resolve(root,'.'+name);if(candidate!==root&&!candidate.startsWith(root+sep))throw Error('outside project');const actual=candidate===root?resolve(root,'index.html'):candidate;res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));}catch{res.statusCode=404;res.end('not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
await mkdir(output,{recursive:true});
const sizes=[320,390,430,768,1024,1440,1920];
const measures=[];
try{
 for(const width of sizes){
  const height=width>=1440?900:width>=768?1024:844;
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=hash=>page.goto(url+hash,{waitUntil:'networkidle'});
  await open('#/learning');await page.locator('.lr-course').first().waitFor();
  assert.equal(await page.locator('.lr-course').count(),3,'only implemented courses on the page');
  const catalog=await page.locator('.lr-catalog').innerText();
  assert.match(catalog,/平均ペースと途中の配分を比べます/);
  assert.match(catalog,/脚の動きと研究での測り方/);
  assert.match(catalog,/きつさ・疲労感と休養の考え方/);
  assert.doesNotMatch(catalog,/RUNLOAD|内部審査|原著・教材確認中/);
  await page.screenshot({path:resolve(output,'learning-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:resolve(output,'learning-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  const learningDims=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,visibleCards:document.querySelectorAll('.lr-course').length}));
  assert.ok(learningDims.doc<=width+3,'learning layout overflows '+width+' '+JSON.stringify(learningDims));
  await open('#/exploration-tree');await page.locator('.ex-map').waitFor();
  assert.equal(await page.locator('.ex-node').count(),7,'retain all seven discovery fields');
  assert.equal(await page.locator('.ex-heading [data-ex-action="field-help"]').count(),1,'common help is in header');
  assert.equal(await page.locator('.ex-map-head [data-ex-action="field-help"]').count(),0,'avoid duplicate help inside the map');
  const geometry=await page.evaluate(()=>{
   const map=document.querySelector('.ex-map').getBoundingClientRect();
   const nodes=[...document.querySelectorAll('.ex-map .ex-node')].map(el=>{const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label'),x:r.x,y:r.y,w:r.width,h:r.height}});
   return {inner:innerWidth,doc:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,map:{x:map.x,y:map.y,w:map.width,h:map.height},nodes,headerHelp:document.querySelector('.ex-heading [data-ex-action="field-help"]')?.getBoundingClientRect().height};
  });
  assert.ok(geometry.doc<=width+3,'exploration horizontal overflow '+width+' '+JSON.stringify(geometry));
  assert.ok(geometry.headerHelp>=40,'help button target too small at '+width);
  for(const node of geometry.nodes){
   assert.ok(node.x>=geometry.map.x-9&&node.x+node.w<=geometry.map.x+geometry.map.w+9,'node clipped horizontally '+width+' '+JSON.stringify(node));
   assert.ok(node.y>=geometry.map.y-9&&node.y+node.h<=geometry.map.y+geometry.map.h+9,'node clipped vertically '+width+' '+JSON.stringify(node));
  }
  await page.screenshot({path:resolve(output,'exploration-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:resolve(output,'exploration-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  await page.locator('.ex-heading [data-ex-action="field-help"]').click();
  await page.locator('.ex-dialog').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('[data-ex-overlay]').waitFor({state:'detached'});
  if(width===320||width===390){
   for(const hash of ['#/learning','#/exploration-tree']){
    await open(hash);
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    const zoom=await page.evaluate(()=>{
     const nav=document.querySelector('.mobile-nav'),nr=nav.getBoundingClientRect();
     const labels=[...nav.querySelectorAll('.mobile-link')].map(a=>{
      const txt=[...a.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      const range=document.createRange();range.selectNodeContents(txt);
      const rect=range.getBoundingClientRect();
      return {text:txt.textContent.trim(),top:rect.top,bottom:rect.bottom,width:rect.width};
     });
     return {inner:innerWidth,doc:document.documentElement.scrollWidth,height:innerHeight,navTop:nr.top,navBottom:nr.bottom,labels};
    });
    assert.ok(zoom.doc<=width+3,'200% font causes horizontal overflow '+hash+' '+width+' '+JSON.stringify(zoom));
    assert.ok(zoom.navTop>=0&&zoom.navBottom<=zoom.height+1,'200% bottom nav stays within viewport '+JSON.stringify({hash,width,zoom}));
    assert.ok(zoom.labels.every(l=>l.top>=zoom.navTop-1&&l.bottom<=zoom.navBottom-2),'200% nav label must remain visible '+JSON.stringify({hash,width,zoom}));
    await page.screenshot({path:resolve(output,(hash.includes('learning')?'learning':'exploration')+'-'+width+'-200percent.png'),fullPage:false,animations:'disabled'});
    await page.evaluate(()=>{document.documentElement.style.fontSize=''});
   }
  }
  assert.deepEqual(errors,[],'browser JS errors at '+width);
  measures.push({width,height,learningHeight:learningDims.documentHeight,explorationHeight:geometry.documentHeight,mapHeight:geometry.map.h,nodeCount:geometry.nodes.length,errors:0});
  await context.close();
 }
 console.log('P6 actual browser visual evidence '+JSON.stringify(measures));
}finally{await browser.close();await new Promise(done=>server.close(done))}
