/** P6 supplementary evidence: first use, home and ROF-J under text scaling.
 * CSS zoom=2 is diagnostic, not browser-native zoom or a physical-device test.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep))throw Error('Outside app');
  const file=target===root?resolve(root,'index.html'):target;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4319,'127.0.0.1',done));
let browser;
const output=resolve(root,'audit-output','p6-integrated-zoom');
const results=[];
try{
 await mkdir(output,{recursive:true});
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
 const screens=[
  {id:'S01',route:'home',selector:'.fu-shell',firstVisit:true},
  {id:'S02',route:'home',selector:'.home-v3',firstVisit:false},
  {id:'S06',route:'record-rof',selector:'[data-rof-v4-root]',firstVisit:false}
 ];
 const modes=[
  {name:'normal-375',width:375},
  {name:'normal-801',width:801},
  {name:'normal-390',width:390},
  {name:'root-font-200-390',width:390,font:true},
  {name:'css-zoom-200-390',width:390,zoom:true}
 ];
 for(const screen of screens){
  for(const mode of modes){
   const context=await browser.newContext({viewport:{width:mode.width,height:mode.width===801?900:844},reducedMotion:'reduce'});
   if(!screen.firstVisit)await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4319/#/'+screen.route,{waitUntil:'networkidle'});
   await page.locator(screen.selector).first().waitFor({state:'visible',timeout:18000});
   if(mode.font)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   if(mode.zoom)await page.evaluate(()=>{document.documentElement.style.zoom='2';});
   await page.waitForTimeout(200);
   const layout=await page.evaluate(()=>{
    const width=innerWidth;
    const elements=[...document.querySelectorAll('body *')];
    const offenders=elements.filter(e=>{
     const style=getComputedStyle(e),r=e.getBoundingClientRect();
     return style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&(r.right>width+3||r.left< -3);
    }).sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right).slice(0,20).map(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);
     return {tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,110):'',text:(e.innerText||'').trim().slice(0,40),left:Math.round(r.left),right:Math.round(r.right),elementWidth:Math.round(r.width),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflowX:s.overflowX,minWidth:s.minWidth,gridColumns:s.gridTemplateColumns};
    });
    return {innerWidth:width,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,offenders};
   });
   const overflow=Math.max(0,layout.scrollWidth-layout.innerWidth);
   const entry={engine,screen:screen.id,screenState:screen.firstVisit?'first-visit':'after-onboarding',mode:mode.name,viewport:mode.width,overflowPx:overflow,layout,errors};
   results.push(entry);
   assert.deepEqual(errors,[],screen.id+' '+mode.name+' uncaught JS errors');
   console.log('P6_INTEGRATED_ZOOM',JSON.stringify({engine,screen:screen.id,mode:mode.name,overflowPx:overflow,offenders:layout.offenders.slice(0,5)}));
   if(overflow>3)console.warn('::warning::P6 layout observation '+engine+' '+screen.id+' '+mode.name+' overflow '+overflow+' px (not a formal native-zoom verdict)');
   if(mode.zoom||mode.font||mode.name==='normal-375'||mode.name==='normal-801')await page.screenshot({path:resolve(output,engine+'-'+screen.id+'-'+mode.name+'.png'),fullPage:true,animations:'disabled'});
   await context.close();
  }
 }
 const summary={source_sha:process.env.GITHUB_SHA||'local',head_ref:process.env.GITHUB_HEAD_REF||'',engine,caseCount:results.length,overflowCases:results.filter(x=>x.overflowPx>3).map(x=>({screen:x.screen,mode:x.mode,overflowPx:x.overflowPx})),limitation:'CSS zoom is a diagnostic approximation, not native browser zoom, OS text scaling or physical device acceptance'};
 await writeFile(resolve(output,engine+'-summary.json'),JSON.stringify({summary,results},null,2));
 assert.equal(results.length,15);
 assert.equal(results.filter(x=>!x.mode.startsWith('css-zoom')&&x.overflowPx>3).length,0,'Normal/font-200% cases must not horizontally overflow');
 console.log('P6 INTEGRATED DIAGNOSTIC COMPLETE',JSON.stringify(summary));
}finally{await browser?.close();await new Promise(done=>server.close(done));}