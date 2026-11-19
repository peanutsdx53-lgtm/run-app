import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDataUi,renderDataBackup} from '../ui/dataManagementUi.js';
import {isPrivateV3,projectPortableV2,restorePrivatePortableV3}
 from '../ui/gpsPrivatePortableUiFlow.js';

test('G4-C5 private export and restore are separate explicit opt-in, default OFF',()=>{
 const ui=makeDataUi();
 assert.equal(ui.includeGps,false);assert.equal(ui.includeGpsReflections,false);
 assert.equal(ui.privateRestoreAgree,false);
 const html=renderDataBackup(ui);
 assert.match(html,/data-dm-include-gps/);
 assert.match(html,/data-dm-include-private/);
 assert.match(html,/data-dm-include-private[^>]*disabled/);
});
test('G4-C5 legacy v1/v2 files never enter v3 recovery flow',()=>{
 assert.equal(isPrivateV3('{"version":1}'),false);
 assert.equal(isPrivateV3('{"version":2}'),false);
 assert.equal(isPrivateV3('{"version":3}'),true);
 assert.equal(isPrivateV3('not JSON'),false);
 assert.equal(projectPortableV2('{"version":3}').ok,false);
});
test('G4-C5 v3 requires explicit additional restore consent before enabling button',()=>{
 const ui=makeDataUi();
 ui.preview={ok:true,privateV3:true,hasExisting:false,
  privateNoteCount:2,privateEventCount:3,parsed:{counts:{},gpsCount:1}};
 let html=renderDataBackup(ui);
 assert.match(html,/data-dm-private-restore-agree/);
 assert.match(html,/data-dm-restore[^>]*disabled/);
 ui.privateRestoreAgree=true;html=renderDataBackup(ui);
 assert.doesNotMatch(html,/data-dm-restore[^>]*disabled/);
});
test('G4-C5 no v3 backup write occurs without private confirmation',async()=>{
 let called=0;const result=await restorePrivatePortableV3(null,'not valid',{
  confirmed:false,restoreOthers:async()=>{called++;return {ok:true};}
 });
 assert.equal(result.ok,false);assert.equal(result.code,'CONSENT_REQUIRED');assert.equal(called,0);
});
