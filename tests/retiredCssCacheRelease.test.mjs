import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('retired CSS release activates a fresh cache, keeps unrelated caches and matches page release',async()=>{
 const source=read('sw.js'),html=read('index.html');
 const release='20261126-cleanup-v5-css-retired-mirror-stage3',current='runload-ui-next-shell-'+release,previous='runload-ui-next-shell-20261126-cleanup-v5-css-retired-mirror';
 assert.equal(source.match(/const CACHE="([^"]+)"/)[1],current);
 assert.match(html,new RegExp('pwa\\.js\\?v='+release+'"'));
 assert.doesNotMatch(html,/(?:interpretationExperience|resultExperience)\\.css/);
 const handlers=new Map(),stores=new Map([[previous,new Set(['https://example.test/run-app/ui/interpretationExperience.css','https://example.test/run-app/ui/resultExperience.css'])],['unrelated-cache',new Set()]]);
 let claimed=false,skipped=false;
 const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{
  if(!stores.has(key))stores.set(key,new Set());
  return {addAll:async urls=>urls.forEach(url=>stores.get(key).add(url))};
 }};
 const self={location:{href:'https://example.test/run-app/sw.js'},addEventListener:(name,fn)=>handlers.set(name,fn),skipWaiting:async()=>{skipped=true},clients:{claim:async()=>{claimed=true}}};
 vm.runInNewContext(source,{self,caches,URL});
 async function fire(name){let pending;handlers.get(name)({waitUntil:p=>{pending=p}});await pending;}
 await fire('install');assert.ok(skipped);assert.ok(stores.has(previous),'old cache stays until activation');
 await fire('activate');assert.ok(claimed);assert.ok(!stores.has(previous));assert.ok(stores.has('unrelated-cache'));
 const urls=[...stores.get(current)];
 assert.ok(urls.length>=150);assert.ok(urls.some(u=>u.endsWith('/pwa.js?v='+release)));assert.ok(!urls.some(u=>/(?:interpretationExperience|resultExperience)\.css/.test(u)));
 let reply;handlers.get('message')({data:{type:'RUNLOAD_GET_RELEASE'},ports:[{postMessage:x=>{reply=x}}]});assert.equal(reply.release,release);
});
