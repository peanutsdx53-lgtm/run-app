// UPR-01..03: real pointer interactions, before/after screenshots and hit tests.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(process.env.RUNLOAD_UPR_ROOT||resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const baseline=process.env.RUNLOAD_UPR_BASELINE==='1', engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const output=resolve(process.env.RUNLOAD_UPR_OUTPUT||'audit-output/upr-'+engine);await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const f=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(f!==root&&!f.startsWith(root+sep))throw Error('outside root');const path=f===root?resolve(root,'index.html'):f;res.setHeader('content-type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});const reports=[],failures=[];
const check=(ok,msg)=>{if(!ok&&!baseline)failures.push(msg);};
const geometry=page=>page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};return {width:innerWidth,doc:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,scale:visualViewport.scale,visualWidth:visualViewport.width,rootFont:getComputedStyle(document.documentElement).fontSize,heading:box('.ex-heading'),tabs:box('.ex-switch'),outer:box('.ex-page'),main:box('.main-content'),sample:document.querySelectorAll('[data-ex-action="sample"]').length,related:document.querySelectorAll('.ex-node.is-related').length,active:document.activeElement?.dataset?.exTab||null};});
const gpsGeometry=page=>page.evaluate(()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom};};const summary=document.querySelector('.gps-live-info summary'),r=summary.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const p=document.querySelector('.gps-live-info p');const pr=p.getBoundingClientRect();const last=document.elementFromPoint(pr.x+Math.min(15,pr.width/2),pr.bottom-5);return {scroll:scrollY,max:document.documentElement.scrollHeight-innerHeight,viewport:innerHeight,info:box('.gps-live-info'),summary:box('.gps-live-info summary'),start:box('[data-gps-action="start"]'),nav:box('.mobile-nav'),reachable:!!hit&&summary.contains(hit),lastVisible:!!last&&p.contains(last),open:summary.parentElement.open};});
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const mobile=width<=768,tag=`${lang}-${width}-${zoom}`;
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block',...(mobile?{userAgent:engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'}:{})});
  const row={tag,engine,baseline,explore:[],errors:[]};reports.push(row);
  try{
   await ctx.addInitScript(language=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language}));},lang);
   const page=await ctx.newPage();page.on('pageerror',e=>row.errors.push(String(e)));
   await page.goto(base+'#/exploration-tree',{waitUntil:'networkidle'});await page.locator('.ex-switch').waitFor();if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});await page.waitForFunction(l=>document.documentElement.lang===l,lang);
   for(const [i,mode] of ['field','catalog','field','catalog','field'].entries()){
    await page.locator(`[data-ex-tab="${mode}"]`).click();await page.locator(`[data-ex-tab="${mode}"][aria-pressed="true"]`).waitFor();await page.waitForTimeout(150);
    const g=await geometry(page);row.explore.push({mode,...g});await page.screenshot({path:resolve(output,`${tag}-tab-${i}-${mode}.png`),animations:'disabled'});
    check(g.doc<=width+3,`${tag} overflow ${mode}: ${g.doc}`);check(g.sample===0,`${tag} example control still exists`);check(g.related===0,`${tag} fabricated relevance`);
    if(i){const first=row.explore[0];for(const key of ['width','client','scale','visualWidth'])check(Math.abs(g[key]-first[key])<=0.5,`${tag} ${key} changed`);for(const key of ['heading','tabs','outer','main'])for(const axis of ['x','w'])check(Math.abs(g[key][axis]-first[key][axis])<=1,`${tag} ${key} ${axis} changed`);check(g.rootFont===first.rootFont,`${tag} root font changed`);check(g.active===mode,`${tag} focus lost`);}
   }
   if(mobile){await page.goto(base+'#/measurement',{waitUntil:'networkidle'});await page.locator('.gps-live-info').waitFor({state:'attached'});if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(150);row.gpsClosed=await gpsGeometry(page);await page.screenshot({path:resolve(output,`${tag}-gps-bottom-closed.png`),animations:'disabled'});check(row.gpsClosed.reachable,`${tag} GPS summary obscured`);if(row.gpsClosed.reachable){await page.locator('.gps-live-info summary').click();await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(150);row.gpsOpen=await gpsGeometry(page);await page.screenshot({path:resolve(output,`${tag}-gps-bottom-open.png`),animations:'disabled'});check(row.gpsOpen.open&&row.gpsOpen.lastVisible,`${tag} GPS explanation obscured`);} }
   check(row.errors.length===0,`${tag} browser errors: ${row.errors.join(';')}`);
  }catch(e){row.exception=String(e);check(false,`${tag} ${e}`);}finally{await ctx.close();}
 }
}finally{await browser.close();await new Promise(done=>server.close(done));await writeFile(resolve(output,'summary.json'),JSON.stringify({engine,baseline,reports,failures},null,2));}
console.log(`UPR ${engine} ${baseline?'baseline':'candidate'}: ${reports.length} states, ${failures.length} failures`);assert.deepEqual(failures,[]);
