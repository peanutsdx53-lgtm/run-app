import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,dirname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".webmanifest":"application/manifest+json",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
  const file=resolve(root,"."+path);
  if(!(file===root||file.startsWith(root+sep)))throw Error("invalid path");
  const real=file===root?resolve(root,"index.html"):file;
  res.setHeader("Content-Type",mime[extname(real)]||"application/octet-stream");
  res.end(await readFile(real));
 }catch{res.statusCode=404;res.end("Not found");}
});
await new Promise(ok=>server.listen(4186,"127.0.0.1",ok));
const browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,...(engineName==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 await mkdir(resolve(root,"screenshots"),{recursive:true});
 for(const mode of [{name:"mobile",width:390,height:844},{name:"narrow",width:320,height:740},{name:"desktop",width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:4186/#/home",{waitUntil:"domcontentloaded"});
  await page.locator(".fu-shell").waitFor();
  assert.equal(await page.locator('[data-onboard-overlay]').count(),1);
  assert.match(await page.locator("#onboard-title").innerText(),/表示言語/);
  const english=page.locator('[data-onboard-language="en"]');
  assert.equal(await english.isEnabled(),true,'English is selectable during first-use setup');
  assert.equal(await english.getAttribute("lang"),"en");
  assert.match(await english.innerText(),/Use the app in English/);
  assert.doesNotMatch(await english.innerText(),/Preview only/);
  assert.doesNotMatch(await english.innerText(),/[\u3040-\u30ff\u3400-\u9fff]/);
  for(let step=0;step<8;step++){
   const shell=page.locator(".fu-shell");
   const box=await shell.boundingBox();
   assert.ok(box.width<=mode.width+2,mode.name+" flow width "+JSON.stringify(box));
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(overflow.scroll<=overflow.viewport+3,mode.name+" horizontal overflow "+JSON.stringify(overflow));
   assert.equal((await shell.innerText()).includes("RunLoad"),false,"development name must not appear");
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-first-use-"+String(step+1).padStart(2,"0")+".png")});
   if(step===2){
    const cards=page.locator('.fu-intro-cards .fu-number-card');
    assert.equal(await cards.count(),4,'approved poster has four distinct operations');
    const text=await cards.allInnerTexts();
    for(const word of ['手入力で記録する','結果を確認する','過去と比較する','任意で気づきを書く'])
     assert.ok(text.some(v=>v.includes(word)),word);
   }
   if(step===1){
    const next=page.locator("[data-onboard-next]");
    assert.equal(await next.isDisabled(),true);
    await page.locator('[data-onboard-document="terms"]').click();
    assert.match(await page.locator(".fu-doc-dialog").innerText(),/運営者の責任/);
    await page.locator('.fu-doc-dialog [data-legal-dismiss]').first().click();
    await page.locator('[data-onboard-document="privacy"]').click();
    assert.match(await page.locator(".fu-doc-dialog").innerText(),/OpenStreetMap/);
    await page.locator('.fu-doc-dialog [data-legal-dismiss]').first().click();
    await page.locator('[data-onboard-terms]').check();
    assert.equal(await next.isDisabled(),true);
    await page.locator('[data-onboard-privacy]').check();
    assert.equal(await next.isEnabled(),true);
   }
   if(step===7){await page.locator("[data-onboard-skip-profile]").click();break;}
   await page.locator("[data-onboard-next]").click();
  }
  assert.equal(await page.locator(".fu-shell").count(),0);
  await page.locator(".home-head h1").waitFor();
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-first-use-09-home.png")});
  const consent=await page.evaluate(()=>{
   const c=JSON.parse(localStorage.getItem("runload-v2-legal-consent-v1")||"null");
   const i=JSON.parse(localStorage.getItem("runload-v2-introduction-preview-v1")||"null");
   return {c,i};
  });
  const currentLegalVersion=await page.evaluate(async()=>(await import('/ui/legalDocuments.js')).LEGAL_VERSION);
  assert.equal(consent.c.termsVersion,currentLegalVersion);
  assert.equal(consent.c.privacyVersion,currentLegalVersion);
  assert.equal(consent.c.termsAccepted,true);
  assert.equal(consent.c.privacyConfirmed,true);
  assert.equal(consent.i.completed,true);
  await page.goto("http://127.0.0.1:4186/#/settings",{waitUntil:"domcontentloaded"});
  await page.locator("[data-settings-v2]").waitFor();
  assert.equal(await page.locator(".fu-shell").count(),0,"completed introduction must not reappear");
  const item=page.locator(".s2-item").filter({hasText:"利用規約・プライバシー"}).first();
  await item.locator("summary").click();
  await item.locator('[data-legal-open="terms"]').click();
  assert.match(await page.locator(".fu-doc-dialog").innerText(),/利用規約/);
  await page.locator('.fu-doc-dialog [data-legal-dismiss]').first().click();
  await page.locator(".s2-item").filter({hasText:"初回ガイド"}).first().locator("summary").click();
  await page.locator("[data-onboard-open]").click();
  assert.match(await page.locator("#onboard-title").innerText(),/記録と振り返り/);
  assert.equal(await page.locator('[data-onboard-close]').count(),1,"reopened guide may be closed");
  await page.locator('[data-onboard-close]').click();
  assert.equal(await page.locator(".fu-shell").count(),0);
  await page.evaluate(()=>{const key="runload-v2-legal-consent-v1",c=JSON.parse(localStorage.getItem(key));c.privacyVersion="old";localStorage.setItem(key,JSON.stringify(c));});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".fu-shell").waitFor();
  assert.match(await page.locator("#onboard-title").innerText(),/利用規約とプライバシー/);
  await page.locator("[data-onboard-terms]").check();
  await page.locator("[data-onboard-privacy]").check();
  await page.locator("[data-onboard-next]").click();
  assert.equal(await page.locator(".fu-shell").count(),0,"version change requires only reconfirmation");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-legal-consent-v1")).privacyVersion),currentLegalVersion);
  assert.deepEqual(errors,[],mode.name+" JavaScript exceptions");
  console.log("PASS",mode.name,"Japanese first use, two confirmations, legal documents, optional profile, settings replay");
  await page.close();
  // Separate clean first-use path: mandatory legal confirmation cannot be skipped,
  // while the five optional guide pages may be deferred for later replay.
  const skip=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:"reduce"});
  try{
   await skip.goto("http://127.0.0.1:4186/#/home",{waitUntil:"domcontentloaded"});
   await skip.locator(".fu-shell").waitFor();
   assert.equal(await skip.locator("[data-onboard-skip-guide]").count(),0);
   await skip.locator("[data-onboard-next]").click();
   assert.equal(await skip.locator("[data-onboard-skip-guide]").count(),0);
   await skip.locator("[data-onboard-terms]").check();
   await skip.locator("[data-onboard-privacy]").check();
   await skip.locator("[data-onboard-next]").click();
   await skip.locator("[data-onboard-skip-guide]").waitFor();
   const a=await skip.locator(".fu-shell").boundingBox();
   assert.ok(a.width<=mode.width+2,"defer-guide overlay clipped");
   assert.ok(await skip.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),"defer-guide horizontal overflow");
   await skip.screenshot({path:resolve(root,"screenshots",mode.name+"-first-use-optional-skip.png")});
   await skip.locator("[data-onboard-skip-guide]").click();
   assert.match(await skip.locator("#onboard-title").innerText(),/プロフィール/);
   await skip.locator("[data-onboard-skip-profile]").click();
   assert.equal(await skip.locator(".fu-shell").count(),0);
   assert.equal(await skip.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-introduction-preview-v1")).completed),true);
   await skip.goto("http://127.0.0.1:4186/#/settings",{waitUntil:"domcontentloaded"});
   const guide=skip.locator(".s2-item").filter({hasText:"初回ガイド"}).first();
   await guide.locator("summary").click();
   await skip.locator("[data-onboard-open]").click();
   assert.match(await skip.locator("#onboard-title").innerText(),/記録と振り返り/);
   assert.equal(await skip.locator("[data-onboard-skip-guide]").count(),0,"replayed guide is already optional");
  }finally{await skip.close();}
  // English must be selectable on a clean device, carry through legal consent,
  // and allow the main application to open without relying on Settings.
  const englishStart=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:"reduce"});
  try{
   await englishStart.goto("http://127.0.0.1:4186/#/home",{waitUntil:"domcontentloaded"});
   await englishStart.locator('[data-onboard-language="en"]').click();
   await englishStart.waitForFunction(()=>document.documentElement.lang==='en');
   await englishStart.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Display Language');
   await englishStart.locator("[data-onboard-next]").click();
   await englishStart.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Terms of Use and Privacy');
   assert.equal(await englishStart.locator('[data-onboard-next]').isDisabled(),true);
   await englishStart.locator('[data-onboard-document="terms"]').click();
   assert.match(await englishStart.locator('[data-legal-english-reference]').innerText(),/Unofficial English reference translation/);
   assert.match(await englishStart.locator('.fu-doc-scroll').innerText(),/運営者の責任/);
   await englishStart.locator('[data-legal-dismiss]').first().click();
   await englishStart.locator('[data-onboard-terms]').check();
   await englishStart.locator('[data-onboard-privacy]').check();
   await englishStart.locator('[data-onboard-next]').click();
   await englishStart.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Recording and Reflection');
   await englishStart.locator('[data-onboard-skip-guide]').click();
   await englishStart.locator('[data-onboard-skip-profile]').click();
   await englishStart.locator('.home-head h1').waitFor();
   assert.equal(await englishStart.evaluate(()=>document.documentElement.lang),'en');
   assert.equal(await englishStart.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-display-preferences-v1')).language),'en');
   assert.equal(await englishStart.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-legal-consent-v1')).termsAccepted),true);
   await englishStart.reload({waitUntil:'domcontentloaded'});
   // DOMContentLoaded precedes the async module startup: wait for hydration,
   // then verify the persisted English preference is applied to the real app.
   await englishStart.locator('.home-head h1').waitFor({timeout:20000});
   await englishStart.waitForFunction(()=>document.documentElement.lang==='en');
   assert.equal(await englishStart.evaluate(()=>document.documentElement.lang),'en');
   assert.equal(await englishStart.locator('[data-onboard-overlay]').count(),0);
  }finally{await englishStart.close();}
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
