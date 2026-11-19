import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA_KEYS,PORTABLE_FORMAT,inspectPortableBackup as inspectLegacy}
 from '../ui/dataManagement.js';
import {inspectPortableBackup as inspectV2} from '../ui/portableDataV2.js';
import {prepareGpsV2Run,inspectGpsV2Backup,GPS_V2_BACKUP_FORMAT}
 from '../ui/gpsReplayIndexedDbStore.js';
import {GPS_PRIVATE_REFLECTION_FORMAT,GPS_PRIVATE_REFLECTION_VERSION}
 from '../ui/gpsReflectionBackupScope.js';
import {PRIVATE_PORTABLE_VERSION,inspectAnyPortableBackup,inspectPortableV3Backup,
 preparePortableV3Candidate,planPrivateGpsRestore}
 from '../ui/gpsReflectionPortableV3.js';

const local=Object.fromEntries(DATA_KEYS.map(k=>[k,null]));
const annotations={format:'running-annotation-backup-v1',version:1,events:[],heads:[],
 meta:{key:'root',schemaVersion:1,storeRevision:0,eventCount:0,totalBytes:0}};
const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,
 ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,
 t:1700000000000+i*5000,breakBefore:i===0,activity:'RUNNING'}));
const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
 accepted:3,rejected:0,track,trackSimplified:false,replayTrackAvailable:true,
 replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
const prepared=prepareGpsV2Run(session,{saveDetails:true,date:'2026-11-18'});
assert.equal(prepared.ok,true,JSON.stringify(prepared));
const gps={format:GPS_V2_BACKUP_FORMAT,version:2,summaries:[prepared.summary],details:[prepared.detail]};
assert.equal(inspectGpsV2Backup(JSON.stringify(gps)).ok,true);
const v2={format:PORTABLE_FORMAT,version:2,exportedAt:'2026-11-18T10:00:00.000Z',
 local,gps,annotations};
assert.equal(inspectV2(JSON.stringify(v2)).ok,true);
const noteId='gps-refnote-g4c3aaaab';
const ref={sourceType:'GPS_V2',recordId:prepared.summary.id};
const event={schemaVersion:1,eventId:'gps-refevent-g4c3aaaaa',
 requestId:'gps-refrequest-g4c3aaaaa',noteId,recordRef:ref,action:'CREATE',
 revision:1,predecessorEventId:null,savedAt:'2026-11-18T10:01:00.000Z'};
const current={noteId,recordRef:ref,text:'私的な走行の気づき'};
const reflections={format:GPS_PRIVATE_REFLECTION_FORMAT,
 version:GPS_PRIVATE_REFLECTION_VERSION,contents:[current],events:[event]};
const choice={includeGps:true,includeGpsReflections:true};
const snapshot={ok:true,includedGps:true,includedReflections:true,gps,reflections};
const packed=preparePortableV3Candidate(JSON.stringify(v2),snapshot,choice);
assert.equal(packed.ok,true,JSON.stringify(packed));
const emptyGps={format:GPS_V2_BACKUP_FORMAT,version:2,summaries:[],details:[]};
const emptyReflection={...reflections,contents:[],events:[]};
const emptyCurrent={ok:true,includedGps:true,includedReflections:true,
 gps:emptyGps,reflections:emptyReflection};
const json=x=>JSON.stringify(x);

test('G4-C3 legacy v1 and v2 are inspected with original strict readers, unchanged',()=>{
 const v1={format:PORTABLE_FORMAT,version:1,exportedAt:v2.exportedAt,local,gps};
 assert.equal(inspectLegacy(json(v1)).ok,true);
 assert.equal(inspectAnyPortableBackup(json(v1)).ok,true);
 assert.equal(inspectAnyPortableBackup(json(v2)).ok,true);
 assert.equal(inspectV2(json(v2)).ok,true);
 assert.equal(inspectV2(packed.text).ok,false,'v2 does not silently accept version3');
 assert.equal(inspectLegacy(packed.text).ok,false,'v1 cannot silently accept version3');
});

test('G4-C3 explicit separate consent and exactly matching GPS original are mandatory',()=>{
 const original=json(v2),before=json(snapshot);
 for(const [v,choiceBad] of [
  [{includeGps:true},true],[{includeGps:false,includeGpsReflections:true},true],
  [{includeGps:true,includeGpsReflections:false},true],[{},true]
 ]){
  const x=preparePortableV3Candidate(original,snapshot,v);
  assert.equal(x.ok,false,json(v));
 }
 const altered={...snapshot,gps:{...gps,summaries:[]}};
 assert.equal(preparePortableV3Candidate(original,altered,choice).code,'HEAD_CONFLICT');
 const noGps={...v2,gps:null};
 assert.equal(preparePortableV3Candidate(json(noGps),snapshot,choice).ok,false);
 const result=preparePortableV3Candidate(original,snapshot,choice);
 assert.equal(result.ok,true,json(result));
 assert.equal(result.version,PRIVATE_PORTABLE_VERSION);
 assert.equal(json(snapshot),before,'candidate must not mutate original snapshot');
});

test('G4-C3 v3 strict schema retains original local, GPS and annotation sections',()=>{
 const accepted=inspectPortableV3Backup(packed.text);
 assert.equal(accepted.ok,true,json(accepted));
 assert.equal(accepted.privateNoteCount,1);
 assert.equal(accepted.privateEventCount,1);
 assert.equal(accepted.gpsCount,1);
 const root=JSON.parse(packed.text);
 assert.deepEqual(root.local,v2.local);
 assert.deepEqual(root.gps,v2.gps);
 assert.deepEqual(root.annotations,v2.annotations);
 assert.deepEqual(root.gpsReflections,reflections);
 assert.equal(root.version,3);
 assert.equal(inspectAnyPortableBackup(packed.text).ok,true);
});

test('G4-C3 v3 rejects unknown fields, parent orphans and hidden stale text',()=>{
 const base=JSON.parse(packed.text);
 for(const obj of [
  {...base,secret:'PRIVATE_SPILL'},
  {...base,version:4},
  {...base,gps:null},
  {...base,gpsReflections:{...reflections,extra:'leak'}},
  {...base,gpsReflections:{...reflections,contents:[{...current,text:' '}] }},
  {...base,gpsReflections:{...reflections,contents:[{...current,recordRef:
    {sourceType:'GPS_V2',recordId:'gps-v2-missingparent1'}}]}},
  {...base,gpsReflections:{...reflections,events:[{...event,recordRef:
    {sourceType:'GPS_V2',recordId:'gps-v2-missingparent1'}}]}},
  {...base,gpsReflections:{...reflections,events:[{...event,revision:2}]}},
  {...base,gpsReflections:{...reflections,contents:[]}},
  {...base,gpsReflections:{...reflections,events:[]}},
  {...base,annotations:{...annotations,extra:1}}
 ])assert.equal(inspectPortableV3Backup(json(obj)).ok,false,json(obj).slice(0,200));
});

test('G4-C3 no-write restore preflight accepts new parent/note, then exact idempotent restore',()=>{
 const empty=planPrivateGpsRestore(packed.text,emptyCurrent);
 assert.equal(empty.ok,true,json(empty));
 assert.deepEqual(empty.plan,{
  gpsParentsToAdd:1,privateNotesToAdd:1,skippedExactNotes:0,privateEventsToAdd:1
 });
 assert.equal(empty.writeCount,0);
 assert.equal(empty.requiresTransactionRecheck,true);
 const old=planPrivateGpsRestore(packed.text,snapshot);
 assert.equal(old.ok,true,json(old));
 assert.deepEqual(old.plan,{
  gpsParentsToAdd:0,privateNotesToAdd:0,skippedExactNotes:1,privateEventsToAdd:0
 });
});

test('G4-C3 restore preflight rejects divergent text, revisions and parent data',()=>{
 const differentText={...snapshot,reflections:{...reflections,
  contents:[{...current,text:'違う走行感覚の本文'}]}};
 assert.equal(planPrivateGpsRestore(packed.text,differentText).code,'NOTE_CONFLICT');
 const newerEvent={...event,eventId:'gps-refevent-g4c3new1',requestId:'gps-refrequest-g4c3new1',
  predecessorEventId:event.eventId,action:'EDIT',revision:2,
  savedAt:'2026-11-18T10:02:00.000Z'};
 const changed={...snapshot,reflections:{...reflections,
  contents:[current],events:[event,newerEvent]}};
 assert.equal(planPrivateGpsRestore(packed.text,changed).code,'NOTE_CONFLICT');
 const changedParent={...snapshot,gps:{...gps,
  summaries:[{...prepared.summary,memo:'wrong'}]}};
 assert.equal(planPrivateGpsRestore(packed.text,changedParent).ok,false);
 const unreadable={...snapshot,ok:false};
 assert.equal(planPrivateGpsRestore(packed.text,unreadable).code,'UNREADABLE_CURRENT');
});

test('G4-C3 restore preflight rejects reuse of immutable event IDs across notes',()=>{
 const anotherId='gps-refnote-otherc3xx';
 const newNote={...current,noteId:anotherId,text:'別の質問'};
 const currentRef={...event,noteId:anotherId,
  requestId:'gps-refrequest-otherc3x'};
 const unrelated={...snapshot,reflections:{
  ...reflections,contents:[newNote],events:[currentRef]
 }};
 assert.equal(planPrivateGpsRestore(packed.text,unrelated).code,'EVENT_CONFLICT');
});


test('G4-C3 deleted-note tombstone is metadata-only and cannot resurrect old text',()=>{
 const tombstone={...event,eventId:'gps-refevent-g4c3delete1',
  requestId:'gps-refrequest-g4c3delete1',action:'DELETE',
  revision:2,predecessorEventId:event.eventId,
  savedAt:'2026-11-18T10:03:00.000Z'};
 const clean={...JSON.parse(packed.text),gpsReflections:{
  ...reflections,contents:[],events:[event,tombstone]
 }};
 const cleanText=json(clean);
 const check=inspectPortableV3Backup(cleanText);
 assert.equal(check.ok,true,json(check));
 assert.equal(check.privateNoteCount,0);
 assert.equal(check.privateEventCount,2);
 assert.equal(cleanText.includes(current.text),false);
 const plan=planPrivateGpsRestore(cleanText,emptyCurrent);
 assert.equal(plan.ok,true,json(plan));
 assert.equal(plan.plan.privateNotesToAdd,1);
 assert.equal(plan.plan.privateEventsToAdd,2);
 assert.equal(planPrivateGpsRestore(cleanText,snapshot).code,'NOTE_CONFLICT',
  'already active text must never be silently replaced by a tombstone');
 const injected={...clean,gpsReflections:{...clean.gpsReflections,
  contents:[current]}};
 assert.equal(inspectPortableV3Backup(json(injected)).ok,false,
  'deleted note text must not be restored from malformed backup');
});
