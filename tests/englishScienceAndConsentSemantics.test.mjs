import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENGLISH_UI_TEXT,translateUiText} from '../ui/englishUi.js';
import {ENGLISH_LEGAL_REVIEW_STATUS,englishLegalParity} from '../ui/englishLegalDocuments.js';
import {resultImageAnnotation} from '../ui/resultExperience.js';
import {resultExportDisclosure} from '../ui/resultSharingPolicy.js';
import {englishResultImageCopy} from '../ui/englishResultExport.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const requirements=[
 ['この色は各部位自身の文献基準100との差を示し、危険度や部位間の順位ではありません。個人の身体負荷を直接測定した値ではありません。',[/each region.s own source-study baseline of 100/i,/do not rank medical risk/i,/do not directly measure/i]],
 ['未回答は「—」で、0と区別します。',[/unanswered/i,/valid response of 0/i]],
 ['「運動前／後」は回答区分です。入力操作時刻と本人申告の評価時刻を記録しますが、実際の時間的な順序が検証できないため、変化量や原因は判定しません。',[/before\/after/i,/actual chronological order cannot be verified/i,/causes are not determined/i]],
 ['保存した走行情報を現在の同一モデルで再計算した参考値です。記録当時の結果を再現したものではありません。',[/recalculated/i,/do not reproduce/i]],
 ['走歩混在を一つの値に換算しません',[/mixed running and walking/i,/cannot be converted/i]],
 ['活動種別が未選択のため算出しません',[/no activity type selected/i]],
 ['位置・速度・フラッグを含みます。初期OFFで、本人が選んだ場合だけ保存します。',[/Off by default/i,/saved only when (selected|you choose)/i]],
 ['GPSが測定した疲労感ではなく、本人の回答です。入力操作時刻は評価・発生時刻の実測ではないため、時間的な差や原因は判定しません。',[/not GPS measurements/i,/do not directly measure/i,/does not infer/i]],
 ['この記述は本人の感覚・申告です。文献の12部位参考値は本人の組織負荷や痛みの実測ではありません。両者を数値で照合したり、病名・原因・傷害リスクを推定しません。',[/do not directly measure tissue load or pain/i,/diagnoses, causes or injury risk/i]],
 ['GPSを含めると自宅周辺の経路などの位置情報がファイルに保存されます。ファイルは暗号化されません。第三者と共有せず、安全な場所に保管してください。',[/routes near your home/i,/unencrypted/i,/store them securely/i]],
 ['共有する記録と情報を自分で選び、プレビューを確認してから印刷・PDFで保存します。本人の主観や記述は初期状態では出力されず、共有先に自動送信もしません。',[/excluded by default/i,/nothing is automatically sent/i]]
];
test('critical English scientific and privacy translations preserve explicit Japanese limits',()=>{
 for(const [original,patterns] of requirements){
  assert.ok(Object.hasOwn(ENGLISH_UI_TEXT,original),'missing exact reviewed Japanese source: '+original);
  const english=translateUiText(original);
  for(const pattern of patterns)assert.match(english,pattern,'meaning omitted: '+original);
 }
});
test('English result PNG defaults are private and unsaved or ineligible source studies remain clearly labeled',()=>{
 for(const [opts,expected] of [
  [{saved:false},/Before Saving/],
  [{saved:true,reference:{count:0,reason:'GAIT_NOT_SELECTED'}},/Not Applicable/],
  [{saved:true,reference:{count:12}},/12\/12/]
 ]){
  const image=englishResultImageCopy({evidence:resultImageAnnotation(opts),disclosure:resultExportDisclosure({date:'2026-11-11',before:0,after:null})});
  assert.match(image.evidence.status,expected);
  assert.match(image.rofText,/Omitted/);
  assert.match(image.dateText,/Omitted/);
  assert.match(image.notRisk,/Not a Ranking/i);
  assert.match(image.notMeasured,/Not a Direct Measurement/i);
  assert.doesNotMatch(JSON.stringify(image),/2026-11-11|Before 0/);
 }
});
test('legal reference is expressly unreviewed and never grants consent or changes canonical scientific storage',()=>{
 assert.equal(ENGLISH_LEGAL_REVIEW_STATUS,'DRAFT_UNREVIEWED');
 assert.equal(englishLegalParity(),true);
 const first=file('ui/firstUseExperience.js'),english=file('ui/englishUi.js'),app=file('app.js');
 assert.match(first,/data-onboard-terms/);
 assert.match(first,/data-onboard-privacy/);
 assert.match(first,/termsAccepted===true && state.privacyConfirmed===true/);
 assert.match(english,/element\.closest\('\[data-legal-backdrop\],\.fu-doc-scroll'\)/);
 assert.match(app,/onboardingState\.termsAccepted/);
 assert.match(app,/onboardingState\.privacyConfirmed/);
 assert.match(app,/settingsExperience\.saveDisplay/);
 assert.doesNotMatch(english,/fetch\(|XMLHttpRequest|localStorage\.setItem|indexedDB\.open/);
});
