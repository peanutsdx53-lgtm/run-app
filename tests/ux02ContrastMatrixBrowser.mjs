/* UX02: real Chromium/WebKit contrast + reflow matrix for all three audited surfaces.
 * 2 languages x 4 widths x 2 text sizes x 2 engines = 32 per screen across CI.
 * Reference backgrounds are conservative documented surface stops, not pixel sampling.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','button-contrast-'+engine,'ux02-matrix');
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
const lin=hex=>{
 const n=hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*n[0]+.7152*n[1]+.0722*n[2];
};
const ratio=(a,b)=>{const x=lin(a),y=lin(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const colorHex=rgb=>{
 const n=rgb.match(/\d+(?:\.\d+)?/g).slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0'));
 return '#'+n.join('');
};
const routes=[
 {name:'settings',hash:'settings',ready:'[data-settings-v2]',target:'.s2-chevron',role:'non-text-icon',floor:'#103850',min:3},
 {name:'body',hash:'record-reflection',ready:'.cx-page',target:'.mx-label small',role:'text',floor:'#0d3d4e',min:4.5},
 {name:'explore',hash:'exploration-tree',ready:'[data-experience-v3]',target:'.ex-node-icon',role:'non-text-icon',floor:'#155563',min:3}
];
const results=[];
try{
 for(const language of ['ja','en'])for(const width of [320,390,768,1440])for(const fontPercent of [100,200]){
  const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
  },language);
  const page=await ctx.newPage();
  for(const route of routes){
   await page.goto(base+'#/'+route.hash,{waitUntil:'networkidle'});
   await page.locator(route.ready).first().waitFor({timeout:15000});
   if(fontPercent===200)await page.addStyleTag({content:'html{font-size:200%!important}'});
   const nodes=page.locator(route.target);
   assert.ok(await nodes.count()>=1,route.name+' has its expected visible control');
   const styles=await nodes.evaluateAll(els=>els.map(el=>{
    const c=getComputedStyle(el),r=el.getBoundingClientRect();
    return {color:c.color,font:c.fontSize,width:r.width,left:r.left,right:r.right,visible:c.display!=='none'&&c.visibility!=='hidden'};
   }).filter(x=>x.visible&&x.width>0));
   assert.ok(styles.length>=1,route.name+' visible in '+language+' '+width+' '+fontPercent);
   const ratios=styles.map(x=>ratio(colorHex(x.color),route.floor));
   const minRatio=Math.min(...ratios);
   assert.ok(minRatio>=route.min,route.name+' '+language+' '+width+' '+fontPercent+' '+JSON.stringify({minRatio,styles}));
   for(const x of styles)assert.ok(x.left>=-4&&x.right<=width+4,
    route.name+' target is clipped horizontally: '+JSON.stringify({width,language,fontPercent,x}));
   results.push({engine,language,width,fontPercent,screen:route.name,role:route.role,sampled:styles.length,
    lowestContrast:+minRatio.toFixed(2),conservativeReferenceBackground:route.floor});
   // Inspect exactly the states assessed, including long English and 200% text.
   if(width===320||width===390||fontPercent===200){
    if(route.name==='body')await nodes.first().scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(out,engine+'-'+language+'-'+width+'-'+fontPercent+'-'+route.name+'.png'),
     animations:'disabled',fullPage:false});
   }
  }
  await ctx.close();
 }
 assert.equal(results.length,48,'16 width/language/font settings x 3 screens per engine');
 await writeFile(resolve(out,'matrix.json'),JSON.stringify({engine,conditions:results.length,
  note:'Browser-computed foreground against conservative dark panel stop; real pixel/background and native device checks remain separate.',
  results},null,2));
 console.log('UX02 MATRIX PASS '+engine+' '+results.length+' route-state conditions');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}
