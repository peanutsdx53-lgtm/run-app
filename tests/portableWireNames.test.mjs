import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA_KEYS,PORTABLE_LOCAL_FIELDS,PORTABLE_FORMAT,exportPortableBackup,inspectPortableBackup,inspectLocalStorage,planPortableRestore,restorePortableBackup} from '../ui/dataManagement.js';
import {inspectPortableBackup as inspectV2} from '../ui/portableDataV2.js';
import {REST_DAY_KEY,saveRestDay} from '../ui/restDayStore.js';
import {CONDITION_KEY} from '../ui/homeExperience.js';
const storage=(initial={})=>{const map=new Map(Object.entries(initial));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const annotations={format:'running-annotation-backup-v1',version:1,events:[],heads:[],meta:{key:'root',schemaVersion:1,storeRevision:0,eventCount:0,totalBytes:0}};
test('new local backup wire keys are neutral, complete, unique and lossless; legacy storage does not change',async()=>{
 const source=storage({[CONDITION_KEY]:JSON.stringify([{date:'2026-10-10',sleepMinutes:420,feeling:'良い',memo:''}]),'unrelated':'keep'});
 assert.ok(saveRestDay(source,{date:'2026-10-11',memo:'rest'}).ok);
 const snapshot=inspectLocalStorage(source),before=[...source.map];assert.ok(snapshot.ok);
 const result=await exportPortableBackup(source);assert.ok(result.ok,result.reason);
 const wire=JSON.parse(result.text);assert.deepEqual(Object.keys(wire.local),DATA_KEYS.map(k=>PORTABLE_LOCAL_FIELDS[k]));
 assert.equal(new Set(Object.keys(wire.local)).size,DATA_KEYS.length);assert.doesNotMatch(result.text,/runload/i);
 const checked=inspectPortableBackup(result.text);assert.ok(checked.ok,checked.reason);assert.deepEqual(checked.data.local,snapshot.local);
 assert.deepEqual([...source.map],before);
 const target=storage({'unrelated':'keep'});const restored=await restorePortableBackup(target,result.text);assert.ok(restored.ok,restored.reason);
 assert.deepEqual(inspectLocalStorage(target).local,snapshot.local);assert.equal(target.getItem('unrelated'),'keep');
 const v2={...wire,version:2,annotations};assert.ok(inspectV2(JSON.stringify(v2)).ok);
});
test('legacy keys and optional missing rest field remain readable, mixed and unknown keys fail closed',async()=>{
 const source=storage();const old={format:PORTABLE_FORMAT,version:1,exportedAt:'2026-11-26T00:00:00Z',local:inspectLocalStorage(source).local,gps:null};
 const legacy=inspectPortableBackup(JSON.stringify(old));assert.ok(legacy.ok);
 const wire=JSON.parse((await exportPortableBackup(source)).text);
 for(const env of [old,wire]){const missing={...env,local:{...env.local}};delete missing.local[env===old?REST_DAY_KEY:PORTABLE_LOCAL_FIELDS[REST_DAY_KEY]];assert.ok(inspectPortableBackup(JSON.stringify(missing)).ok);}
 const mixed={...wire,local:{...wire.local,[DATA_KEYS[0]]:null}};delete mixed.local[PORTABLE_LOCAL_FIELDS[DATA_KEYS[0]]];
 const duplicate={...wire,local:{...wire.local,[DATA_KEYS[0]]:null}};
 const unknown={...wire,local:{...wire.local,unknown:null}};delete unknown.local[PORTABLE_LOCAL_FIELDS[DATA_KEYS[0]]];
 const missing={...wire,local:{...wire.local}};delete missing.local[PORTABLE_LOCAL_FIELDS[DATA_KEYS[0]]];
 for(const env of [mixed,duplicate,unknown,missing]){assert.equal(inspectPortableBackup(JSON.stringify(env)).ok,false);assert.equal(planPortableRestore(source,JSON.stringify(env)).ok,false);}
 assert.equal(source.map.size,0);
});
