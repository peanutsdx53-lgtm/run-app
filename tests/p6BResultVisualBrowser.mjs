/** P6-B actual-result visual audit: synthetic runs in disposable browser contexts only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'screenshots','p6b');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const c=resolve(root,'.'+name);
  if(c!==root&&!c.startsWith(root+sep))throw Error('outside');
  const f=c===root?resolve(root,'index.html'):c;
  res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const matrix=[];
try{
 for(const width of [320,390,430,768,1024,1440,1920]){
  const height=width>=1440?900:width>=768?1024:844;
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'#/home',{waitUntil:'networkidle'});
  const ids=await p.evaluate(async()=>{
    const [c,m]=await Promise.all([import('./ui/manualRunCanonical.js'),import('./ui/manualRunStore.js')]);
    const ready=await c.refresh();if(!ready.ok)throw Error(ready.reason);
    const template={date:'2026-10-18',distance:'5',hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:6,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'前回のメモ',courseName:'河川敷',shoeName:'練習用'};
    const a=await c.mutate(s=>m.saveManualRun(s,template));
    const b=await c.mutate(s=>m.saveManualRun(s,{...template,date:'2026-10-25',distance:'5.5',minutes:'32',rofBefore:2,rofAfter:5,memo:'今回の振り返り'}));
    if(!a.ok||!b.ok)throw Error(JSON.stringify({a,b}));
    return {prior:a.record.id,current:b.record.id};
  });
  const url=base+'#/result?record='+encodeURIComponent(ids.current);
  await p.goto(url,{waitUntil:'networkidle'});
  const host=p.locator('#runload-result-v4');
  await host.locator('.rv4-body .rv4-reading').waitFor({timeout:20000});
  assert.equal(await host.locator('.rv4-mobile-tabs [data-tab]').count(),3,'all three approved result views persist');
  assert.equal(await host.locator('.rv4-header-help summary').count(),1,'one guidance affordance near heading');
  assert.equal(await host.locator('.rv4-method-disclosure summary').count(),1);
  assert.equal(await host.locator('.rv4-reading-route').count(),1,'no duplicate guide below hero');
  assert.match(await host.locator('.rv4-method-disclosure summary').innerText(),/参考値の出典と条件/);
  assert.match(await host.locator('.rv4-notice').innerText(),/参考値/);
  assert.equal(await host.locator('.rv4-export-menu').count(),1,'export choice remains optional');
  assert.equal(await host.locator('.rv4-body [data-view]').count(),3,'three anatomy views remain');
  const measure=()=>p.evaluate(()=>{
    const host=document.querySelector('#runload-result-v4');
    const sr=host.shadowRoot, w=innerWidth;
    const get=(sel)=>{const e=sr.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const check=['.rv4-header','.rv4-hero','.rv4-method-disclosure','.rv4-mobile-tabs','.rv4-grid','.rv4-body','.rv4-body-content','.rv4-reading','.rv4-next-path','.rv4-region-compare'];
    return {width:w,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,parts:Object.fromEntries(check.map(s=>[s,get(s)]))};
  });
  const initial=await measure();
  assert.ok(initial.documentWidth<=width+3,'result outer page horizontal overflow '+JSON.stringify(initial));
  for(const [name,r] of Object.entries(initial.parts)){
    if(!r||r.width===0)continue;
    assert.ok(r.left>=-4&&r.right<=width+4,'result element clipped '+width+' '+name+' '+JSON.stringify(r));
  }
  await p.screenshot({path:resolve(out,'result-body-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await p.screenshot({path:resolve(out,'result-body-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  await host.locator('.rv4-header-help summary').click();
  assert.match(await host.locator('.rv4-header-help').innerText(),/記録を理解する順番/);
  if(width===320||width===1440)await p.screenshot({path:resolve(out,'result-guide-'+width+'.png'),fullPage:false,animations:'disabled'});
  await host.locator('.rv4-header-help summary').click();
  if(width<=800){
    await host.locator('[data-tab="fatigue"]').click();
    await host.locator('.rv4-fatigue').waitFor({state:'visible'});
    assert.match(await host.locator('.rv4-fatigue').innerText(),/運動前|運動後/);
    await p.screenshot({path:resolve(out,'result-fatigue-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
    await host.locator('[data-tab="radar"]').click();
  }
  await host.locator('[data-compare-select]').waitFor({state:'visible'});
  await host.locator('[data-compare-select]').selectOption(ids.prior);
  await host.locator('.rv4-compare-summary').waitFor({state:'visible'});
  assert.match(await host.locator('.rv4-compare-summary').innerText(),/2026-10-18/);
  assert.match(await host.locator('.rv4-compare-summary').innerText(),/2026-10-25/);
  assert.equal(await host.locator('.rv4-compare-provenance').count(),0,'do not expose internal IDs');
  await p.screenshot({path:resolve(out,'result-comparison-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await p.screenshot({path:resolve(out,'result-comparison-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  const after=await measure();
  assert.ok(after.documentWidth<=width+3,'comparison page overflow '+width+' '+JSON.stringify(after));
  if(width===320||width===390){
    await p.goto(url,{waitUntil:'networkidle'});await host.locator('.rv4-header-help').waitFor({state:'visible'});
    await p.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    const zoom=await measure();assert.ok(zoom.documentWidth<=width+3,'200 percent result overflow '+width+' '+JSON.stringify(zoom));
    const nav=await p.evaluate(()=>{
     const panel=document.querySelector('.mobile-nav'),outer=panel.getBoundingClientRect();
     return {top:outer.top,bottom:outer.bottom,viewHeight:innerHeight,items:[...panel.querySelectorAll('.mobile-link')].map(a=>{
      const label=[...a.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      const range=document.createRange();range.selectNodeContents(label);
      const box=range.getBoundingClientRect();
      return {text:label.textContent.trim(),top:box.top,bottom:box.bottom};
     })};
    });
    assert.ok(nav.top>=-1&&nav.bottom<=nav.viewHeight+1,'result bottom nav fits viewport at '+width+JSON.stringify(nav));
    assert.ok(nav.items.every(x=>x.top>=nav.top-1&&x.bottom<=nav.bottom-2),'no 200 percent result nav label clipping '+width+JSON.stringify(nav));
    await p.screenshot({path:resolve(out,'result-body-'+width+'-200percent.png'),fullPage:false,animations:'disabled'});
    await p.evaluate(()=>{document.documentElement.style.fontSize=''});
  }
  assert.deepEqual(errors,[],'browser errors '+width);
  matrix.push({width,height,bodyHeight:initial.documentHeight,comparisonHeight:after.documentHeight,help:true,science:true,tabs:3,errors:0});
  await ctx.close();
 }
 console.log('P6B REAL RESULT BROWSER EVIDENCE '+JSON.stringify(matrix));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
