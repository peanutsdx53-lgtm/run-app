/* English Explore surface inventory for 7 categories x 28 topics.
 * Diagnoses untranslated SYSTEM text and accessibility labels, in each
 * normal, help and explicit-run context. Never flags user-authored text.
 * Visuals: focused screenshots for iPhone and 1024px; no edits to records.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','explore-copy-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(path!==root&&!path.startsWith(root+sep))throw Error('blocked');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
 res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const raw=await readFile(resolve(root,'app.js'),'utf8');
const categories=[...raw.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
assert.equal(categories.length,7);
assert.equal(categories.reduce((n,x)=>n+x.topics.length,0),28);
const bad=/[\u3041-\u30ff\u3400-\u9fff]/u;
const reports=[],errors=[];
async function scan(page,mode,category,topic,state){
 await page.waitForTimeout(45);
 const res=await page.locator('[data-experience-v3]').evaluate((root)=>{
  const re=/[\u3041-\u30ff\u3400-\u9fff]/u,out=[],attrs=[],japanese=content=>re.test(content||'');
  const skipped=el=>!!el.closest('[data-user-authored],.ex-note-preview,.ex-saved,textarea,[contenteditable],[data-report-purpose]');
  const displayed=el=>{
   if(!el||skipped(el))return false;
   if(el.closest('details:not([open])'))return false;
   for(let p=el;p&&p!==root.parentElement;p=p.parentElement){
    const st=getComputedStyle(p);
    if(st.display==='none'||st.visibility==='hidden'||st.opacity==='0')return false;
   }
   return el.getClientRects().length>0;
  };
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walk.nextNode();node;node=walk.nextNode()){
   const el=node.parentElement,txt=node.textContent.trim().replace(/\s+/g,' ');
   if(txt&&japanese(txt)&&displayed(el))
    out.push({tag:el.tagName,cls:String(el.className||'').slice(0,64),text:txt.slice(0,360)});
  }
  for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]')){
   if(!displayed(el))continue;
   for(const name of ['aria-label','title','placeholder']){
    const val=el.getAttribute(name);
    if(val&&japanese(val))attrs.push({name,tag:el.tagName,cls:String(el.className||'').slice(0,60),text:val.slice(0,300)});
   }
  }
  return {out,attrs,scroll:document.documentElement.scrollWidth,viewport:window.innerWidth,
   questions:root.querySelectorAll('.ex-inquiry-start h3').length,
   sourceDisclosure:root.querySelectorAll('.ex-inquiry-details,.ex-e-boundary-disclosure').length,
   mapLegend:root.querySelectorAll('.ex-map-card .ex-legend').length,
   selectedTag:root.querySelectorAll('.ex-related-label').length};
 });
 const result={engine,mode,category,topic,state,...res};reports.push(result);
 if(res.scroll>res.viewport+3)errors.push({type:'overflow',mode,category,topic,width:res.viewport,scroll:res.scroll});
 return result;
}
try{
 for(const width of [390,1024]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'en'}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:'en'}));
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({type:'js',error:String(error)}));
  let selectedRun=null;
  if(width===390){
   await page.goto(base+'#/home',{waitUntil:'networkidle'});
   selectedRun=await page.evaluate(async()=>{
    const [canonical,store]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
    const prep=await canonical.refresh();
    if(!prep.ok)throw Error('canonical seed: '+prep.reason);
    const response=await canonical.mutate(st=>store.saveManualRun(st,{
     date:'2026-11-20',distance:'5',hours:'',minutes:'35',seconds:'',
     activityGait:'RUNNING',runningFormat:'UNKNOWN',
     rofBefore:2,rofAfter:8,steps:'',stepsProvenance:'UNKNOWN',
     gradeMode:'SUMMARY',upPercent:'20',downPercent:'10',
     courseName:'audit',bodyObservation:'',
     temperatureC:'',environmentNote:''
    }));
    if(!response.ok)throw Error('saved run seed: '+response.reason);
    return response.record.id;
   });
  }
  for(const cat of categories){
   for(const topic of cat.topics){
    for(const mode of width===390?['general','selected-run']:['general']){
     const params=new URLSearchParams({category:cat.id,topic});
     if(mode==='selected-run'){params.set('source','manual');params.set('record',selectedRun)}
     await page.goto(base+'#/exploration-tree?'+params.toString(),{waitUntil:'networkidle'});
     await page.locator('[data-experience-v3] .ex-inquiry-start h3').first().waitFor({state:'visible',timeout:14000});
     await page.waitForFunction(()=>document.documentElement.lang==='en');
     await scan(page,mode,cat.id,topic,'visible');
     const details=page.locator('[data-experience-v3] .ex-inquiry-details,[data-experience-v3] .ex-e-boundary-disclosure');
     const n=await details.count();
     for(let i=0;i<n;i++)await details.nth(i).evaluate(el=>{el.open=true});
     await scan(page,mode,cat.id,topic,'expanded');
     if(cat.id==='03'&&topic==='上り坂・下り坂'||cat.id==='04'&&topic==='疲れの感じ方'){
      if(width===390&&mode==='selected-run'){
       await page.locator('.ex-focus').screenshot({path:resolve(out,'focus-'+cat.id+'-'+mode+'-'+width+'.png'),animations:'disabled'});
      }
     }
     if(cat.id==='03'&&topic==='上り坂・下り坂'){
      await page.locator('[data-ex-action="field-help"]').first().click();
      await page.locator('.ex-dialog').waitFor({state:'visible'});
      await scan(page,mode,cat.id,topic,'field-help');
      await page.locator('.ex-dialog [data-ex-action="close"]').click();
     }
     if(await page.locator('[data-ex-action="learn-help"]').count()){
      await page.locator('[data-ex-action="learn-help"]').first().click();
      await page.locator('.ex-dialog').waitFor({state:'visible'});
      await scan(page,mode,cat.id,topic,'learn-help');
      await page.locator('.ex-dialog [data-ex-action="close"]').click();
     }
    }
   }
  }
  await context.close();
 }
 const untranslated=reports.flatMap(r=>[...r.out,...r.attrs].map(x=>({...x,category:r.category,topic:r.topic,mode:r.mode,state:r.state})));
 const grouped=Object.create(null);
 for(const e of untranslated){const key=e.text;const row=grouped[key]||{text:key,count:0,places:[]};row.count++;if(row.places.length<4)row.places.push({category:e.category,topic:e.topic,mode:e.mode,state:e.state});grouped[key]=row;}
 const sorted=Object.values(grouped).sort((a,b)=>b.count-a.count);
 const result={engine,cases:reports.length,uniqueUntranslated:sorted.length,visibleOccurrences:untranslated.length,errors,rows:sorted};
 await writeFile(resolve(out,'report.json'),JSON.stringify(result,null,2));
 console.log('EXPLORE-COPY-SUMMARY '+JSON.stringify({engine,cases:result.cases,uniqueUntranslated:result.uniqueUntranslated,
  visibleOccurrences:result.visibleOccurrences,errors:result.errors}).slice(0,1200));
 console.log('EXPLORE-COPY-UNTRANSLATED '+JSON.stringify(sorted.slice(0,80)).slice(0,12000));
 assert.deepEqual(errors,[],'Explore must have no browser exceptions or whole-page horizontal overflow');
 if(process.env.RUNLOAD_EXPLORE_STRICT==='1')assert.deepEqual(sorted,[],'all generated Explore UI copy must be English');
}finally{await browser.close();await new Promise(done=>server.close(done));}
