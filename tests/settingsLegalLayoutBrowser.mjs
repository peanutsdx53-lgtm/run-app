import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,readFile} from "node:fs/promises";
import {resolve,dirname,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium,webkit} from "playwright";
const engine=process.env.RUNLOAD_BROWSER_ENGINE==="webkit"?"webkit":"chromium";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const candidate=resolve(root,"."+relative);
  if(candidate!==root&&!candidate.startsWith(root+sep))throw Error("outside root");
  const path=candidate===root?resolve(root,"index.html"):candidate;
  res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");
  res.end(await readFile(path));
 }catch{res.statusCode=404;res.end("Not found");}
});
await new Promise(ok=>server.listen(4198,"127.0.0.1",ok));
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const base="http://127.0.0.1:4198";
const out=resolve(root,"screenshots","settings-legal");
await mkdir(out,{recursive:true});
function verifyGeometry(label,g){
 assert.ok(g.dialogTop>=0&&g.dialogBottom<=g.height+1,label+" dialog must stay in viewport "+JSON.stringify(g));
 assert.ok(g.headerTop>=0&&g.headerBottom<=g.height,label+" header must be visible "+JSON.stringify(g));
 assert.ok(g.closeTop>=0&&g.closeBottom<=g.height,label+" close button must be visible "+JSON.stringify(g));
 assert.ok(g.footerTop>=0&&g.footerBottom<=g.height+1,label+" footer must be visible "+JSON.stringify(g));
 assert.ok(g.scrollTop>=0,label+" document scrollable");
 assert.ok(g.noHorizontalOverflow,label+" no horizontal overflow");
}
async function geometry(page){
 return page.evaluate(()=>{
  const dialog=document.querySelector('body > .fu-doc-backdrop .fu-doc-dialog');
  const header=dialog.querySelector('header').getBoundingClientRect();
  const close=dialog.querySelector('.fu-doc-close').getBoundingClientRect();
  const footer=dialog.querySelector('footer').getBoundingClientRect();
  const rect=dialog.getBoundingClientRect();
  const scroll=dialog.querySelector(".fu-doc-scroll");
  return {height:innerHeight,dialogTop:rect.top,dialogBottom:rect.bottom,headerTop:header.top,headerBottom:header.bottom,closeTop:close.top,closeBottom:close.bottom,footerTop:footer.top,footerBottom:footer.bottom,scrollTop:scroll.scrollTop,noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+2};
 });
}
try{
 for(const mode of [{name:"320",width:320,height:740},{name:"390",width:390,height:844},{name:"desktop",width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},reducedMotion:"reduce"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/",{waitUntil:"networkidle"});
  await page.evaluate(async()=>{
   const {LEGAL_VERSION}=await import("/ui/legalDocuments.js");
   localStorage.setItem("runload-v2-introduction-preview-v1",JSON.stringify({completed:true,language:"ja"}));
   localStorage.setItem("runload-v2-legal-consent-v1",JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:"2026-10-28T00:00:00Z",termsVersion:LEGAL_VERSION,privacyVersion:LEGAL_VERSION}));
  });
  await page.goto(base+"/#/settings",{waitUntil:"networkidle"});
  await page.reload({waitUntil:"networkidle"});
  await page.locator("[data-settings-v2]").waitFor();
  assert.equal(await page.locator("[data-onboard-overlay]").count(),0,"completed first-use state must not cover settings");
  // Save screenshots of the condensed backup and deletion forms.
  await page.locator('details.s2-item').filter({has:page.locator('[data-dm-export]')}).locator('summary').first().click();
  await page.screenshot({path:resolve(out,engine+"-"+mode.name+"-backup.png"),fullPage:true});
  await page.locator('details.s2-item').filter({has:page.locator('[data-dm-delete-confirm]')}).locator('summary').first().click();
  await page.screenshot({path:resolve(out,engine+"-"+mode.name+"-deletion.png"),fullPage:true});
  await page.locator('details.s2-item').filter({has:page.locator('[data-legal-open="terms"]')}).locator('summary').first().click();
  for(const kind of ["terms","privacy"]){
   await page.locator('[data-legal-open="'+kind+'"]').click();
   const doc=page.locator("body > .fu-doc-backdrop");
   await doc.waitFor();
   assert.equal(await page.locator(".fu-doc-close").count(),1);
   assert.equal(await page.locator(".fu-doc-close").getAttribute("aria-label"),"閉じる");
   assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains("fu-doc-close")),true);
   assert.equal(await page.locator(".fu-doc-scroll").evaluate(el=>el.scrollTop),0);
   verifyGeometry(engine+"/"+mode.name+"/"+kind,await geometry(page));
   await page.screenshot({path:resolve(out,engine+"-"+mode.name+"-"+kind+"-top.png"),fullPage:false});
   await page.locator(".fu-doc-scroll").evaluate(el=>el.scrollTop=el.scrollHeight);
   verifyGeometry(engine+"/"+mode.name+"/"+kind+"-bottom",await geometry(page));
   await page.screenshot({path:resolve(out,engine+"-"+mode.name+"-"+kind+"-bottom.png"),fullPage:false});
   if(kind==="terms"){
    await page.keyboard.press("Escape");
    await doc.waitFor({state:"detached"});
    assert.equal(await page.locator('[data-legal-open="terms"]').evaluate(el=>document.activeElement===el),true);
   }else{
    await page.locator(".fu-doc-close").click();
    await doc.waitFor({state:"detached"});
   }
  }
  // Enlargement is a separate stress test for text and fixed controls.
  if(mode.width===390){
   await page.evaluate(()=>document.documentElement.style.fontSize="200%");
   await page.locator('[data-legal-open="privacy"]').click();
   verifyGeometry(engine+"/390/enlarged",await geometry(page));
   await page.screenshot({path:resolve(out,engine+"-390-privacy-200percent.png"),fullPage:false});
   await page.keyboard.press("Escape");
  }
  assert.deepEqual(errors,[],engine+"/"+mode.name+" browser errors");
  console.log("PASS",engine,mode.name,"backup/delete screenshots and legal viewport controls");
  await context.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
