import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_INQUIRY,bodyInquiryModel,renderBodyInquiry} from '../ui/explorationBodyInquiry.js';
const id='run-v1-11111111-1111-4111-8111-111111111111';
const ref={sourceType:'MANUAL',recordId:id};
const original='元の身体記述：右膝周囲に気づいた、原因は未確認';
const record={id,source:'manual',schema:2,type:'run',draft:{bodyObservation:original}};
const read=(text='後日記述：足首の違和感を思い出した',source=ref,status='ACTIVE')=>({
 ok:true,value:{status,provenance:'POST_HOC_SELF_REPORT',
 latest:{recordRef:source,fieldKey:'bodyObservation',operation:'ADD',
  payload:{text},declaredPhase:'AFTER',timeBasis:'RECALLED',
  enteredAt:'2026-11-08T01:00:00.000Z'}}});
test('E4 is a lived-experience inquiry, not M5 editor, general guide or medical reference',()=>{
 assert.equal(BODY_INQUIRY.id,'T04');
 assert.equal(BODY_INQUIRY.category,'04');
 const initial=renderBodyInquiry({ref,record});
 assert.match(initial,/data-e-state="NOT_REQUESTED"/);
 assert.match(initial,/data-e-body-reveal/);
 assert.doesNotMatch(initial,/右膝周囲|足首の違和感|data-ex-action="note"/);
 assert.match(initial,/本人が明示的に選ぶまで/);
});
test('E4 manual original and posthoc remain separate with phase provenance',()=>{
 const h=renderBodyInquiry({ref,record,read:read()});
 assert.match(h,/元の手入力走行の本人記述/);
 assert.match(h,/右膝周囲/);
 assert.match(h,/別に保存した本人の後日追記/);
 assert.match(h,/足首の違和感/);
 assert.match(h,/走った後/);
 assert.match(h,/過去を思い出して申告/);
 assert.match(h,/実際の発生時刻や入力時点との順序は証明できません/);
 assert.match(h,/文献の12部位参考値/);
 assert.match(h,/#\/annotation\?source=manual/);
 assert.doesNotMatch(h,/data-e-body-reveal|data-ex-action="note"|原因は走行負荷/);
});
test('E4 current GPS cannot manufacture original physical observations',()=>{
 const id='gps-v2-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const gpsRef={sourceType:'GPS_V2',recordId:id};
 const gpsRecord={id,schema:2,activeSeconds:500,finalReference:{}};
 const h=renderBodyInquiry({ref:gpsRef,record:gpsRecord,read:read('思い出した違和感',gpsRef)});
 assert.match(h,/元のGPS記録には、独立した身体観察の申告欄がありません/);
 assert.match(h,/思い出した違和感/);
 assert.doesNotMatch(h,/元の手入力走行|本人の組織負荷が高い/);
});
test('E4 withdrawn stays hidden; original remains its own record, no-answer is not negative',()=>{
 const withdrawn=renderBodyInquiry({ref,record,read:{ok:true,value:{status:'RETRACTED',latest:read().value.latest}}});
 assert.match(withdrawn,/撤回した追記の文章は表示しません/);
 assert.match(withdrawn,/右膝周囲/);
 assert.doesNotMatch(withdrawn,/後日記述：足首の違和感/);
 const none=renderBodyInquiry({ref,record,read:{ok:true,value:{status:'NO_ANSWER'}}});
 assert.match(none,/元の手入力走行/);
 assert.match(none,/異常なし.*申告した意味ではありません/);
 assert.doesNotMatch(none,/後日記述：足首の違和感/);
});
test('E4 invalid refs, orphan, corrupt source and read failures fail closed',()=>{
 assert.equal(bodyInquiryModel().status,'NO_RECORD');
 for(const [q,status] of [
  [{ref,record:null,read:read()},'UNVERIFIED'],
  [{ref:{sourceType:'MANUAL',recordId:'run-v1-99999999-9999-4999-8999-999999999999'},record,read:read()},'UNVERIFIED'],
  [{ref,record,read:{ok:false,code:'READ_FAILED'}},'READ_ERROR'],
  [{ref,record,read:{ok:true,value:{status:'ORPHANED'}}},'UNVERIFIED'],
  [{ref,record,read:read('<script>bad</script>',{sourceType:'GPS_V2',recordId:'gps-v2-12345678'})},'READ_ERROR'],
  [{ref,record,read:read('',ref)},'READ_ERROR'],
  [{ref,record,read:read('changed',ref,'INVALID')},'READ_ERROR']
 ]){
  const m=bodyInquiryModel(q);assert.equal(m.status,status);
  const h=renderBodyInquiry(q);
  assert.doesNotMatch(h,/右膝周囲|足首の違和感|<script>/);
  assert.doesNotMatch(h,/data-ex-action="note"/);
 }
});
test('E4 HTML escaping for the explicitly revealed private text; no side effects',()=>{
 const raw='<img src=x onerror=alert(1)>';
 const data={ref,record,read:read(raw)};
 const before=JSON.stringify(data);
 const h=renderBodyInquiry(data);
 assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(h,/<img src=x/);
 assert.equal(JSON.stringify(data),before);
});
