import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGpsReflectionDraft,preflightGpsReflectionDraft,GPS_REFLECTION_TEXT_LIMIT} from '../ui/gpsReflectionPreflight.js';
import {prepareGpsV2Run,validGpsV2Summary} from '../ui/gpsReplayIndexedDbStore.js';

const t0=1700000000000;
const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
 altitudeQuality:'missing',km,t:t0+i*5000,breakBefore:i===0,activity:'RUNNING'}));
const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,accepted:3,rejected:0,track,trackSimplified:false,
 replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true,flags:[]};
const made=prepareGpsV2Run(session,{saveDetails:false,date:'2026-11-17'});
assert.equal(made.ok,true,made.reason);
const summary=made.summary;
assert.equal(validGpsV2Summary(summary),true);
const ref=Object.freeze({sourceType:'GPS_V2',recordId:summary.id});
const request=(text='結果を見て、次回は時間と感覚の違いを確認したい。')=>({recordRef:ref,text});
const source=(records=[summary],ok=true)=>({readGpsV2Summaries:async()=>({ok,records}),validGpsV2Summary});

// This gate is non-persistent. Do not accidentally claim that it stores notes.
test('G4-A valid real GPS V2 summary and explicit identity are accepted as read-only preflight',async()=>{
 const original=JSON.stringify(summary);
 const raw=JSON.stringify(request());
 const checked=await preflightGpsReflectionDraft(request(),{gpsV2:source()});
 assert.equal(checked.ok,true,checked.reason);
 assert.deepEqual(checked.value.recordRef,ref);
 assert.equal(checked.value.recordDate,'2026-11-17');
 assert.equal(checked.value.parentRecheckRequired,true);
 assert.equal(JSON.stringify(summary),original,'GPS original remains byte-for-byte identical');
 assert.equal(JSON.stringify(request()),raw,'caller input remains unchanged');
 assert.equal('route' in checked.value,false,'private route is not materialized by the eligibility result');
});

test('G4-A forbid manual, old GPS, unknown and source-prefix mismatch',()=>{
 const manual='run-v1-12345678-aaaa-4abc-8def-123456789abc';
 for(const bad of [
  {sourceType:'MANUAL',recordId:manual},
  {sourceType:'GPS_V1',recordId:'gps-v1-abcdefgh'},
  {sourceType:'GPS_V2',recordId:manual},
  {sourceType:'MANUAL',recordId:ref.recordId},
  {sourceType:'GPS_V2',recordId:'gps-v2-short'},
  {sourceType:'GPS_V2',recordId:'gps-v2-abcdefgh?record=other'},
  {sourceType:'GPS_V2',recordId:ref.recordId,extra:true}
 ])assert.equal(inspectGpsReflectionDraft({recordRef:bad,text:'本人の記述'}).ok,false,JSON.stringify(bad));
});

test('G4-A reject malformed/ambiguous request and text while preserving user control',()=>{
 assert.equal(GPS_REFLECTION_TEXT_LIMIT,500);
 for(const bad of [null,[],{},'text', {recordRef:ref}, {text:'x'},
  {...request(),extra:'location'}, {...request(),gpsRoute:'PRIVATE'},
  {...request(),text:null},{...request(),text:0},{...request(),text:''},
  {...request(),text:' \n '},{...request(),text:'x'.repeat(501)}
 ])assert.equal(inspectGpsReflectionDraft(bad).ok,false,JSON.stringify(bad)?.slice(0,140));
 assert.equal(inspectGpsReflectionDraft({...request(),text:'x'.repeat(500)}).ok,true);
 assert.equal(inspectGpsReflectionDraft({...request(),text:'  気づき  '}).value.text,'気づき');
});

test('G4-A never select latest or substitute another GPS parent after deletion',async()=>{
 const missing={recordRef:{sourceType:'GPS_V2',recordId:'gps-v2-deleted-12345678'},text:'残したい問い'};
 const x=await preflightGpsReflectionDraft(missing,{gpsV2:source()});
 assert.equal(x.ok,false);assert.equal(x.code,'NOT_FOUND');
 assert.equal((await preflightGpsReflectionDraft(request(),{gpsV2:source([])})).code,'NOT_FOUND');
});

test('G4-A rejects broken, duplicate, unreadable and throwing GPS summary authority',async()=>{
 const bad=structuredClone(summary);bad.finalReference.regions[0].value=Infinity;
 for(const [name,adapter,want] of [
  ['unreadable',source([],false),'UNREADABLE_PARENT'],
  ['corrupt',source([bad]),'UNREADABLE_PARENT'],
  ['duplicates',source([summary,summary]),'UNREADABLE_PARENT'],
  ['no adapter',{},'UNREADABLE_PARENT'],
  ['exception',{readGpsV2Summaries:()=>{throw Error('read blocked')},validGpsV2Summary},'UNREADABLE_PARENT'],
 ]){const r=await preflightGpsReflectionDraft(request(),{gpsV2:adapter});assert.equal(r.ok,false,name);assert.equal(r.code,want,name);}
});

test('G4-A does not authorize a writer, mutate localStorage, change consent or export GPS notes',async()=>{
 let reads=0;
 const adapter={readGpsV2Summaries:async()=>{reads++;return {ok:true,records:[summary]};},validGpsV2Summary};
 const before=JSON.stringify(summary);
 const r=await preflightGpsReflectionDraft(request(),{gpsV2:adapter});
 assert.equal(r.ok,true);assert.equal(reads,1);
 assert.equal(JSON.stringify(summary),before);
 assert.deepEqual(Object.keys(r.value).sort(),['parentRecheckRequired','recordDate','recordRef','text']);
 assert.equal('persist' in r.value,false);assert.equal('includeGps' in r.value,false);
});