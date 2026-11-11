import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecordRef,parseLegacyOrTypedLink,encodeTypedRecordQuery,resolveRecord} from '../ui/recordRef.js';

const manualId='run-v1-12345678-aaaa-4abc-8def-123456789abc';
const gps2Id='gps-v2-12345678-abcd';
const reference=(sourceType,recordId)=>({sourceType,recordId});
const savedManual={id:manualId,schema:2,source:'manual',type:'run',distanceKm:5,durationSeconds:1800};
const savedGps2={id:gps2Id,schema:2,detailSaved:false};
const readers={
 manual:{readManualRuns:()=>({ok:true,records:[savedManual]})},
 gpsV2:{readGpsV2Summaries:()=>({ok:true,records:[savedGps2]}),validGpsV2Summary:x=>x===savedGps2}
};
const resolve=(ref,overrides={})=>resolveRecord(ref,{storage:{},...readers,...overrides});

test('M1: strictly validate active source types and keep the identity stable',()=>{
 for(const [sourceType,id] of [['MANUAL',manualId],['GPS_V2',gps2Id]]){
  const result=normalizeRecordRef(reference(sourceType,id));
  assert.equal(result.ok,true,sourceType);assert.deepEqual(result.value,reference(sourceType,id));
 }
 for(const bad of [null,{},[],{sourceType:'MANUAL'},{sourceType:'UNKNOWN',recordId:manualId},
  {...reference('MANUAL',manualId),extra:1},reference('MANUAL',manualId+':injection'),
  reference('MANUAL','run-v1-not-real'),reference('GPS_V1','gps-v1-short'),
  reference('GPS_V2','gps-v2-12345678:other')])assert.equal(normalizeRecordRef(bad).ok,false,JSON.stringify(bad));
 assert.equal(normalizeRecordRef(reference('MANUAL',gps2Id)).code,'SOURCE_MISMATCH');
 assert.equal(normalizeRecordRef(reference('GPS_V1','gps-v1-12345678')).code,'BAD_REF');
 assert.throws(()=>encodeTypedRecordQuery(reference('MANUAL',gps2Id)),TypeError);
});

test('M1: legacy manual, legacy GPS result and typed routes round-trip',()=>{
 const cases=[
  ['#/result?record='+manualId,'result','MANUAL',manualId],
  ['#/result?gps='+gps2Id,'result','GPS_V2',gps2Id],
  ['#/exploration-tree?category=01&topic=%E7%96%B2%E3%82%8C&record='+manualId,'exploration','MANUAL',manualId],
  ['#/result?source=gps-v2&record='+gps2Id,'result','GPS_V2',gps2Id]
 ];
 for(const [url,context,sourceType,id] of cases){
  const parsed=parseLegacyOrTypedLink(url,context);
  assert.equal(parsed.ok,true,`${url}: ${parsed.reason}`);
  assert.deepEqual(parsed.value,reference(sourceType,id));
  const encoded=encodeTypedRecordQuery(parsed.value);
  assert.equal(typeof encoded,'string');
  const again=parseLegacyOrTypedLink('#/result?'+encoded,'result');
  assert.deepEqual(again.value,parsed.value);
 }
 assert.deepEqual(parseLegacyOrTypedLink('#/exploration-tree?category=01&topic=foo','exploration'),{ok:true,value:null});
 assert.deepEqual(parseLegacyOrTypedLink('#/result','result'),{ok:true,value:null});
});

test('M1: invalid explicit references never become latest or unspecified',()=>{
 const bad=[
  ['#/result?record='+gps2Id,'result'],
  ['#/result?source=gps-v1&record=gps-v1-12345678','result'],
  ['#/result?source=gps-v2&record='+manualId,'result'],
  ['#/result?source=manual&record='+gps2Id,'result'],
  ['#/history?source=gps-v1','history'],
  ['#/result?record=','result'],
  ['#/result?gps=','result'],
  ['#/result?source=incorrect&record='+manualId,'result'],
  ['#/result?record='+manualId+'&record='+manualId,'result'],
  ['#/result?gps='+gps2Id+'&record='+manualId,'result'],
  ['#/history?gps='+gps2Id,'history'],
  ['#/result?record=%not-valid','result'],
  ['#/history?record='+manualId,'result'],
  ['#/exploration-tree?source=gps-v1&record=gps-v1-12345678','exploration']
 ];
 for(const [url,context] of bad){
  const parsed=parseLegacyOrTypedLink(url,context);
  assert.equal(parsed.ok,false,url);assert.notEqual(parsed.value,null,url);
 }
});

test('M1: read-only resolution for every real source identity',async()=>{
 for(const [kind,ref] of [['SAVED_MANUAL',reference('MANUAL',manualId)],
  ['GPS_DEVICE',reference('GPS_V2',gps2Id)]]){
  const result=await resolve(ref);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.value.sourceKind,kind);
  assert.equal(result.value.record.id,ref.recordId);
  assert.deepEqual(result.value.ref,ref);
 }
 assert.equal(savedGps2.detailSaved,false,'GPS v2 summaries without optional route details are valid');
});

test('M1: parent absent, deleted, unreadable, malformed and duplicate are separate from missing answer',async()=>{
 const ref=reference('MANUAL',manualId);
 assert.equal((await resolve(ref,{manual:{readManualRuns:()=>({ok:true,records:[]})}})).code,'NOT_FOUND');
 assert.equal((await resolve(ref,{manual:{readManualRuns:()=>({ok:false,records:[]})}})).code,'UNREADABLE_PARENT');
 assert.equal((await resolve(ref,{manual:{readManualRuns:()=>{throw Error('quota');}}})).code,'UNREADABLE_PARENT');
 assert.equal((await resolve(ref,{manual:{readManualRuns:()=>({ok:true,records:[savedManual,savedManual]})}})).code,'UNREADABLE_PARENT');
 assert.equal((await resolve(ref,{manual:{readManualRuns:()=>({ok:true,records:[{...savedManual,schema:1}]})}})).code,'UNREADABLE_PARENT');
 assert.equal((await resolve(reference('GPS_V2',gps2Id),{gpsV2:{readGpsV2Summaries:()=>({ok:false,records:[]}),validGpsV2Summary:()=>true}})).code,'UNREADABLE_PARENT');
 assert.equal((await resolve(reference('GPS_V1',gps2Id))).code,'BAD_REF');
});

test('M1: existing manual store integration actually reads a valid persisted parent',async t=>{
 let source;
 try{source=await import('../ui/manualRunStore.js');}catch(e){
  if(process.env.RUNLOAD_CI_REQUIRE_INTEGRATION==='1')throw e;
  // Standalone precommit unit run lacks the complete repo; CI must not skip.
  t.skip('requires repository manualRunStore.js for integration');return;
 }
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 const draft={date:'2026-10-25',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',courseName:'',shoeName:''};
 const saved=source.saveManualRun(storage,draft);
 assert.equal(saved.ok,true,saved.reason);
 const adapter={readManualRuns:source.readManualRuns};
 const found=await resolveRecord(reference('MANUAL',saved.record.id),{storage,manual:adapter});
 assert.equal(found.ok,true,found.reason);
 assert.equal(found.value.record.rofBefore,0);
 assert.equal(found.value.record.rofAfter,null);
 assert.equal((await resolveRecord(reference('MANUAL',manualId),{storage,manual:adapter})).code,'NOT_FOUND');
 const before=storage.getItem(source.MANUAL_RUN_KEY);
 assert.equal((await resolveRecord(reference('MANUAL',saved.record.id),{storage,manual:adapter})).ok,true);
 assert.equal(storage.getItem(source.MANUAL_RUN_KEY),before,'resolution must not mutate the manual store');
 assert.equal((await resolveRecord(reference('MANUAL',saved.record.id),{storage})).code,'UNREADABLE_PARENT',
  'legacy localStorage must not substitute for the IndexedDB authority');
});


test('M1: current GPS contract validates records without inventing route details',async()=>{
 const v2=await import('../ui/gpsReplayIndexedDbStore.js');
 const start=1700000000000;
 const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
  altitudeQuality:'missing',km,t:start+i*5000,breakBefore:i===0,activity:'RUNNING'}));
 const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,accepted:3,rejected:0,track,trackSimplified:false,
  replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),replayTrackAvailable:true,flags:[]};
 const current=v2.prepareGpsV2Run(session,{saveDetails:false,date:'2026-10-27'});
 assert.equal(current.ok,true,current.reason);
 assert.equal(current.detail,null);
 assert.equal(v2.validGpsV2Summary(current.summary),true);
 const found=await resolveRecord(reference('GPS_V2',current.summary.id),{gpsV2:{
  readGpsV2Summaries:()=>({ok:true,records:[current.summary]}),validGpsV2Summary:v2.validGpsV2Summary}});
 assert.equal(found.ok,true,found.reason);
 assert.equal(found.value.record.detailSaved,false);
});
