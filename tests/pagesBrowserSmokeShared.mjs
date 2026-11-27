import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

// Run the same browser assertions on candidate builds and the deployed HTTPS site.
export async function runPagesBrowserSmoke(root,tag,out){
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
// First-use is independently tested; this scenario represents a returning user.
const asReturningUser=page=>page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));

try{
 await mkdir(out,{recursive:true});
 for(const mode of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await asReturningUser(page);
  await page.goto(root+'?check='+tag+'#/record',{waitUntil:'networkidle',timeout:45000});
  if(await page.locator('[data-onboard-close]').count())await page.locator('[data-onboard-close]').click();
  await page.locator('[data-draft="distance"]').fill('5.20');
  await page.locator('[data-draft="minutes"]').fill('32.5');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('[data-open-record-review]').click();
  await page.locator('[data-record-review]').waitFor({timeout:12000});
  assert.match(await page.locator('.rr-metrics').innerText(),/5\.20/);
  assert.match(await page.locator('.rr-metrics').innerText(),/32:30/);
  assert.match(await page.locator('.rr-metrics').innerText(),/6:15/);
  assert.equal(await page.locator('[data-review-link]').count(),5);
  assert.equal(await page.locator('[data-manual-run-save]').isEnabled(),true,'deployed preview can save eligible manual run');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  await page.screenshot({path:out+'/review-'+mode.name+'-viewport.png'});
  await page.screenshot({path:out+'/review-'+mode.name+'-full.png',fullPage:true});
  await page.locator('[data-review-link="record-reflection"]').click();
  await page.locator('[data-cx-page]').waitFor();
  await page.locator('[data-draft="shoeName"]').fill('確認用シューズ');
  await page.locator('[data-apply]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.match(await page.locator('[data-record-review]').innerText(),/確認用シューズ/);
  assert.deepEqual(errors,[],'Live browser errors');
  await page.close();
 }
const resultCheck=await browser.newPage({viewport:{width:390,height:844}});
try{
 await asReturningUser(resultCheck);
 await resultCheck.goto(root+'?check='+tag+'#/result',{waitUntil:'networkidle'});
 if(await resultCheck.locator('[data-onboard-close]').count())await resultCheck.locator('[data-onboard-close]').click();
 const report=resultCheck.locator('#activity-result');
 await report.locator('.rv4-empty-card[data-pane="body"]').waitFor({timeout:15000});
 assert.equal(await report.locator('.rv4-empty-card[data-pane="body"] .rv4-card-heading h2').innerText(),'部位の文献参考値');
 assert.match(await report.locator('.rv4-notice').innerText(),/記録なし/);
 assert.equal(await report.locator('.rv4-hero').count(),0,'public Pages never invents a run');
 assert.equal(await report.locator('.rv4-region').count(),0,'anatomy hidden before a record exists');
 assert.equal(await report.locator('[data-download]').count(),0,'no export of unrecorded data');
 assert.equal(await report.locator('.rv4-mobile-tabs [data-tab]').count(),3,'approved result tabs remain');
 await resultCheck.screenshot({path:out+'/result-mobile.png',fullPage:true});
}finally{await resultCheck.close()}
const explorationCheck=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
try{
 await asReturningUser(explorationCheck);
 await explorationCheck.goto(root+'?check='+tag+'#/exploration-tree',{waitUntil:'networkidle',timeout:45000});
 if(await explorationCheck.locator('[data-onboard-close]').count())await explorationCheck.locator('[data-onboard-close]').click();
 await explorationCheck.locator('[data-ex-learning="slope-running"]').waitFor({timeout:15000});
 await explorationCheck.locator('[data-ex-slope="down"]').click();
 assert.equal(await explorationCheck.locator('[data-ex-learning="slope-running"] .ex-tool > .ex-tool-result strong').innerText(),'下りの動き');
 assert.match(await explorationCheck.locator('[data-ex-learning="slope-running"] .ex-tool > .ex-tool-result p').innerText(),/勢いを制御するため、着地時のブレーキの働き/);
 assert.equal(await explorationCheck.locator('[data-ex-slope="down"]').getAttribute('aria-pressed'),'true');
 await explorationCheck.locator('[data-ex-category="02"]').click();
 await explorationCheck.locator('[data-ex-learning="body-movement"]').waitFor();
 await explorationCheck.locator('[data-ex-category="05"]').click();
 await explorationCheck.locator('[data-ex-learning="sleep-recovery"]').waitFor();
 const reference=explorationCheck.locator('[data-ex-learning="sleep-recovery"] .ex-knowledge-reference');
 await reference.locator('summary').click();
 await reference.locator('[data-ex-action="learn-help"]').click();
 const doi=explorationCheck.locator('.ex-dialog-source');
 assert.equal(await doi.count(),1,'current learning help links to its source');
 assert.equal(await doi.getAttribute('href'),'https://doi.org/10.1136/bjsports-2020-102025');
 assert.equal(await explorationCheck.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 await explorationCheck.screenshot({path:out+'/exploration-mobile.png',fullPage:true});
}finally{await explorationCheck.close()}
}finally{await browser.close()}
}
