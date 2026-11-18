import test from 'node:test';
import assert from 'node:assert/strict';
import {
 inspectGpsPrivateBackupChoice,inspectGpsPrivateBackupSnapshot,
 GPS_PRIVATE_REFLECTION_FORMAT,GPS_PRIVATE_REFLECTION_VERSION
} from '../ui/gpsReflectionBackupScope.js';

const ref={sourceType:'GPS_V2',recordId:'gps-v2-12345678-1234-4abc-8def-123456789abc'};
const other={sourceType:'GPS_V2',recordId:'gps-v2-87654321-4321-4abc-8def-123456789abc'};
const noteId='gps-refnote-abcdefgh';
const creation=Object.freeze({
 schemaVersion:1,eventId:'gps-refevent-abcdefgh',requestId:'gps-refrequest-abcdefgh',
 noteId,recordRef:ref,action:'CREATE',revision:1,predecessorEventId:null,
 savedAt:'2026-11-18T10:00:00.000Z'
});
const edit=Object.freeze({
 ...creation,eventId:'gps-refevent-bcdefghi',requestId:'gps-refrequest-bcdefghi',
 action:'EDIT',revision:2,predecessorEventId:creation.eventId,
 savedAt:'2026-11-18T10:01:00.000Z'
});
const content={recordRef:ref,noteId,text:'現在の私的な気づき'};
const scope={includeGps:true,includeGpsReflections:true};
const good=()=>({parents:[ref],contents:[content],events:[creation,edit]});

test('G4-C1 default GPS/private note export is excluded, without leaking any snapshot contents or IDs',()=>{
 const x=inspectGpsPrivateBackupSnapshot({},new Proxy({},{
  get(){throw Error('private snapshot must not be inspected on opt-out')},
  ownKeys(){throw Error('must not enumerate private snapshot')}
 }));
 assert.deepEqual(x,{ok:true,included:false,bundle:null});
 for(const choice of [{includeGps:false},{includeGps:true},{includeGps:true,includeGpsReflections:false}]){
  const result=inspectGpsPrivateBackupSnapshot(choice,good());
  assert.deepEqual(result,{ok:true,included:false,bundle:null});
 }
});

test('G4-C1 GPS records consent alone never implies private free-text backup consent',()=>{
 assert.equal(inspectGpsPrivateBackupChoice({includeGps:true}).value.includeGpsReflections,false);
 assert.equal(inspectGpsPrivateBackupChoice({includeGps:true,includeGpsReflections:true}).ok,true);
 for(const choice of [
  {includeGps:false,includeGpsReflections:true},
  {includeGpsReflections:true},
  {includeGps:0},
  {includeGps:true,includeGpsReflections:'true'},
  {includeGps:true,includeGpsReflections:true,extra:'private'},
  null,[],{includeGps:null}
 ])assert.equal(inspectGpsPrivateBackupChoice(choice).ok,false,JSON.stringify(choice));
});

test('G4-C1 opt-in serializes current text once with metadata-only CREATE/EDIT chain',()=>{
 const prepared=good(),before=JSON.stringify(prepared);
 const x=inspectGpsPrivateBackupSnapshot(scope,prepared);
 assert.equal(x.ok,true,JSON.stringify(x));
 assert.equal(x.included,true);
 assert.equal(x.bundle.format,GPS_PRIVATE_REFLECTION_FORMAT);
 assert.equal(x.bundle.version,GPS_PRIVATE_REFLECTION_VERSION);
 assert.equal(x.bundle.contents.length,1);
 assert.equal(x.bundle.contents[0].text,content.text);
 assert.equal(x.bundle.events.length,2);
 assert.deepEqual(x.bundle.events.map(e=>e.revision),[1,2]);
 assert.equal(JSON.stringify(x.bundle.events).includes(content.text),false);
 assert.deepEqual(x.bundle.events.map(e=>Object.keys(e).length),[9,9]);
 assert.equal(JSON.stringify(prepared),before,'pure contract must not reorder or modify the source');
});

test('G4-C1 DELETE tombstones have no private text, and a deleted-only stream is legal',()=>{
 const deletedId='gps-refnote-deleted123';
 const createDeleted={...creation,noteId:deletedId,eventId:'gps-refevent-deleted123',requestId:'gps-refrequest-deleted123'};
 const tombstone={...createDeleted,eventId:'gps-refevent-tombstone1',requestId:'gps-refrequest-tombstone1',
  action:'DELETE',revision:2,predecessorEventId:createDeleted.eventId,
  savedAt:'2026-11-18T10:02:00.000Z'};
 const snapshot={parents:[ref],contents:[],events:[tombstone,createDeleted]};
 const result=inspectGpsPrivateBackupSnapshot(scope,snapshot);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.bundle.contents.length,0);
 assert.deepEqual(result.bundle.events.map(x=>x.action),['CREATE','DELETE']);
 assert.equal(JSON.stringify(result.bundle).includes('text'),false);
 assert.equal(inspectGpsPrivateBackupSnapshot(scope,{...snapshot,contents:[{...content,noteId:deletedId}]}).ok,false,
  'deleted note text must not survive export');
});

test('G4-C1 corrupted or missing GPS parents and cross-run note content fail closed',()=>{
 for(const snap of [
  {...good(),parents:[]},
  {...good(),parents:[other]},
  {...good(),parents:[ref,ref]},
  {...good(),parents:['gps-v2-12345678']},
  {...good(),contents:[{...content,recordRef:other}]},
  {...good(),events:[{...creation,recordRef:other},edit]},
  {...good(),contents:[{...content,text:' 私的な気づき  '}]},
  {...good(),contents:[{...content,secret:'leak'}]},
  {...good(),extra:1},
  {...good(),events:[creation,edit,{...edit,requestId:'gps-refrequest-another1'}]},
  {...good(),events:[creation,{...edit,revision:4}]},
  {...good(),contents:[]},
  {...good(),events:[]}
 ])assert.equal(inspectGpsPrivateBackupSnapshot(scope,snap).ok,false,JSON.stringify(snap)?.slice(0,140));
});

test('G4-C1 reject duplicate request and event IDs across separate note streams',()=>{
 const note2='gps-refnote-second123';
 const second={...creation,noteId:note2,eventId:'gps-refevent-second123'};
 const snap={parents:[ref],contents:[content,{recordRef:ref,noteId:note2,text:'別の問い'}],events:[creation,second]};
 assert.equal(inspectGpsPrivateBackupSnapshot(scope,snap).ok,false,'duplicate request ID across notes');
 const again={...second,requestId:'gps-refrequest-second123',eventId:creation.eventId};
 assert.equal(inspectGpsPrivateBackupSnapshot(scope,{...snap,events:[creation,again]}).ok,false,'duplicate event ID');
});

test('G4-C1 empty explicit opt-in is safe but malformed arrays or extra snapshot keys are refused',()=>{
 const ok=inspectGpsPrivateBackupSnapshot(scope,{parents:[],contents:[],events:[]});
 assert.equal(ok.ok,true);
 assert.deepEqual(ok.bundle.contents,[]);
 assert.deepEqual(ok.bundle.events,[]);
 for(const snap of [null,{},[],{parents:[],contents:null,events:[]},
  {parents:[],contents:[],events:[],text:'never accept arbitrary backup keys'}])
  assert.equal(inspectGpsPrivateBackupSnapshot(scope,snap).ok,false);
});
