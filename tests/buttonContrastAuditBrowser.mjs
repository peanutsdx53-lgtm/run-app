/* Dark-mode button color inventory: collect actual computed styles in real Chromium/WebKit.
 * This first phase is diagnostic. A separate acceptance run enforces the approved contract. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','button-contrast-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('blocked');
  const file=p===root?resolve(root,'index.html'):p;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const base='http://127.0.0.1:'+server.address().port+'/';
const paths=[
 ['home','home','.home-v3'],
 ['record-start','record-start','.rv-method'],
 ['record','record','.record-v3'],
 ['course','record-course','.rv-course'],
 ['rof','record-rof','[data-rof-v4-root]'],
 ['more','record-more','.rv-aux'],
 ['settings','settings','[data-settings-v2]'],
 ['history','history','#runload-history-v2 .stage'],
 ['explore','exploration-tree','[data-experience-v3]'],
 ['condition','condition','#condition-journey'],
 ['consultation','consultation','#runload-consultation'],
 ['learning','learning','.lr-root'],
 ['measurement','measurement','[data-measurement-v2]']
];
const findings=[],failures=[];
async function scan(page,screen,language,width,phase){
 return await page.evaluate(({screen,language,width,phase})=>{
  const all=[];
  const parse=v=>{
   if(!v)return null;
   const m=String(v).match(/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s\/]+(\d*\.?\d+))?/i);
   return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;
  };
  const lin=c=>{const f=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
  const contrast=(a,b)=>{const l=lin(a),r=lin(b);return +(Math.max(l,r)+.05)/(Math.min(l,r)+.05);};
  const sampleBgs=el=>{
   for(let cur=el;cur;cur=cur.parentElement||cur.getRootNode()?.host){
    const css=getComputedStyle(cur),bg=css.backgroundColor,image=css.backgroundImage;
    const solid=parse(bg);
    const stops=[...image.matchAll(/rgba?\([^)]*\)/g)].map(m=>parse(m[0])).filter(c=>c&&c[3]>.87);
    if(stops.length)return stops;
    if(solid&&solid[3]>.88)return [solid];
   }
   return [[5,23,37,1]];
  };
  const visit=root=>{
   for(const btn of root.querySelectorAll('button,a.btn,[role="button"],summary')){
    if(btn.shadowRoot)visit(btn.shadowRoot);
    const css=getComputedStyle(btn),r=btn.getBoundingClientRect();
    if(r.width<10||r.height<10||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)<.45)continue;
    const text=(btn.innerText||btn.textContent||'').trim().replace(/\s+/g,' ').slice(0,100);
    if(!text||!/[\p{L}\d]/u.test(text))continue;
    const descendants=[btn,...btn.querySelectorAll('span,b,strong,small,em')].filter(x=>[...x.childNodes].some(n=>n.nodeType===3&&(n.data||'').trim()));
    const bgs=sampleBgs(btn);
    const scores=[];
    for(const item of descendants){
      const fg=parse(getComputedStyle(item).color);
      if(!fg)continue;
      const colors=sampleBgs(item);
      const ratios=colors.map(c=>contrast(fg,c));
      scores.push({fg:getComputedStyle(item).color,min:Math.min(...ratios),max:Math.max(...ratios),node:item===btn?'button':item.tagName.toLowerCase()});
    }
    if(!scores.length)continue;
    const low=scores.reduce((a,b)=>a.min<b.min?a:b);
    const font=getComputedStyle(btn),size=parseFloat(font.fontSize),bold=parseInt(font.fontWeight,10)>=700;
    const threshold=size>=24||(size>=18.66&&bold)?3:4.5;
    const label=btn.className?.baseVal??btn.className??'';
    all.push({screen,language,width,phase,selector:btn.tagName.toLowerCase()+'#'+btn.id+'.'+String(label).replace(/\s+/g,'.').slice(0,90),
     context:String(btn.closest('.rv4-view-tabs,.rv4-mobile-tabs,.rv4-actions,.rr-foot-actions,.rv4-rof-correct-form,.rv4-question-continuation,.gps-v2-tabs,.rv4-tabs,.record-v3,.ex-topic-set,.s2-choice-row,.cp-mode-button')?.className||'').slice(0,100),
     text,foreground:low.fg,background:font.backgroundColor,gradient:font.backgroundImage.slice(0,160),
     minRatio:+low.min.toFixed(2),threshold,pressed:btn.getAttribute('aria-pressed')||btn.getAttribute('aria-selected')||'',
     disabled:btn.disabled||false,node:low.node,widthPx:+r.width.toFixed(1),heightPx:+r.height.toFixed(1)});
   }
   for(const child of root.querySelectorAll('*'))if(child.shadowRoot)visit(child.shadowRoot);
  };
  visit(document);
  return all;
 },{screen,language,width,phase});
}
async function snap(page,screen,language,width,phase){
 if(width!==390)return;
 const name=screen+'-'+phase+'-'+language+'-'+width;
 findings.push(...await scan(page,screen,language,width,phase));
 await page.screenshot({path:resolve(out,name+'.png'),animations:'disabled',fullPage:screen==='course'||screen==='settings'});
}
try{
 for(const [language,width] of [['en',390],['ja',390],['en',320]]){
  const ua=engine==='webkit'?
   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':
   'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block',userAgent:ua});
  await context.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
  },language);
  const page=await context.newPage();
  await page.goto(base+'#/home',{waitUntil:'networkidle'});
  const savedId=await page.evaluate(async()=>{
   const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const base=await c.refresh();if(!base.ok)throw Error('canonical init: '+base.reason);
   const x=await c.mutate(st=>m.saveManualRun(st,{date:'2026-11-20',distance:'5',
     hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',
     rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
     courseName:'Audit-only course',memo:''}));
   if(!x.ok)throw Error('audit record: '+x.reason);
   return x.record.id;
  });
  for(const [name,path,selector] of [...paths,['result','result?record='+encodeURIComponent(savedId),'#runload-result-v4']]){
   try{
    await page.goto(base+'#/'+path,{waitUntil:'networkidle'});
    await page.locator(selector).first().waitFor({timeout:13000});
    await page.waitForTimeout(75);
    const entries=await scan(page,name,language,width,'default');
    findings.push(...entries);
    if(width===390)await page.screenshot({path:resolve(out,name+'-default-'+language+'-'+width+'.png'),animations:'disabled',fullPage:name==='course'||name==='settings'});
    if(name==='course'){
     await page.locator('[data-rv-grade="SUMMARY"]').click();
     await page.locator('[data-rv-surface-mode="MIXED"]').click();
     await snap(page,name,language,width,'selected');
    }else if(name==='settings'){
     const profile=page.locator('.s2-panel[data-settings-tone="mint"] details.s2-item').first();
     if(await profile.count()){await profile.locator('summary').click();await snap(page,name,language,width,'expanded');}
    }else if(name==='home'&&width===390){
     const edit=page.locator('.dashboard-edit-trigger').first();
     if(await edit.count()){await edit.click();await snap(page,name,language,width,'editing');}
    }else if(name==='history'){
     const first=page.locator('[data-select-id]').first();
     if(await first.count()){await first.click();await snap(page,name,language,width,'selected');}
    }
    if(name==='result'){
     const tabs=page.locator('#runload-result-v4 [data-tab]');
     if(await tabs.count()===3){await tabs.nth(1).click();await snap(page,name,language,width,'fatigue');}
    }
    console.log('CONTRAST AUDIT '+name+' '+language+' '+width+': '+entries.length+' visible actions');
   }catch(err){failures.push({screen:name,language,width,error:String(err).slice(0,280)});console.log('WARN CONTRAST SCREEN '+name+' '+String(err).slice(0,180));}
  }
  if(width===390){
   try{
    await page.goto(base+'#/record',{waitUntil:'networkidle'});
    await page.locator('[data-draft="distance"]').fill('5');
    await page.locator('[data-draft="minutes"]').fill('30');
    await page.locator('[data-demo-save]').click();
    await page.locator('[data-record-review]').waitFor({timeout:12000});
    await snap(page,'review',language,width,'ready-to-save');
   }catch(err){failures.push({screen:'review',language,width,error:String(err).slice(0,280)});}
  }
  await context.close();
 }
 const ranked=findings.filter(x=>!x.disabled&&x.minRatio<x.threshold).sort((a,b)=>a.minRatio-b.minRatio);
 const grouped={};for(const issue of ranked){const key=issue.screen;grouped[key]=(grouped[key]||0)+1;}
 const report={engine,scanned:findings.length,belowThreshold:ranked.length,issuesByScreen:grouped,
  visibleButtonRecords:findings,suspectedLowContrast:ranked,routeErrors:failures,
  caveat:'CSS computed gradient stops and ancestor backgrounds approximate actual rendered pixels. Confirm on screenshots.'};
 await writeFile(resolve(out,'contrast-audit.json'),JSON.stringify(report,null,2));
 console.log('CONTRAST SUMMARY '+JSON.stringify({engine,scanned:findings.length,belowThreshold:ranked.length,byScreen:grouped,errors:failures}).slice(0,2600));
 console.log('LOW CONTRAST EXAMPLES '+JSON.stringify(ranked.slice(0,70)).slice(0,14500));
 assert.ok(findings.length>40,'button audit must observe actual rendered actions');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
