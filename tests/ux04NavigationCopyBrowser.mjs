/* UX04: opt-in keyed bilingual nav copy across mobile and desktop.
 * No mutation of saved records. Fails if any tagged route key, label or
 * route action drifts, or if English defaults to an untranslated JA label.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import {UI_ACTION_COPY} from '../ui/actionCopyKeys.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux04-actions-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const requested=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(requested!==root&&!requested.startsWith(root+sep))throw Error('blocked');
  // The homepage URL is '/'. Determine MIME from the actual index.html file
  // rather than the root directory; otherwise Chromium starts a download.
  const file=requested===root?resolve(root,'index.html'):requested;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not Found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const home='http://127.0.0.1:'+server.address().port+'/#/home';
const routes={mobile:['home','record-start','history','exploration-tree','settings'],
 desktop:['home','record','result','history','exploration-tree','learning','settings']};
const results=[];
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const font of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(language=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language}));
  },lang);
  const page=await ctx.newPage();
  await page.goto(home,{waitUntil:'networkidle'});
  await page.locator('.home-v3').first().waitFor({state:'visible',timeout:18000});
  if(font===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const variant=width<=800?'mobile':'desktop';
  const selector=variant==='mobile'?'.mobile-nav .mobile-link':'.sidebar .side-link';
  const expected=routes[variant].map(route=>({key:'nav.'+route,href:'#/'+route,copy:UI_ACTION_COPY['nav.'+route][lang]}));
  // English text rendering is a queued DOM pass; require actual translated
  // labels, instead of measuring an unlocalized intermediate state.
  await page.waitForFunction(({selector,expected})=>{
   const links=[...document.querySelectorAll(selector)];
   return links.length===expected.length&&links.every((el,i)=>el.textContent.trim()===expected[i].copy);
  },{selector,expected},{timeout:16000});
  const current=await page.locator(selector).evaluateAll(els=>els.map(el=>({
   key:el.getAttribute('data-ui-copy-key'),kind:el.getAttribute('data-ui-action-kind'),
   href:el.getAttribute('href'),label:el.textContent.trim(),
   current:el.getAttribute('aria-current'),
   visible:getComputedStyle(el).display!=='none'
  })));
  assert.deepEqual(current.map(x=>({key:x.key,href:x.href,label:x.label})),expected.map(x=>({key:x.key,href:x.href,label:x.copy})),
   'stable navigation label mismatch: '+JSON.stringify({engine,lang,width,font}));
  assert.ok(current.every(x=>x.kind==='navigate'),'no navigation action may masquerade as save or select');
  assert.equal(current.filter(x=>x.current==='page').length,1,'exactly one active Home tab');
  assert.equal(current.find(x=>x.current==='page')?.key,'nav.home');
  const target=page.locator(selector+'[data-ui-copy-key="nav.exploration-tree"]');
  await target.click({timeout:15000});
  await page.locator('[data-experience-v3]').first().waitFor({state:'visible',timeout:18000});
  await page.waitForFunction(selector=>{
   const a=document.querySelector(selector+'[data-ui-copy-key="nav.exploration-tree"]');
   return a&&a.getAttribute('aria-current')==='page';
  },selector,{timeout:18000});
  const selected=await page.locator(selector+'[data-ui-copy-key="nav.exploration-tree"]').textContent();
  assert.equal(selected.trim(),UI_ACTION_COPY['nav.exploration-tree'][lang]);
  results.push({engine,lang,width,font,variant,count:current.length,homeLabel:current[0].label,exploreLabel:selected.trim(),passed:true});
  if(font===200&&(width===320||width===390||width===1440)){
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-'+font+'-explore-nav.png'),animations:'disabled',fullPage:false});
  }
  await ctx.close();
 }
 assert.equal(results.length,16);
 await writeFile(resolve(out,'action-copy-matrix.json'),JSON.stringify({engine,cases:results.length,results},null,2));
 console.log('UX04 ACTION COPY PASS '+JSON.stringify({engine,conditions:results.length,navDestinations:12}));
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}
