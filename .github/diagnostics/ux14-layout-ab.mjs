// Diagnostic only. A = exact main CSS/DOM; B = same app with reversible presentation overrides.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const root=process.cwd(), engine=process.env.RUNLOAD_BROWSER_ENGINE;
assert.ok(['chromium','webkit'].includes(engine));
const expectedBase='fced4c3af51ed26387ef22607f69a1d96598f2a0';
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root,...args],{encoding:'utf8'}).trim();
assert.equal(git('rev-parse','HEAD^'),expectedBase,'prototype parent must equal approved main');
const changes=git('diff','--name-only',expectedBase,'HEAD').split('\n');
assert.ok(changes.length===3&&changes.every(p=>p.startsWith('.github/diagnostics/ux14-')||p==='.github/workflows/ux14-layout-ab.yml'),JSON.stringify(changes));
const css=await readFile(resolve(root,'.github/diagnostics/ux14-prototype.css'),'utf8');
const out=resolve(root,'audit-output','ux14-layout-ab-'+engine);await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(p!==root&&!p.startsWith(root+sep))throw Error('blocked');const f=p===root?resolve(root,'index.html'):p;res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end('Not found')}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const rows=[], errors=[];
// Short visible English labels only, full accessible names and selected headings unchanged.
const shortNames={'01':'Run Logs','02':'Body','03':'Course & Env.','04':'Fatigue & Recovery','05':'Life & Feelings','06':'Before / After','07':'Goals & Fun'};
async function decorate(page,language,width,variant){
 if(variant==='A')return;
 await page.evaluate(({language,width,shortNames})=>{
  const map=document.querySelector('.ex-map');
  if(language==='en'&&width<=390)for(const node of map.querySelectorAll('.ex-node')){
   const title=node.querySelector('.ex-node-title');
   // Preserve full category name in the real aria-label and selected heading.
   title.textContent=shortNames[node.dataset.exCategory];
  }
  const centers=[[1/6,1/6],[1/2,1/6],[5/6,1/6],[5/6,1/2],[2/3,5/6],[1/3,5/6],[1/6,1/2]];
  [...map.querySelectorAll('.ex-constellation-link')].forEach((p,i)=>{
   const [x,y]=centers[i].map((v,j)=>v*(j?520:760));
   p.setAttribute('d',`M380 260 Q${380+(x-380)*.48} ${260+(y-260)*.62-18} ${x} ${y}`);
  });
 },{language,width,shortNames});
}
async function geometry(page){return page.evaluate(()=>{
 const map=document.querySelector('.ex-map'), focus=document.querySelector('.ex-focus');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const m=rect(map),c=rect(map.querySelector('.ex-core')),f=rect(focus);
 const rangeRects=e=>{const range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}))};
 const nodes=[...map.querySelectorAll('.ex-node')].map(el=>({id:el.dataset.exCategory,aria:el.getAttribute('aria-label'),title:el.querySelector('.ex-node-title').textContent,source:el.dataset.exSource,pressed:el.getAttribute('aria-pressed'),box:rect(el),orb:rect(el.querySelector('.ex-node-orb')),text:rangeRects(el.querySelector('.ex-node-title'))}));
 const inside=(a,b,t=1)=>a.x>=b.x-t&&a.y>=b.y-t&&a.right<=b.right+t&&a.bottom<=b.bottom+t;
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
 const clipped=[],collisions=[];
 for(const n of nodes){if(!inside(n.box,m,1))clipped.push(n.id+':button');for(const t of n.text)if(!inside(t,n.box,1)||!inside(t,m,1))clipped.push(n.id+':text');if(overlap(n.box,c))collisions.push(n.id+':core');}
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(overlap(nodes[i].box,nodes[j].box))collisions.push(nodes[i].id+':'+nodes[j].id);
 const coreText=[...map.querySelectorAll('.ex-core span,.ex-core strong')].flatMap(rangeRects);for(const t of coreText)if(!inside(t,c,1))clipped.push('core:text');
 return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),map:m,core:c,focus:f,documentHeight:document.documentElement.scrollHeight,focusOffset:Math.round(f.y-m.y),columns: getComputedStyle(map.closest('.ex-orbit-workspace')).gridTemplateColumns, nodes,clipped:[...new Set(clipped)],collisions,questionCount:focus.querySelectorAll('.ex-inquiry-start h3').length,stages:focus.querySelectorAll('.ex-inquiry-stage').length,linkCount:map.querySelectorAll('.ex-constellation-link').length,relatedCount:map.querySelectorAll('.ex-node.is-related').length};
})}
try{
 for(const language of ['ja','en'])for(const width of [320,390,768,1440])for(const percent of [100,200])for(const variant of ['A','B']){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block',locale:language==='en'?'en-US':'ja-JP'});
  try{
   await ctx.addInitScript(lang=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));},language);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push({language,width,percent,variant,error:String(e)}));
   await page.goto(base+'#/exploration-tree?'+new URLSearchParams({category:'03',topic:'上り坂・下り坂'}),{waitUntil:'networkidle'});
   await page.locator('.ex-inquiry-start h3').waitFor({state:'visible',timeout:15000});await page.waitForFunction(l=>document.documentElement.lang===l,language);
   if(percent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   if(variant==='B')await page.addStyleTag({content:css});
   await decorate(page,language,width,variant);
   const g=await geometry(page);assert.equal(g.nodes.length,7);assert.equal(g.linkCount,7);assert.equal(g.rootFont,percent===200?32:16);assert.deepEqual([g.questionCount,g.stages],[1,3]);
   const filename=[variant,language,width,percent].join('-');
   await page.screenshot({path:resolve(out,filename+'-full.png'),fullPage:true,animations:'disabled',timeout:20000});
   await page.locator('.ex-map-card').screenshot({path:resolve(out,filename+'-map.png'),animations:'disabled',timeout:20000});
   const actions=[];
   // Test the exact same seven actual controls using real pointer clicks, not synthetic dispatch.
   // Failed/occluded targets are observations, not silently bypassed with force clicks.
   for(const id of ['01','02','03','04','05','06','07']){
    const n=page.locator('.ex-node[data-ex-category="'+id+'"]');
    try{await n.click({timeout:2200});await page.locator('.ex-node[data-ex-category="'+id+'"][aria-pressed="true"]').waitFor({timeout:2200});await decorate(page,language,width,variant);const state=await page.evaluate(()=>({active:document.activeElement?.getAttribute('data-ex-category')||document.activeElement?.tagName,heading:document.querySelector('.ex-focus h2')?.textContent,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top,scrollY:scrollY,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory}));actions.push({id,ok:state.selected===id,...state});}catch(e){actions.push({id,ok:false,error:String(e).split('\n')[0].slice(0,300)})}
   }
   const keyboard=[];
   for(const id of ['03','07']){const n=page.locator('.ex-node[data-ex-category="'+id+'"]');await n.focus();await page.keyboard.press('Enter');await decorate(page,language,width,variant);keyboard.push(await page.evaluate(id=>({id,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory,activeTag:document.activeElement?.tagName,activeCategory:document.activeElement?.dataset?.exCategory||null,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top}),id))}
   // Verify the help text and sample highlighting remain reachable; it is not a danger ranking.
   await page.locator('.ex-heading [data-ex-action="field-help"]').click();const help=await page.locator('.ex-dialog').innerText();await page.keyboard.press('Escape');
   const sample=page.locator('.ex-map-foot [data-ex-action="sample"]');let sampleGeometry=null;
   if(await sample.count()){await sample.click();await decorate(page,language,width,variant);sampleGeometry=await geometry(page);await page.locator('.ex-map-card').screenshot({path:resolve(out,filename+'-sample.png'),animations:'disabled',timeout:20000});}
   rows.push({engine,language,width,percent,variant,filename,...g,actions,keyboard,help,sampleGeometry});
  }finally{await ctx.close();}
 }
 assert.equal(rows.length,32,'16 states x A/B per engine');
}finally{await writeFile(resolve(out,'comparison.json'),JSON.stringify({engine,base:expectedBase,head:git('rev-parse','HEAD'),changes,rows,errors},null,2));console.log('UX14-AB '+JSON.stringify({engine,rows:rows.length,A:rows.filter(x=>x.variant==='A').map(x=>({language:x.language,width:x.width,percent:x.percent,height:x.map.h,clipped:x.clipped.length,collisions:x.collisions.length,clicks:x.actions.filter(y=>y.ok).length})),B:rows.filter(x=>x.variant==='B').map(x=>({language:x.language,width:x.width,percent:x.percent,height:x.map.h,clipped:x.clipped.length,collisions:x.collisions.length,clicks:x.actions.filter(y=>y.ok).length})),errors}));await browser.close();await new Promise(done=>server.close(done));}
assert.deepEqual(errors,[],'unexpected JS errors');
