/* UX05: eight onboarding stages and Home entry, bilingual + responsive + text zoom.
 * Synthetic isolated sessions only. No personal information, GPS or research
 * values are persisted to a real account.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import {FIRST_USE_STEPS} from '../ui/firstUseExperience.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','ux05-intro-home-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const requested=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(requested!==root&&!requested.startsWith(root+sep))throw Error('blocked');
  const file=requested===root?resolve(root,'index.html'):requested;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const base='http://127.0.0.1:'+server.address().port+'/#/home';
const english=['Display Language','Terms and Privacy','Recording and Reflection','Record Activity','Review Results','History and Condition','Explore and Share Information','Profile'];
const report=[];
try{
 for(const lang of ['ja','en'])for(const width of [320,390,768,1440])for(const zoom of [100,200]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('[data-onboard-language="ja"]').waitFor({state:'visible',timeout:20000});
  if(lang==='en'){
   await page.locator('[data-onboard-language="en"]').click();
   await page.waitForFunction(()=>document.querySelector('#onboard-title')?.textContent==='Display Language',{},{timeout:18000});
  }
  if(zoom===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
  const steps=[];
  for(let step=0;step<8;step++){
   const desired=(lang==='en'?english:FIRST_USE_STEPS)[step];
   await page.waitForFunction(({name,n})=>{
    return document.querySelector('.fu-step-name')?.textContent.trim()===name &&
      document.querySelector('.fu-step-count')?.textContent.trim()===n+' / 8';
   },{name:desired,n:step+1},{timeout:16000});
   const sample=await page.evaluate(()=>{
    const indicator=document.querySelector('[data-onboard-step-indicator]');
    const label=indicator.querySelector('.fu-step-name');
    const fraction=indicator.querySelector('.fu-step-count');
    const header=document.querySelector('.fu-topbar');
    const bar=document.querySelector('.fu-progress');
    const rect=indicator.getBoundingClientRect(),headerBox=header.getBoundingClientRect();
    const textBox=label.getBoundingClientRect(),fractionBox=fraction.getBoundingClientRect();
    const brand=document.querySelector('.fu-topbrand').getBoundingClientRect();
    return {label:label.textContent.trim(),count:fraction.textContent.trim(),
     now:+bar.getAttribute('aria-valuenow'),max:+bar.getAttribute('aria-valuemax'),
     headerHeight:+headerBox.height.toFixed(1),x:+rect.x.toFixed(1),right:+rect.right.toFixed(1),
     top:+rect.top.toFixed(1),bottom:+rect.bottom.toFixed(1),
     labelRight:+textBox.right.toFixed(1),countRight:+fractionBox.right.toFixed(1),
     brandRight:+brand.right.toFixed(1),scrollWidth:document.documentElement.scrollWidth,
     topbarScrollWidth:header.scrollWidth,topbarClientWidth:header.clientWidth};
   });
   assert.equal(sample.label,desired,'current stage name '+JSON.stringify({engine,lang,width,zoom,step}));
   assert.equal(sample.count,(step+1)+' / 8');
   assert.equal(sample.now,step+1);assert.equal(sample.max,8);
   assert.ok(sample.x>=-2 && sample.right<=width+2,
    'step status outside screen '+JSON.stringify({engine,lang,width,zoom,step,sample}));
   assert.ok(sample.labelRight<=width+2&&sample.countRight<=width+2,'stage text clipped');
   assert.ok(sample.topbarScrollWidth<=sample.topbarClientWidth+3,'stage header is horizontally overflowing');
   assert.ok(sample.scrollWidth<=width+3,'onboarding horizontal document overflow');
   if(width<=390)assert.ok(sample.headerHeight<=170,'step status causes oversized sticky header');
   if(step===1){
    assert.equal(await page.locator('[data-onboard-next]').isDisabled(),true,'consent must not be preselected');
    await page.locator('[data-onboard-terms]').check();
    assert.equal(await page.locator('[data-onboard-next]').isDisabled(),true,'both acknowledgments are needed');
    await page.locator('[data-onboard-privacy]').check();
    assert.equal(await page.locator('[data-onboard-next]').isEnabled(),true);
   }
   if(step>=2&&step<=6)assert.equal(await page.locator('[data-onboard-skip-guide]').count(),1,'optional guide skip retained');
   steps.push({step:step+1,...sample});
   if(zoom===200&&(step===0||step===1||step===6||step===7)&&(width===320||width===390||width===1440))
    await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-step'+(step+1)+'.png'),animations:'disabled',fullPage:false});
   if(step<7)await page.locator('[data-onboard-next]').click();
  }
  await page.locator('[data-onboard-skip-profile]').click();
  await page.locator('.home-v3').waitFor({state:'visible',timeout:18000});
  const card=page.locator('.hx-latest');
  assert.equal(await card.locator('.home-latest-action a[href="#/record-start"]').count(),1,'one visible empty record entry');
  assert.match(await card.innerText(),lang==='en'?/No Running Records Yet/:/走行記録はまだありません/);
  assert.equal(await page.locator('.hx-achievement .hx-award-item').count(),4,'four optional milestone states retained');
  const edit=page.locator('[data-home-edit]');
  assert.equal(await edit.getAttribute('aria-label'),lang==='en'?'Edit Home Layout':'ホームの表示を編集');
  assert.equal((await edit.innerText()).trim(),lang==='en'?'Edit':'編集');
  for(const route of ['course','learning','consultation'])
   assert.equal(await page.locator('.hx-shortcuts a[href="#/'+route+'"]').count(),1,'original Home shortcut '+route);
  if(width===390&&zoom===100){
   const cols=await page.locator('.hx-condition-stats').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
   assert.equal(cols,3,'standard phone condition metrics must align in three columns');
  }
  if(width<=390&&zoom===200){
   // Check actual rendered text line boxes, not just document overflow.
   const headings=await page.evaluate(()=>{
    const read=selector=>{
     const el=document.querySelector(selector);
     const range=document.createRange();range.selectNodeContents(el);
     const r=el.getBoundingClientRect();
     return {lines:range.getClientRects().length,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,right:r.right};
    };
    const controls=[...document.querySelectorAll('.home-heading-actions button')].map(el=>el.getBoundingClientRect().right);
    return {home:read('.home-head h1'),condition:read('.hx-condition .hx-head h2'),
      controlsRight:controls};
   });
   assert.equal(headings.home.lines,1,'Home title must not split into individual characters '+JSON.stringify({lang,width,headings}));
   assert.equal(headings.condition.lines,1,'Condition title must not break midword '+JSON.stringify({lang,width,headings}));
   for(const key of ['home','condition'])
    assert.ok(headings[key].scrollWidth<=headings[key].clientWidth+2,'full heading must fit without horizontal clipping '+JSON.stringify({key,lang,width,headings}));
   assert.ok(headings.controlsRight.every(x=>x<=width+2),'Home edit/help controls may not leave screen');

   // The Japanese three-column Condition metrics used to let full-size
   // 200% text overflow into neighboring metrics. Check real geometry in
   // both languages, not just a source-level grid-template assertion.
   const metrics=await page.evaluate(()=>{
    const root=document.querySelector('.hx-condition-stats');
    const boxes=[...root.children].map(card=>{
     const label=card.querySelector('small');
     const r=card.getBoundingClientRect(),t=label.getBoundingClientRect();
     return {text:label.textContent.trim(),
       x:r.left,right:r.right,top:r.top,bottom:r.bottom,
       labelRight:t.right,labelScroll:label.scrollWidth,
       labelWidth:label.clientWidth,
       value:card.querySelector('strong')?.textContent.trim()};
    });
    return {columns:getComputedStyle(root).gridTemplateColumns,boxes};
   });
   assert.equal(metrics.boxes.length,3,'preserve all three condition metrics');
   for(const x of metrics.boxes){
    assert.ok(x.labelScroll<=x.labelWidth+2,
     'condition metric label must not overflow: '+JSON.stringify({lang,width,x,metrics}));
    assert.ok(x.labelRight<=x.right+2,
     'metric text must stay in its own card: '+JSON.stringify({lang,width,x}));
   }
   const [a,b,c]=metrics.boxes;
   assert.ok(a.right<=b.x+2&&a.bottom>=b.top-2,
    'first two metrics have separate card bounds: '+JSON.stringify(metrics));
   assert.ok(c.top>=Math.max(a.bottom,b.bottom)-1&&c.right<=width+2,
    'third metric must occupy its own next row: '+JSON.stringify(metrics));
   assert.ok(a.value&&b.value&&c.value,
    'unanswered condition values and recorded-days denominator must remain visible');

  }
  assert.match(await page.locator('.hx-condition-empty').innerText(),lang==='en'?/Missing Days Are Not Treated as Zero Hours/:/未記録日は0時間として扱いません/);
  if(zoom===200&&(width===320||width===390||width===1440))
   await page.screenshot({path:resolve(out,engine+'-'+lang+'-'+width+'-home.png'),animations:'disabled',fullPage:false});
  assert.deepEqual(errors,[],'uncaught app script errors');
  report.push({engine,lang,width,zoom,steps,homeEmpty:true,editLabel:true,legalConsentChecked:true,errors});
  await context.close();
 }
 assert.equal(report.length,16);
 await writeFile(resolve(out,'onboarding-home-matrix.json'),JSON.stringify({engine,conditions:report.length,onboardingStates:report.length*8,results:report},null,2));
 console.log('UX05 FIRST USE & HOME PASS '+JSON.stringify({engine,conditions:report.length,onboardingStates:report.length*8}));
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
