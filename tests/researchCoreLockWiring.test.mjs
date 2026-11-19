import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const lock=readFileSync(new URL('../ui/manualRunLock.js',import.meta.url),'utf8');
test('manual run, correction, export, restore and deletion all use one exclusion lock',()=>{
 for(const snippet of [
  'withManualRunWriteLock(()=>canonical.mutate(s=>manualRunStore.saveManualRun',
  'withManualRunWriteLock(()=>canonical.snapshotTask(nativeStorage,s=>',
  'manualRunStore.classifySavedManualRun(s,record.id,gait)'
 ])assert.ok(app.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),'missing serialized operation: '+snippet);
 for(const s of ['canonical.portableMutation(nativeStorage,s=>dataManagement.restorePortableBase(s,dataUi.pendingText))','canonical.portableMutation(nativeStorage,s=>dataManagement.restorePortableBase(s,v2Text))'])
  assert.ok(app.includes(s),'both v2 and v3 restore adapters must run within manual exclusion lock: '+s);
 for(const s of ['dataManagement.exportPortableBackup(s,{includeGps:dataUi.includeGps})','gpsPrivatePortableFlow.exportPrivatePortableV3(s)'])
  assert.ok(app.includes(s),'both backup writers remain inside the canonical lock: '+s);
 for(const snippet of [
  'withManualRunWriteLock(async()=>{',
  'return saved.ok?dataManagement.restorePortableAnnotations(dataUi.pendingText,saved):saved',
  'withManualRunWriteLock(async()=>{const cleared=await canonical.portableMutation(nativeStorage,s=>dataManagement.removeAllPortableBase',
  'return cleared.ok?dataManagement.removeAllPortableAnnotations(cleared):cleared'
 ])assert.ok(app.includes(snippet),'missing M3 serialized operation: '+snippet);
 assert.match(app,/onAssignGait:async gait=>/);
 assert.match(lock,/mode:'exclusive'/);
 assert.match(lock,/保存を停止しました/);
});
test('note write and delete use the same lock; failure is not accepted as deletion success',()=>{
 assert.match(app,/withManualRunWriteLock\(\(\)=>explorationExperience\.saveNote/);
 assert.match(app,/withManualRunWriteLock\(\(\)=>explorationExperience\.deleteNote/);
 assert.match(app,/const success=deleteResult===true/);
 assert.doesNotMatch(app,/const success=await manualRunLock\.withManualRunWriteLock/);
});
