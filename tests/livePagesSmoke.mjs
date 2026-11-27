import assert from 'node:assert/strict';
import {runPagesBrowserSmoke} from './pagesBrowserSmokeShared.mjs';
import {readFileSync} from 'node:fs';
// The deployment target is configured per repository. Never query a former project URL.
const pagesUrl=process.env.RUNLOAD_PAGES_URL||'';
assert.ok(pagesUrl,'RUNLOAD_PAGES_URL must be configured to verify the new deployed Pages URL');
const parsed=new URL(pagesUrl);
assert.equal(parsed.protocol,'https:','deployed Pages should use HTTPS');
const root=parsed.href.endsWith('/')?parsed.href:parsed.href+'/';
const tag=(process.env.GITHUB_SHA||'manual-preview-check').slice(0,16);
// Check the deployed snapshot against this exact main build. Old version tags must not remain fixed in a future release.
const probes=['index.html','app.js','sw.js','ui/explorationExperience.js','ui/historyExperience.js','ui/resultExperience.js','ui/gpsDynamicResult.css'];
const expected=probes.map(file=>readFileSync(new URL('../'+file,import.meta.url),'utf8'));
let valid=false;
for(let i=1;i<=30;i++){
 try{
  const data=await Promise.all(probes.map(async file=>{
   const r=await fetch(new URL(file+'?check='+tag+'-'+i,root),{cache:'no-store'});
   assert.equal(r.status,200,'HTTP '+file);return r.text();
  }));
  valid=probes.every((_,n)=>data[n]===expected[n]);
  if(valid)break;
 }catch(e){console.log('Live Pages pending',i,e.message)}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
assert.ok(valid,'GitHub Pages has not deployed the matching checked-out main snapshot');
await runPagesBrowserSmoke(root,tag,'screenshots');
console.log('PAGES DEPLOYMENT CHECK PASS: matching code, record review, results and exploration learning');
