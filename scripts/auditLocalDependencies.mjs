// Verify referenced repository modules/assets and workflow test files without network access.
// This is a path-integrity check, not an execution test or a compatibility layer.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';

const tracked=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
const problems=[],checked=[];
const appSource=p=>p==='app.js'||p==='pwa.js'||p==='sw.js'||/^(?:ui|core|assets|tests|scripts)\/.*\.(?:mjs|js)$/.test(p);
const targetPath=(source,target)=>{
 if(!target.startsWith('./')&&!target.startsWith('../')&&!target.startsWith('/'))return null;
 const withoutQuery=target.split(/[?#]/,1)[0];
 if(!withoutQuery||withoutQuery==='/')return null;
 if(withoutQuery.startsWith('/'))return withoutQuery.slice(1);
 return posix.normalize(posix.join(posix.dirname(source),withoutQuery));
};
for(const file of tracked){
 if(!appSource(file))continue;
 const source=readFileSync(file,'utf8');
 // Literal import/export names and browser dynamic imports are part of the real dependency graph.
 const refs=[
  ...[...source.matchAll(/^\s*(?:import|export)\s+[\s\S]{0,250}?\bfrom\s*(['"])([^'"]+)\1/gm)].map(m=>m[2]),
  ...[...source.matchAll(/^\s*import\s*(['"])([^'"]+)\1/gm)].map(m=>m[2]),
  ...[...source.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].map(m=>m[2])
 ];
 for(const spec of refs){
  const path=targetPath(file,spec);
  if(path===null)continue;
  checked.push([file,path]);
  // In browser acceptance tests, literal dynamic imports of site-root assets run
  // inside page.evaluate at the site's root; Node's tests/ path is not its base.
  const browserRoot=spec.startsWith('./ui/')||spec.startsWith('./core/')||spec.startsWith('./assets/')
   ?spec.slice(2):null;
  const isBrowserTest=file.startsWith('tests/')&&/(?:Browser|startupFast)/.test(file);
  if(!tracked.has(path)&&!(isBrowserTest&&browserRoot&&tracked.has(browserRoot)))
   problems.push(file+' imports missing '+path);
 }
 if(file==='sw.js'){
  for(const match of source.matchAll(/['"]\.\/([^'"?]+\.(?:js|css|html|svg|png|webmanifest))(?:\?[^'"]*)?['"]/g)){
   const path=match[1];checked.push([file,path]);
   if(!tracked.has(path))problems.push(file+' precaches missing '+path);
  }
 }
}
for(const workflow of [...tracked].filter(p=>p.startsWith('.github/workflows/')&&/\.ya?ml$/.test(p))){
 const lines=readFileSync(workflow,'utf8').split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const s=lines[i].trim();
  if(s.startsWith('#')||s.length===0)continue;
  // Check explicit file names in commands and path filters. Do not treat glob
  // patterns or identifiers in explanatory comments as executable paths.
  for(const m of s.matchAll(/\b(?:tests|scripts|ui|core)\/[a-zA-Z0-9_./-]+\.(?:js|mjs)\b/g)){
   const path=m[0];
   checked.push([workflow,path]);
   if(!tracked.has(path))problems.push(workflow+':'+(i+1)+' references missing '+path);
  }
 }
}
const retired=['ui/gpsIndexedDbStore.js','ui/gpsMeasurementStore.js','tests/gpsBackupContract.test.mjs','tests/gpsIndexedDbStore.test.mjs',
 'ui/historyExperience.css','docs/SCREEN_MAP.md','docs/UNIMPLEMENTED_PRIORITY_V27_20261026.md'];
for(const file of retired)if(tracked.has(file))problems.push('retired source reintroduced: '+file);
console.log(JSON.stringify({tracked:tracked.size,checkedDependencies:checked.length,issues:problems.length},null,2));
if(problems.length){for(const error of problems)console.error(error);process.exitCode=1;}
