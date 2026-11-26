import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('missing');}
});
await new Promise(done=>server.listen(4391,'127.0.0.1',done));
const browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','gps-stage6-dynamic');
await mkdir(out,{recursive:true});
const results=[];
const base='http://127.0.0.1:4391/#/';
async function capture(page,width,language,state){
 const layout=await page.evaluate(()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const selectors=['.gd-root','.gd-head','.gd-evidence-status','.gd-view-bar','.gd-main','.gd-anatomy-panel','.gd-course-panel','.gd-linked-insight','.gd-flag-actions','.gd-speed-block','.gd-controls'];
  return {width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   boxes:Object.fromEntries(selectors.map(x=>[x,document.querySelector(x)?rect(document.querySelector(x)):null])),
   buttons:[...document.querySelectorAll('.gd-flag-actions button')].map(rect),
   fixedNavVisible:[...document.querySelectorAll('.app-shell .mobile-nav,.app-shell .bottom-nav')]
    .filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0)
    .map(el=>({className:el.className,position:getComputedStyle(el).position,...rect(el)})),
   replayActive:!!document.querySelector('.gd-root:not(.gd-summary) .gd-main'),
   unavailable:!!document.querySelector('[data-gps-dynamic] .gd-empty'),
   heading:(()=>{const root=document.querySelector('.gd-anatomy-panel .gd-panel-head');if(!root)return null;return {outer:rect(root),strong:rect(root.querySelector('strong')),small:rect(root.querySelector('small'))};})(),
   state:document.querySelector('[data-gps-replay-state]')?.dataset.gpsReplayState};
 });
 if(layout.replayActive){
  assert.deepEqual(layout.fixedNavVisible,[],
   'active GPS replay must never be covered by mobile/tablet fixed navigation '+engineName+' '+language+' '+width+' '+state);
 }else{
  // An unavailable replay has no dynamic chart to cover. Keep ordinary app
  // navigation accessible so a no-consent record cannot become a dead end.
  assert.equal(state,'07-no-detail-not-available','only explicitly tested unavailable state may lack the replay root');
  assert.equal(layout.unavailable,true,'unavailable state must show an explanation');
  if(width<=680)assert.ok(layout.fixedNavVisible.some(nav=>String(nav.className).includes('mobile-nav')),
    'unavailable GPS replay must preserve the normal mobile navigation');
 }
 assert.ok(layout.scroll<=layout.width+2&&layout.body<=layout.width+2,
  'horizontal overflow '+engineName+' '+language+' '+width+' '+state+' '+JSON.stringify(layout));
 for(const [key,r] of Object.entries(layout.boxes)){
  if(!r)continue;
  assert.ok(r.left>=-2&&r.right<=layout.width+2,key+' outside viewport '+JSON.stringify(r));
 }
 for(const r of layout.buttons)assert.ok(r.height>=43.5&&r.left>=-2&&r.right<=layout.width+2,
  'flag nav hit target clipped '+JSON.stringify(r));
 if(layout.heading){const {outer,strong,small}=layout.heading;
  assert.ok(strong.left>=outer.left-1&&strong.right<=outer.right+1&&strong.bottom<=outer.bottom+1,'anatomy title clipped '+JSON.stringify(layout.heading));
  assert.ok(small.left>=outer.left-1&&small.right<=outer.right+1&&small.bottom<=outer.bottom+1,'reference disclaimer clipped '+JSON.stringify(layout.heading));
  assert.ok(strong.bottom<=small.top+2||strong.right<=small.left+1,'anatomy title overlaps disclaimer '+JSON.stringify(layout.heading));
 }
 const path=resolve(out,engineName+'-'+language+'-'+width+'-'+state+'.png');
 await page.screenshot({path,fullPage:true,animations:'disabled',timeout:25000});
 results.push({engine:engineName,language,width,state,layout});
}
const createFixture=async page=>page.evaluate(async()=>{
 const store=await import('/ui/gpsReplayIndexedDbStore.js');
 const t=1700000000000,minutes=[0,5,10,35,40],km=[0,.015,.03,.03,.045];
 const track=km.map((distance,i)=>({lat:37.5+i*.00007,lon:139.9+i*.00007,km:distance,
  t:t+minutes[i]*1000,breakBefore:i===0||i===3,activity:'RUNNING',
  ele:null,altitudeAccuracy:null,altitudeQuality:'missing'}));
 const session={phase:'finished',activity:'RUNNING',distanceM:45,
  elapsedMs:40000,accepted:5,rejected:0,track,trackSimplified:false,
  replayTrackAvailable:true,
  replayTrack:track.map((p,i)=>({t:p.t,km:p.km,breakBefore:p.breakBefore,activeMs:minutes[i]*1000})),
  flags:[1,4].map((i,n)=>({id:'flag-stage6-'+(n+1),t:track[i].t,km:track[i].km,
    lat:track[i].lat,lon:track[i].lon,note:n?'second flag':'first flag'}))
 };
 const opts={date:'2026-11-16',experience:{source:'USER_REPORTED',
  rofBefore:0,rofAfter:null,beforeCapturedAt:'2026-11-16T00:00:00.000Z',
  afterCapturedAt:null,surface:'UNKNOWN',memo:'GPS session self report'}};
 const withDetails=await store.saveGpsV2Run(session,{...opts,saveDetails:true});
 if(!withDetails.ok)throw Error('save detailed GPS failed '+JSON.stringify(withDetails));
 const withoutDetails=await store.saveGpsV2Run(session,{...opts,saveDetails:false});
 if(!withoutDetails.ok)throw Error('save summary GPS failed '+JSON.stringify(withoutDetails));
 const detail=await store.readGpsV2Detail(withDetails.summary.id);
 if(!detail.ok)throw Error('detail read failed '+JSON.stringify(detail));
 return {id:withDetails.summary.id,emptyId:withoutDetails.summary.id};
});
try{
 for(const language of ['ja','en'])for(const width of [320,390,414,768,1024,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({language:lang,textSize:'standard',motion:'system'}));
  },language);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const saved=await createFixture(page);
  // GPS V2 summary listing is intentionally snapshotted at app startup.
  // Reload to reproduce opening a stored record after the normal save flow.
  await page.reload({waitUntil:'networkidle'});
  await page.goto(base+'result?gps='+encodeURIComponent(saved.id),{waitUntil:'networkidle'});
  const rootResult=page.locator('#activity-result');
  await rootResult.locator('[data-gps-dynamic-gate]').waitFor({timeout:15000});
  assert.equal(await rootResult.locator('[data-tab]').count(),3,'shared result must retain three panels');
  await rootResult.locator('[data-gps-dynamic-gate]').click();
  await page.locator('.gd-evidence-status').waitFor({timeout:15000});
  assert.equal(await page.locator('.gd-panel').count(),2,'body/route remain paired');
  assert.equal(await page.locator('[data-gps-replay-state]').getAttribute('data-gps-replay-state'),'REFERENCE_ONLY');
  assert.equal(await page.locator('[data-flag-step]').count(),2);
  assert.equal(await page.locator('.gd-map-flag').count(),2);
  assert.ok(await page.locator('.gd-speed-isolated').count()>=1,'speed graph displays valid isolated GPS speed after gap as an unconnected point');
  assert.equal(await page.locator('.gd-flag-step-status').innerText(),'0 / 2');
  await page.waitForFunction(lang=>lang==='ja'
   ?document.querySelector('.gd-time-axis-note')?.textContent.includes('横軸')
   :document.querySelector('.gd-time-axis-note')?.textContent.includes('Chart X-axis'),
   language,{timeout:12000});
  if(language==='en'){
   const english=(await page.locator('.gd-evidence-status').innerText())+' '+
    (await page.locator('.gd-flag-actions').innerText())+' '+
    (await page.locator('.gd-time-axis-note').innerText())+' '+
    (await page.locator('.gd-panel-head').first().innerText())+' '+
    (await page.locator('.gd-metrics').innerText())+' '+
    (await page.locator('.gd-panel-foot').first().innerText())+' '+
    (await page.locator('.gd-reading-actions').innerText())+' '+
    (await page.locator('.gd-play').innerText())+' '+
    (await page.locator('.gd-head-sub').innerText())+' '+
    (await page.locator('.gd-course-panel .gd-panel-head').innerText());
   assert.ok(!/[ぁ-んァ-ン一-龯]/.test(english),'English dynamic source UI not fully translated: '+english);
  }
  assert.equal(await page.locator('.gd-note-disclosure').getAttribute('open'),null,'long research limitations start folded');
  await capture(page,width,language,'01-reference-first');
  if(width===390){
   await page.locator('.gd-note-disclosure summary').click();
   assert.equal(await page.locator('.gd-note-disclosure').getAttribute('open'),'','details accessible on demand');
   await capture(page,width,language,'01a-reference-explanation-open');
   await page.locator('.gd-note-disclosure summary').click();
  }
  await page.locator('[data-seek]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('[data-gps-replay-state]').getAttribute('data-gps-replay-state'),'INITIAL_FIX');
  assert.match(await page.locator('.gd-metric').nth(2).innerText(),/—/,'initial GPS fix has no speed');
  await capture(page,width,language,'01b-first-fix-not-measured');
  await page.locator('[data-seek]').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('[data-gps-replay-state]').getAttribute('data-gps-replay-state'),'GPS_GAP');
  assert.match(await page.locator('.gd-metric').nth(2).innerText(),/—/,'gap speed not fabricated');
  assert.match(await page.locator('.gd-region-reading').innerText(),/—/,'gap reference not zero');
  await capture(page,width,language,'02-gap-no-reference');
  await page.locator('[data-flag-step="1"]').click();
  assert.equal(await page.locator('[data-seek]').inputValue(),'1');
  assert.equal(await page.locator('.gd-flag-step-status').innerText(),'1 / 2');
  assert.match(await page.locator('.gd-flag-content').innerText(),/first flag/);
  await capture(page,width,language,'03-first-flag');
  await page.locator('[data-flag-step="1"]').click();
  assert.equal(await page.locator('[data-seek]').inputValue(),'4');
  assert.equal(await page.locator('.gd-flag-step-status').innerText(),'2 / 2');
  assert.equal(await page.locator('[data-flag-step="1"]').isDisabled(),true);
  assert.match(await page.locator('.gd-flag-content').innerText(),/second flag/);
  await capture(page,width,language,'04-last-flag');
  await page.locator('[data-view="back"]').click();
  assert.equal(await page.locator('.gd-body-path').count(),4);
  await capture(page,width,language,'05-body-back');
  await page.locator('[data-view="sole"]').click();
  assert.equal(await page.locator('.gd-body-path').count(),3);
  await capture(page,width,language,'06-body-sole');
  if(width===390){
   await page.goto(base+'result?gps='+encodeURIComponent(saved.emptyId),{waitUntil:'networkidle'});
   await rootResult.locator('[data-tab="body"]').waitFor({state:'attached',timeout:15000});
   assert.equal(await rootResult.locator('[data-gps-dynamic-gate]').count(),0,'GPS summary without location consent must not expose replay');
   await page.goto(base+'dynamic-result?record='+encodeURIComponent(saved.emptyId),{waitUntil:'networkidle'});
   const expected=language==='en'?'Saved data for dynamic results could not be verified.':'動的結果の保存データを確認できません';
   await page.waitForFunction(text=>document.querySelector('[data-gps-dynamic] .gd-empty')?.textContent===text,expected,{timeout:15000});
   const unavailable=page.locator('[data-gps-dynamic] .gd-empty');
   assert.equal(await unavailable.getAttribute('role'),'status');
   const colors=await unavailable.evaluate(el=>{const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor};});
   const luminance=color=>{
    const values=color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(n=>Number(n)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
   };
   assert.match(colors.bg,/^rgb\(/,'unavailable state has an opaque background');
   const contrast=(Math.max(luminance(colors.fg),luminance(colors.bg))+0.05)/(Math.min(luminance(colors.fg),luminance(colors.bg))+0.05);
   assert.ok(contrast>=4.5,'unavailable GPS explanation contrast '+contrast);
   assert.equal(await page.locator('.gd-main').count(),0,'force navigation cannot load unsaved route');
   await capture(page,width,language,'07-no-detail-not-available');
  }
  assert.deepEqual(errors,[],engineName+' JS page errors '+language+' '+width+': '+errors.join(';'));
  await ctx.close();
 }
 await writeFile(resolve(out,engineName+'-report.json'),JSON.stringify(results,null,2));
 console.log('PASS GPS Stage 6 elapsed-time/gap/evidence/flag/body dynamic bilingual 6 viewports '+engineName+' screenshots '+results.length);
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
