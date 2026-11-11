import test from 'node:test';
import assert from 'node:assert/strict';
import {LIFE_INQUIRY,lifeInquiryModel,renderLifeInquiry} from '../ui/explorationLifeInquiry.js';
const id='run-v1-11111111-1111-4111-8111-111111111111';
const ref={sourceType:'MANUAL',recordId:id};
const record={id,source:'manual',type:'run',schema:2,date:'2026-11-08',rofBefore:0,rofAfter:0};
const life=(date='2026-11-08',sleepSource='duration',sleepMinutes=450)=>({canSave:true,entries:[
 {date,sleepSource,sleepMinutes,feeling:'良い',memo:'PRIVATE-LIFE-ANSWER'}
]});
const rests={ok:true,records:[{id:'rest-v1-2026-11-08',source:'manual',type:'rest',
 date:'2026-11-08',memo:'PRIVATE-REST-ANSWER',
 bodyObservation:'PRIVATE-BODY',environmentNote:'PRIVATE-ENV',shoeName:'',createdAt:'2026-11-08T01:00:00Z'}]};
test('E6 no automatic same-day join, no implicit disclosure or writes',()=>{
 assert.equal(LIFE_INQUIRY.id,'T06');
 const input={ref,record,conditions:life(),rests};
 assert.equal(lifeInquiryModel(input).status,'NEED_SELECTION');
 const html=renderLifeInquiry(input);
 assert.match(html,/data-e-state="NEED_SELECTION"/);
 assert.match(html,/data-e-life-kind="life"/);
 assert.match(html,/data-e-life-kind="rest"/);
 assert.doesNotMatch(html,/PRIVATE-|450分|本人が記録したその日の調子：良い/);
 assert.match(html,/同じ日付というだけで生活と走行を結び付けたり/);
});
test('E6 explicit life origin preserves self-report versus time-in-bed versus unknown',()=>{
 const chosen={kind:'life',date:'2026-11-08'};
 for(const [source,label,minute] of [
  ['duration','本人申告の睡眠時間','450分'],
  ['clock','就床から起床までの経過時間','450分'],
  [undefined,'方法が確認できない旧記録','値の意味を確定できません']]){
  const conditions=life();
  conditions.entries[0].sleepSource=source;
  if(source==='clock')Object.assign(conditions.entries[0],{
   bedTime:'23:00',wakeTime:'06:30',bedDayOffset:1,bedDayRule:'auto'
  });
  const m=lifeInquiryModel({ref,record,conditions,rests,selection:chosen});
  assert.equal(m.status,'READY');
  const html=renderLifeInquiry({ref,record,conditions,rests,selection:chosen});
  assert.match(html,new RegExp(label));
  assert.match(html,new RegExp(minute));
  assert.match(html,/PRIVATE-LIFE-ANSWER/);
  assert.match(html,/日付や時刻だけで両者を自動結合せず/);
 }
});
test('E6 same-date rest is an independent self-report, not proof that no running occurred',()=>{
 const input={ref,record,conditions:life(),rests,selection:{kind:'rest',date:'2026-11-08'}};
 const m=lifeInquiryModel(input);assert.equal(m.status,'READY');
 const html=renderLifeInquiry(input);
 assert.match(html,/PRIVATE-REST-ANSWER/);
 assert.match(html,/PRIVATE-BODY/);
 assert.match(html,/一切走らなかったことを測定した記録ではありません/);
 assert.doesNotMatch(html,/PRIVATE-LIFE-ANSWER/);
 assert.equal(JSON.stringify(input).includes('PRIVATE-LIFE-ANSWER'),true);
});
test('E6 invalid, missing, duplicate, unreadable or changed sources refuse fallback',()=>{
 const input={ref,record,conditions:life(),rests};
 for(const [selection,status] of [
  [{kind:'life',date:'2026-11-07'},'MISSING'],
  [{kind:'rest',date:'2026-11-07'},'MISSING'],
  [{kind:'life',date:'2026-02-30'},'BAD_SELECTION'],
  [{kind:'life',date:'2026-11-08',duplicate:true},'BAD_SELECTION'],
  [{kind:'life',date:'2026-11-08',invalid:true},'BAD_SELECTION'],
  [{kind:'invalid',date:'2026-11-08'},'BAD_SELECTION']]){
  assert.equal(lifeInquiryModel({...input,selection}).status,status);
  assert.doesNotMatch(renderLifeInquiry({...input,selection}),/PRIVATE-/);
 }
 assert.equal(lifeInquiryModel({...input,conditions:{canSave:false,entries:[]},selection:{kind:'life',date:'2026-11-08'}}).status,'READ_ERROR');
 assert.equal(lifeInquiryModel({...input,rests:{ok:false,records:[]},selection:{kind:'rest',date:'2026-11-08'}}).status,'READ_ERROR');
 assert.equal(lifeInquiryModel({...input,record:null,selection:{kind:'rest',date:'2026-11-08'}}).status,'UNVERIFIED');
 assert.equal(lifeInquiryModel().status,'NO_RUN');
});
test('E6 HTML escaping, no sleep-to-ROF conversion or identity mutation',()=>{
 const malicious=life();malicious.entries[0].memo='<img src=x onerror=alert(1)>';
 const input={ref,record,conditions:malicious,rests,selection:{kind:'life',date:'2026-11-08'}},before=JSON.stringify(input);
 const html=renderLifeInquiry(input);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x/);
 assert.doesNotMatch(html,/改善した|診断結果|睡眠のおかげで/);
 assert.equal(JSON.stringify(input),before);
});
