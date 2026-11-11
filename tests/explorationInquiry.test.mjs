import test from 'node:test';
import assert from 'node:assert/strict';
import {FATIGUE_INQUIRY,fatigueInquiryModel,renderFatigueInquiry} from '../ui/explorationInquiry.js';
const mid='run-v1-11111111-1111-4111-8111-111111111111',gid='gps-v2-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const ref={sourceType:'MANUAL',recordId:mid},record={id:mid,schema:2,source:'manual',type:'run',rofBefore:0,rofAfter:null};
test('E1 question is not a scored lesson or causal model',()=>{
 assert.equal(FATIGUE_INQUIRY.id,'T02');assert.match(FATIGUE_INQUIRY.role,/本人/);
 const h=renderFatigueInquiry({ref,record});assert.match(h,/正解・不正解はありません/);
 assert.doesNotMatch(h,/正答率|診断結果|改善した/);
});
test('E1 manual 0 is a valid subjective answer, null remains absent',()=>{
 const m=fatigueInquiryModel({ref,record});
 assert.deepEqual([m.state,m.source,m.before,m.after,m.hasAnswer],['VERIFIED','MANUAL',0,null,true]);
 const h=renderFatigueInquiry({ref,record});
 assert.match(h,/運動前 0 ／ 運動後 未回答/);assert.match(h,/出所：本人が手入力した走行/);
 assert.match(h,/実際の評価時刻/);
});
test('E1 missing, wrong-source and deleted records cannot silently substitute data',()=>{
 assert.equal(fatigueInquiryModel().state,'NO_RECORD');
 assert.match(renderFatigueInquiry(),/走行記録を指定していません/);
 for(const x of [{ref,record:null},{ref:{sourceType:'GPS_V2',recordId:gid},record},
  {ref:{sourceType:'MANUAL',recordId:gid},record},{ref,record:{...record,schema:1}},
  {ref:null,record}]){
  assert.equal(fatigueInquiryModel(x).state,'UNVERIFIED');
  const h=renderFatigueInquiry(x);assert.match(h,/照合できません/);assert.doesNotMatch(h,/運動前 0/);
 }
});
test('E1 current GPS only shows explicit voluntary fatigue answers',()=>{
 const gps={ref:{sourceType:'GPS_V2',recordId:gid},record:{id:gid,schema:2,activeSeconds:1800,finalReference:{},experience:{rofBefore:2,rofAfter:0}}};
 const m=fatigueInquiryModel(gps);assert.equal(m.state,'VERIFIED');assert.deepEqual([m.before,m.after],[2,0]);
 const h=renderFatigueInquiry(gps);assert.match(h,/運動前 2 ／ 運動後 0/);assert.match(h,/GPSの保存記録/);
 assert.doesNotMatch(h,/疲れが改善した|原因は走ったこと/);
});

test('E1 inquiry-to-optional-memo works only with no record or verified manual parent',()=>{
 const any=renderFatigueInquiry({},{allowLegacyMemo:true});
 const bound=renderFatigueInquiry({ref,record},{allowLegacyMemo:true});
 for(const h of [any,bound])assert.match(h,/data-ex-action="note"/);
 assert.doesNotMatch(renderFatigueInquiry({ref,record:null},{allowLegacyMemo:true}),/data-ex-action="note"/);
 const gps={ref:{sourceType:'GPS_V2',recordId:gid},
  record:{id:gid,schema:2,activeSeconds:100,finalReference:{},experience:{rofBefore:0}}};
 assert.doesNotMatch(renderFatigueInquiry(gps,{allowLegacyMemo:true}),/data-ex-action="note"/);
 assert.doesNotMatch(renderFatigueInquiry({ref,record},{allowLegacyMemo:false}),/data-ex-action="note"/);
});
