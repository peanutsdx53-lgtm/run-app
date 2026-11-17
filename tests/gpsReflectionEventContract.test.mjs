import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGpsReflectionEvent,inspectGpsReflectionContent,inspectGpsReflectionThread,inspectGpsReflectionChange,
 GPS_REFLECTION_EVENT_SCHEMA,GPS_REFLECTION_MAX_EVENTS} from '../ui/gpsReflectionEventContract.js';

const rid='gps-v2-aaaaaaaa-bbbb',mid='run-v1-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ref={sourceType:'GPS_V2',recordId:rid};const noteId='gps-refnote-aaaa1111';
const savedAt='2026-11-18T01:00:00.000Z';
const event=(rev=1,action='CREATE')=>({schemaVersion:GPS_REFLECTION_EVENT_SCHEMA,
 eventId:`gps-refevent-event${rev}abcd`,requestId:`gps-refrequest-req${rev}abcd`,noteId,recordRef:ref,
 predecessorEventId:rev===1?null:`gps-refevent-event${rev-1}abcd`,revision:rev,action,
 savedAt:`2026-11-18T01:0${rev-1}:00.000Z`});
const stream=(...events)=>inspectGpsReflectionThread(ref,noteId,events);

test('G4-B0: explicit GPS source identity and strictly checked event fields',()=>{
 const x=event();assert.equal(validateGpsReflectionEvent(x).ok,true);
 for(const bad of [{...x,recordRef:{sourceType:'MANUAL',recordId:mid}},
  {...x,recordRef:{sourceType:'MANUAL',recordId:rid}},
  {...x,recordRef:{sourceType:'GPS_V2',recordId:mid}},
  {...x,noteId:'gps-refnote-short'}, {...x,schemaVersion:2}, {...x,extra:'unexpected'},
  {...x,revision:0},{...x,savedAt:'yesterday'}])
  assert.equal(validateGpsReflectionEvent(bad).ok,false,JSON.stringify(bad));
});

test('G4-B0: 500-character content is current-only; no text in any historical event',()=>{
 const content={recordRef:ref,noteId,text:'結果を見て気づいたこと'};
 assert.equal(inspectGpsReflectionContent(content).ok,true);
 assert.equal(inspectGpsReflectionContent({...content,text:'あ'.repeat(500)}).ok,true);
 for(const text of ['', ' ','あ'.repeat(501),null,4])
  assert.equal(inspectGpsReflectionContent({...content,text}).ok,false);
 assert.equal(inspectGpsReflectionContent({...content,noteId:'gps-refnote-short'}).ok,false);
 assert.equal(validateGpsReflectionEvent({...event(),text:'SHOULD_NOT_STORE_PRIVATE_TEXT'}).ok,false);
 assert.equal(validateGpsReflectionEvent({...event(2,'DELETE'),text:null}).ok,false);
 assert.doesNotMatch(JSON.stringify(event(2,'DELETE')),/text|気づ|質問/);
});

test('G4-B0: create/edit/delete ordered history returns only the latest permitted status',()=>{
 const a=event(),b=event(2,'EDIT'),c=event(3,'DELETE');
 const active=stream(a,b);assert.equal(active.ok,true,active.reason);
 assert.equal(active.value.revision,2);assert.equal(active.value.status,'ACTIVE');
 assert.equal(Object.hasOwn(active.value,'text'),false,'the history cannot expose private old text');
 const gone=stream(a,b,c);assert.equal(gone.ok,true,gone.reason);
 assert.equal(gone.value.status,'DELETED');assert.equal(Object.hasOwn(gone.value,'text'),false);
 assert.equal(gone.value.latestEventId,c.eventId);
});

test('G4-B0: only a valid empty stream allows new creation; no silent resurrection',()=>{
 const empty=stream();assert.equal(empty.ok,true);assert.equal(empty.value.status,'ABSENT');
 assert.deepEqual(inspectGpsReflectionChange(empty,{expectedRevision:0,expectedLastEventId:null,action:'CREATE'}),
  {ok:true,value:{nextRevision:1,predecessorEventId:null}});
 const active=stream(event());
 assert.equal(inspectGpsReflectionChange(active,{expectedRevision:1,expectedLastEventId:event().eventId,action:'CREATE'}).code,'BAD_TRANSITION');
 assert.equal(inspectGpsReflectionChange(active,{expectedRevision:1,expectedLastEventId:event().eventId,action:'EDIT'}).ok,true);
 const gone=stream(event(),event(2,'DELETE'));
 for(const action of ['CREATE','EDIT','DELETE'])
  assert.equal(inspectGpsReflectionChange(gone,{expectedRevision:2,expectedLastEventId:event(2,'DELETE').eventId,action}).code,'BAD_TRANSITION');
});

test('G4-B0: stale revision or concurrent head cannot overwrite an existing text',()=>{
 const current=stream(event(),event(2,'EDIT'));assert.equal(current.ok,true);
 for(const overrides of [{expectedRevision:1,expectedLastEventId:event().eventId},
  {expectedRevision:2,expectedLastEventId:'gps-refevent-other999'},
  {expectedRevision:NaN,expectedLastEventId:event(2,'EDIT').eventId}])
  assert.equal(inspectGpsReflectionChange(current,{...overrides,action:'EDIT'}).code,'HEAD_CONFLICT');
 assert.equal(Object.hasOwn(current.value,'text'),false);
});

test('G4-B0: foreign run, ambiguous event ID and request IDs always fail closed',()=>{
 const a=event(),b=event(2,'EDIT');
 assert.equal(stream(a,{...b,recordRef:{sourceType:'GPS_V2',recordId:'gps-v2-other12345'}}).code,'SOURCE_MISMATCH');
 assert.equal(stream(a,{...b,noteId:'gps-refnote-other12345'}).code,'SOURCE_MISMATCH');
 assert.equal(stream(a,{...b,eventId:a.eventId}).code,'DUPLICATE_EVENT');
 assert.equal(stream(a,{...b,requestId:a.requestId}).code,'DUPLICATE_EVENT');
 assert.equal(stream(a,{...b,predecessorEventId:'gps-refevent-other1234'}).code,'BROKEN_CHAIN');
 assert.equal(stream(a,{...b,revision:3}).code,'BROKEN_CHAIN');
 assert.equal(stream(a,event(2,'CREATE')).ok,false);
});

test('G4-B0: no modification of caller-owned evidence and no mutable escape values',()=>{
 const a=event(),saved=JSON.stringify(a),arr=[a];
 const result=stream(...arr);assert.equal(result.ok,true);
 assert.equal(JSON.stringify(a),saved);assert.equal(arr.length,1);
 assert.equal('write' in result.value,false);assert.equal('export' in result.value,false);
 assert.equal(GPS_REFLECTION_MAX_EVENTS>=1000,true);
});
test('G4-B0: timestamp inversion and future schema are rejected without repairing history',()=>{
 const a=event(),b=event(2,'EDIT');
 assert.equal(stream(a,{...b,savedAt:'2026-11-17T00:00:00.000Z'}).code,'BROKEN_CHAIN');
 assert.equal(stream(a,{...b,schemaVersion:2}).code,'BAD_EVENT');
 assert.equal(stream(a,{...b,predecessorEventId:null}).code,'BAD_EVENT');
 assert.equal(stream({...a,action:'DELETE'}).ok,false);
});
