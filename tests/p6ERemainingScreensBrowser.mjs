/** P6-E: real-browser acceptance across five remaining screen families.
 * No live GPS or permission is requested. All data stays in disposable contexts.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'screenshots','p6e');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=resolve(root,'.'+name);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/#/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const evidence=[];
async function audit(page,width,screen){
 const obj=await page.evaluate(()=>{
  return {viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,height:document.documentElement.scrollHeight};
 });
 assert.ok(obj.doc<=width+3&&obj.body<=width+3,screen+' horizontal overflow '+JSON.stringify(obj));
 const trigger=page.locator('.rl-screen-help > summary');
 assert.equal(await trigger.count(),1,screen+' exactly one header guidance control');
 const b=await trigger.boundingBox();
 assert.ok(b&&b.width>=43&&b.height>=43&&b.x>=0&&b.x+b.width<=width+2,screen+' visible help target '+JSON.stringify(b));
 return obj;
}
async function help(page,screen,expected){
 const root=page.locator('.rl-screen-help');
 await root.locator('summary').click();
 assert.match(await root.innerText(),expected,screen+' help preserves needed explanation');
 await root.locator('summary').click();
}
async function image(page,screen,width,suffix='viewport'){
 await page.screenshot({path:resolve(out,screen+'-'+width+'-'+suffix+'.png'),fullPage:suffix==='full',animations:'disabled'});
}
async function zoom(page,screen,width){
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 await audit(page,width,screen+' text-200%');
 const m=await page.evaluate(()=>{
  const nav=document.querySelector('.mobile-nav');
  const b=nav.getBoundingClientRect();
  return {top:b.top,bottom:b.bottom,height:innerHeight,items:[...nav.querySelectorAll('.mobile-link')].map(a=>{
   const textNode=[...a.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
   const r=document.createRange();r.selectNodeContents(textNode);const x=r.getBoundingClientRect();
   return {label:textNode.textContent.trim(),top:x.top,bottom:x.bottom};
  })};
 });
 assert.equal(m.items.length,6,screen+' six bottom navigation destinations');
 assert.ok(m.top>=-1&&m.bottom<=m.height+1,screen+' zoom nav fits '+JSON.stringify(m));
 assert.ok(m.items.every(v=>v.top>=m.top-1&&v.bottom<=m.bottom-2),screen+' nav labels not clipped '+JSON.stringify(m));
 await image(page,screen,width,'text200');
 await page.evaluate(()=>{document.documentElement.style.fontSize=''});
}
try{
 for(const width of [320,390,430,768,1024,1440,1920]){
  const isPhone=width<801;
  const height=width>=1440?900:width>=768?1024:844;
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',
   ...(isPhone?{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'}:{})});
  await ctx.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   const today=new Date();const date=offset=>{const d=new Date(today);d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
   localStorage.setItem('runload-v2-life-condition-v1',JSON.stringify([
    {date:date(-2),sleepMinutes:420,sleepSource:'duration',feeling:'ふつう',memo:'任意の本人メモ'},
    {date:date(-1),sleepMinutes:450,sleepSource:'duration',feeling:'良い',memo:'本人による観察'}
   ]));
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const go=async(route,selector)=>{await page.goto(base+route,{waitUntil:'networkidle'});await page.locator(selector).waitFor({state:'visible',timeout:20000})};
  // S14 condition
  await go('condition','.cj-screen .cj-page-head');
  assert.match(await page.locator('.cj-screen').innerText(),/コンディションの歩み/);
  assert.equal(await page.locator('.cj-screen [data-cj-day]:not([disabled])').count(),2);
  await audit(page,width,'condition');await image(page,'condition',width);
  await help(page,'condition',/本人の記録/);
  if(width===320||width===390)await zoom(page,'condition',width);
  // S15 consultation
  await go('consultation','#runload-consultation .cp-head');
  assert.equal(await page.locator('#cp-target').count(),1);
  assert.equal(await page.locator('[data-share="notes"]').isChecked(),false,'private notes initially excluded');
  assert.equal(await page.locator('#cp-print').count(),1,'print action not removed');
  assert.match(await page.locator('.cp-sensitive').innerText(),/本人が選んだ場合だけ出力します/);
  await audit(page,width,'consultation');await image(page,'consultation',width);
  await help(page,'consultation',/自動送信もしません/);
  if(width===320||width===390)await zoom(page,'consultation',width);
  // S16 settings
  await go('settings','[data-settings-v2] .s2-heading');
  assert.match(await page.locator('[data-settings-v2]').innerText(),/データとプライバシー/);
  assert.ok(await page.locator('[data-settings-v2] [data-install-app]').count()>=1,'install guidance remains available in settings');
  await audit(page,width,'settings');await image(page,'settings',width);
  await help(page,'settings',/バックアップとプライバシー/);
  if(width===320||width===390)await zoom(page,'settings',width);
  // S17 GPS: no permission, no measurement started
  await go('measurement',isPhone?'[data-measurement-v2]':'.gps-platform-unavailable');
  if(isPhone){
   assert.equal(await page.locator('[data-gps-action="start"]').count(),1,'GPS start remains voluntary');
   assert.match(await page.locator('.gps-live-disclaimer').innerText(),/未保存/);
   assert.equal(await page.locator('[data-gps-keep-awake]').count(),1);
   await audit(page,width,'measurement');await image(page,'measurement',width);
   await help(page,'measurement',/誤差/);
   if(width===320||width===390)await zoom(page,'measurement',width);
  }else{
   assert.equal(await page.locator('[data-gps-action="start"]').count(),0,'desktop does not offer start');
   await image(page,'measurement-desktop-limitation',width);
  }
  // S18 simulation (hypotheses are not actual measurement)
  await go('simulation','.sm-page .sm-heading');
  assert.equal(await page.locator('.sm-panel').count(),4,'all four steps retained');
  assert.equal(await page.locator('.sm-source-option').count(),4,'four source options retained');
  assert.match(await page.locator('.sm-page').innerText(),/仮|計算/);
  assert.doesNotMatch(await page.locator('.sm-heading').innerText(),/WHAT IF/);
  await audit(page,width,'simulation');await image(page,'simulation',width);
  await help(page,'simulation',/実測や予測ではありません/);
  if(width===320||width===390)await zoom(page,'simulation',width);
  assert.deepEqual(errors,[],'JS exceptions '+width);
  evidence.push({width,condition:true,consultation:true,settings:true,gps:isPhone?'phone:ready':'desktop:blocked',simulation:true,errors:0});
  await ctx.close();
 }
 console.log('P6E VERIFIED REMAINING UI MATRIX '+JSON.stringify(evidence));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
