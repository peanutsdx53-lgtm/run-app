import test from 'node:test';
import assert from 'node:assert/strict';
import {MENTAL_CHOICES,newMentalDraft,renderMentalInput,mentalSummary,validateMentalDraft,makeMentalAppendRequest,mentalResultHtml} from '../ui/mentalExperience.js';
const manual={sourceType:'MANUAL',recordId:'run-v1-12345678-1234-1234-1234-123456789abc'};
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
const idFn=()=>ids.shift();
const time='2026-11-08T00:30:00.000Z';
test('unselected question is optional; no event or forced answer',()=>{
 const m=newMentalDraft(),html=renderMentalInput(m,'manual');
 assert.equal(mentalSummary(m),'未回答');
 assert.match(html,/気持ち・考える面の疲れ/);
 assert.match(html,/name="mental-manual"/);
 assert.equal((html.match(/type="radio"/g)||[]).length,3);
 assert.doesNotMatch(html,/type="radio"[^>]*checked/);
 assert.match(html,/500字以内/);
 assert.equal(validateMentalDraft(m).selected,false);
 assert.deepEqual(makeMentalAppendRequest(manual,m),{ok:true,request:null});
});
test('three choices do not imply a score or diagnosis',()=>{
 for(const [k,label] of Object.entries(MENTAL_CHOICES)){
  const m={...newMentalDraft(),answer:k};
  assert.equal(validateMentalDraft(m).ok,true);
  assert.equal(mentalSummary(m),label+'（本人の任意申告）');
  assert.match(renderMentalInput(m,'gps'),/data-mental-answer="gps"/);
 }
 assert.equal(validateMentalDraft({...newMentalDraft(),answer:'SCORE_5'}).ok,false);
 assert.equal(validateMentalDraft({...newMentalDraft(),answer:'FELT',freeText:'a'.repeat(501)}).ok,false);
});
test('time-basis and declared phase are distinct, retry IDs are held once',()=>{
 const m={...newMentalDraft(),answer:'FELT',declaredPhase:'BEFORE',timeBasis:'RECALLED',freeText:'走る前のことを思い出した'};
 const saved=makeMentalAppendRequest(manual,m,{uuid:idFn,now:()=>time});
 assert.equal(saved.ok,true);const q=saved.request;
 assert.deepEqual(q.recordRef,manual);assert.equal(q.fieldKey,'mentalExperience');assert.equal(q.operation,'ADD');
 assert.equal(q.declaredPhase,'BEFORE');assert.equal(q.timeBasis,'RECALLED');assert.equal(q.assessedAt,null);
 assert.equal(q.enteredAt,time);assert.equal(q.payload.answer,'FELT');assert.equal(q.payload.freeText,m.freeText);
 assert.equal(q.clientRequestId,'mental_req_00000000-0000-4000-8000-000000000001');
 assert.notEqual(q.eventId,q.clientRequestId);
 assert.equal(q.expectedRevision,0);assert.equal(q.expectedHeadEventId,null);
 const atEntry=makeMentalAppendRequest(manual,{...m,timeBasis:'AT_ENTRY'},{uuid:()=> '00000000-0000-4000-8000-000000000001',now:()=>time});
 assert.equal(atEntry.request.assessedAt,time);
});
test('XSS escaped and missing/read-error/retracted distinct; pending retry only if original committed',()=>{
 const no=mentalResultHtml({ok:true,value:{status:'NO_ANSWER'}});
 assert.match(no,/申告はありません/);assert.doesNotMatch(no,/data-mental-retry/);
 const retr=mentalResultHtml({ok:true,value:{status:'RETRACTED'}});
 assert.match(retr,/取り消されました/);
 const error=mentalResultHtml({ok:false,code:'READ_FAILED'});
 assert.match(error,/確認できません/);assert.doesNotMatch(error,/申告はありません/);
 const active=mentalResultHtml({ok:true,value:{status:'ACTIVE',latest:{payload:{answer:'FELT',freeText:'<img src=x onerror=alert(1)>'},declaredPhase:'BEFORE',timeBasis:'RECALLED',enteredAt:time}}});
 assert.match(active,/&lt;img/);assert.doesNotMatch(active,/<img/);
 const pending=mentalResultHtml({ok:true,value:{status:'NO_ANSWER'}},{pending:true,reason:'IndexedDBを利用できません'});
 assert.match(pending,/走行記録は保存できましたが/);assert.match(pending,/data-mental-retry/);
});
