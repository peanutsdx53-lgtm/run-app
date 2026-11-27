import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareConditionJourney,renderConditionJourney,renderHomeConditionFollowup} from '../ui/conditionJourney.js';
import {addConditionInsight,loadConditionInsights,removeConditionInsight,insightRecordStatus,CONDITION_INSIGHTS_KEY} from '../ui/conditionInsights.js';
import {createLifeIntent,updateIntent,loadIntent,ACTION_INTENT_KEY} from '../ui/actionIntentStore.js';
const localDay=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const record=(date,minutes=420,feeling='良い',memo='',source='duration')=>({date,sleepMinutes:minutes,sleepSource:source,feeling,memo});
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const a=localDay(-3),b=localDay(-2),c=localDay(-1);
const conditions={canSave:true,entries:[record(a,360,'ふつう','気持ちが普通'),record(b,450,'良い','朝は元気'),record(c,420,'疲れ気味','寝付けなかった')]};
test('long-term journey lists actual dates and highlights without inferring personal causes',()=>{
 const day7=prepareConditionJourney(conditions,{days:7,selected:b});
 assert.equal(day7.status,'ready');
 assert.equal(day7.days.length,7);assert.equal(day7.entries.length,3);assert.equal(day7.selected.date,b);
 assert.equal(prepareConditionJourney(conditions,{days:90}).days.length,90);
 const html=renderConditionJourney(conditions,{days:30,selected:b,focus:'good'});
 assert.match(html,/気づきを保存する/);assert.match(html,/次の記録で確かめる/);
 assert.match(html,/朝は元気/);assert.match(html,/調子が良かった日/);
 assert.doesNotMatch(html,/data-interpret-date/,'no manual two-date selection is necessary');
 assert.match(html,/<details class="cj-local-help" data-cj-comparison-help><summary>比較の見方と限界<\/summary><p>2日間の差だけから/);
 assert.doesNotMatch(html,/class="cj-disclaimer"|違いの原因やランニングへの影響/);
});
test('displayed mood is categorical and day notes are escaped',()=>{
 const evil={canSave:true,entries:[record(b,450,'良い','<script>alert(1)</script>')]};
 const html=renderConditionJourney(evil,{days:7,selected:b});
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/aria-label/);
 assert.match(html,/睡眠時間/);
});
test('different input methods are separated, not silently placed on a common trend',()=>{
 const c2={canSave:true,entries:[record(a,420,'良い','','duration'),record(b,470,'ふつう','','clock')]};
 const journey=prepareConditionJourney(c2,{days:7,method:'self-reported'});
 assert.equal(journey.entries.length,1);
 const other=prepareConditionJourney(c2,{days:7,method:'time-in-bed'});
 assert.equal(other.entries.length,1);
 assert.equal(other.method,'time-in-bed');
});
test('reflections are voluntary, bound to saved source, and independent of other stores',()=>{
 const s=store();s.setItem('runload-v2-action-intents-v1','unmodified');
 assert.equal(addConditionInsight(s,conditions,b,'').ok,false);
 assert.equal(loadConditionInsights(s).entries.length,0);
 const saved=addConditionInsight(s,conditions,b,'前の日より元気に感じた','2026-10-26T00:00:00Z');
 assert.equal(saved.ok,true);assert.equal(loadConditionInsights(s).entries.length,1);
 assert.equal(s.getItem('runload-v2-action-intents-v1'),'unmodified');
 const item=loadConditionInsights(s).entries[0];
 assert.equal(insightRecordStatus(item,conditions),'current');
 assert.equal(insightRecordStatus(item,{canSave:true,entries:[...conditions.entries.filter(e=>e.date!==b),record(b,451)]}),'changed');
 assert.equal(insightRecordStatus(item,{canSave:true,entries:conditions.entries.filter(e=>e.date!==b)}),'missing');
 assert.equal(removeConditionInsight(s,item.id).ok,true);
 assert.equal(loadConditionInsights(s).entries.length,0);
});
test('corruption and failed writes never overwrite stored data',()=>{
 const s=store();s.setItem(CONDITION_INSIGHTS_KEY,'{corrupt');
 const raw=s.getItem(CONDITION_INSIGHTS_KEY);
 assert.equal(addConditionInsight(s,conditions,b,'確認').ok,false);
 assert.equal(s.getItem(CONDITION_INSIGHTS_KEY),raw);
 const q=store();q.setItem=()=>{throw Error('quota')};
 assert.equal(addConditionInsight(q,conditions,b,'確認').ok,false);
 assert.equal(q.getItem(CONDITION_INSIGHTS_KEY),null);
});
test('home presents real next-entry comparison inline and offers reflection instead of a click-to-complete badge',()=>{
 const s=store();const r=createLifeIntent(s,{date:b,source:'self-reported',minutes:450});
 assert.equal(r.ok,true);
 const waiting=renderHomeConditionFollowup(r.intent,{canSave:true,entries:conditions.entries.slice(0,2)},loadConditionInsights(s));
 assert.match(waiting,/次の記録を待っています/);
 const ready=renderHomeConditionFollowup(r.intent,conditions,loadConditionInsights(s));
 assert.match(ready,/新しい記録と見比べられます/);
 assert.match(ready,/気づきを保存する/);
 assert.match(ready,/30分/);
 assert.doesNotMatch(ready,/data-interpret-mark-reviewed/);
});

test('invalid calendar dates reject safely without changing opt-in next-check records (037)',()=>{
 const s=store(),baseline={date:'2024-02-29',source:'self-reported',minutes:440};
 const created=createLifeIntent(s,baseline,'2026-11-03T00:00:00.000Z');
 assert.equal(created.ok,true,created.reason);
 const original=s.getItem(ACTION_INTENT_KEY);
 for(const invalid of ['2026-02-29','2026-13-99','2026-11-31','not-a-date']){
  assert.doesNotThrow(()=>createLifeIntent(s,{...baseline,date:invalid}));
  assert.equal(createLifeIntent(s,{...baseline,date:invalid}).ok,false,invalid);
  const candidate={...created.intent,baseline:{...created.intent.baseline,date:invalid}};
  assert.doesNotThrow(()=>updateIntent(s,candidate),invalid);
  assert.equal(updateIntent(s,candidate).ok,false,invalid);
  assert.equal(s.getItem(ACTION_INTENT_KEY),original,'invalid date must not alter saved intent');
 }
 s.setItem(ACTION_INTENT_KEY,JSON.stringify({...created.intent,baseline:{...created.intent.baseline,date:'2026-13-99'}}));
 assert.equal(loadIntent(s).ok,false,'corrupt saved date is rejected without exception');
});

test('UX15 empty state has no zero bars and retains explicit period and method selection',()=>{
 const html=renderConditionJourney({canSave:true,entries:[]},{days:7,method:'time-in-bed'});
 assert.match(html,/選択した期間・方法の記録なし/);assert.match(html,/未記録日は0時間として扱いません/);
 assert.doesNotMatch(html,/data-cj-chart(?=[\s=>])|data-cj-day=/);assert.match(html,/<details class="cj-local-help" data-cj-chart-help>/);assert.match(html,/data-cj-range="7" aria-label="7日" aria-pressed="true"/);
 assert.match(html,/就床から起床までの経過時間：0日分/);assert.doesNotMatch(html,/棒の基準/);
});
test('UX15 missing method is distinct from an absent date, and self-report symbols do not assess health',()=>{
 const data={canSave:true,entries:[record(a,420,'良い','','duration'),record(b,480,'ふつう','','clock')]};
 const html=renderConditionJourney(data,{days:7,method:'self-reported'});
 assert.match(html,new RegExp(b+' 選択した方法の記録なし'));assert.match(html,new RegExp(c+' 記録なし'));
 assert.match(html,/色や記号は健康状態や走行能力の評価ではありません/);assert.match(html,/本人が入力した調子/);
});


test('UX15 composed condition labels translate only generated display text',async()=>{
 const {translateResidualDynamic}=await import('../ui/englishSurfaceRemainders.js');
 const element={closest:s=>s==='.cj-panel'?{}:null};
 const tr=s=>translateResidualDynamic(s,{element});
 assert.equal(tr('良い'),'Good');
 assert.equal(tr('◐ ふつう'),'◐ Normal');
 assert.equal(tr('2026-11-23の記録'),'Record for 2026-11-23');
 assert.equal(tr('6時間30分'),'6 h 30 min');
 assert.equal(tr('2026-11-21 就床から起床までの経過時間 8時間00分、調子 良い'),'2026-11-21 Elapsed Time in Bed 8 h 00 min, condition: Good');
 assert.equal(tr('2026-11-14と2026-11-23で、申告した睡眠時間に1時間00分の差があります。'),'Between 2026-11-14 and 2026-11-23, Self-Reported Sleep Duration differs by 1 h 00 min.');
 assert.equal(tr('本人の調子：ふつう ／ 疲れ気味'),'Self-reported condition: Normal / Somewhat Tired');
 assert.equal(translateResidualDynamic('良い',{element:{closest:s=>s==='.cj-panel'||s==='[data-user-authored]'?{}:null}}),null);
 assert.equal(translateResidualDynamic('良い'),null);
});

test('chart and comparison limits are locally available, collapsed and not duplicated',()=>{const html=renderConditionJourney(conditions);assert.match(html,/<details class="cj-local-help" data-cj-chart-help><summary>グラフの見方<\/summary>/);assert.match(html,/<details class="cj-local-help" data-cj-comparison-help><summary>比較の見方と限界<\/summary>/);assert.equal((html.match(/2日間の差だけから/g)||[]).length,1);assert.doesNotMatch(html,/<details[^>]*(?:data-cj-chart-help|data-cj-comparison-help)[^>]*\bopen\b/);assert.match(html,/本人が入力した調子/);});
