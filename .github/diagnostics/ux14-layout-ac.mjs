// Diagnostic only. A = independent exact main checkout; C = actual source candidate, no DOM/CSS decoration.
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
const baseline=resolve(process.env.RUNLOAD_UX14_BASELINE);
const expectedChanges=['.github/diagnostics/ux14-layout-ac.mjs','.github/workflows/ux14-layout-ac.yml','app.js','ui/englishUi.js','ui/explorationExperience.css','ui/explorationExperience.js','ui/englishExploreDynamic.js','tests/explorationExperience.test.mjs','tests/englishExploreDynamic.test.mjs'];
assert.deepEqual(changes.sort(),expectedChanges.sort());
assert.equal(execFileSync('git',['-c','safe.directory='+baseline,'-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),expectedBase,'independent A exact SHA');
assert.equal(execFileSync('git',['-c','safe.directory='+baseline,'-C',baseline,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','A tracked source unchanged');
const out=resolve(root,'audit-output','ux14-layout-ac-'+engine);await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
async function serve(dir){const server=createServer(async(req,res)=>{try{const p=resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(p!==dir&&!p.startsWith(dir+sep))throw Error('blocked');const f=p===dir?resolve(dir,'index.html'):p;res.setHeader('content-type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end('Not found')}});await new Promise(done=>server.listen(0,'127.0.0.1',done));return {server,base:'http://127.0.0.1:'+server.address().port+'/'};}
const servers={A:await serve(baseline),C:await serve(root)};
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const rows=[], errors=[];
async function geometry(page){return page.evaluate(()=>{
 const map=document.querySelector('.ex-map'), focus=document.querySelector('.ex-focus');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const m=rect(map),c=rect(map.querySelector('.ex-core')),f=rect(focus);
 const rangeRects=e=>{const range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}))};
 const nodes=[...map.querySelectorAll('.ex-node')].map(el=>{const full=el.querySelector('.ex-node-title'),compact=el.querySelector('.ex-node-compact'),label=compact&&getComputedStyle(compact).display!=='none'?compact:full;const brokenWords=[];const walk=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);for(let node=walk.nextNode();node;node=walk.nextNode()){for(const match of node.textContent.matchAll(/[A-Za-z]+/g)){const r=document.createRange();r.setStart(node,match.index);r.setEnd(node,match.index+match[0].length);if([...r.getClientRects()].filter(x=>x.width>0&&x.height>0).length>1)brokenWords.push(match[0]);}}return {id:el.dataset.exCategory,aria:el.getAttribute('aria-label'),title:label.textContent,fullTitle:full.textContent,source:el.dataset.exSource,pressed:el.getAttribute('aria-pressed'),box:rect(el),orb:rect(el.querySelector('.ex-node-orb')),text:rangeRects(label),brokenWords};});
 const inside=(a,b,t=1)=>a.x>=b.x-t&&a.y>=b.y-t&&a.right<=b.right+t&&a.bottom<=b.bottom+t;
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
 const clipped=[],collisions=[];
 for(const n of nodes){if(!inside(n.box,m,1))clipped.push(n.id+':button');for(const t of n.text)if(!inside(t,n.box,1)||!inside(t,m,1))clipped.push(n.id+':text');if(overlap(n.box,c))collisions.push(n.id+':core');}
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(overlap(nodes[i].box,nodes[j].box))collisions.push(nodes[i].id+':'+nodes[j].id);
 const coreText=[...map.querySelectorAll('.ex-core span,.ex-core strong')].flatMap(rangeRects);for(const t of coreText)if(!inside(t,c,1))clipped.push('core:text');
 return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),map:m,core:c,focus:f,documentHeight:document.documentElement.scrollHeight,focusOffset:Math.round(f.y-m.y),columns: getComputedStyle(map.closest('.ex-orbit-workspace')).gridTemplateColumns, nodes,clipped:[...new Set(clipped)],collisions,questionCount:focus.querySelectorAll('.ex-inquiry-start h3').length,stages:focus.querySelectorAll('.ex-inquiry-stage').length,linkCount:map.querySelectorAll('.ex-constellation-link').length,relatedCount:map.querySelectorAll('.ex-node.is-related').length,artVisible:getComputedStyle(map.querySelector('.ex-art')).display!=='none',brokenWords:nodes.flatMap(n=>n.brokenWords.map(w=>n.id+':'+w))};
})}
try{
 for(const language of ['ja','en'])for(const width of [320,390,768,1440])for(const percent of [100,200])for(const variant of ['A','C']){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block',locale:language==='en'?'en-US':'ja-JP'});
  try{
   await ctx.addInitScript(lang=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));},language);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push({language,width,percent,variant,error:String(e)}));
   await page.goto(servers[variant].base+'#/exploration-tree?'+new URLSearchParams({category:'03',topic:'上り坂・下り坂'}),{waitUntil:'networkidle'});
   await page.locator('.ex-inquiry-start h3').waitFor({state:'visible',timeout:15000});await page.waitForFunction(l=>document.documentElement.lang===l,language);
   if(percent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   if(language==='en')await page.waitForFunction(()=>document.querySelector('.ex-core span')?.textContent.trim()==='7 Areas');
   const g=await geometry(page);assert.equal(g.nodes.length,7);assert.equal(g.linkCount,7);assert.equal(g.rootFont,percent===200?32:16);assert.deepEqual([g.questionCount,g.stages],[1,3]);
   const filename=[variant,language,width,percent].join('-');
   await page.screenshot({path:resolve(out,filename+'-full.png'),fullPage:true,animations:'disabled',timeout:20000});
   await page.locator('.ex-map-card').screenshot({path:resolve(out,filename+'-map.png'),animations:'disabled',timeout:20000});
   const actions=[];
   // Test the exact same seven actual controls using real pointer clicks, not synthetic dispatch.
   // Failed/occluded targets are observations, not silently bypassed with force clicks.
   for(const id of ['01','02','03','04','05','06','07']){
    const n=page.locator('.ex-node[data-ex-category="'+id+'"]');
    try{await n.click({timeout:2200});await page.locator('.ex-node[data-ex-category="'+id+'"][aria-pressed="true"]').waitFor({timeout:2200});const state=await page.evaluate(()=>({active:document.activeElement?.getAttribute('data-ex-category')||document.activeElement?.tagName,activeIsHeading:document.activeElement===document.querySelector('.ex-focus h2'),heading:document.querySelector('.ex-focus h2')?.textContent,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top,scrollY:scrollY,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory}));actions.push({id,ok:state.selected===id,...state});}catch(e){actions.push({id,ok:false,error:String(e).split('\n')[0].slice(0,300)})}
   }
   const keyboard=[];
   for(const id of ['03','07']){const n=page.locator('.ex-node[data-ex-category="'+id+'"]');await n.focus();await page.keyboard.press('Enter');keyboard.push(await page.evaluate(id=>({id,selected:document.querySelector('.ex-node[aria-pressed="true"]')?.dataset.exCategory,activeTag:document.activeElement?.tagName,activeIsHeading:document.activeElement===document.querySelector('.ex-focus h2'),headingTop:document.querySelector('.ex-focus h2')?.getBoundingClientRect().top,headingBottom:document.querySelector('.ex-focus h2')?.getBoundingClientRect().bottom,activeCategory:document.activeElement?.dataset?.exCategory||null,focusTop:document.querySelector('.ex-focus')?.getBoundingClientRect().top}),id))}
   let disclosure=null;
   if(variant==='C'){
    const toggle=page.locator('[data-ex-action="toggle-map"]'),map=page.locator('.ex-map'),before=await geometry(page);
    await toggle.click();const closed=await map.isHidden(),expandedClosed=await toggle.getAttribute('aria-expanded'),focusClosed=await toggle.evaluate(e=>e===document.activeElement);
    await page.locator('[data-ex-action="change-area"]').click();const open=await map.isVisible(),expandedOpen=await toggle.getAttribute('aria-expanded'),active=await page.evaluate(()=>document.activeElement?.dataset?.exCategory),selected=await page.locator('.ex-node[aria-pressed="true"]').getAttribute('data-ex-category');
    disclosure={closed,expandedClosed,focusClosed,open,expandedOpen,active,selected,initialArt:before.artVisible};
   }
   // Verify the help text and sample highlighting remain reachable; it is not a danger ranking.
   await page.locator('.ex-heading [data-ex-action="field-help"]').click();const help=await page.locator('.ex-dialog').innerText();await page.keyboard.press('Escape');
   const sample=page.locator('.ex-map-foot [data-ex-action="sample"]');let sampleGeometry=null;
   if(await sample.count()){await sample.click();sampleGeometry=await geometry(page);await page.locator('.ex-map-card').screenshot({path:resolve(out,filename+'-sample.png'),animations:'disabled',timeout:20000});}
   rows.push({engine,language,width,percent,variant,filename,...g,actions,keyboard,help,sampleGeometry,disclosure});
   if(variant==='C')try{
    const label=JSON.stringify({language,width,percent});
    assert.deepEqual(g.clipped,[],'C clipped '+label);assert.deepEqual(g.collisions,[],'C collision '+label);assert.deepEqual(g.brokenWords,[],'C mid-word wrap '+label);
    assert.ok(g.scrollWidth<=width+3,'C page overflow '+label);
    assert.ok(g.nodes.every(n=>n.box.w>=44&&n.box.h>=44&&n.aria&&n.aria.includes(n.fullTitle)),'C control geometry or full accessible label '+label);
    assert.equal(actions.filter(x=>x.ok&&x.activeIsHeading).length,7,'C pointer focus '+label);
    assert.equal(keyboard.filter(x=>x.selected===x.id&&x.activeIsHeading&&x.headingTop>=-1&&x.headingBottom<=900).length,2,'C keyboard focus '+label);
    assert.ok(disclosure.closed&&disclosure.expandedClosed==='false'&&disclosure.focusClosed&&disclosure.open&&disclosure.expandedOpen==='true'&&disclosure.active===disclosure.selected,'C map disclosure '+label);
    assert.ok(sampleGeometry&&sampleGeometry.relatedCount===2&&sampleGeometry.clipped.length===0&&sampleGeometry.collisions.length===0&&sampleGeometry.brokenWords.length===0,'C sample geometry '+label);
    assert.ok(sampleGeometry.nodes.every(n=>n.aria&&n.aria.includes(n.fullTitle)),'C sample accessible names '+label);
    assert.ok(sampleGeometry.nodes.filter(n=>n.source==='sample').every(n=>language==='en'?n.aria.includes('Example:'):n.aria.includes('表示例：')),'C sample provenance '+label);
    assert.ok(language==='en'?/not.*(priority|ranking|burden)|not indicate|not.*load/i.test(help):help.includes('優先順位や身体への負担の大きさを示すものではありません'),'C relevance explanation '+label);
    assert.equal(g.columns.trim().split(/\s+/).length,width===1440&&percent===100?2:1,'C width/font column contract '+label);
   }catch(e){errors.push({type:'acceptance',language,width,percent,error:String(e)});}
  }finally{await ctx.close();}
 }
 assert.equal(rows.length,32,'16 states x A/C per engine');
}finally{await writeFile(resolve(out,'comparison.json'),JSON.stringify({engine,base:expectedBase,head:git('rev-parse','HEAD'),changes,rows,errors},null,2));console.log('UX14-AC '+JSON.stringify({engine,rows:rows.length,A:rows.filter(x=>x.variant==='A').map(x=>({language:x.language,width:x.width,percent:x.percent,height:x.map.h,clipped:x.clipped.length,collisions:x.collisions.length,clicks:x.actions.filter(y=>y.ok).length})),C:rows.filter(x=>x.variant==='C').map(x=>({language:x.language,width:x.width,percent:x.percent,height:x.map.h,clipped:x.clipped.length,collisions:x.collisions.length,clicks:x.actions.filter(y=>y.ok).length})),errors}));await browser.close();await Promise.all(Object.values(servers).map(({server})=>new Promise(done=>server.close(done))));}
assert.deepEqual(errors,[],'unexpected JS errors');
