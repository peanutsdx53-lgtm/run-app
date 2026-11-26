import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {posix} from 'node:path';

const files=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
const runtime=new Set([...files].filter(p=>/^(?:app\.js|pwa\.js|sw\.js|index\.html|styles\.css|manifest(?:\.en)?\.webmanifest)$/.test(p)||/^(?:ui|core|assets|icons)\/.*\.(?:js|css|png|svg)$/.test(p)));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const textual=p=>/\.(?:js|css|html|webmanifest)$/.test(p);

// Conservative lexical reachability: this is not a JS execution or CSS selector coverage test.
// Precache is deliberately not a root of the runtime graph.
function dependencies(path){
 const source=read(path),deps=new Set();
 for(const match of source.matchAll(/["'\x60]((?:\.{1,2}\/|\/)[\w./-]+\.(?:js|css|png|svg|webmanifest))(?:\?[^"'\x60\s]*)?["'\x60]/g)){
  const target=match[1];
  for(const candidate of [posix.normalize(posix.join(posix.dirname(path),target)),posix.normalize(target.replace(/^\//,''))]){
   if(runtime.has(candidate))deps.add(candidate);
  }
 }
 if(path.endsWith('.webmanifest'))for(const icon of JSON.parse(source).icons||[]){
  const candidate=posix.normalize(posix.join(posix.dirname(path),icon.src));
  assert.ok(runtime.has(candidate),'manifest icon missing: '+candidate);deps.add(candidate);
 }
 if(path==='ui/rofJScale.js'){
  assert.ok(source.includes('"./assets/rof/rof-visual-"+anchor.file+".png"'));
  for(const match of source.matchAll(/file:"([a-z]+)"/g)){
   const candidate='assets/rof/rof-visual-'+match[1]+'.png';
   assert.ok(runtime.has(candidate),'dynamic ROF image missing: '+candidate);deps.add(candidate);
  }
 }
 return deps;
}

test('tracked application assets have a shell reference path independent of precache',()=>{
 const reached=new Set(['index.html']),queue=['index.html'];
 while(queue.length){
  const path=queue.pop();
  if(path==='sw.js'||!textual(path))continue;
  for(const dep of dependencies(path))if(!reached.has(dep)){reached.add(dep);queue.push(dep);}
 }
 assert.ok(reached.has('sw.js'),'worker must be registered by application');
 assert.ok(reached.has('ui/resultInlineStyles.js'),'live result styles must be reachable');
 assert.deepEqual([...runtime].filter(path=>!reached.has(path)).sort(),[]);
 for(const retired of ['ui/interpretationView.js','ui/interpretationExperience.css','ui/resultExperience.css'])assert.ok(!files.has(retired));
});
