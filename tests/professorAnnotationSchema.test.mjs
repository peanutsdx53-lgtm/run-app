import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAnnotationPayload,validateAppendRequest,validateAnnotationEvent,digestAnnotationInput,
 stableJSONStringify,recordKeyOf,streamKeyOf} from '../ui/annotationSchema.js';
const mid='run-v1-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const refs={MANUAL:{sourceType:'MANUAL',recordId:mid},GPS_V2:{sourceType:'GPS_V2',recordId:'gps-v2-abcdefgh'}};
const instant='2026-11-08T01:00:00.000Z';
const request=(fieldKey='mentalExperience',payload={answer:'FELT'},sourceType='MANUAL')=>({recordRef:refs[sourceType],fieldKey,operation:'ADD',payload,
 expectedHeadEventId:null,expectedRevision:0,clientRequestId:'request-00000001',eventId:'event-00000001',declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',assessedAt:null,enteredAt:instant});
const valid=(field,payload,source='MANUAL',record)=>validateAnnotationPayload(field,payload,{ref:refs[source],record}).ok;
test('M2 identities and event streams are unambiguous across manual / GPS',()=>{
 assert.equal(recordKeyOf(refs.MANUAL),'MANUAL:'+mid);
 assert.notEqual(streamKeyOf(refs.MANUAL,'memo'),streamKeyOf(refs.GPS_V2,'memo'));
 assert.notEqual(streamKeyOf(refs.GPS_V2,'memo'),streamKeyOf(refs.GPS_V2,'mentalExperience'));
});
test('mental experience is a voluntary three-choice non-scale, not a ROF value',()=>{
 for(const answer of ['FELT','NOT_FELT','UNSURE'])assert.equal(valid('mentalExperience',{answer}),true);
 for(const answer of ['',null,0,'BEFORE','HAPPY','NOT_ANSWERED'])assert.equal(valid('mentalExperience',{answer}),false);
 assert.equal(valid('mentalExperience',{answer:'FELT',freeText:'a'.repeat(500)}),true);
 assert.equal(valid('mentalExperience',{answer:'FELT',freeText:'a'.repeat(501)}),false);
 assert.equal(valid('mentalExperience',{answer:'FELT',score:10}),false);
 assert.equal(valid('mentalExperience',null),false,'missing response creates no event');
});
test('text fields, temperature and GPS ROF distinguish zero from null',()=>{
 for(const field of ['memo','bodyObservation','environmentNote']){
  assert.equal(valid(field,{text:'自由記述'}),true);assert.equal(valid(field,{text:''}),false);
  assert.equal(valid(field,{text:'x'.repeat(501)}),false);
 }
 assert.equal(valid('shoeName',{text:'x'.repeat(100)}),true);
 assert.equal(valid('shoeName',{text:'x'.repeat(101)}),false);
 assert.equal(valid('temperatureC',{celsius:-50}),true);
 assert.equal(valid('temperatureC',{celsius:61}),false);
 assert.equal(valid('temperatureC',{celsius:NaN}),false);
 assert.equal(valid('rofBefore',{score:0},'GPS_V2'),true);
 assert.equal(valid('rofBefore',{score:null},'GPS_V2'),false);
 assert.equal(valid('rofAfter',{score:0},'MANUAL'),false);
});
test('post-hoc steps preserve 0 and require explicit provenance',()=>{
 assert.equal(valid('stepsBundle',{steps:0,stepsProvenance:'UNKNOWN'}),true);
 assert.equal(valid('stepsBundle',{steps:1234,stepsProvenance:'ESTIMATED'}),true);
 assert.equal(valid('stepsBundle',{steps:1.5,stepsProvenance:'ESTIMATED'}),false);
 assert.equal(valid('stepsBundle',{steps:null,stepsProvenance:'UNKNOWN'}),false);
 assert.equal(valid('stepsBundle',{steps:20,stepsProvenance:'MADE_UP'}),false);
});
test('complete grade bundle: summary, sections, boundaries and unknown keys',()=>{
 assert.equal(valid('gradeBundle',{gradeMode:'FLAT'}),true);
 assert.equal(valid('gradeBundle',{gradeMode:'FLAT',upPercent:99}),false);
 assert.equal(valid('gradeBundle',{gradeMode:'SUMMARY',upPercent:0,downPercent:0}),true);
 assert.equal(valid('gradeBundle',{gradeMode:'SUMMARY',upPercent:70,downPercent:31}),false);
 assert.equal(valid('gradeBundle',{gradeMode:'SUMMARY',upPercent:10}),false);
 assert.equal(valid('gradeBundle',{gradeMode:'SUMMARY',upPercent:10,downPercent:20,rawScientificValue:100}),false);
 assert.equal(valid('gradeBundle',{gradeMode:'SECTIONS',sections:[{sharePercent:40,direction:'UPHILL'},{sharePercent:60,direction:'DOWNHILL',surface:'paved'}]}),true);
 assert.equal(valid('gradeBundle',{gradeMode:'SECTIONS',sections:[{sharePercent:40,direction:'UPHILL'},{sharePercent:59,direction:'DOWNHILL'}]}),false);
 assert.equal(valid('gradeBundle',{gradeMode:'SECTIONS',sections:[{sharePercent:100,direction:'INJURY'}]}),false);
});
test('surface bundle must be complete with exact allowable surface names',()=>{
 assert.equal(valid('surfaceBundle',{surfaceMode:'SINGLE',primarySurface:'track'}),true);
 assert.equal(valid('surfaceBundle',{surfaceMode:'MIXED',shares:{paved:50,soil:50}}),true);
 assert.equal(valid('surfaceBundle',{surfaceMode:'MIXED',shares:{paved:0,soil:100}}),false);
 assert.equal(valid('surfaceBundle',{surfaceMode:'MIXED',shares:{paved:49,soil:50}}),false);
 assert.equal(valid('surfaceBundle',{surfaceMode:'MIXED',shares:{paved:50,glass:50}}),false);
 assert.equal(valid('surfaceBundle',{surfaceMode:'SINGLE',primarySurface:'track',shares:{track:100}}),false);
});
test('run-walk post-hoc data must be strictly below original measured totals',()=>{
 const field='runWalkBundle',record={distanceKm:5,durationSeconds:1800};
 const payload={runningFormat:'RUN_WALK',runWalkRunningDistanceKm:3,runWalkRunningDurationMinutes:20};
 assert.equal(valid(field,payload,'MANUAL',record),true);
 assert.equal(valid(field,{...payload,runWalkRunningDistanceKm:5},'MANUAL',record),false);
 assert.equal(valid(field,{...payload,runWalkRunningDurationMinutes:30},'MANUAL',record),false);
 assert.equal(valid(field,{...payload,runWalkRunningDistanceKm:null},'MANUAL',record),false);
 assert.equal(valid(field,{runningFormat:'CONTINUOUS_RUN'},'GPS_V2',record),true);
});
test('append contract rejects missing, unknown, edited core and invalid time basis',()=>{
 assert.equal(validateAppendRequest(request()).ok,true);
 const original=request();assert.equal(validateAppendRequest({...original,recordRef:{sourceType:'MANUAL',recordId:'gps-v2-abcdefgh'}}).ok,false);
 assert.equal(validateAppendRequest({...original,operation:'NEW_THOUGHT'}).ok,false);
 assert.equal(validateAppendRequest({...original,fieldKey:'distance',payload:{km:1}}).ok,false);
 assert.equal(validateAppendRequest({...original,enteredAt:'2026-11-08'}).ok,false);
 assert.equal(validateAppendRequest({...original,timeBasis:'AT_ENTRY',assessedAt:null}).ok,false);
 assert.equal(validateAppendRequest({...original,timeBasis:'AT_ENTRY',assessedAt:instant}).ok,true);
 assert.equal(validateAppendRequest({...original,timeBasis:'RECALLED',assessedAt:instant}).ok,false);
 assert.equal(validateAppendRequest({...original,timeBasis:'UNKNOWN',assessedAt:instant}).ok,false);
 assert.equal(validateAppendRequest({...original,unknownKey:1}).ok,false);
 assert.equal(validateAppendRequest({...original,operation:'RETRACT',payload:null}).ok,true);
 assert.equal(validateAppendRequest({...original,operation:'RETRACT',payload:{answer:'FELT'}}).ok,false);
});
test('immutable digest is stable under key order, but detects semantic changes',async()=>{
 const a=request(),b={...a,payload:{freeText:'note',answer:'FELT'}};
 const c={...a,payload:{answer:'FELT',freeText:'note'}};
 assert.equal(await digestAnnotationInput(b),await digestAnnotationInput(c));
 assert.notEqual(await digestAnnotationInput(a),await digestAnnotationInput(c));
 assert.equal(stableJSONStringify({b:1,a:{z:1,y:2}}),stableJSONStringify({a:{y:2,z:1},b:1}));
});
test('strict event protects dictionary, chain identity and payload',async()=>{
 const req=request(),digest=await digestAnnotationInput(req);
 const event={schemaVersion:1,eventId:req.eventId,clientRequestId:req.clientRequestId,requestDigest:digest,
  recordRef:req.recordRef,recordKey:recordKeyOf(req.recordRef),streamKey:streamKeyOf(req.recordRef,req.fieldKey),
  fieldKey:req.fieldKey,threadId:'primary',operation:'ADD',predecessorEventId:null,sequence:1,payload:req.payload,
  declaredPhase:req.declaredPhase,timeBasis:req.timeBasis,assessedAt:req.assessedAt,enteredAt:req.enteredAt,
  savedAt:instant,dictionaryVersion:1};
 assert.equal(validateAnnotationEvent(event).ok,true);
 assert.equal(validateAnnotationEvent({...event,dictionaryVersion:2}).ok,false);
 assert.equal(validateAnnotationEvent({...event,recordKey:'GPS_V2:'+mid}).ok,false);
 assert.equal(validateAnnotationEvent({...event,source:'GPS'}).ok,false);
 assert.equal(validateAnnotationEvent({...event,payload:{answer:'NONE'}}).ok,false);
});

test('M7 T-074: future schema, unknown fields, NaN and inconsistent ISO time are rejected without coercion',async()=>{
 const original=request('temperatureC',{celsius:18.5}),digest=await digestAnnotationInput(original);
 const event={schemaVersion:1,eventId:original.eventId,clientRequestId:original.clientRequestId,requestDigest:digest,
  recordRef:original.recordRef,recordKey:recordKeyOf(original.recordRef),streamKey:streamKeyOf(original.recordRef,original.fieldKey),
  fieldKey:original.fieldKey,threadId:'primary',operation:'ADD',predecessorEventId:null,sequence:1,
  payload:original.payload,declaredPhase:original.declaredPhase,timeBasis:original.timeBasis,
  assessedAt:original.assessedAt,enteredAt:original.enteredAt,savedAt:instant,dictionaryVersion:1};
 assert.equal(validateAnnotationEvent(event).ok,true,'valid baseline before fault injection');
 const invalid=[
  [{...event,schemaVersion:2},'BAD_EVENT'],
  [{...event,dictionaryVersion:2},'BAD_EVENT'],
  [{...event,payload:{celsius:NaN}},'BAD_VALUE'],
  [{...event,payload:{celsius:Infinity}},'BAD_VALUE'],
  [{...event,payload:{celsius:18.5,unexpectedField:true}},'BAD_VALUE'],
  [{...event,timeBasis:'AT_ENTRY',assessedAt:'2026-11-08T00:59:59.000Z'},'BAD_EVENT'],
  [{...event,enteredAt:'2026-11-08T25:00:00.000Z'},'BAD_EVENT'],
  [{...event,assessedAt:'2026-11-08T01:00:00.000Z',timeBasis:'RECALLED'},'BAD_EVENT']
 ];
 for(const [corrupt,code] of invalid)assert.equal(validateAnnotationEvent(corrupt).code,code);
 assert.equal(validateAppendRequest({...original,payload:{celsius:NaN}}).code,'BAD_VALUE');
 assert.equal(validateAppendRequest({...original,timeBasis:'AT_ENTRY',assessedAt:'2026-11-08T01:01:00.000Z'}).code,'BAD_EVENT');
 assert.equal(validateAppendRequest({...original,enteredAt:'2026-11-08T25:00:00.000Z'}).code,'BAD_EVENT');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-074',status:'PASS',invalidInputs:invalid.length+3}));
});
test('M7 T-077: exact mixed surface 60+30 and grade sections 40+30 reject the whole group without inference',()=>{
 const before={distanceKm:6,durationSeconds:1980,memo:'original untouched'},unchanged=JSON.stringify(before);
 const wrongSurface={surfaceMode:'MIXED',shares:{paved:60,track:30}};
 const wrongGrade={gradeMode:'SECTIONS',sections:[{sharePercent:40,direction:'UPHILL'},{sharePercent:30,direction:'DOWNHILL'}]};
 assert.equal(validateAnnotationPayload('surfaceBundle',wrongSurface,{ref:refs.MANUAL,record:before}).code,'BAD_VALUE');
 assert.equal(validateAnnotationPayload('gradeBundle',wrongGrade,{ref:refs.MANUAL,record:before}).code,'BAD_VALUE');
 assert.equal(validateAppendRequest(request('surfaceBundle',wrongSurface)).code,'BAD_VALUE');
 assert.equal(validateAppendRequest(request('gradeBundle',wrongGrade)).code,'BAD_VALUE');
 assert.equal(JSON.stringify(before),unchanged,'neither rejected group edits the original');
 assert.deepEqual(wrongSurface.shares,{paved:60,track:30},'no silent normalization to 100%');
 assert.deepEqual(wrongGrade.sections.map(x=>x.sharePercent),[40,30],'no silent grade completion');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-077',status:'PASS',surfaceTotal:90,gradeTotal:70}));
});
test('M7 T-078: GPS MIXED original cannot be edited as MANUAL run-walk bundle',()=>{
 const GPS={id:refs.GPS_V2.recordId,activity:'MIXED',distanceKm:5,activeSeconds:1800};
 const MANUAL={id:refs.MANUAL.recordId,source:'manual',type:'run',runningFormat:'RUN_WALK',distanceKm:5,durationSeconds:1800};
 const p={runningFormat:'RUN_WALK',runWalkRunningDistanceKm:3,runWalkRunningDurationMinutes:20};
 const saved=JSON.stringify(GPS);
 assert.equal(validateAnnotationPayload('runWalkBundle',p,{ref:refs.GPS_V2,record:GPS}).code,'BAD_VALUE');
 assert.equal(validateAppendRequest(request('runWalkBundle',p,'GPS_V2'),{record:GPS}).code,'BAD_VALUE');
 assert.equal(validateAnnotationPayload('runWalkBundle',p,{ref:refs.MANUAL,record:MANUAL}).ok,true);
 assert.equal(validateAnnotationPayload('runWalkBundle',{...p,runWalkRunningDistanceKm:5},{ref:refs.MANUAL,record:MANUAL}).code,'BAD_VALUE');
 assert.equal(JSON.stringify(GPS),saved,'GPS source identity and measured totals not altered');
 console.log(JSON.stringify({gate:'M7-exact-counterexample',caseId:'T-078',status:'PASS',sources:['GPS_V2_MIXED','MANUAL_RUN_WALK']}));
});

console.log('M2 schema tests: exact payloads and non-measurement boundaries');
