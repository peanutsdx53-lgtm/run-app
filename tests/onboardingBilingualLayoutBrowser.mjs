/* Bilingual first-use layout: real app/browser screenshots and containment assertions.
 * No user data: each context uses an empty, isolated browser storage profile. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside root');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('content-type',types[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port+'/#/home';
const browser=await (engine==='webkit'?webkit:chromium).launch({
 headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})
});
const out=resolve(root,'audit-output','onboarding-'+engine);
await mkdir(out,{recursive:true});
const results=[];

async function verifyBounds(page,screen,width,language){
 const data=await page.evaluate(()=>{
  const viewport=document.documentElement.clientWidth;
  const elements=[...document.querySelectorAll('.fu-language-option,.fu-profile-form input,.fu-profile-form select,.fu-footer .fu-button')]
   .filter(el=>el.getClientRects().length).map(el=>{
    const r=el.getBoundingClientRect();
    return {tag:el.tagName,role:el.getAttribute('data-onboard-language')||el.getAttribute('data-onboard-next')||el.getAttribute('data-onboard-skip-profile')||el.getAttribute('data-onboard-back')||el.getAttribute('data-onboard-nickname')||el.getAttribute('data-onboard-height')||el.getAttribute('data-onboard-weight')||el.getAttribute('data-onboard-purpose')||'control',
     text:el.innerText?.trim().slice(0,80)||'',left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
   });
  const shell=document.querySelector('.fu-shell')?.getBoundingClientRect();
  const body=document.body,doc=document.documentElement;
  return {viewport,documentWidth:doc.scrollWidth,bodyWidth:body.scrollWidth,shell:{left:shell.left,right:shell.right},elements};
 });
 assert.ok(data.documentWidth<=width+3&&data.bodyWidth<=width+3,screen+' document overflow '+JSON.stringify(data));
 for(const item of data.elements){
  assert.ok(item.left>=-2&&item.right<=width+2,screen+' clipped '+JSON.stringify(item));
  assert.ok(item.right>item.left&&item.bottom>item.top,screen+' empty control '+JSON.stringify(item));
 }
 if(screen==='profile'){
  const pair=await page.locator('.fu-profile-pair input').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}}));
  assert.equal(pair.length,2,'profile has two optional measurements');
  if(width<=520){
   assert.ok(pair[1].top>=pair[0].bottom+4,'mobile measurement inputs must be stacked in both languages: '+JSON.stringify(pair));
   assert.ok(Math.abs(pair[0].left-pair[1].left)<=2&&Math.abs(pair[0].right-pair[1].right)<=2,'mobile inputs share full width');
  }
  const selectColors=await page.locator('.fu-profile-form select').evaluate(el=>{
   const css=getComputedStyle(el);return {background:css.backgroundColor,color:css.color,appearance:css.appearance};
  });
  assert.equal(selectColors.appearance,'none','WebKit and Chromium select must use the same styled control');
  const footer=await page.locator('.fu-footer .fu-button').evaluateAll(els=>els.map(el=>{
   const r=el.getBoundingClientRect();return {text:el.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
  }));
  assert.equal(footer.length,3,'profile has back, optional skip and save actions');
  for(let i=1;i<footer.length;i++){
   const a=footer[i-1],b=footer[i];
   assert.ok(a.right<=b.left+1||a.bottom<=b.top+1,'footer actions overlap: '+JSON.stringify(footer));
  }
  for(const btn of footer)assert.ok(btn.scrollWidth<=btn.clientWidth+2,'footer text clipped '+JSON.stringify(btn));
 }
 results.push({screen,width,language,engine,...data});
}
try{
 for(const width of [320,390,768,1440]){
  for(const language of ['ja','en']){
   const context=await browser.newContext({
    viewport:{width,height:width===1440?900:width===768?1024:844},
    deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('.fu-shell').waitFor();
   if(language==='en'){
    await page.locator('[data-onboard-language="en"]').click();
    await page.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Display Language');
   }
   const title=await page.locator('#onboard-title').innerText();
   assert.equal(title,language==='en'?'Display Language':'表示言語');
   assert.equal(await page.locator('.fu-screen-title > p').count(),0,'no explanatory paragraph on language selection');
   assert.equal(await page.locator('.fu-screen-title > .fu-eyebrow').count(),0,'no redundant setup eyebrow');
   assert.equal(await page.locator('.fu-language-option p').count(),0,'no duplicate language subtitle');
   assert.equal(await page.locator('.fu-language-option').count(),2);
   assert.equal(await page.locator('.fu-chosen').count(),1);
   const cardBoxes=await page.locator('.fu-language-option').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
   assert.ok(Math.abs(cardBoxes[0]-cardBoxes[1])<=2,'both language cards share dimensions '+JSON.stringify(cardBoxes));
   await verifyBounds(page,'language',width,language);
   await page.screenshot({path:resolve(out,'language-'+language+'-'+width+'.png'),animations:'disabled'});
   await page.locator('[data-onboard-next]').click();
   assert.equal(await page.locator('.fu-screen-title > .fu-eyebrow').count(),0,'no redundant legal eyebrow');
   await page.locator('[data-onboard-terms]').check();
   await page.locator('[data-onboard-privacy]').check();
   await page.locator('[data-onboard-next]').click();
   await page.locator('[data-onboard-skip-guide]').click();
   await page.locator('[data-onboard-skip-profile]').waitFor();
   assert.equal(await page.locator('#onboard-title').innerText(),language==='en'?'Profile Settings':'プロフィールの設定');
   await verifyBounds(page,'profile',width,language);
   await page.screenshot({path:resolve(out,'profile-'+language+'-'+width+'.png'),animations:'disabled'});
   assert.deepEqual(errors,[],language+' '+width+' script errors');
   console.log('PASS',engine,width,language,'language/profile visible bounds and nonoverlapping footer');
   await context.close();
  }
 }
 await writeFile(resolve(out,'measurements.json'),JSON.stringify({engine,run:'first-use bilingual language and profile',results},null,2));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
