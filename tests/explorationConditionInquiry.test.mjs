import test from 'node:test';
import assert from 'node:assert/strict';
import {CONDITION_INQUIRY,CONDITION_FIELDS,conditionInquiryModel,renderConditionInquiry} from '../ui/explorationConditionInquiry.js';
const id='run-v1-11111111-1111-4111-8111-111111111111';
const ref={sourceType:'MANUAL',recordId:id};
const record={id,source:'manual',type:'run',schema:2,rofBefore:0,rofAfter:null,draft:{
 courseName:'河川敷',gradeMode:'FLAT',surfaceMode:'SINGLE',primarySurface:'paved',
 temperatureC:'0',environmentNote:'天候：雨\n風が少し強かった'
}};
const data={
 courseName:{text:'後から思い出した道'},
 gradeBundle:{gradeMode:'SUMMARY',upPercent:15,downPercent:10},
 surfaceBundle:{surfaceMode:'SINGLE',primarySurface:'paved'},
 temperatureC:{celsius:0},
 environmentNote:{text:'後日に思い出した雨のような天気'}
};
const answered=(r,f,p=data[f])=>({ok:true,value:{status:'ACTIVE',provenance:'POST_HOC_SELF_REPORT',
 latest:{recordRef:r,fieldKey:f,operation:'ADD',payload:p,declaredPhase:'DURING',timeBasis:'RECALLED'}}});
const none={ok:true,value:{status:'NO_ANSWER'}};
const reads=r=>Object.fromEntries(CONDITION_FIELDS.map(x=>[x.field,answered(r,x.field)]));
test('E5 inquiry distinct from old general course/weather guides and input forms',()=>{
 assert.deepEqual(CONDITION_FIELDS.map(x=>x.field),['courseName','gradeBundle','surfaceBundle','temperatureC','environmentNote']);
 assert.equal(CONDITION_INQUIRY.topic,'気温・天候');
 assert.equal(conditionInquiryModel({ref,record}).status,'NOT_REQUESTED');
 const h=renderConditionInquiry({ref,record});
 assert.match(h,/本人が確認を選ぶまで/);
 assert.match(h,/data-e-condition-reveal/);
 assert.doesNotMatch(h,/河川敷|天候：雨|data-ex-action="note"|後から思い出した道/);
});
test('E5 0 Celsius is a user input, not missing or instrument measurement; provenance of five fields',()=>{
 const m=conditionInquiryModel({ref,record,reads:reads(ref)});
 assert.equal(m.status,'READY');
 assert.equal(m.rows.length,5);
 const h=renderConditionInquiry({ref,record,reads:reads(ref)});
 assert.match(h,/元の手入力記録：0 ℃（本人入力）/);
 assert.match(h,/後日追記（本人申告）：0 ℃/);
 assert.match(h,/天候：雨/);
 assert.match(h,/走っている間/);
 assert.match(h,/過去を思い出して申告/);
 assert.match(h,/気象観測値ではありません/);
 assert.match(h,/記録に結びつけず「路面」/);
 assert.doesNotMatch(h,/自動照合で得た天気|負荷が高い|data-ex-action="note"/);
});
test('E5 missing vs withdrawn vs current GPS measurement provenance',()=>{
 const missing=Object.fromEntries(CONDITION_FIELDS.map(x=>[x.field,none]));
 const h=renderConditionInquiry({ref,record,reads:missing});
 assert.match(h,/後日の追記は未回答です/);
 assert.match(h,/元の手入力記録：記録時：河川敷/);
 const withdrawn={...reads(ref),environmentNote:{ok:true,value:{status:'RETRACTED',latest:{
  recordRef:ref,fieldKey:'environmentNote',operation:'RETRACT',payload:null}}}};
 const w=renderConditionInquiry({ref,record,reads:withdrawn});
 assert.match(w,/後日の追記は撤回済み/);
 assert.doesNotMatch(w,/後日に思い出した雨のような天気/);
 const gpsId='gps-v2-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const gpsRef={sourceType:'GPS_V2',recordId:gpsId};
 const gpsRecord={id:gpsId,schema:2,activeSeconds:600,finalReference:{}};
 const out=renderConditionInquiry({ref:gpsRef,record:gpsRecord,reads:reads(gpsRef)});
 assert.match(out,/GPSの位置情報から坂道・路面・気温・天候を推定しません/);
 assert.match(out,/元のGPS記録：該当する本人申告欄なし/);
 assert.doesNotMatch(out,/河川敷/);
});
test('E5 all-five atomic fail-closed on malformed, mixed-origin, orphan, or read error',()=>{
 const valid=reads(ref);
 for(const [bad,status] of [
  [{courseName:{ok:false,code:'READ_FAILED'}},'READ_ERROR'],
  [{gradeBundle:{ok:true,value:{status:'ORPHANED'}}},'UNVERIFIED'],
  [{surfaceBundle:answered({sourceType:'GPS_V2',recordId:'gps-v2-12345678'},'surfaceBundle')},'READ_ERROR'],
  [{temperatureC:answered(ref,'temperatureC',{celsius:88})},'READ_ERROR'],
  [{environmentNote:answered(ref,'environmentNote',{text:'<img onerror=x>'})},'READY']
 ]){
  const input={ref,record,reads:{...valid,...bad}};
  const m=conditionInquiryModel(input);
  assert.equal(m.status,status);
  const h=renderConditionInquiry(input);
  if(status!=='READY')assert.doesNotMatch(h,/河川敷|天候：雨|後から思い出した道/);
  else{assert.match(h,/&lt;img onerror=x&gt;/);assert.doesNotMatch(h,/<img onerror=x>/);}
 }
 assert.equal(conditionInquiryModel().status,'NO_RECORD');
 assert.equal(conditionInquiryModel({ref,record:null,reads:valid}).status,'UNVERIFIED');
 assert.equal(conditionInquiryModel({ref:{sourceType:'GPS_V2',recordId:'gps-v2-abcdefgh'},record,reads:valid}).status,'UNVERIFIED');
 assert.equal(conditionInquiryModel({ref,record,reads:{courseName:none}}).status,'READ_ERROR');
});
test('E5 original run, GPS track and M5 note objects never mutate',()=>{
 const r=reads(ref),input={ref,record,reads:r},before=JSON.stringify(input);
 renderConditionInquiry(input);
 assert.equal(JSON.stringify(input),before);
 assert.doesNotMatch(renderConditionInquiry({ref,record,reads:r}),/latitude|longitude|coordinates/);
});
