/** English interface real-browser acceptance. This does not certify translated legal
 * documents, original scientific-source translation, or independent linguistic review.
 * All records are synthetic and isolated from user profiles. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const name=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
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
const origin='http://127.0.0.1:'+server.address().port+'/#/';
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','english-preview-'+name);
await mkdir(out,{recursive:true});
const results=[];
try{
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'settings',{waitUntil:'networkidle'});
  const settings=page.locator('[data-settings-v2]');
  await settings.waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'ja');
  const starting=await page.evaluate(async()=>{
   const c=await import('/ui/manualRunCanonical.js'),m=await import('/ui/manualRunStore.js');
   const ok=await c.initialize();if(!ok.ok)throw Error('canonical init');
   const saved=await c.mutate(s=>m.saveManualRun(s,{date:'2026-11-11',distance:'6',hours:'',minutes:'33',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',memo:'記録',shoeName:'',courseName:'記録'}));
   if(!saved.ok)throw Error('record save '+saved.reason);
   const read=await c.readCanonical();return {id:saved.record.id,raw:read.raw};
  });
  const lang=settings.locator('[data-settings-language=en]');
  await lang.locator('xpath=ancestor::details').evaluate(el=>{el.open=true});
  await lang.click();
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert.equal(await page.locator('.mobile-nav a[href="#/home"]').innerText(),'Home');
  assert.equal(await page.locator('.mobile-nav a[href="#/settings"]').innerText(),'Settings');
  assert.equal(await page.locator('.rl-english-preview-note').count(),0,'English does not display a preview banner');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-display-preferences-v1')).language),'en');

  await page.waitForFunction(()=>document.querySelector('#s3-nickname')?.getAttribute('placeholder')==='Example: Runner / Leave Blank');
  assert.match(await page.locator('.s3-profile-intro p').textContent(),/not sent automatically/);

  await page.screenshot({path:resolve(out,width+'-english-settings.png'),fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await settings.waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'en','language persists across reload');
  assert.equal(await page.locator('.mobile-nav a[href="#/home"]').innerText(),'Home');
  await page.goto(origin+'record-start',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.rv-method .rv-screen-help p')?.textContent?.includes('Choose manual entry or GPS measurement'));
  await page.screenshot({path:resolve(out,width+'-english-record-method.png'),fullPage:true});
  await page.goto(origin+'record',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.rv-manual h1')?.textContent==='Enter a Record Manually');
  await page.waitForFunction(()=>document.querySelector('.rv-manual .rv-screen-help p')?.textContent?.includes('Enter a date, distance'));
  await page.goto(origin+'history',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#runload-history-v2')?.shadowRoot?.querySelector('.calendar-panel')?.getAttribute('aria-label')==='Record Calendar');
  assert.ok((await page.locator('#runload-history-v2').evaluate(host=>[...host.shadowRoot.querySelectorAll('.entry-title')].map(el=>el.textContent))).includes('記録'),'user-entered course title matching a UI label must stay unchanged');
  await page.screenshot({path:resolve(out,width+'-english-history.png'),fullPage:true});
  await page.goto(origin+'result?record='+encodeURIComponent(starting.id),{waitUntil:'networkidle'});
  const result=page.locator('#runload-result-v4');
  await result.locator('.rv4-mobile-tabs [data-tab]').first().waitFor({state:'attached',timeout:20000});
  assert.equal(await result.locator('.rv4-mobile-tabs [data-tab]').count(),3);
  assert.ok((await result.locator('.rv4-note p').allTextContents()).includes('記録'),'saved user-authored memo identical to a UI label must not be translated');
  assert.equal(await result.locator('.rv4-body .rv4-card-heading h2').first().innerText(),'Region Reference Values');
  await page.screenshot({path:resolve(out,width+'-english-result.png'),fullPage:true});
  // Canvas output is separate from HTML: inspect the strings actually drawn
  // onto the 1200x630 PNG. A translated button does not prove a translated PNG.
  await page.evaluate(()=>{
   window.__pngDrawnStrings=[];
   const original=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(value,...args){
    if(this.canvas?.width===1200&&this.canvas?.height===630)window.__pngDrawnStrings.push(String(value));
    return original.call(this,value,...args);
   };
   window.__restorePngDraw=()=>{CanvasRenderingContext2D.prototype.fillText=original;};
  });
  await result.locator('.rv4-export-menu summary').click();
  const [englishImage]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   result.locator('[data-download]').click()
  ]);
  assert.equal(englishImage.suggestedFilename(),'Running Results.png');
  const pngLines=await page.evaluate(()=>{
   window.__restorePngDraw();
   return window.__pngDrawnStrings;
  });
  assert.ok(pngLines.includes('Activity Results'),'PNG heading is English');
  assert.ok(pngLines.some(s=>s.includes('Study References:')),'PNG scientific eligibility is in English');
  assert.ok(pngLines.some(s=>s.includes('Not a Direct Measurement')),'PNG scientific caveat remains');
  assert.ok(pngLines.includes('Date Omitted (Default)'),'date defaults to private');
  assert.ok(pngLines.includes('ROF-J Responses Omitted (Default)'),'fatigue defaults to private');
  assert.doesNotMatch(pngLines.join(' '),/[ぁ-ゟァ-ヿ一-龯]/,'English PNG must not draw Japanese interface copy');
  const nextRaw=await page.evaluate(async()=>{const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw});
  assert.equal(nextRaw,starting.raw,'view changes cannot alter canonical saved run');
  await page.goto(origin+'settings',{waitUntil:'networkidle'});
  await settings.waitFor();
  const openGuide=settings.locator('[data-onboard-open]');
  await openGuide.locator('xpath=ancestor::details').evaluate(el=>{el.open=true});
  await openGuide.click();
  await page.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Recording and Reflection');
  assert.match(await page.locator('.fu-intro-cards').innerText(),/meanings and limits of recorded facts/);
  await page.screenshot({path:resolve(out,width+'-english-first-use-guide.png'),fullPage:true});
  await page.locator('[data-onboard-next]').click();
  await page.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Record an Activity');
  assert.match(await page.locator('.fu-two-col').innerText(),/GPS uses location permission/);
  await page.locator('[data-onboard-next]').click();
  await page.waitForFunction(()=>document.querySelector('.fu-screen-title p')?.textContent?.includes('applicable references'));
  assert.match(await page.locator('.fu-content .fu-muted').innerText(),/applicability criteria/);
  await page.locator('[data-onboard-close]').click();
  assert.equal(await page.locator('[data-onboard-overlay]').count(),0);

  await page.goto(origin+'exploration-tree',{waitUntil:'networkidle'});
  await page.locator('.ex-node[data-ex-category="01"]').click();
  await page.locator('.ex-topic[data-ex-topic="距離・時間・ペース"]').click();
  await page.waitForFunction(()=>document.querySelector('.ex-inquiry-start h3')?.textContent==='Did running feel different on days with a similar average pace?');
  await page.locator('.ex-knowledge-reference summary').click();
  assert.match(await page.locator('.ex-knowledge-reference').innerText(),/average time required to cover 1 km/);
  await page.locator('.ex-node[data-ex-category="02"]').click();
  await page.locator('.ex-topic[data-ex-topic="足・膝・股関節"]').click();
  await page.waitForFunction(()=>document.querySelector('.ex-inquiry-start h3')?.textContent==='Was there a part of your leg movement or a moment that stood out?');
  await page.locator('.ex-knowledge-reference summary').click();
  assert.match(await page.locator('.ex-knowledge-reference').innerText(),/hips, knees, and ankles/);
  await page.screenshot({path:resolve(out,width+'-english-learning-topic.png'),fullPage:true});

  // Fully authored isolated learning quizzes: selected answers and reasons
  // must be English, while never becoming personal records or diagnoses.
  for(const [lesson,heading,id,answer] of [
   ['pace-basics','Average Pace and Split Pace','q1','1'],
   ['record-origin-missing','Record Sources, Missing Data, and Later Reports','o1','1'],
   ['running-motion-basics','How the Legs Move When Running','m1','0'],
   ['effort-fatigue-recovery','Exertion, Fatigue, and Rest in Running','f1','1']
  ]){
   await page.goto(origin+'learning?lesson='+lesson,{waitUntil:'networkidle'});
   await page.waitForFunction(expected=>document.querySelector('.lr-lesson-title')?.textContent===expected,heading);
   const untranslated=await page.locator('.lr-lesson').evaluate(root=>{
    const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),parts=new Set();
    while(walk.nextNode()){
     const node=walk.currentNode,parent=node.parentElement,txt=node.data.trim();
     if(parent?.closest('script,style,code,pre')||!/[ぁ-ゟァ-ヿ]/.test(txt))continue;
     parts.add(txt);
    }
    return [...parts];
   });
   console.log('ENGLISH-CURRICULUM-REMAINDER '+lesson+' '+JSON.stringify(untranslated.slice(0,160)));
   assert.equal(await page.locator('.lr-lesson .lr-question').count(),4);
   const first=page.locator('.lr-lesson .lr-question').first();
   await page.waitForFunction(()=>document.querySelector('.lr-lesson .lr-question legend')?.textContent==='Question 1');
   assert.doesNotMatch(await first.locator('legend').innerText(),/[ぁ-ゟァ-ヿ]/);
   assert.doesNotMatch((await first.locator('label').allInnerTexts()).join(' '),/[ぁ-ゟァ-ヿ]/);
   await first.evaluate(el=>{const chapter=el.closest('details.lr-chapter');if(chapter)chapter.open=true;});
   await first.locator('input[name="'+id+'"][value="'+answer+'"]').check();
   if(lesson==='pace-basics')for(const [qid,value] of [['q2','1'],['q3','0'],['q4','1']])await page.locator('.lr-lesson input[name="'+qid+'"][value="'+value+'"]').check();
   await page.locator('.lr-lesson .lr-review [type=submit]').click();
   await page.waitForFunction(id=>document.querySelector('.lr-lesson [data-lr-feedback="'+id+'"],.lr-lesson [data-lo-feedback="'+id+'"],.lr-lesson [data-lm-feedback="'+id+'"],.lr-lesson [data-lf-feedback="'+id+'"]')?.textContent?.startsWith('Correct.'),id);
   await page.screenshot({path:resolve(out,width+'-english-'+lesson+'.png'),fullPage:true});
  }
  await page.goto(origin+'consultation',{waitUntil:'networkidle'});
  await page.locator('#cp-report .cp-paper').first().waitFor({state:'attached'});
  await page.locator('#cp-purpose').fill('記録');
  if(width<=800)await page.locator('[data-switch="preview"]').click();
  await page.waitForFunction(()=>document.querySelector('.cp-report-head h2')?.textContent==='Activity and Consultation Report');
  assert.equal(await page.locator('[data-report-purpose]').innerText(),'記録','user-authored report purpose must remain Japanese, not be translated');
  assert.match(await page.locator('[data-activity-source]').first().innerText(),/Source: Manual Entry/);
  await page.evaluate(()=>{window.__englishPrintRequested=false;window.print=()=>{window.__englishPrintRequested=true;};});
  await page.locator('#cp-print').click();
  assert.equal(await page.evaluate(()=>window.__englishPrintRequested),true);
  assert.match(await page.locator('.cp-privacy').innerText(),/Missing data are not treated as zero/);
  assert.equal(await page.locator('[data-report-purpose]').innerText(),'記録');
  const reportRemaining=await page.locator('#cp-report').evaluate(root=>{
   const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),items=new Set();
   while(w.nextNode()){
    const node=w.currentNode,text=node.data.trim();
    if(node.parentElement?.closest('[data-report-purpose],[data-report-observation],[data-report-question],.cp-condition strong')||!/[ぁ-ゟァ-ヿ]/.test(text))continue;
    items.add(text);
   }
   return [...items];
  });
  console.log('ENGLISH-REPORT-REMAINDER '+JSON.stringify(reportRemaining.slice(0,120)));
  await page.screenshot({path:resolve(out,width+'-english-print-report.png'),fullPage:true});

  await page.goto(origin+'settings',{waitUntil:'networkidle'});
  await settings.waitFor();
  const privacyLink=page.locator('[data-legal-open="privacy"]');
  await privacyLink.locator('xpath=ancestor::details').evaluate(el=>{el.open=true});
  await privacyLink.click();
  await page.locator('[data-legal-english-reference]').waitFor();
  assert.match(await page.locator('[data-legal-english-reference]').innerText(),/Unofficial English reference translation/);
  assert.match(await page.locator('.fu-doc-scroll').innerText(),/個人情報に関する請求/);
  assert.equal(await page.locator('[data-legal-english-reference] .fu-document-section').count(),17);
  await page.locator('[data-legal-dismiss]').first().click();
  await page.goto(origin+'settings',{waitUntil:'networkidle'});
  await settings.waitFor();
  const button=settings.locator('[data-settings-language=ja]');
  await button.locator('xpath=ancestor::details').evaluate(el=>{el.open=true});
  await button.click();
  await page.waitForFunction(()=>document.documentElement.lang==='ja');
  assert.equal(await page.locator('.mobile-nav a[href="#/home"]').innerText(),'ホーム');
  assert.equal(await page.locator('.rl-english-preview-note').count(),0);
  const finalRaw=await page.evaluate(async()=>{const c=await import('/ui/manualRunCanonical.js');return (await c.readCanonical()).raw});
  assert.equal(finalRaw,starting.raw);
  assert.deepEqual(errors,[],'no page script errors');
  results.push({engine:name,width,status:'PASS',savedIdStable:true,extendedRecordingAndHistory:true,englishPlaceholder:true,guideReplay:true,learningSources:true,threeCurriculumQuizzes:true,englishConsultationPrint:true,legalEnglishReference:true,japaneseReturn:true});
  await ctx.close();
 }
 // A pre-existing English display preference must never turn the official Japanese
 // first-use agreement or confirmation buttons into a misleading English consent.
 const preConsent=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
 await preConsent.addInitScript(()=>localStorage.setItem('runload-v2-display-preferences-v1',
  JSON.stringify({textSize:'standard',motion:'system',language:'en'})));
 const consentPage=await preConsent.newPage();
 await consentPage.goto(origin+'home',{waitUntil:'networkidle'});
 await consentPage.locator('[data-onboard-next]').click();
 await consentPage.locator('[data-onboard-legal-step]').waitFor({timeout:20000});
 assert.equal(await consentPage.locator('[data-onboard-legal-step]').getAttribute('lang'),'en');
 await consentPage.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Terms of Use and Privacy');
 assert.match(await consentPage.locator('[data-onboard-next]').innerText(),/Agree and Continue/);
 assert.match(await consentPage.locator('.fu-legal-checks').innerText(),/I have read and agree to the Terms/);
 assert.equal(await consentPage.locator('[data-onboard-next]').isDisabled(),true);
 await consentPage.locator('[data-onboard-document="terms"]').click();
 assert.match(await consentPage.locator('.fu-doc-dialog').innerText(),/運営者の責任/);
 assert.equal(await consentPage.locator('[data-legal-english-reference]').count(),1);
 await consentPage.close();await preConsent.close();
 results.push({engine:name,case:'Bilingual-legal-boundary',status:'PASS',consentNotAutoGranted:true});
 console.log(JSON.stringify({gate:'ENGLISH-UI-PREVIEW',results}));
}finally{
 await writeFile(resolve(out,'report.json'),JSON.stringify(results,null,2));
 await browser.close();await new Promise(ok=>server.close(ok));
}
