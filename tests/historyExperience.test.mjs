import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHistoryUi,normalizeRecords,lookupRecord,filterRecords,renderHistory} from '../ui/historyExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixtures=[
 {id:'saved-A',type:'run',date:'2026-10-21',distanceKm:8.42,durationSeconds:2792,courseName:'朝の周回コース',memo:'保存済みの記録A',shoeName:'靴A'},
 {id:'saved-B',type:'run',date:'2026-10-18',distanceKm:4.21,durationSeconds:1390,courseName:'公園周回',memo:'保存済みの記録B',shoeName:'靴B'},
 {id:'saved-C',type:'rest',date:'2026-10-16',memo:'休養日'}
];
test('no synthetic records or saved results in the production history view',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 const html=renderHistory(ui,[],{connected:false});
 assert.match(html,/保存した履歴をこの画面では確認できません/);
 assert.match(html,/未保存の入力内容/);
 assert.ok(!html.includes('sample-run-'));
 assert.ok(!html.includes('8.42'));
 assert.equal((html.match(/data-select-id=/g)||[]).length,0);
 assert.ok(!html.includes('data-open-record'));
 assert.ok(read('app.js').includes('historyExperience.mountHistory'));
 assert.ok(read('app.js').includes('...manualRunStore.toHistoryRows(saved)')&&read('app.js').includes('restDayStore.readRestDays(onboardStorage)'), 'history uses separately validated saved runs and rest days, never unsaved drafts');
});
test('explicit saved record ID controls display and no fallback from unknown IDs',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 const saved=normalizeRecords(fixtures);
 assert.equal(saved.length,3);
 assert.equal(lookupRecord(saved,'saved-A')?.distanceKm,8.42);
 assert.equal(lookupRecord(saved,'saved-B')?.distanceKm,4.21);
 assert.equal(lookupRecord(saved,'not-a-record'),null);
 ui.selectedId='saved-A';
 let html=renderHistory(ui,saved,{connected:true,onOpen:id=>id});
 assert.match(html,/保存済みの記録A/);
 assert.match(html,/data-open-record/);
 assert.match(html,/8\.42/);
 ui.selectedId='unknown';
 html=renderHistory(ui,saved,{connected:true,onOpen:id=>id});
 assert.ok(!html.includes('data-open-record'));
 assert.ok(!html.includes('保存済みの記録A'));
});
test('calendar filters and Japanese text search use authorized record collection only',()=>{
 const rows=normalizeRecords(fixtures),ui=createHistoryUi();ui.month='2026-10';
 assert.equal(filterRecords(rows,ui).length,3);
 ui.day=21;assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-A']);
 ui.day=null;ui.type='rest';assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-C']);
 ui.type='run';ui.query='公園';assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-B']);
 ui.month='2026-11';assert.equal(filterRecords(rows,ui).length,0);
});
test('invalid IDs, duplicate IDs, invalid dates and injection are rejected or escaped',()=>{
 const records=normalizeRecords([...fixtures,fixtures[0],{id:'x',type:'run',date:'2026-02-31'}, {id:'y',type:'bogus',date:'2026-10-01'},{id:'z',type:'run',date:'2026-10-01',memo:'<img src=x onerror=alert(1)>'}]);
 assert.equal(records.length,4);
 const ui=createHistoryUi();ui.month='2026-10';ui.selectedId='z';
 const html=renderHistory(ui,records,{connected:true,onOpen() {}});
 assert.ok(!html.includes('<img src=x onerror='));
 assert.ok(html.includes('&lt;img'));
 assert.equal(lookupRecord(records,'absent'),null);
});

test('saved activity identity is visible in history row, focus and selected footer, without guessing missing gait',()=>{
 const ui=createHistoryUi();ui.month='2026-10';ui.selectedId='walk';
 const records=[
  {id:'walk',type:'run',date:'2026-10-27',distanceKm:2,durationSeconds:1400,activityGait:'WALK',memo:'歩いた'},
  {id:'jog',type:'run',date:'2026-10-26',distanceKm:3,durationSeconds:1600,activityGait:'JOGGING'},
  {id:'run',type:'run',date:'2026-10-25',distanceKm:5,durationSeconds:1900,activityGait:'RUNNING'},
  {id:'old',type:'run',date:'2026-10-24',distanceKm:4,durationSeconds:1900,activityGait:'INVALID'}
 ];
 const normalized=normalizeRecords(records);
 assert.deepEqual(normalized.map(r=>r.activityGait),['WALK','JOGGING','RUNNING','UNKNOWN']);
 const html=renderHistory(ui,records,{connected:true,onOpen(){}});
 assert.match(html,/ウォーキング/);assert.match(html,/ジョギング/);assert.match(html,/ランニング/);
 assert.match(html,/活動種別不明/);
 assert.match(html,/2026年10月27日のウォーキング/);
 assert.match(html,/2026年10月27日　ウォーキング/);
 assert.match(html,/運動回数/);
 assert.doesNotMatch(html,/走行回数/);
});

test('UX-013: real empty account differs from empty selected month',()=>{
 const ui=createHistoryUi();ui.month='2026-11';
 const noRuns=renderHistory(ui,[],{connected:true});
 assert.match(noRuns,/保存した記録はまだありません/);
 assert.doesNotMatch(noRuns,/data-jump-month=/);
 const previous=renderHistory(ui,fixtures,{connected:true});
 assert.match(previous,/この月の記録はありません/);
 assert.match(previous,/別の月に保存済みの記録/);
 assert.match(previous,/data-history-scope="all"/);
 assert.match(previous,/data-jump-month="2026-10"/);
 assert.equal((previous.match(/data-select-id=/g)||[]).length,0);
});
test('UX-013: explicit all-period mode searches across saved months without fabricating run values',()=>{
 const ui=createHistoryUi();ui.month='2026-11';
 const records=normalizeRecords([...fixtures,{id:'saved-future',type:'rest',date:'2026-12-01',memo:'休養'}]);
 assert.equal(filterRecords(records,ui).length,0,'month filtering remains default');
 ui.allMonths=true;
 assert.equal(filterRecords(records,ui).length,4);
 ui.query='公園';assert.deepEqual(filterRecords(records,ui).map(r=>r.id),['saved-B']);
 const text=renderHistory(ui,records,{connected:true,onOpen(){}});
 assert.match(text,/全期間の記録/);assert.match(text,/2026年10月18日/);
 assert.match(text,/全期間で検索中/);
 assert.match(text,/aria-pressed="true" class="active">全期間/);
 assert.doesNotMatch(text,/data-open-record/,'no implicit record selection');
 ui.query='';ui.type='rest';
 assert.deepEqual(filterRecords(records,ui).map(r=>r.id),['saved-future','saved-C']);
 ui.allMonths=false;ui.month='2026-10';
 assert.equal(filterRecords(records,ui).length,1,'switching back restores month-bound filtering');
});


test('P6-C S10: internal ID stays in selection logic and must never be visible as user copy',()=>{
 const ui=createHistoryUi();ui.month='2026-10';ui.selectedId='id-a-very-long-record-1234567890';
 const records=[{id:ui.selectedId,type:'run',date:'2026-10-22',activityGait:'RUNNING',distanceKm:3,durationSeconds:900}];
 const html=renderHistory(ui,records,{connected:true,onOpen(){}});
 assert.doesNotMatch(html,/hx-record-id|記録IDを確認|<code>id-a-very-long-record-1234567890<\/code>/,'internal identifier disclosure has been removed');
 assert.match(html,/data-select-id="id-a-very-long-record-1234567890"/,'internal identity remains available for explicit record selection');
 assert.match(html,/data-open-record/,'selected saved record can still open result');
 ui.selectedId='missing';
 assert.doesNotMatch(renderHistory(ui,records,{connected:true,onOpen(){}}),/<summary>記録IDを確認<\/summary>/);
});


test('Find Records local help is collapsed and controls preserve scope/source/type/search IDs',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 let html=renderHistory(ui,fixtures,{connected:true});
 assert.ok(html.includes('<details class="hx-find-help"><summary aria-label="検索条件の説明">？</summary>'));
 for(const label of ['検索期間','記録方法','記録の種類'])
  assert.ok(html.includes('class="hx-filter-label">'+label));
 for(const id of ['data-history-scope="month"','data-history-scope="all"','data-record-source="MANUAL"','data-record-source="GPS_V2"','data-record-kind="rest"','id="hx-search"'])
  assert.ok(html.includes(id));
 assert.ok(!html.includes('<p class="hx-scope-hint" role="status">'));
 ui.allMonths=true;html=renderHistory(ui,fixtures,{connected:true});
 assert.ok(html.includes('全期間で検索中（月間集計は表示月のみ）'));
 assert.equal(filterRecords(normalizeRecords(fixtures),ui).length,3);
 const styles=read('ui/historyInlineStyles.js');
 assert.ok(styles.includes('hx-source-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(styles.includes('hx-scope{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(styles.includes('min-height:52px;height:100%'));
});


test('Find Records prioritizes keyword and period; advanced source/type stay folded without clearing filters',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 assert.equal(ui.advancedOpen,false,'detail controls start closed');
 let html=renderHistory(ui,fixtures,{connected:true});
 const search=html.indexOf('id="hx-search"'),period=html.indexOf('class="hx-filter-label">検索期間'),more=html.indexOf('data-history-advanced');
 assert.ok(search>0&&search<period&&period<more,'search, period, then optional filters');
 assert.match(html,/data-history-advanced aria-expanded="false" aria-controls="hx-advanced-panel"/);
 assert.match(html,/id="hx-advanced-panel" hidden/);
 assert.equal((html.match(/data-history-advanced/g)||[]).length,1);
 assert.ok(html.indexOf('class="hx-find-help"')>html.indexOf('class="list-head"'));
 assert.ok(html.indexOf('class="hx-find-help"')<search,'help detail is an independent block before filters');
 ui.source='GPS_V2';ui.type='run';ui.advancedOpen=false;
 html=renderHistory(ui,fixtures,{connected:true});
 assert.match(html,/class="hx-filter-count" aria-label="有効な絞り込み">2</);
 assert.match(html,/data-record-source="GPS_V2" aria-pressed="true"/);
 assert.match(html,/data-record-kind="run" type="button" class="active"/);
 assert.equal(filterRecords(normalizeRecords(fixtures),ui).length,0,'source restriction remains effective even when collapsed');
 ui.advancedOpen=true;
 html=renderHistory(ui,fixtures,{connected:true});
 assert.match(html,/data-history-advanced aria-expanded="true"/);
 assert.match(html,/id="hx-advanced-panel" >/);
 const style=read('ui/historyInlineStyles.js');
 assert.ok(style.includes('.hx-advanced-body[hidden]{display:none!important}'));
 assert.ok(style.includes('.hx-find-help-body{position:static;top:auto;right:auto'), 'help takes normal space and cannot sit behind period');
 assert.ok(style.includes('hx-advanced-body .hx-source-controls{background:#071e2e;border:1px'), 'method matches boxed filter styling');
});

test('UX12 mobile calendar is optional, keeps an ISO day filter and never selects a run implicitly',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 assert.equal(ui.calendarOpen,null);
 let html=renderHistory(ui,fixtures,{connected:true,onOpen(){}});
 assert.match(html,/<details class="hx-calendar-fold" data-history-calendar open><summary>日付を指定して探す<\/summary>/);
 ui.calendarOpen=false;html=renderHistory(ui,fixtures,{connected:true,onOpen(){}});
 assert.match(html,/<details class="hx-calendar-fold" data-history-calendar ><summary>/);
 assert.match(html,/data-day="21"/);
 assert.match(html,/data-history-scope="all"/);
 assert.equal(filterRecords(normalizeRecords(fixtures),ui).length,3);
 assert.doesNotMatch(html,/data-open-record/);
 ui.day=21;ui.calendarOpen=true;html=renderHistory(ui,fixtures,{connected:true,onOpen(){}});
 assert.match(html,/data-history-calendar open/);
 assert.equal(filterRecords(normalizeRecords(fixtures),ui).length,1);
});
test('UX12 filter summary reflects scope, method, kind and query; dates are labeled without rewriting their source',()=>{
 const ui=createHistoryUi();ui.month='2026-10';ui.allMonths=true;ui.query='公園';ui.source='MANUAL';ui.type='run';
 let html=renderHistory(ui,fixtures,{connected:true,onOpen(){}});
 assert.match(html,/data-history-active-conditions/);
 for(const label of ['全期間を表示','検索語','手入力のみ','走行のみ'])assert.ok(html.includes(label));
 assert.match(html,/datetime="2026-10-18"/);
 assert.match(html,/aria-label="走行日：2026年10月18日"/);
 ui.query='<script>alert(1)</script>';
 html=renderHistory(ui,fixtures,{connected:true,onOpen(){}});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.equal(filterRecords(normalizeRecords(fixtures),ui).length,0);
});
