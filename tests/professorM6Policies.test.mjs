import test from 'node:test';
import assert from 'node:assert/strict';
import {explorationHref,resolveExplorationContext,gpsInquiryBridge,FATIGUE_TOPIC} from '../ui/explorationLinkPolicy.js';
import {resultExportDisclosure,PRIVATE_EXPORT_DEFAULTS,sourceProvenance} from '../ui/resultSharingPolicy.js';
const manualId='run-v1-12345678-1234-4234-a234-123456789abc';
const v2Id='gps-v2-12345678-1234-4234-a234-123456789abc';
const sources={manual:{ok:true,records:[{id:manualId,source:'manual',type:'run',schema:2,date:'2026-11-08',distanceKm:6}]},gpsV2:{ok:true,records:[{id:v2Id,schema:2,date:'2026-11-08',distanceKm:6,activeSeconds:1800,finalReference:{regions:[]},experience:{rofBefore:0,rofAfter:7}}]}};
test('M6 fatigue theme uses existing official 01 topic and exact typed manual identity',()=>{
 assert.deepEqual(FATIGUE_TOPIC,{category:'01',topic:'自分が感じた疲れ'});
 const href=explorationHref({sourceType:'MANUAL',recordId:manualId},FATIGUE_TOPIC.category,FATIGUE_TOPIC.topic);
 assert.match(href,/source=manual&record=run-v1-/);
 const r=resolveExplorationContext(href,sources);assert.equal(r.ok,true);assert.equal(r.value.record.id,manualId);assert.equal(r.value.kind,'MANUAL');
 assert.equal(resolveExplorationContext('#/exploration-tree?record='+manualId,sources).value.record.id,manualId);
});
test('M6 never falls back on explicit unknown, corrupt, mismatched or deleted ID',()=>{
 const cases=['#/exploration-tree?source=gps-v2&record='+manualId,'#/exploration-tree?source=bad&record='+manualId,'#/exploration-tree?source=manual&record='+manualId+'&record='+manualId,'#/exploration-tree?source=manual&record=run-v1-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'];
 for(const path of cases)assert.equal(resolveExplorationContext(path,sources).ok,false,path);
 assert.equal(resolveExplorationContext('#/exploration-tree?category=01&topic='+encodeURIComponent(FATIGUE_TOPIC.topic),sources).value.kind,'GENERAL');
 assert.equal(resolveExplorationContext('#/exploration-tree?source=manual&record='+manualId,{...sources,manual:{ok:false}}).code,'READ_FAILED');
});
test('M6 current GPS is read-only, never invented manual record',()=>{
 for(const [id,kind] of [[v2Id,'GPS_V2']]){
  const r=resolveExplorationContext(explorationHref({sourceType:kind,recordId:id},'01',FATIGUE_TOPIC.topic),sources);
  assert.equal(r.ok,true);assert.equal(r.value.kind,'GPS_READONLY');
  const html=gpsInquiryBridge(r.value);assert.match(html,/data-gps-inquiry-bridge/);assert.match(html,/既存の手入力専用探究メモへ自動的には関連づけません/);assert.doesNotMatch(html,/[?&]record=run-v1-/);
 }
 assert.match(gpsInquiryBridge(resolveExplorationContext(explorationHref({sourceType:'GPS_V2',recordId:v2Id},'01',FATIGUE_TOPIC.topic),sources).value),/運動前 0／運動後 7/);
});
test('M6 sensitive export opt-in is explicit; no free text, GPS route or mental answer',()=>{
 assert.deepEqual(PRIVATE_EXPORT_DEFAULTS,{includeDate:false,includeRof:false});
 const input={date:'2026-11-08',before:0,after:5,memo:'私的な記述',mentalExperience:'FELT',route:'HOME 1,2'};
 const ordinary=resultExportDisclosure(input);assert.doesNotMatch(JSON.stringify(ordinary),/2026-11-08|私的な記述|HOME|FELT|運動前 0/);
 const explicit=resultExportDisclosure({...input,includeDate:true,includeRof:true});assert.equal(explicit.dateText,'2026-11-08');assert.match(explicit.rofText,/運動前 0 ／ 運動後 5/);assert.doesNotMatch(JSON.stringify(explicit),/私的な記述|HOME|FELT/);
});
test('M6 source labels separate input, GPS, arithmetic, self-report and scholarly basis',()=>{
 assert.equal(sourceProvenance({saved:true}).distance,'本人入力');assert.equal(sourceProvenance({gps:true}).duration,'GPS計測値');assert.equal(sourceProvenance({gps:true}).pace,'距離・時間から算出');assert.equal(sourceProvenance().reference,'文献条件に基づく参考値');
});
