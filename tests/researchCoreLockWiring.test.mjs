import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const lock=readFileSync(new URL('../ui/manualRunLock.js',import.meta.url),'utf8');
test('manual run, correction, export, restore and deletion all use one exclusion lock',()=>{
 for(const snippet of [
  'withManualRunWriteLock(()=>canonical.mutate(s=>manualRunStore.saveManualRun',
  'withManualRunWriteLock(()=>canonical.snapshotTask(nativeStorage,s=>dataManagement.exportPortableBackup',
  'manualRunStore.classifySavedManualRun(s,record.id,gait)'
 ])assert.ok(app.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),'missing serialized operation: '+snippet);
 for(const snippet of [
  'withManualRunWriteLock(async()=>{const saved=await canonical.portableMutation(nativeStorage,s=>dataManagement.restorePortableBase',
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
