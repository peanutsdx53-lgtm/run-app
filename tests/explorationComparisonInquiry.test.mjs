import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPARISON_INQUIRY,comparisonInquiryModel,renderComparisonInquiry} from '../ui/explorationComparisonInquiry.js';
import {compareSavedRuns} from '../ui/runReflection.js';
const id=n=>'run-v1-'+String(n).repeat(8)+'-'+String(n).repeat(4)+'-4'+String(n).repeat(3)+'-8'+String(n).repeat(3)+'-'+String(n).repeat(12);
const ref=n=>({sourceType:'MANUAL',recordId:id(n)});
const run=(n,date='2026-11-08',gait='RUNNING',before=0)=>({
 id:id(n),date,source:'manual',type:'run',schema:2,distanceKm:n===1?4:6,
 durationSeconds:n===1?1440:1980,rofBefore:before,rofAfter:null,
 createdAt:date+'T09:00:00.000Z',draft:{activityGait:gait}
});
const cur=run(2),prev=run(1,'2026-11-04');
const pair={currentRef:ref(2),current:cur,previousRef:ref(1),previous:prev,explicit:true};
test('E2 T08 is inquiry distinct from the result comparison and learning',()=>{
 assert.equal(COMPARISON_INQUIRY.id,'T08');
 const m=comparisonInquiryModel(pair);assert.equal(m.status,'READY');
 assert.deepEqual(m.changed,compareSavedRuns(cur,prev).rows.filter(r=>r.change!==null&&r.change!==0).map(r=>r.label));
 const h=renderComparisonInquiry(pair,{allowLegacyMemo:true});
 assert.match(h,/以前の走りとの違いから/);
 assert.match(h,/data-e-state="READY"/);
 assert.match(h,/記録間で数値の違いを確認できる項目/);
 assert.match(h,/比較表を複製しません/);
 assert.match(h,/結果画面で確認/);
 assert.doesNotMatch(h,/data-ex-action="note"/,'T08 reuses old memoir control');
 assert.match(h,/既存テーマにある「書いてみる」/);
 assert.doesNotMatch(h,/改善した|危険度スコア|比較相手.*自動選択/);
});
test('E2 requires an explicit pair and does not fill missing data',()=>{
 assert.equal(comparisonInquiryModel().status,'NO_RECORD');
 assert.equal(comparisonInquiryModel({currentRef:ref(2),current:cur}).status,'NEED_SELECTION');
 assert.equal(comparisonInquiryModel({...pair,previous:null}).status,'MISSING');
 assert.equal(comparisonInquiryModel({...pair,previousRef:{sourceType:'GPS_V1',recordId:'gps-v1-abcdefgh'}}).status,'INVALID_SELECTION');
 assert.equal(comparisonInquiryModel({...pair,duplicate:true}).status,'UNVERIFIED');
 assert.equal(comparisonInquiryModel({...pair,readable:false}).status,'UNVERIFIED');
 assert.equal(comparisonInquiryModel({...pair,current:null}).status,'UNVERIFIED');
 assert.equal(comparisonInquiryModel({...pair,previousRef:ref(2),previous:cur}).status,'INELIGIBLE');
 for(const p of [{...pair,previous:null},{...pair,duplicate:true},{...pair,previousRef:ref(2),previous:cur}]){
  assert.doesNotMatch(renderComparisonInquiry(p,{allowLegacyMemo:true}),/data-ex-action="note"/);
 }
});
test('E2 refuses activity mismatches, unknown gait and unproven date order',()=>{
 assert.equal(comparisonInquiryModel({...pair,previous:run(1,'2026-11-04','JOGGING')}).status,'INELIGIBLE');
 assert.equal(comparisonInquiryModel({...pair,previous:run(1,'2026-11-04','UNKNOWN')}).status,'INELIGIBLE');
 assert.equal(comparisonInquiryModel({...pair,previous:run(1,'2026-11-08')}).status,'ORDER_UNCLEAR');
 assert.equal(comparisonInquiryModel({...pair,previous:run(1,'2026-11-09')}).status,'ORDER_UNCLEAR');
 assert.match(renderComparisonInquiry({...pair,previous:run(1,'2026-11-08')}),/同日・新しい日付/);
});
test('E2 descriptive record difference never claims scientific reference compatibility or changes the originals',()=>{
 const before=JSON.stringify([cur,prev]);
 const m=comparisonInquiryModel(pair);
 assert.ok(m.unavailable.includes('運動後に感じた疲れ'));
 const h=renderComparisonInquiry(pair);
 assert.match(h,/同一部位・同一指標・同一計算方法/);
 assert.match(h,/入力された日付は実際の走行順を証明しません/);
 assert.match(h,/#\/result\?record=run-v1-[^"]+&view=compare&compare=run-v1-/);
 assert.doesNotMatch(h,/data-ex-action="note"/);
 assert.equal(JSON.stringify([cur,prev]),before);
});
