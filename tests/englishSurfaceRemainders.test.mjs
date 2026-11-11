import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_UI_TEXT,translateUiText} from '../ui/englishUi.js';
test('untranslated 20-screen UI phrases are explicit English copy without rewriting user records',()=>{
 for(const input of ['クイックアクセス','現在値は配色表示範囲（60〜140）の外側です。数値はそのまま表示しています。','コンディションの見方','日付を画像に含める（任意）','内容の根拠と注意点','GPS実走履歴']){
  assert.ok(Object.hasOwn(ENGLISH_UI_TEXT,input),input);
  assert.doesNotMatch(translateUiText(input),/[ぁ-ゟァ-ヿ一-龯]/);
 }
 assert.equal(translateUiText('本人が記入した自由記述です'),'本人が記入した自由記述です');
 assert.equal(translateUiText('2026-11-11'),'2026-11-11');
 assert.equal(translateUiText('11日、1件',{attribute:'aria-label'}),'Day 11, 1 records');
 assert.equal(translateUiText('2026-11-11 記録なし',{attribute:'aria-label'}),'2026-11-11: No Record');
 assert.equal(translateUiText('保存済み手入力走行から確認 · 2 / 4 項目'),'Based on Saved Manually Entered Runs · 2 / 4 Milestones');
 assert.match(translateUiText('活動種別：ランニング。平均速度：3.03 m/s。文献条件に合う12/12部位のみ算出。路面・勾配は数値補正していません。 この色は各部位自身の文献基準100との差を示し、危険度や部位間の順位ではありません。個人の身体負荷を直接測定した値ではありません。'),/not danger or rankings between regions/);
});

test('desktop ROF-J corrections, timestamps, and source limits translate without inferring temporal change',()=>{
 const phrases=[
  '今回の記録・保存コース',
  '訂正して履歴を保存',
  '「運動前／後」は回答区分です。入力操作時刻と本人申告の評価時刻を記録しますが、実際の時間的な順序が検証できないため、変化量や原因は判定しません。未回答は「—」で、0と区別します。',
  '出所：ROF-J／本人回答。数値が同じ場合も経験が同じとは限らず、前後差や原因の測定ではありません。'
 ];
 for(const phrase of phrases)assert.doesNotMatch(translateUiText(phrase),/[ぁ-ゟァ-ヿ一-龯]/);
 assert.match(translateUiText(phrases[2]),/chronological order is not verified/);
 assert.match(translateUiText(phrases[3]),/neither actual timing differences nor causes are measured/);
 assert.equal(translateUiText('訂正履歴 0件。訂正前の回答も保存されています。'),'Revision History: 0 Entries. Earlier responses are also retained.');
 const when='運動前：入力 不明／評価（本人申告） 不明／評価時点の扱い：評価時点は不明';
 assert.equal(translateUiText(when),'Before: Entered Unknown / Self-reported Assessment Unknown / Timing Basis: Assessment time unknown');
 assert.equal(translateUiText('運動開始（本人申告）：不明／運動終了（本人申告）：不明'),'Activity Start (Self-reported): Unknown / Activity End (Self-reported): Unknown');
 assert.equal(translateUiText('運動前：入力 不明／評価（本人申告） 不明／評価時点の扱い：未登録の値'),'運動前：入力 不明／評価（本人申告） 不明／評価時点の扱い：未登録の値');
});
