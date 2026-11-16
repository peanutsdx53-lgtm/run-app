import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gpsReplayElapsed,gpsReplayChartX,gpsReplayEvidenceState} from '../ui/gpsDynamicResult.js';
import {deriveReplaySpeeds,evaluateGpsReplayReference} from '../ui/gpsReplayReference.js';

const raw=[
 {t:1700000000000,km:0,breakBefore:true,activeMs:0},
 {t:1700000001000,km:.003,breakBefore:false,activeMs:1000},
 {t:1700000020000,km:.003,breakBefore:true,activeMs:20000},
 {t:1700000025000,km:.019,breakBefore:false,activeMs:25000}
];

test('stage6: GPS speed chart uses recorded elapsed time, never equal sample spacing',()=>{
 const speeds=deriveReplaySpeeds(raw);
 assert.deepEqual(speeds.map(p=>p.state),['INITIAL_FIX','SPEED_AVAILABLE','GPS_GAP','SPEED_AVAILABLE']);
 assert.equal(gpsReplayElapsed(speeds,0),0);
 assert.equal(gpsReplayElapsed(speeds,3),25000);
 const pos=speeds.map((_,i)=>gpsReplayChartX(speeds,i));
 assert.equal(pos[0],5);assert.equal(pos[3],695);
 assert.ok(Math.abs(pos[1]-(5+690/25))<1e-7,'one second must represent 1/25 of recorded elapsed');
 assert.ok(pos[2]>pos[1]&&pos[2]<pos[3]);
 assert.ok(pos[1]<100,'sample index 1/3 would incorrectly land at 235');
 const withoutActive=raw.map(({activeMs,...r})=>r);
 assert.equal(gpsReplayChartX(deriveReplaySpeeds(withoutActive),1),5+690/25);
 assert.equal(gpsReplayChartX([],0),5,'no fabricated location for missing series');
});

test('stage6: GPS gap, initial fix and missing speed cannot display a tissue measurement or zero',()=>{
 const frames=deriveReplaySpeeds(raw),reference=evaluateGpsReplayReference({activity:'RUNNING',speedMps:frames[1].speedMps});
 assert.equal(gpsReplayEvidenceState(frames[0],null).code,'INITIAL_FIX');
 assert.equal(gpsReplayEvidenceState(frames[2],null).code,'GPS_GAP');
 assert.equal(frames[2].speedMps,null,'no speed interpolation across breakBefore');
 assert.match(gpsReplayEvidenceState(frames[2],null).label,/補完しません/);
 assert.equal(gpsReplayEvidenceState({...frames[1],speedMps:0},null).code,'SPEED_UNAVAILABLE');
 assert.equal(gpsReplayEvidenceState(frames[1],{state:'NO_AUTHORIZED_SPEED_REFERENCE',count:0}).code,'REFERENCE_UNAVAILABLE');
 assert.match(gpsReplayEvidenceState(frames[1],{state:'NO_AUTHORIZED_SPEED_REFERENCE',count:0}).label,/ゼロではありません/);
 assert.equal(reference.referenceOnly,true);
 assert.equal(gpsReplayEvidenceState(frames[1],reference).code,'REFERENCE_ONLY');
 assert.match(gpsReplayEvidenceState(frames[1],reference).label,/身体負荷の実測ではありません/);
 assert.equal(gpsReplayEvidenceState(null,null).code,'NOT_AVAILABLE');
});

test('stage6: dynamic body map has two synced panels, accessible steps, and three-tab result stays separate',()=>{
 const source=readFileSync(new URL('../ui/gpsDynamicResult.js',import.meta.url),'utf8');
 assert.match(source,/gpsReplayChartX\(speed,i\)/,'speed chart x is elapsed-time based');
 assert.match(source,/data-gps-replay-state/,'gap and reference status is text, not only gray');
 assert.match(source,/data-flag-step/,'flag list has forward/back controls');
 assert.match(source,/data-jump-flag/,'existing map flag navigation preserved');
 assert.match(source,/playing=false;activeFlagIndex=target;index=nearest/,'flag jump pauses replay before setting frame');
 assert.match(source,/data-seek/,'existing range control preserved');
 assert.match(source,/role="group"/,'evidence state does not continuously announce on playback');
 assert.doesNotMatch(source,/経過時間のグラフ[^\n]*GPS\s*で計測した身体負荷/,'never imply directly measured tissue load');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/mountGpsDynamicResult\(/);
 assert.match(app,/page==="dynamic-result"/);
 const result=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(result,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
});
