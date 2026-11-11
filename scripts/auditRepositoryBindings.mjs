// Full tracked-file inventory of previous-repository URLs, separate from historical provenance.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const previous=/(?:peanutsdx53-lgtm|https?:\/\/[^\s"'<>)]+\/runload-app-v2(?:\/|$))/ig;
const runtime=p=>/^(?:app\.js|pwa\.js|sw\.js|index\.html|manifest\.webmanifest|styles\.css|ui\/.*\.(?:js|css)|core\/.*\.js|assets\/.*\.js)$/.test(p);
const currentGuides=new Set(['README.md','docs/INSTALL.md','tests/livePagesSmoke.mjs']);
const matches=[],binary=[];
let scanned=0;
for(const path of paths){
 if(!/\.(?:js|mjs|css|html|json|webmanifest|md|yml|yaml|csv|svg|txt)$/.test(path)){binary.push(path);continue;}
 const content=fs.readFileSync(path,'utf8');scanned++;
 content.split(/\r?\n/).forEach((line,i)=>{
  previous.lastIndex=0;const all=[...line.matchAll(previous)].map(m=>m[0]);
  if(!all.length)return;
  matches.push({path,line:i+1,terms:all,excerpt:line.trim().slice(0,420),active:runtime(path)||currentGuides.has(path)});
 });
}
const active=matches.filter(x=>x.active);
const report={tracked:paths.length,textScanned:scanned,binaryOrUnsupported:binary,previousRepositoryMentions:matches.length,activeReferences:active.length,active,historical:matches.filter(x=>!x.active)};
fs.mkdirSync('audit-artifacts',{recursive:true});
fs.writeFileSync('audit-artifacts/repository-link-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('REPOSITORY_LINK_AUDIT '+JSON.stringify({tracked:report.tracked,textScanned:scanned,other:binary.length,allMentions:matches.length,activeReferences:active.length,historicalReferences:report.historical.length}));
for(const entry of active)console.error('OLD_REPOSITORY_REFERENCE '+entry.path+':'+entry.line+' '+entry.excerpt);
if(active.length)process.exitCode=1;
