/** Stage 4 diagnostic: GPS finish -> optional self-report -> pre-save review
 * JA/EN x 320/390/414/768 x consent OFF/ON x 100/200% text.
 * Geolocation is simulated. This does not certify outdoor hardware.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.png':'image/png','.svg':'image/svg+xml',
 '.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const p=resolve(root,'.'+name);
 if(p!==root&&!p.startsWith(root+sep))throw Error('invalid path');
 res.setHeader('Content-Type',mime[extname(p===root?resolve(root,'index.html'):p)]||'application/octet-stream');
 res.end(await readFile(p===root?resolve(root,'index.html'):p));
}catch{res.statusCode=404;res.end('missing');}});
await new Promise(ok=>server.listen(4393,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const dest=resolve(root,'audit-output','gps-postreview-zoom');
await mkdir(dest,{recursive:true});
const phoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const rows=[];
try{
 for(const language of ['ja','en'])for(const width of [320,390,414,768]){
  const context=await browser.newContext({
   viewport:{width,height:900},locale:language==='en'?'en-US':'ja-JP',
   userAgent:phoneUA,isMobile:true,hasTouch:true,reducedMotion:'reduce'
  });
  await context.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
   const observers=new Map();
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    watchPosition:(ok,err)=>{const id=observers.size+1;observers.set(id,{ok,err});return id;},
    clearWatch:id=>observers.delete(id)
   }});
   window.__gpsPostreviewFix=(lat,t)=>{for(const h of observers.values())h.ok({
    timestamp:t,coords:{latitude:lat,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}
   });};
  },language);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto('http://127.0.0.1:4393/#/measurement',{waitUntil:'networkidle'});
  await page.locator('[data-phase="ready"]').waitFor({timeout:14000});
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  const now=Date.now();
  await page.evaluate(t=>window.__gpsPostreviewFix(37.5,t),now);
  await page.evaluate(t=>window.__gpsPostreviewFix(37.50025,t),now+5000);
  await page.waitForTimeout(1200);
  await page.locator('[data-gps-action="finish"]').click();
  await page.locator('[data-gps-finish-dialog]').waitFor({state:'visible'});
  await page.locator('[data-gps-action="finish-confirm"]').click();
  await page.locator('[data-gps-review]').waitFor({timeout:12000});
  if(language==='en')await page.waitForFunction(()=>document.querySelector('[data-pre-save-scope]')?.textContent.includes('Review Before Saving'));
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),false,'route opt-in defaults OFF');
  assert.equal(await page.locator('[data-pre-save-scope]').getAttribute('data-save-source'),'gps');
  for(const optIn of [false,true]){
   if(optIn)await page.locator('[data-gps-save-route]').check();
   else await page.locator('[data-gps-save-route]').uncheck();
   assert.equal(await page.locator('[data-gps-save-route]').isChecked(),optIn);
   const routeStatus=await page.locator('[data-route-consent-status]').innerText();
   assert.match(routeStatus,optIn?/(位置|Location)/:/(保存しない|Not Saved)/i,'explicit consent reflected in status');
   for(const scale of [100,200]){
    await page.evaluate(s=>{document.documentElement.style.fontSize=s+'%';},scale);
    const metrics=await page.evaluate(()=>{
     const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
     const scope=document.querySelector('[data-pre-save-scope]');
     const nav=document.querySelector('.mobile-nav');
     const scopeRows=scope?[...scope.querySelectorAll('dl>div')].map(div=>({label:rect(div.querySelector('dt')),value:rect(div.querySelector('dd'))})):[];
     return {viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      viewportHeight:innerHeight,scope:rect(scope),scopeRows,save:rect(document.querySelector('[data-gps-action="save"]')),
      nav:rect(nav),navVisible:!!nav&&getComputedStyle(nav).display!=='none',pageHeight:document.documentElement.scrollHeight};
    });
    assert.ok(metrics.doc<=width+2&&metrics.body<=width+2,'GPS postreview horizontal overflow '+JSON.stringify({engine,language,width,optIn,scale,metrics}));
    if(metrics.scope)assert.ok(metrics.scope.left>=-2&&metrics.scope.right<=width+2,'pre-save scope fits phone');
    for(const r of metrics.scopeRows)assert.ok(r.label.right<=r.value.left+2||r.label.bottom<=r.value.top+2,
     'GPS pre-save label/value overlap '+JSON.stringify({language,width,scale,r}));
    const key=engine+'-'+language+'-'+width+'-route-'+(optIn?'on':'off')+'-text-'+scale;
    await page.screenshot({path:resolve(dest,key+'-full.png'),fullPage:true,animations:'disabled',timeout:18000});
    if(scale===200){
     await page.locator('[data-gps-action="save"]').scrollIntoViewIfNeeded();
     await page.screenshot({path:resolve(dest,key+'-save-viewport.png'),fullPage:false,animations:'disabled'});
     const focus=await page.evaluate(()=>{
      const r=document.querySelector('[data-gps-action="save"]').getBoundingClientRect();
      const nav=document.querySelector('.mobile-nav'),n=nav?.getBoundingClientRect();
      const overlap=!!n&&r.left<n.right&&r.right>n.left&&r.top<n.bottom&&r.bottom>n.top;
      return {save:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},
       nav:n?{left:n.left,right:n.right,top:n.top,bottom:n.bottom}:null,navVisible:!!nav&&getComputedStyle(nav).display!=='none',overlap};
     });
     metrics.saveViewport=focus;
    }
    // A page-level width check misses text spilling into the adjacent action control.
    const actionTextBounds=await page.evaluate(()=>[...document.querySelectorAll('.gps-review .gps-live-actions>*')].map(element=>{
     const button=element.getBoundingClientRect(),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),textRects=[];
     while(walker.nextNode()){
      if(!walker.currentNode.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(walker.currentNode);
      for(const r of range.getClientRects())textRects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
     }
     return {button:{left:button.left,right:button.right,top:button.top,bottom:button.bottom},textRects};
    }));
    for(const action of actionTextBounds){
     assert.ok(action.textRects.length>0,'GPS action must have visible text');
     for(const t of action.textRects)assert.ok(t.left>=action.button.left-2&&t.right<=action.button.right+2&&t.top>=action.button.top-2&&t.bottom<=action.button.bottom+2,
      'GPS action label spills outside own button '+JSON.stringify({engine,language,width,optIn,scale,action,text:t}));
    }
    rows.push({engine,language,width,optIn,scale,...metrics});
   }
  }
  assert.deepEqual(errors,[],'GPS postreview page errors '+language+' '+width);
  await context.close();
 }
 assert.equal(rows.length,32,'2 languages x 4 widths x 2 route choices x 2 text scales');
 await writeFile(resolve(dest,engine+'-report.json'),JSON.stringify(rows,null,2));
 console.log('PASS GPS postreview responsive diagnostic '+engine+' '+rows.length+' captures');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
