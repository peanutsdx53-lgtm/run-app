/** S17: header help geometry and visual tokens across ordinary app screens.
 * Runs with Chromium/WebKit in disposable in-memory browser contexts.
 * Inactive empty/deployment notices are not invented as help-bearing screens.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const output=resolve(root,'audit-output','s17-help-'+engine);
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=resolve(root,'.'+url);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside repository');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(output,{recursive:true});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const reports=[],failures=[];
const screenDefs=[
 ['home','.home-v3 .home-head','.home-v3 .home-head .hx-help-toggle','button'],
 ['record-start','.rv-method .rv-head','.rv-method .rv-screen-help>summary','details'],
 ['record','.rv-manual .rv-head','.rv-manual .rv-screen-help>summary','details'],
 ['record-course','.rv-course .rv-head','.rv-course .rv-screen-help>summary','details'],
 ['record-rof','.rv4-page .rv-head','.rv4-page .rv-screen-help>summary','details'],
 ['record-more','.rv-aux .rv-head','.rv-aux .rv-screen-help>summary','details'],
 ['record-compare','.record-v3 .rv-head','.record-v3 .rv-screen-help>summary','details'],
 ['record-reflection','.cx-page .cx-header','.cx-page .cx-screen-help>summary','details'],
 ['record-environment','.environment-v4 .rv-head','.environment-v4 .rv-screen-help>summary','details'],
 ['exploration-tree','.ex-page .ex-heading','.ex-page .ex-top-help','button'],
 ['learning','.lr-root .lr-page-heading','.lr-root .lr-page-heading .lr-screen-help>summary','details'],
 ['condition','.cj-screen .cj-page-head','.cj-screen .cj-page-head .rl-screen-help>summary','details'],
 ['consultation','.cp-app .cp-head','.cp-app .cp-head .rl-screen-help>summary','details'],
 ['settings','.s2-page .s2-heading','.s2-page .s2-heading>.rl-screen-help>summary','details'],
 ['history','#runload-history-v2 .stage .hx-title-line','#runload-history-v2 .hx-title-line .rl-screen-help>summary','details'],
 ['result','#runload-result-v4 .rv4-header','#runload-result-v4 .rv4-header>.rv4-header-help>summary','details'],
 ['measurement','.gps-v2-header','.gps-v2-header .rl-screen-help>summary','details']
];
const configs=[[320,'ja',200],[390,'en',200],[768,'ja',100],[1440,'en',100]];
try{
 for(const [width,lang,font] of configs){
  const phone=width<801;
  const ctx=await browser.newContext({viewport:{width,height:width>=1024?900:844},locale:lang==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block',
   ...(phone?{userAgent:engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'}:{})});
  const page=await ctx.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(16000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(async selected=>{
    const {LEGAL_VERSION}=await import('/ui/legalDocuments.js');
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:selected}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:selected}));
    localStorage.setItem('runload-v2-legal-consent-v1',JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:'2026-11-17T00:00:00Z',termsVersion:LEGAL_VERSION,privacyVersion:LEGAL_VERSION}));
   },lang);
   // The app reads onboarding and legal state on boot; hash navigation alone
   // does not recreate startup state or remove the first-use overlay.
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-onboard-overlay]').waitFor({state:'detached',timeout:6000});
   for(const [route,headerSelector,helpSelector,kind] of screenDefs.filter(([name])=>width===390||['home','record-start','record','record-reflection','exploration-tree','learning','settings','history','result'].includes(name))){
    if(route==='measurement'&&!phone)continue;
    const pageName=route;
    try{
     await page.goto(url+'#/'+route,{waitUntil:'networkidle'});
     const header=page.locator(headerSelector).first(),help=page.locator(helpSelector).first();
     await header.waitFor({state:'visible',timeout:3500});
     await help.waitFor({state:'visible',timeout:3500});
     if(font===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
     const h=await header.boundingBox(),b=await help.boundingBox();
     assert.ok(h&&b,'header and help need rectangles');
     assert.ok(b.width>=43&&b.width<=45&&b.height>=43&&b.height<=45,
      '44px target: '+JSON.stringify({route,b}));
     assert.ok(h.x+h.width-(b.x+b.width)>=-2&&h.x+h.width-(b.x+b.width)<=18,
      'help must be at header right edge: '+JSON.stringify({route,h,b}));
     assert.ok(b.y>=h.y-2&&b.y<=h.y+27,
      'help must occupy upper heading row: '+JSON.stringify({route,h,b}));
     assert.ok(b.x>=-1&&b.x+b.width<=width+1,'help stays inside viewport');
     const visual=await help.evaluate(el=>{
      const s=getComputedStyle(el);
      return {background:s.backgroundColor,border:s.borderTopColor,radius:s.borderTopLeftRadius,color:s.color,size:s.fontSize,weight:s.fontWeight};
     });
     assert.deepEqual(visual,{background:'rgb(18, 72, 91)',border:'rgb(87, 158, 171)',radius:'11px',
      color:'rgb(207, 248, 245)',size:'20px',weight:'850'},'consistent help visual '+route);
     if(kind==='details'){
      await help.click();
      const popup=help.locator('xpath=..').locator(':scope > p, :scope > .lr-screen-help-content').first();
      await popup.waitFor({state:'visible'});
      const pb=await popup.boundingBox();
      assert.ok(pb&&pb.x>=-1&&pb.x+pb.width<=width+2,
       'help disclosure must stay within viewport: '+JSON.stringify({route,pb,width}));
      await help.click();
     }
     assert.deepEqual(errors,[],'no browser exceptions at '+route);
     if((width===320||width===390)&&['settings','result','home','exploration-tree','record-reflection'].includes(route)){
      await page.screenshot({path:resolve(output,engine+'-'+lang+'-'+width+'-'+font+'-'+route+'.png'),fullPage:false,animations:'disabled'});
     }
     reports.push({route,lang,width,font,help:b,visual,ok:true});
    }catch(e){failures.push({route:pageName,lang,width,font,error:String(e)});}
   }
   // Record review is an interaction state, not a direct route by default.
   await page.goto(url+'#/record',{waitUntil:'networkidle'});
   await page.locator('[data-draft="distance"]').fill('5');
   await page.locator('[data-draft="minutes"]').fill('30');
   await page.locator('[data-manual-gait="RUNNING"]').click();
   await page.locator('[data-demo-save]').click();
   await page.locator('[data-record-review]').waitFor({state:'visible',timeout:4500});
   if(font===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   const hb=await page.locator('[data-record-review] .rr-heading').boundingBox();
   const bb=await page.locator('[data-record-review] .rr-heading>.rr-screen-help>summary').boundingBox();
   // Safari/WebKit may report a null box for the heading wrapper at desktop size
   // while its summary has a stable visible rectangle. In that case check
   // strict viewport-right placement rather than treating null as visual failure.
   const toRight=hb?hb.x+hb.width-(bb?.x+bb?.width):width-(bb?.x+bb?.width);
   assert.ok(bb&&bb.x>=0&&bb.x+bb.width<=width+2&&toRight>=-2&&toRight<=(hb?18:40),
    'review help must be far right '+JSON.stringify({hb,bb,toRight}));
   reports.push({route:'record-review',lang,width,font,help:bb,ok:true});
  }catch(e){failures.push({route:'setup-or-record-review',lang,width,font,error:String(e)})}
  finally{await ctx.close();}
 }
}finally{
 await writeFile(resolve(output,'summary.json'),JSON.stringify({engine,reports,failures},null,2));
 await browser.close();await new Promise(done=>server.close(done));
}
assert.deepEqual(failures,[],'S17 cross-screen failures');
console.log('S17 rightmost unified help '+engine+' '+reports.length+' states PASS');
