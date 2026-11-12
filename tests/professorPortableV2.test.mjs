import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {inspectAnnotationBundle,inspectAnnotationBundleShape,planAnnotationMerge,
 ANNOTATION_BACKUP_FORMAT,ANNOTATION_BACKUP_VERSION} from '../ui/annotationBackup.js';
import {digestAnnotationInput,recordKeyOf,streamKeyOf} from '../ui/annotationSchema.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const REF={sourceType:'MANUAL',recordId:'run-v1-11111111-1111-4111-8111-111111111111'};
const TS='2026-11-08T02:00:00.000Z';
const root=events=>({key:'root',schemaVersion:1,storeRevision:events.length,eventCount:events.length,
 totalBytes:events.reduce((s,e)=>s+new TextEncoder().encode(JSON.stringify(e)).length,0)});
const bundle=events=>({format:ANNOTATION_BACKUP_FORMAT,version:ANNOTATION_BACKUP_VERSION,events,
 heads:events.length?[{streamKey:streamKeyOf(REF,'mentalExperience'),headEventId:events.at(-1).eventId,
  sequence:events.length,revision:events.length}]:[],meta:root(events)});
async function event(n,{prev=null,op='ADD',answer='UNSURE'}={}){
 const input={recordRef:REF,fieldKey:'mentalExperience',operation:op,payload:op==='RETRACT'?null:{answer},
 expectedHeadEventId:prev,expectedRevision:n-1,clientRequestId:`m3-request-${n}00000`,eventId:`m3-event-${n}000000`,
 declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:TS};
 return {schemaVersion:1,eventId:input.eventId,clientRequestId:input.clientRequestId,
  requestDigest:await digestAnnotationInput(input),recordRef:REF,recordKey:recordKeyOf(REF),
  streamKey:streamKeyOf(REF,'mentalExperience'),fieldKey:'mentalExperience',threadId:'primary',
  operation:op,predecessorEventId:prev,sequence:n,payload:input.payload,
  declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:TS,savedAt:TS,dictionaryVersion:1};
}
test('M3 pure: valid snapshot and one-field idempotence',async()=>{
 const a=await event(1),b=await event(2,{prev:a.eventId,op:'CORRECT',answer:'FELT'});
 assert.equal((await inspectAnnotationBundle(bundle([a,b]))).ok,true);
 assert.equal(inspectAnnotationBundleShape(bundle([a,b])).ok,true);
 const merge=planAnnotationMerge(bundle([a]),bundle([a,b]));
 assert.equal(merge.ok,true);assert.equal(merge.value.added,1);
 assert.equal((await inspectAnnotationBundle(merge.value.bundle)).ok,true);
 assert.equal(planAnnotationMerge(bundle([a,b]),bundle([a,b])).value.added,0);
});
test('M3 pure: invalid version and missing metadata fail closed',async()=>{
 const a=await event(1),good=bundle([a]);
 assert.equal(inspectAnnotationBundleShape({...good,version:2}).ok,false);
 assert.equal(inspectAnnotationBundleShape({...good,meta:{...good.meta,totalBytes:0}}).ok,false);
 assert.equal(inspectAnnotationBundleShape({...good,events:[a,a]}).ok,false);
 assert.equal(inspectAnnotationBundleShape({...good,unknown:true}).ok,false);
});
test('M3 pure: tampered choice, broken chain and conflicting prefixes refuse import',async()=>{
 const a=await event(1),b=await event(2,{prev:a.eventId,op:'CORRECT',answer:'FELT'});
 const changed={...a,payload:{answer:'NOT_FELT'}};
 assert.equal((await inspectAnnotationBundle(bundle([changed]))).code,'BAD_EVENT');
 const broken={...b,predecessorEventId:'m3-event-missing00'};
 assert.equal((await inspectAnnotationBundle(bundle([a,broken]))).ok,false);
 const alternate=await event(1,{answer:'FELT'});
 assert.equal(planAnnotationMerge(bundle([a]),bundle([alternate])).code,'REQUEST_CONFLICT');
});
test('M3 pure: ROF and source types remain independent of event restoration',async()=>{
 const a=await event(1);
 assert.equal(a.recordRef.sourceType,'MANUAL');
 assert.equal(a.payload.answer,'UNSURE');
 assert.equal(a.timeBasis,'UNKNOWN');
 assert.equal((await inspectAnnotationBundle(bundle([a]))).ok,true);
});

test('new annotation backups use neutral format and strict validation accepts authentic old exports',async()=>{
 const current=bundle([await event(1)]);
 assert.equal(ANNOTATION_BACKUP_FORMAT,'running-annotation-backup-v1');
 assert.doesNotMatch(JSON.stringify(current),/runload/i,'newly produced annotation JSON must not show the old brand');
 const legacy={...current,format:'runload-v2-annotation-backup'};
 assert.equal(inspectAnnotationBundleShape(legacy).ok,true);
 assert.equal((await inspectAnnotationBundle(legacy)).ok,true,'old signed events stay verifiable');
 assert.equal(inspectAnnotationBundleShape({...current,format:'unsupported-format'}).ok,false);
 assert.equal(inspectAnnotationBundleShape({...legacy,version:2}).ok,false);
 const corrupt={...legacy,events:[{...current.events[0],payload:{answer:'FELT'}}]};
 assert.equal((await inspectAnnotationBundle(corrupt)).ok,false,'legacy header never bypasses signed event verification');
});
