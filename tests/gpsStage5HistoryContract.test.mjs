import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGpsV2Run,validGpsV2Summary} from '../ui/gpsReplayIndexedDbStore.js';
import {gpsSummariesToHistoryRows} from '../ui/historyGpsAdapter.js';
import {createHistoryUi,filterRecords,normalizeRecords,renderHistory} from '../ui/historyExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const point=(i,km)=>({lat:37.502+i*.0001,lon:139.902,km,t:1700000000000+i*10000,
 breakBefore:i===0,ele:null,altitudeAccuracy:null,altitudeQuality:'missing',activity:'RUNNING'});
const session=()=>{const track=[point(0,0),point(1,.0125),point(2,.025)];return {
 phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:20000,accepted:3,rejected:0,
 track,trackSimplified:false,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
 replayTrackAvailable:true,flags:[]};};
const gpsSummary=()=>{const saved=prepareGpsV2Run(session(),{date:'2026-11-16',saveDetails:true,
 experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,
 beforeCapturedAt:'2026-11-16T00:00:00.000Z',afterCapturedAt:null,
 surface:'UNKNOWN',memo:'本当の気づき'}});
 assert.equal(saved.ok,true,saved.reason);return saved.summary;};
test('stage 5: GPS history adapter never exposes location/speeds/flags or inferred self-report',()=>{
 const summary=gpsSummary();
 const rows=gpsSummariesToHistoryRows({ok:true,records:[summary]});
 assert.equal(rows.length,1);
 const row=rows[0];assert.equal(row.sourceType,'GPS_V2');
 assert.equal(row.id,summary.id);assert.equal(row.type,'run');
 assert.equal(row.activityGait,'RUNNING');assert.equal(row.date,'2026-11-16');
 assert.equal(row.detailSaved,true);assert.equal(row.rofBefore,0);
 assert.equal(row.rofAfter,null);assert.equal(row.memo,'本当の気づき');
 for(const name of ['track','route','speedPoints','flags','location','lat','lon','energyEstimate','finalReference']){
  assert.equal(Object.hasOwn(row,name),false,name+' may not be copied');
 }
 assert.doesNotMatch(JSON.stringify(row),/37\.502|139\.902/);
 const normalized=normalizeRecords(rows);assert.equal(normalized.length,1);
 assert.equal(normalized[0].sourceType,'GPS_V2');
});
test('stage 5: corrupt or failed GPS listing fails closed; does not fabricate zero records',()=>{
 const summary=gpsSummary();
 assert.equal(gpsSummariesToHistoryRows({ok:false,records:[summary]}).length,0);
 assert.equal(gpsSummariesToHistoryRows({ok:true,records:[{...summary,date:'2026-02-31'}]}).length,0);
 assert.equal(gpsSummariesToHistoryRows(null).length,0);
 const ui=createHistoryUi();ui.month='2026-11';
 const html=renderHistory(ui,[{id:'run-v1-manual-test',type:'run',date:'2026-11-16',
  distanceKm:2,durationSeconds:1200}],{connected:true,gpsReadFailed:true});
 assert.match(html,/data-gps-history-partial/);
 assert.match(html,/読み取れた手入力・休養日だけ/);
 assert.match(html,/data-source-label="MANUAL"/);
});
test('stage 5: same history lists and monthly stats count manual+GPS once, source-filter changes only list',()=>{
 const gps=gpsSummariesToHistoryRows({ok:true,records:[gpsSummary()]})[0];
 const manual={id:'run-v1-manual-test',sourceType:'MANUAL',type:'run',date:'2026-11-16',
  distanceKm:6,durationSeconds:2100,activityGait:'RUNNING',memo:'手入力'};
 const rest={id:'rest-v1-2026-11-14',type:'rest',date:'2026-11-14',memo:'休む'};
 const rows=normalizeRecords([manual,rest,gps]);
 assert.equal(rows.length,3);
 assert.equal(new Set(rows.map(x=>x.id)).size,3);
 const ui=createHistoryUi();ui.month='2026-11';
 assert.equal(filterRecords(rows,ui).length,3);
 let html=renderHistory(ui,rows,{connected:true,onOpen() {},onAnnotate() {},onDeleteGps() {}});
 assert.match(html,/運動回数/);
 assert.match(html,/>2<em>回/,'GPS+manual are both counted');
 assert.match(html,/GPS計測/);
 assert.match(html,/data-record-source="GPS_V2"/);
 assert.equal((html.match(/data-select-id=/g)||[]).length,3);
 ui.source='GPS_V2';assert.deepEqual(filterRecords(rows,ui).map(x=>x.id),[gps.id]);
 ui.selectedId=gps.id;
 html=renderHistory(ui,rows,{connected:true,onOpen() {},onAnnotate() {},onDeleteGps() {}});
 assert.match(html,/data-delete-gps-record/);
 assert.match(html,/data-annotate-record/);
 assert.equal((html.match(/data-select-id=/g)||[]).length,1);
 assert.match(html,/>2<em>回/,'monthly stat must not change when filtering the list');
 ui.source='MANUAL';ui.selectedId=manual.id;
 html=renderHistory(ui,rows,{connected:true,onOpen() {},onAnnotate() {},onDeleteGps() {}});
 assert.doesNotMatch(html,/data-delete-gps-record/,'no GPS deletion on manual selection');
 assert.equal(filterRecords(rows,ui).length,2,'rest and manual runs are both manually entered');
});
test('stage 5: historic MIXED GPS remains readable and never gains running scientific values',()=>{
 const summary=gpsSummary();
 const old={...summary,activity:'MIXED',energyEstimate:null,finalReference:{
  ...summary.finalReference,state:'MIXED_NOT_SUPPORTED',
  modelVersion:null,semanticVersion:null,source:null,
  regions:summary.finalReference.regions.map(r=>({
   ...r,value:null,calculationState:'NOT_CALCULABLE',reasonCode:'MIXED_NOT_SUPPORTED'}))
 }};
 assert.equal(validGpsV2Summary(old),true,'older preserved MIXED summary stays valid');
 const rows=gpsSummariesToHistoryRows({ok:true,records:[old]});
 assert.equal(rows.length,1);assert.equal(rows[0].activityGait,'RUN_WALK');
 const ui=createHistoryUi();ui.month='2026-11';
 const html=renderHistory(ui,rows,{connected:true,onOpen(){}});
 assert.match(html,/走歩混在/);assert.match(html,/GPS計測/);
});
test('stage 5: source and selected ID cannot silently change during result navigation',()=>{
 assert.equal(normalizeRecords([{id:'nope',sourceType:'GPS_V2',type:'run',date:'2026-11-16'}]).length,0);
 assert.equal(normalizeRecords([{id:'gps-v2-a-valid-id',sourceType:'UNTRUSTED',type:'run',date:'2026-11-16'}]).length,0);
 const app=read('app.js');
 assert.match(app,/gpsSummariesToHistoryRows\(gpsV2Cache\)/);
 assert.match(app,/sourceType==='GPS_V2'&&gpsV2Cache\.ok/);
 assert.match(app,/location\.hash='#\/result\?gps='/);
 assert.doesNotMatch(app,/gps-history-item/,'duplicate GPS list is removed');
 const result=read('ui/resultExperience.js');
 assert.match(result,/fromGps\?'GPS記録では/);
 assert.match(result,/data-result-source/);
 assert.match(result,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
});
