import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','settings-compact-'+engine);
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside root');
  const actual=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',types[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await mkdir(out,{recursive:true});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const samples=[],failures=[];
try{
 // Representative iPhone 16e standard and zoom widths, narrow viewport,
 // medium screen, desktop, both languages and 100/200% text scaling.
 const cases=[[320,'ja',100],[320,'ja',200],[320,'en',200],
  [375,'ja',200],[390,'ja',100],[390,'ja',200],
  [390,'en',100],[390,'en',200],[414,'ja',200],
  [768,'ja',200],[768,'en',200],[1440,'ja',100],[1440,'en',100]];
 for(const [width,language,font] of cases){
  const ctx=await browser.newContext({viewport:{width,height:width>=1024?900:844},locale:language==='en'?'en-US':'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(9000);page.setDefaultNavigationTimeout(14000);
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(async(lang)=>{
    const {LEGAL_VERSION}=await import('/ui/legalDocuments.js');
    localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
    localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
    localStorage.setItem('runload-v2-legal-consent-v1',JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:'2026-11-17T00:00:00Z',termsVersion:LEGAL_VERSION,privacyVersion:LEGAL_VERSION}));
   },language);
   await page.goto(url+'#/settings',{waitUntil:'networkidle'});
   await page.reload({waitUntil:'networkidle'});
   const rootNode=page.locator('[data-settings-v2]');
   await rootNode.waitFor({timeout:15000});
   if(font===200)await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
   await page.waitForFunction(lang=>document.documentElement.lang===lang,language,{timeout:15000});
   const layout=await page.evaluate(()=>{
    const r=sel=>{const e=document.querySelector(sel),x=e?.getBoundingClientRect();return x&&{left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height};};
    return {windowWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
     title:r('.s2-heading-main h1'),header:r('.s2-heading'),help:r('.s2-heading>.rl-screen-help>summary'),
     passiveChipCount:document.querySelectorAll('.s2-locale').length};
   });
   assert.ok(layout.title&&layout.help,'S16 title and help must exist');
   assert.equal(layout.passiveChipCount,0,'remove passive language and theme status');
   assert.ok(layout.header.right-layout.help.right>=-1&&layout.header.right-layout.help.right<=14,
      'help must be at top-right edge of Settings, not next to the title: '+JSON.stringify(layout));
   assert.ok(layout.help.left>=layout.title.right-1,'help must not overlap heading: '+JSON.stringify(layout));
   assert.ok(Math.abs((layout.help.top+layout.help.bottom)/2-(layout.title.top+layout.title.bottom)/2)<=12,
      'help and heading must be vertically aligned: '+JSON.stringify(layout));
   assert.ok(Math.abs(layout.help.width-44)<=1&&Math.abs(layout.help.height-44)<=1,'help must be exactly 44x44px');
   const helpDisclosure=rootNode.locator('.s2-heading>.rl-screen-help');
   await helpDisclosure.locator('summary').click();
   const helpPopup=await helpDisclosure.locator('p').boundingBox();
   assert.ok(helpPopup&&helpPopup.x>=-1&&helpPopup.x+helpPopup.width<=width+2,
    'help text must remain within screen, even on 320px and 200% text: '+JSON.stringify(helpPopup));
   await helpDisclosure.locator('summary').click();
   assert.ok(layout.documentWidth<=width+2,'settings must not overflow viewport: '+JSON.stringify(layout));
   assert.equal(await rootNode.locator('[data-settings-language="ja"]').count(),1);
   assert.equal(await rootNode.locator('[data-settings-language="en"]').count(),1);
   const snap=engine+'-'+language+'-'+width+'-'+font;
   if([320,390,414].includes(width)&&([320,390].includes(width)||font===100)){
    await page.screenshot({path:resolve(out,snap+'-overview.png'),fullPage:true,animations:'disabled'});
   }
   const backup=rootNode.locator('details.s2-item').filter({has:page.locator('[data-dm-export]')});
   await backup.locator('summary').first().click();
   assert.equal(await backup.locator('details.dm-details').count(),2);
   assert.equal(await backup.locator('details.dm-details').first().evaluate(e=>e.open),false,'advanced backup contents collapsed');
   assert.equal(await backup.locator('.dm-section').first().locator('.dm-critical').isVisible(),true,
      'unencrypted personal-data warning must be visible before expanding');
   assert.equal(await backup.locator('[data-dm-include-gps]').isChecked(),false);
   assert.ok((await backup.innerText()).includes(language==='en'?'JSON':'JSON'));
   if(language==='en'){
    await page.waitForFunction(()=>document.querySelector('[data-dm-export]')?.closest('.dm-section')?.textContent?.includes('Save activity records'),null,{timeout:5000});
   }
   if(width===390&&font===200)await page.screenshot({path:resolve(out,snap+'-backup.png'),fullPage:true,animations:'disabled'});
   await backup.locator('details.dm-details').first().locator('summary').click();
   assert.equal(await backup.locator('details.dm-details').first().evaluate(e=>e.open),true);
   await backup.locator('summary').first().click();
   const deletion=rootNode.locator('details.s2-item').filter({has:page.locator('[data-dm-delete-confirm]')});
   await deletion.locator('summary').first().click();
   assert.equal(await deletion.locator('[data-dm-delete-confirm]').isDisabled(),true);
   assert.equal(await deletion.locator('details.dm-details').first().evaluate(e=>e.open),false);
   assert.equal(await deletion.locator('.dm-critical').first().isVisible(),true,'irreversible deletion must remain obvious');
   const word=language==='en'?'DELETE':'削除';
   const field=deletion.locator('[data-dm-delete-word]');
   assert.equal(await field.getAttribute('placeholder'),word);
   assert.ok((await field.locator('xpath=..').innerText()).includes(language==='en'?'Enter DELETE':'削除'),
      'typing instruction must remain succinct and accessible');
   await field.fill(word);
   assert.equal(await deletion.locator('[data-dm-delete-confirm]').isDisabled(),true,'keyword alone not enough');
   await deletion.locator('[data-dm-delete-agree]').check();
   assert.equal(await deletion.locator('[data-dm-delete-confirm]').isEnabled(),true,'both confirmation steps required');
   await deletion.locator('[data-dm-delete-agree]').uncheck();
   assert.equal(await deletion.locator('[data-dm-delete-confirm]').isDisabled(),true,'revoke consent disables deletion');
   if(width===390&&font===200)await page.screenshot({path:resolve(out,snap+'-delete.png'),fullPage:true,animations:'disabled'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'expanded controls must not introduce horizontal overflow');
   assert.deepEqual(errors,[]);
   samples.push({language,width,font,title:layout.title,help:layout.help,overview:layout.documentWidth,keyword:word});
  }catch(e){failures.push({language,width,font,error:String(e)});}
  finally{await ctx.close();}
 }
}finally{
 await writeFile(resolve(out,'summary.json'),JSON.stringify({engine,samples,failures},null,2));
 await browser.close();await new Promise(done=>server.close(done));
}
if(failures.length)throw Error('S16 compact settings failures: '+JSON.stringify(failures));
console.log('S16 compact settings '+engine+' '+samples.length+' viewports PASS');
