import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Public screens do not expose project codenames or provisional labels',()=>{
 assert.doesNotMatch(read('ui/explorationExperience.js'),/研究Current|研究用の出典台帳|RunLoadで本人|RunLoadの本人|Runloadの効果/);
 assert.doesNotMatch(read('ui/learningOriginLesson.js'),/Reference-100|補助教材（試行版）|研究系列の条件付き参考情報/);
 assert.doesNotMatch(read('ui/learningMotionLesson.js'),/一般知識の試行教材/);
 assert.doesNotMatch(read('ui/simulationExperience.js'),/計画と実績の自動照合は未実装/);
 assert.doesNotMatch(read('ui/referenceEvidenceInfo.js'),/研究台帳参照|研究上の指標|モデル内の原著ID|識別子：/);
 assert.doesNotMatch(read('ui/resultExperience.js'),/参考原著・識別子|研究上の測定量/);
 assert.match(read('ui/resultExperience.js'),/ROF_TIME_BASIS_DISPLAY/);
 assert.doesNotMatch(read('ui/resultExperience.js'),/clean\(e\?\.timeBasis\|\|'UNKNOWN'\)/);
 assert.doesNotMatch(read('ui/explorationReadAdapter.js'),/正式な生活記録|走行との連結は未実装|承認済みの12部位ID/);
});
test('Visible file names are neutral; backup format and storage contracts are unchanged',()=>{
 assert.match(read('app.js'),/gps-detailed-track-backup-/);
 assert.doesNotMatch(read('app.js'),/gps-activity-backup-|data-gps-backup-export|gpsIndexedDbStore/);
 assert.doesNotMatch(read('app.js'),/従来形式のバックアップ|新形式のGPS記録/);
 assert.doesNotMatch(read('app.js'),/a\.download='runload-gps-v2-backup-|anchor\.download='runload-gps-backup-/);
 assert.match(read('ui/gpsReplayIndexedDbStore.js'),/runload-gps-v2-backup/);
 assert.doesNotMatch(read('ui/simulationExperience.js'),/GPS実走履歴：今後対応|gpsRecordToFeature/);
 assert.doesNotMatch(read('ui/learningOriginLesson.js'),/GPS旧形式|新形式（v2）|旧記録に存在しない項目/);
 assert.doesNotMatch(read('ui/consultationExperience.js'),/GPS旧形式計測値|新形式のGPS記録/);
 assert.doesNotMatch(read('sw.js'),/gpsIndexedDbStore|gpsMeasurementStore/);
 assert.doesNotMatch(read('ui/gpsMeasurementValidation.js'),/gps-v1-|gpsIndexedDbStore/);
 assert.match(read('ui/manualRunStore.js'),/runload-v2-manual-runs-v2/);
 assert.match(read('ui/annotationBackup.js'),/runload-v2-annotation-backup/);
});
test('PWA cache and description are up to date without an unverified efficacy claim',()=>{
 const index=read('index.html'),sw=read('sw.js');
 const current=index.match(/src="(\.\/app\.js\?v=[a-z0-9-]+)"/)?.[1];
 assert.ok(current,'a versioned active app entry must exist');
 assert.ok(JSON.parse(sw.match(/const ASSETS=(\[[^\n]*\]);/)[1]).includes(current),'the active app must be available offline');
 assert.match(sw,/const CACHE="runload-ui-next-shell-[a-z0-9-]+"/);
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.name,'走行記録と振り返り');
 assert.doesNotMatch(manifest.description,/理解が育つ|向上する/);
});

test('current GPS is the only runtime storage and reference path',()=>{
 for(const path of [
  'app.js','ui/dataManagement.js','ui/portableDataV2.js','ui/recordRef.js',
  'ui/explorationLinkPolicy.js','ui/annotationEditor.js',
  'ui/explorationInquiry.js','ui/consultationExperience.js',
  'ui/gpsMeasurementValidation.js','ui/gpsReplayIndexedDbStore.js','sw.js'
 ]){
  assert.doesNotMatch(read(path),/GPS_V1|gpsLegacy|gpsCurrent|gpsIndexedDbStore|gpsMeasurementStore|gps-v1-/,path);
 }
 assert.match(read('ui/gpsReplayIndexedDbStore.js'),/prepareGpsMeasurement/);
 assert.match(read('ui/dataManagement.js'),/local:snap.local,gps/);
 assert.match(read('ui/simulationExperience.js'),/detailSaved===true/);
 assert.match(read('sw.js'),/\.\/ui\/gpsMeasurementValidation\.js/);
});

test('public copy hides old-version language and academic placeholders without changing evidence protections',()=>{
 const app=read('app.js');
 assert.match(app,/aria-label="走行条件などの任意入力項目"/);
 assert.match(app,/保存済みの走行結果画面で確認できます/);
 assert.doesNotMatch(app,/旧版から引き継ぐ任意入力項目|以前の表示例は実際の保存記録ではありません/);
 assert.match(app,/resultExperience\.mountResult/,'saved result remains the authorized presentation');
 const body=read('ui/explorationBodyInquiry.js');
 const compare=read('ui/explorationComparisonInquiry.js');
 const life=read('ui/explorationLifeInquiry.js');
 assert.doesNotMatch(body+compare,/暫定的な問い|研究上の仮用語/);
 assert.match(body,/記録時の内容と後から追加した内容を分け/);
 assert.match(compare,/比べられる内容と比べられない内容を確かめる/);
 assert.match(life,/記録方法を確認できないため、時間を比較しません/);
 assert.doesNotMatch(life,/方法が確認できない旧記録/);
 assert.match(read('ui/explorationReadAdapter.js'),/source==='legacy-unknown'/,
  'unknown recording-method rejection must remain active');
 for(const [ja,en] of [
  ['走行条件などの任意入力項目','Optional Running Details'],
  ['記録時の内容と後から追加した内容を分け、未回答の項目も確かめる','Review Original and Later Entries Separately, Including Unanswered Items'],
  ['自分で選んだ2件の走行について、比べられる内容と比べられない内容を確かめる','Review What Can and Cannot Be Compared Across Two Selected Runs'],
  ['記録方法を確認できないため、時間を比較しません','Recording Method Unknown; Duration Not Compared']
 ])assert.equal(translateUiText(ja),en,'English copy must match revised Japanese: '+ja);
 assert.doesNotMatch(read('ui/englishFinalAppShell.js')+read('ui/englishFinalInquiry.js'),
  /Optional Entries Retained From Previous Versions|Previous examples are not actual saved records|Form a Tentative Question/);
});
