/** P7 source/markup gate for 24 design targets; not a substitute for visual or user evaluation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFatigueInquiry} from '../ui/explorationInquiry.js';
import {originMarkup} from '../ui/learningOriginLesson.js';
import {createHistoryUi,renderHistory} from '../ui/historyExperience.js';
import {mountLearning} from '../ui/learningExperience.js';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const targets=[
 ['S01','ui/firstUseExperience.js','同意'],
 ['S02','ui/homeExperience.js','記録'],
 ['S03','ui/recordExperience.js','手入力'],
 ['S04','ui/recordExperience.js','距離'],
 ['S05','ui/recordExperience.js','路面'],
 ['S06','ui/rofExperience.js','ROF-J'],
 ['S07','ui/environmentExperience.js','環境メモ'],
 ['S08','ui/recordReviewExperience.js','確認'],
 ['S09','ui/resultExperience.js','参考値'],
 ['S10','ui/historyExperience.js','履歴'],
 ['S11','ui/explorationExperience.js','探究'],
 ['S12','ui/explorationTopicGuides.js','question'],
 ['S13','ui/explorationExperience.js','メモ'],
 ['S14','ui/conditionJourney.js','生活'],
 ['S15','ui/consultationExperience.js','相談・共有'],
 ['S16','ui/settingsExperience.js','データとプライバシー'],
 ['S17','ui/measurementExperience.js','未保存'],
 ['S18','ui/simulationExperience.js','シミュレーション'],
 ['S19','ui/consultationExperience.js','共有レポート'],
 ['S20','ui/settingsExperience.js','文字サイズ'],
 ['L01','ui/learningExperience.js','補助教材'],
 ['L02','ui/learningMotionLesson.js','仮想'],
 ['L03','ui/learningExperience.js','回答を確認する'],
 ['L04','ui/explorationExperience.js','学習']
];
test('P7 all 24 design targets retain a source/wording entry, with cross-cutting states distinct from routes',()=>{
 assert.equal(targets.length,24);
 assert.equal(new Set(targets.map(x=>x[0])).size,24);
 for(const [id,path,token] of targets)assert.ok(src(path).includes(token),id+' '+path+' '+token);
});
test('P7 knowledge quiz is readable and 0, no response, read error remain different states',()=>{
 const html=originMarkup();
 assert.match(html,/ROF-J：0（有効な回答）/);
 assert.match(html,/ROF-J：未回答（値なし）/);
 assert.match(html,/読取失敗/);
 assert.match(html,/回答0・未回答・読取失敗の保存上の区別/);
 assert.doesNotMatch(html,/ROF-J\s*=\s*null|ROF-J\s*=\s*0/);
 const host={innerHTML:''};
 mountLearning(host,new URLSearchParams(''));
 assert.match(host.innerHTML,/補助教材/);
 assert.match(src('ui/learningExperience.js'),/lr-eyebrow">知識の復習/);
 assert.doesNotMatch(src('ui/learningExperience.js'),/lr-eyebrow">REVIEW/);
});
test('P7 unavailable history must not be presented as an empty real account',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 const unknown=renderHistory(ui,[],{connected:false});
 const empty=renderHistory(ui,[],{connected:true});
 assert.match(unknown,/保存記録を確認できません/);
 assert.match(unknown,/記録がないと決めつけず/);
 assert.doesNotMatch(unknown,/準備中|未接続|保存した記録はまだありません/);
 assert.match(empty,/保存した記録はまだありません/);
 assert.doesNotMatch(unknown,/data-open-record/);
});
test('P7 print report terms accurately describe choices and never add internal record ID',()=>{
 const s=src('ui/consultationExperience.js');
 for(const label of ['共有レポート','参考情報','算出と共有の条件','期間の履歴'])
  assert.match(s,new RegExp('cp-report-kicker[^<]*>'+label));
 assert.doesNotMatch(s,/ACTIVITY \/ (?:SHARE REPORT|REFERENCE|EXPLANATION|HISTORY)/);
 assert.match(s,/精神面の回答・後日申告/);
 assert.match(s,/選択内容によりページ数が変わります/);
 assert.doesNotMatch(s,/記録ID：.*record\.id/);
 for(const token of ['cp-sensitive','cp-print','参考値'])assert.ok(s.includes(token));
});
test('P7 current GPS provenance and valid subjective zero remain explicit',()=>{
 const id='gps-v2-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const modern=renderFatigueInquiry({ref:{sourceType:'GPS_V2',recordId:id},record:{id,schema:2,activeSeconds:1800,finalReference:{},experience:{rofBefore:0,rofAfter:null}}});
 assert.match(modern,/GPSの保存記録/);
 assert.match(modern,/運動前 0 ／ 運動後 未回答/);
 assert.doesNotMatch(modern,/改善した|診断結果|GPS V2の計測記録/);
});
