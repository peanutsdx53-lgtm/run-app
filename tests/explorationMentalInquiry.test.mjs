import test from 'node:test';
import assert from 'node:assert/strict';
import {MENTAL_INQUIRY,mentalInquiryModel,renderMentalInquiry} from '../ui/explorationMentalInquiry.js';
const id='run-v1-11111111-1111-4111-8111-111111111111';
const ref={sourceType:'MANUAL',recordId:id};
const record={id,schema:2,source:'manual',type:'run',rofBefore:0,rofAfter:null};
const good=(answer='UNSURE',op='ADD')=>({ok:true,value:{status:'ACTIVE',
 provenance:'POST_HOC_SELF_REPORT',latest:{recordRef:ref,fieldKey:'mentalExperience',
 operation:op,payload:{answer,freeText:'PRIVATE-MENTAL-NOT-TO-BE-DISPLAYED'},
 declaredPhase:'DURING',timeBasis:'RECALLED'}}});
test('E3 non-scored inquiry is independent of M4 input and ROF-J',()=>{
 assert.equal(MENTAL_INQUIRY.id,'T03');
 assert.equal(mentalInquiryModel({ref,record}).status,'NOT_REQUESTED');
 const h=renderMentalInquiry({ref,record});
 assert.match(h,/本人が選んだときだけ/);
 assert.match(h,/data-e-mental-reveal/);
 assert.doesNotMatch(h,/PRIVATE-MENTAL|感じた（本人|2 \/ 10|正答率/);
});
test('E3 active 3-way response and post-hoc basis, without private free text',()=>{
 for(const answer of ['FELT','NOT_FELT','UNSURE']){
  const state=mentalInquiryModel({ref,record,read:good(answer)});
  assert.deepEqual([state.status,state.answer,state.phase,state.basis],
   ['ACTIVE',answer,'DURING','RECALLED']);
  const h=renderMentalInquiry({ref,record,read:good(answer)});
  assert.match(h,/data-e-state="ACTIVE"/);assert.match(h,/本人の任意申告/);
  assert.match(h,/走っている間/);assert.match(h,/過去を思い出して申告/);
  assert.match(h,/ROF-Jと合算せず/);assert.match(h,/#\/annotation\?source=manual/);
  assert.doesNotMatch(h,/PRIVATE-MENTAL-NOT-TO-BE-DISPLAYED|data-ex-action="note"|data-e-mental-reveal/);
 }
});
test('E3 unanswered, withdrawn, unreadable and orphan cases never substitute',()=>{
 for(const [input,status,re] of [
  [{ref,record,read:{ok:true,value:{status:'NO_ANSWER'}}},'NO_ANSWER',/未回答/],
  [{ref,record,read:{ok:true,value:{status:'RETRACTED',latest:good().value.latest}}},'RETRACTED',/撤回済み/],
  [{ref,record,read:{ok:false,code:'READ_FAILED'}},'READ_ERROR',/未回答だとは扱いません/],
  [{ref,record,read:{ok:true,value:{status:'ORPHANED'}}},'UNVERIFIED',/元の走行記録を確認/],
  [{ref,record,read:good('invalid')},'READ_ERROR',/未回答だとは扱いません/],
  [{ref,record,read:good('FELT','RETRACT')},'READ_ERROR',/未回答だとは扱いません/],
  [{ref:{sourceType:'MANUAL',recordId:'run-v1-99999999-9999-4999-8999-999999999999'},record,read:good()},'UNVERIFIED',/元の走行記録を照合/],
 ]){
  const m=mentalInquiryModel(input);assert.equal(m.status,status);
  const h=renderMentalInquiry(input);assert.match(h,re);
  assert.doesNotMatch(h,/PRIVATE-MENTAL-NOT-TO-BE-DISPLAYED|感じた（尺度|回答値：FELT/);
 }
 assert.equal(mentalInquiryModel().status,'NO_RECORD');
});
test('E3 no automatic reads, private note or parent writes by model',()=>{
 const before=JSON.stringify({ref,record,read:good()});
 renderMentalInquiry({ref,record,read:good()});
 const after=JSON.stringify({ref,record,read:good()});
 assert.equal(after,before);
 assert.equal(mentalInquiryModel({ref,record:null,read:good()}).status,'UNVERIFIED');
});
