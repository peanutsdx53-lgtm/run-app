/** P6-C: actual user-flow screenshots, all data isolated in disposable browser profile. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'screenshots','p6c');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const c=resolve(root,'.'+name);if(c!==root&&!c.startsWith(root+sep))throw Error('outside');
 const actual=c===root?resolve(root,'index.html'):c;res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const evidence=[];
async function assertWidth(page,width,label){
 const dims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
 assert.ok(dims.document<=width+3,label+' horizontal page overflow '+width+': '+JSON.stringify(dims));
 return dims;
}
async function screenshot(page,label,width,kind='viewport'){
 await page.screenshot({path:resolve(output,label+'-'+width+'-'+kind+'.png'),fullPage:kind==='full',animations:'disabled'});
}
async function assertExpandedNav(page,width,label){
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 await assertWidth(page,width,label+' 200%-text');
 const nav=await page.evaluate(()=>{
  const n=document.querySelector('.mobile-nav'),nr=n.getBoundingClientRect();
  return {top:nr.top,bottom:nr.bottom,screenHeight:innerHeight,
   items:[...n.querySelectorAll('.mobile-link')].map(a=>{
    const node=[...a.childNodes].find(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim());
    const rng=document.createRange();rng.selectNodeContents(node);
    const b=rng.getBoundingClientRect();
    return {text:node.textContent.trim(),top:b.top,bottom:b.bottom};
   })};
 });
 assert.equal(nav.items.length,5,label+' preserves five nav links');
 assert.ok(nav.top>=-1&&nav.bottom<=nav.screenHeight+1,label+' nav entirely visible '+JSON.stringify(nav));
 assert.ok(nav.items.every(i=>i.top>=nav.top-1&&i.bottom<=nav.bottom-2),label+' no clipped nav labels '+JSON.stringify(nav));
 await screenshot(page,label,width,'200percent');
 await page.evaluate(()=>{document.documentElement.style.fontSize=''});
}
try{
 for(const width of [320,390,430,768,1024,1440,1920]){
  const height=width>=1440?900:width>=768?1024:844;
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const go=hash=>page.goto(base+hash,{waitUntil:'networkidle'});
  await go('#/record-start');await page.locator('.rv-method').waitFor();
  assert.equal(await page.locator('.rv-method-cards .rv-method-card').count(),2,'two record methods');
  assert.equal(await page.locator('.rv-method .rv-screen-help summary').count(),1);
  assert.equal(await page.locator('.rv-method-caption').count(),0,'duplicate instruction removed');
  await assertWidth(page,width,'method');
  await screenshot(page,'record-method',width);
  await page.locator('.rv-method .rv-screen-help summary').click();
  assert.match(await page.locator('.rv-screen-help').innerText(),/手入力かGPS測定/);
  await page.locator('.rv-method .rv-screen-help summary').click();
  await go('#/record');await page.locator('.rv-manual').waitFor();
  assert.equal(await page.locator('.rv-manual .rv-screen-help summary').count(),1);
  assert.equal(await page.locator('.rv-links .rv-link').count(),5,'all optional destinations retained');
  assert.equal(await page.locator('.rv-manual [data-demo-save]').count(),1);
  await assertWidth(page,width,'manual');
  await screenshot(page,'record-manual',width);
  await screenshot(page,'record-manual',width,'full');
  await page.locator('.rv-manual .rv-screen-help summary').click();
  assert.match(await page.locator('.rv-manual .rv-screen-help').innerText(),/追加情報は任意/);
  await page.locator('.rv-manual .rv-screen-help summary').click();
  await page.locator('[data-draft="date"]').fill('2026-10-24');
  await page.locator('[data-draft="distance"]').fill('5.20');
  await page.locator('[data-draft="minutes"]').fill('32.5');
  await page.locator('[data-demo-save]').click();
  await page.locator('.rr-page').waitFor();
  assert.equal(await page.locator('.rr-screen-help summary').count(),1);
  assert.equal(await page.locator('[data-review-link]').count(),5,'all review edit routes');
  assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),true,'cannot save without activity');
  assert.match(await page.locator('.rr-gait-warning').innerText(),/活動種目/);
  await assertWidth(page,width,'review invalid');
  await screenshot(page,'record-review-invalid',width);
  await page.locator('.rr-screen-help summary').click();
  assert.match(await page.locator('.rr-screen-help').innerText(),/入力内容を確かめ/);
  await page.locator('.rr-screen-help summary').click();
  await page.locator('[data-review-gait="RUNNING"]').click();
  await page.locator('[data-manual-run-save]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),false,'valid activity permits save');
  await assertWidth(page,width,'review valid');
  await screenshot(page,'record-review-valid',width);
  await screenshot(page,'record-review-valid',width,'full');
  if(width===320||width===390)await assertExpandedNav(page,width,'record-review');
  await page.locator('[data-manual-run-save]').click();
  // Manual save is an asynchronous canonical transaction and redirects to its saved result.
  // Await that transaction before navigating: otherwise the late redirect overwrites History.
  await page.waitForURL(/#\/result\?record=/,{timeout:20000});
  await page.locator('#runload-result-v4 .rv4-app').waitFor({state:'attached',timeout:20000});
  await go('#/history');
  await page.locator('#runload-history-v2').waitFor();
  await page.locator('.stage .topline').waitFor();
  await page.locator('.hx-screen-help summary').waitFor({state:'attached',timeout:15000}).catch(async err=>{
    const snapshot=await page.evaluate(()=>{
      const host=document.querySelector('#runload-history-v2');
      return {url:location.href,markup:host?.shadowRoot?.querySelector('#hx-view')?.innerHTML?.slice(0,900)};
    });
    throw new Error('history help failed to mount '+JSON.stringify(snapshot)+' '+err.message);
  });
  assert.equal(await page.locator('.hx-screen-help summary').count(),1);
  // The saved test run is intentionally in October; month scope defaults to the current month.
  // Explicitly switch to all-period search instead of silently changing what history displays.
  await page.locator('.hx-scope [data-history-scope="all"]').click();
  await page.locator('.entry').first().waitFor({state:'visible'});
  await page.locator('.entry').first().click();
  const history=page.locator('#runload-history-v2');
  await history.locator('.selected-footer').waitFor({state:'visible'});
  assert.equal(await history.locator('.hx-record-id').count(),0,'no visible ID widgets');
  assert.equal(await history.locator('[data-open-record]').count(),1,'explicit result link retained');
  const visible=await history.innerText();
  assert.doesNotMatch(visible,/記録IDを確認|saved-[A-Za-z0-9]{6,}/,'internal ID not visible to users');
  await assertWidth(page,width,'history');
  await screenshot(page,'history-selected',width);
  await screenshot(page,'history-selected',width,'full');
  await history.locator('.hx-screen-help summary').click();
  assert.match(await history.locator('.hx-screen-help').innerText(),/全期間検索/);
  await history.locator('.hx-screen-help summary').click();
  if(width===320||width===390){
   await assertExpandedNav(page,width,'history-selected');
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
   const days=await page.evaluate(()=>{
    const root=document.querySelector('#runload-history-v2')?.shadowRoot;
    return [...(root?.querySelectorAll('.day-grid button')||[])].map(btn=>{
     const b=btn.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(btn);
     const r=range.getBoundingClientRect();
     return {date:btn.textContent.trim(),cell:{left:b.left,right:b.right},text:{left:r.left,right:r.right}};
    });
   });
   assert.equal(days.length>=28,true,'calendar retains all dates');
   assert.ok(days.every(d=>d.text.left>=d.cell.left-1&&d.text.right<=d.cell.right+1),'calendar dates must not overlap at zoom '+width+' '+JSON.stringify(days.filter(d=>d.text.left<d.cell.left-1||d.text.right>d.cell.right+1)));
   await page.evaluate(()=>{document.documentElement.style.fontSize=''});
   await go('#/record');await page.locator('.rv-manual').waitFor();
   await assertExpandedNav(page,width,'record-manual');
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
   const inputs=await page.evaluate(()=>[...document.querySelectorAll('.rv-manual .rv-unit-input input')].map(input=>{
    const style=getComputedStyle(input),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font=style.font;
    return {value:input.value,space:input.clientWidth,textWidth:ctx.measureText(input.value).width};
   }));
   assert.ok(inputs.every(x=>x.textWidth<=x.space-3),'record numeric values must fit zoomed fields '+width+' '+JSON.stringify(inputs));
   await page.evaluate(()=>{document.documentElement.style.fontSize=''});
  }
  await go('#/history');await page.locator('.stage .topline').waitFor();
  await page.locator('.hx-scope [data-history-scope="all"]').click();
  await page.locator('.entry').first().waitFor();
  await page.locator('.entry').first().click();
  await page.locator('[data-open-record]').click();
  await page.locator('#runload-result-v4 .rv4-app').waitFor({state:'attached'});
  assert.equal(await page.locator('#runload-result-v4 [data-tab]').count(),3,'history-to-result and all three result tabs');
  assert.deepEqual(errors,[],'no uncaught script errors at '+width);
  evidence.push({width,height,method:true,manual:true,review:true,history:true,result:true,privateIds:true,errors:0});
  await ctx.close();
 }
 console.log('P6C VERIFIED ACTUAL BROWSER SCREENS '+JSON.stringify(evidence));
}finally{await browser.close();await new Promise(done=>server.close(done));}
