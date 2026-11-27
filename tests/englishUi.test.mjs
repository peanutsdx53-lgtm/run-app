import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_UI_TEXT,translateUiText,translateLessonComposite} from '../ui/englishUi.js';
import {readFileSync} from 'node:fs';

test('English phrase table covers shared navigation and evidence with precise terminology',()=>{
 for(const [ja,en] of [
  ['ホーム','Home'],['記録','Record'],['結果','Results'],['履歴','History'],
  ['探究','Explore'],['設定','Settings'],
  ['文献の根拠と条件','Research Source & Conditions'],
  ['出所：GPSの保存記録','Source: Saved GPS Record'],
  ['未回答','Not answered'],['日々のコンディション','Daily Condition']
 ]){
  assert.equal(translateUiText(ja),en);
 }
 assert.ok(Object.keys(ENGLISH_UI_TEXT).length>=220,'documented preview coverage');
});

test('translation never guesses the meaning of variable data, times, IDs, or novel user text',()=>{
 for(const value of ['run-v1-0d6d1228-b3e5-4b42-b4e3-ad826fe134d9','2026-11-11','私の日本語メモ','ROF-J: 0','6.00 km / 33分','医学診断を確定する']){
  assert.equal(translateUiText(value),value);
 }
 assert.equal(translateUiText('  記録  '),'  Record  ');
 assert.equal(translateUiText(''),'');
});


test('S09 T06: brief English reference heading preserves both applicability and limits',()=>{
 const label=translateUiText('文献参考値の条件と限界');
 assert.equal(label,'Reference Scope & Limits');
 const html=readFileSync(new URL('../ui/englishResultCopy.js',import.meta.url),'utf8');
 assert.ok(html.includes('"文献参考値の条件と限界": "Reference Scope & Limits"'));
 assert.match(translateUiText('この色は各部位自身の文献基準100との差を示し、危険度や部位間の順位ではありません。個人の身体負荷を直接測定した値ではありません。'),/not directly measure/);
});

test('language selection does not mutate canonical model or legal document source',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const ui=read('ui/englishUi.js'),app=read('app.js'),settings=read('ui/settingsExperience.js');
 assert.match(ui,/const SKIP=.*\[data-legal-backdrop\]/,'do not translate legal bodies');
 assert.match(app,/settingsExperience.saveDisplay\(onboardStorage,updated,settingsUi.displaySnapshot\)/);
 assert.match(settings,/data-settings-language="en"/);
 assert.match(settings,/data-settings-language="en"[^>]*>English<\/button>/);
 assert.doesNotMatch(ui,/fetch\(|XMLHttpRequest|localStorage\.setItem|indexedDB\.open/);
 assert.match(read('ui/firstUseExperience.js'),/data-legal-japanese-original/,'the Japanese original has its own language-marked block');
});

test('extended English copy preserves scientific and consent limits across four UI areas',()=>{
 const pairs=[
  ['日付・距離・時間・活動種目を入力します。追加情報は任意です。入力後に内容を確認して保存します。','Enter a date'],
  ['保存した走行情報を現在の同一モデルで再計算した参考値です。記録当時の結果を再現したものではありません。','do not reproduce'],
  ['未回答は「—」で、0と区別します。','valid response of 0'],
  ['この色は各部位自身の文献基準100との差を示し、危険度や部位間の順位ではありません。個人の身体負荷を直接測定した値ではありません。','do not directly measure'],
  ['位置・速度・フラッグを含みます。初期OFFで、本人が選んだ場合だけ保存します。','Off by default'],
  ['学びの内容は一般的な知識です。あなたの身体や調子の原因を自動的に判定しているわけではありません。','general information'],
  ['保存記録を確認できません。記録がないと決めつけず、未保存の入力も表示しません。','does not assume'],
  ['位置情報へのアクセスはGPS測定を利用する際に端末が確認します。権限は端末・ブラウザ側で変更できます。この設定画面では位置情報の許可を変更できません。','not on this page']
 ];
 for(const [source,meaning] of pairs)assert.ok(translateUiText(source).includes(meaning),source);
 assert.ok(Object.keys(ENGLISH_UI_TEXT).length>=550,'expanded English coverage must not regress');
});

test('English UI is an explicit reviewed dictionary with offline assets and no legal-body translation',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const sw=read('sw.js');
 const assets=JSON.parse(sw.match(/const ASSETS=(\[[^\n]*\]);/)[1]);
 for(const path of ['englishUi.js','englishRecordHistoryCopy.js','englishResultCopy.js','englishGpsExplorationCopy.js','englishSettingsCopy.js','englishGuideCopy.js','englishLearningCopy.js']){
  assert.ok(assets.includes('./ui/'+path),'offline copy unavailable: '+path);
 }
 const english=read('ui/englishUi.js');
 assert.match(english,/element\.matches\('input,textarea'\)/,'input values must not be translated');
 assert.match(english,/element\.closest\('\[data-legal-backdrop\],\.fu-doc-scroll'\)/);
 assert.doesNotMatch(english,/\.value\s*=|localStorage\.setItem|indexedDB\.open/);
});

test('first-use guide and learning sources have exact English coverage without altering Japanese legal consent',()=>{
 const pairs=[
  ['運動の記録と日々の体調を保存し、運動の経過を確認できます。','daily-condition records'],
  ['記録・主観・文献参考値の意味と限界を区別して確かめます。','separately'],
  ['初回の利用規約・プライバシー確認は日本語です。英語プレビューは利用開始後の設定で選択できます。','Official Terms and Privacy confirmation'],
  ['平均ペースは1 km進むためにかかる平均時間です。平均速度は1時間に進む平均距離です。どちらも記録した距離と経過時間から求められます。','Average pace'],
  ['Fukuchi ほか（2017）は習慣的に走る28人を対象に、2.5・3.5・4.5 m/sでのトレッドミル走行時の下肢関節角度・関節モーメント等を測定しました。利用者本人の関節を計測したものでも、負荷を個別推定できる根拠でもありません。','28 habitual runners'],
  ['Vernillo ほか（2020）は成人19人のトレッドミル走で、速度2.50・3.33・4.17 m/s、傾斜角0・±5・±10度における地面反力・筋活動等を調べました。アプリの「上り30％」はコース構成比であり、実験の傾斜角度とは比較できません。','19 adults'],
  ['日本語版ROF-Jは大学生85人と大学運動部員35人などで検討された、主観的な疲労感を記録する尺度です。初心者ランナー全員での妥当性や傷害リスクの予測を保証するものではありません。原著で運動前後を比較した大学運動部員35人の研究手順と、本アプリで本人が後から入力する記録は同じではありません。本人が回答した0と未回答を区別します。「運動前／後」は回答区分であり、記録した時点や運動との客観的な時間的順序を証明するものではありません。同一走行内の時間的な前後差は判定しません。','85 university students'],
  ['記録した距離と時間を見て、今日はどんなペースだったか確かめてみましょう。','recorded distance']
 ];
 for(const [ja,en] of pairs)assert.ok(translateUiText(ja).includes(en),'missing or unsafe translation: '+ja);
 const original=readFileSync(new URL('../ui/firstUseExperience.js',import.meta.url),'utf8');
 assert.match(original,/data-onboard-legal-step lang=/);
 assert.match(original,/renderLegalDocumentModal/);
 assert.doesNotMatch(readFileSync(new URL('../ui/englishUi.js',import.meta.url),'utf8'),/element\.closest\('\[data-legal-backdrop\],\.fu-doc-scroll,\[data-onboard-legal-step\]'\)/);
});

test('English quiz translations preserve score indexes, sources and missingness',async()=>{
 const modules=[
  ['../ui/learningExperience.js','../ui/englishCurriculumPace.js','QUIZ','ENGLISH_CURRICULUM_PACE','prompt'],
  ['../ui/learningOriginLesson.js','../ui/englishCurriculumCopy.js','ORIGIN_QUIZ','ENGLISH_CURRICULUM_ORIGIN','question'],
  ['../ui/learningMotionLesson.js','../ui/englishCurriculumMotion.js','MOTION_QUESTIONS','ENGLISH_CURRICULUM_MOTION','prompt'],
  ['../ui/learningFatigueLesson.js','../ui/englishCurriculumFatigue.js','FATIGUE_QUESTIONS','ENGLISH_CURRICULUM_FATIGUE','prompt']
 ];
 for(const [jp,ep,qkey,ekey,titleKey] of modules){
  const source=await import(jp),translated=await import(ep),questions=source[qkey];
  assert.equal(questions.length,4);
  for(const q of questions){
   assert.match(translateUiText(q[titleKey]),/[A-Za-z]/);
   assert.ok(!/[ぁ-ゟァ-ヿ]/.test(translateUiText(q[titleKey])),'untranslated quiz prompt '+q.id);
   assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.choices.length);
   for(const entry of [...q.choices,...(q.reasons||q.rationales||[])]){
    assert.notEqual(translateUiText(entry),entry,'missing translation: '+q.id+' '+entry);
   }
   assert.ok(translated[ekey]);
  }
 }
 assert.match(translateLessonComposite('問1｜'+(await import('../ui/learningOriginLesson.js')).ORIGIN_QUIZ[0].question),/^Question 1 \| In a hypothetical example/);
});
test('unreviewed English legal translation retains all Japanese articles and user consent',async()=>{
 const m=await import('../ui/englishLegalDocuments.js');
 assert.equal(m.ENGLISH_LEGAL_REVIEW_STATUS,'DRAFT_UNREVIEWED');
 assert.equal(m.englishLegalParity(),true);
 assert.doesNotMatch(m.englishLegalDocumentMarkup('terms'),/authoritative version|Unofficial English reference translation|legal review pending/);
 assert.match(m.englishLegalDocumentMarkup('privacy'),/Article 17 \(Inquiries\)/);
});

test('lesson pagination and optional learning progress render without Japanese numeric labels',()=>{
 for(const [ja,en] of [
  ['問 1','Question 1'],
  ['学習済みとして記録 0 / 4教材','Marked as Studied 0 / 4 Lessons'],
  ['問 1 / 4 · 回答 0/4','Question 1 / 4 · Answered 0/4'],
  ['全4問 · 回答 3/4','All 4 Questions · Answered 3/4'],
  ['回答を確認しました · 3/4問に回答','Answers Reviewed · 3/4 Questions Answered']
 ])assert.equal(translateLessonComposite(ja),en);
});

test('English DELETE confirmation never weakens the destructive-action double check',async()=>{
 const {renderDataDelete,makeDataUi}=await import('../ui/dataManagementUi.js');
 const empty=makeDataUi();
 const en=renderDataDelete(empty,'en'),ja=renderDataDelete(empty,'ja');
 assert.match(en,/<label class="dm-confirm">Enter DELETE/);
 assert.match(en,/data-dm-delete-word maxlength="6"/);
 assert.match(en,/data-dm-delete-confirm[^>]*disabled/);
 assert.match(ja,/data-dm-delete-word maxlength="2"/);
 assert.match(ja,/placeholder="削除"/);
 const enabled=renderDataDelete({...empty,deleteAgreed:true,deleteWord:'DELETE'},'en');
 assert.doesNotMatch(enabled,/data-dm-delete-confirm[^>]*disabled/);
 const wrong=renderDataDelete({...empty,deleteAgreed:true,deleteWord:'削除'},'en');
 assert.match(wrong,/data-dm-delete-confirm[^>]*disabled/);
});

test('English learning catalogue translates dynamic checklist, course numbers, and accessible counts',()=>{
 for(const [source,expected] of [
  ['学習済みとして記録 0 / 4教材','Marked as Studied 0 / 4 Lessons'],
  ['学習済みとして記録 3 / 4教材','Marked as Studied 3 / 4 Lessons'],
  ['基礎教材 01 · 速さと配分','Foundations Lesson 01 · Speed & Pacing'],
  ['基礎教材 02 · 身体の動き','Foundations Lesson 02 · Body Movement'],
  ['基礎教材 03 · 疲労と休養','Foundations Lesson 03 · Fatigue & Rest'],
  ['0件を学習済みとして記録','0 lessons marked as studied'],
  ['4件を学習済みとして記録','4 lessons marked as studied']
 ]){
  assert.equal(translateLessonComposite(source),expected,source);
  assert.doesNotMatch(translateLessonComposite(source),/[ぁ-ゟァ-ヿ一-龯]/,source);
 }
 assert.equal(translateUiText('補助教材'),'Supplementary Lesson');
 assert.equal(translateUiText('起床時の調子'),'Waking Condition');
 assert.equal(translateUiText('直近7日の入力'),'Days Logged');
 assert.equal(translateUiText('私が書いたメモ'),'私が書いたメモ','a novel user note is not translatable interface copy');
});

test('Home edit auto-save has a complete English sentence and exit action',()=>{
 const copy='ハンドルを長押しして移動できます。上下ボタン・表示・サイズ変更も使えます。操作するとすぐに保存されます。';
 assert.equal(translateUiText(copy),'Long-press a handle to rearrange cards, or use Up/Down, show/hide and width controls. Each change is saved immediately.');
 assert.equal(translateUiText('編集を終了'),'Finish Editing');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(app.includes(copy));
 assert.doesNotMatch(app,/data-home-save|data-home-cancel/,'obsolete manual-save controls must not reappear');
});

test('merged English dictionary preserves effective translations without redundant earlier entries',()=>{
 const pairs=[
  ['探究','Explore'],
  ['日々のコンディション','Daily Condition'],
  ['プロフィール','Profile'],
  ['平均速度','Average Speed'],
  ['記録する','Record Activity'],
  ['結果を開く','Open Results'],
  ['保存済みの履歴を見る','View Saved History'],
  ['結果を見る','View Results']
 ];
 const ui=readFileSync(new URL('../ui/englishUi.js',import.meta.url),'utf8');
 const explicit=ui.split(' ...ENGLISH_RECORD_HISTORY_COPY')[0];
 for(const [source,english] of pairs){
  assert.equal(ENGLISH_UI_TEXT[source],english,'dictionary must preserve active translation');
  assert.equal(translateUiText(source),english,'visible translation must remain unchanged');
  assert.equal(explicit.split('\n').some(line=>line.trim().startsWith(JSON.stringify(source)+':')),false,
   'identical earlier override should not return: '+source);
 }
});

test('earlier shell dictionary contains no keys already defined in later final UI dictionaries',()=>{
 const source=readFileSync(new URL('../ui/englishUi.js',import.meta.url),'utf8');
 const original=source.split(' ...ENGLISH_RECORD_HISTORY_COPY')[0];
 const early=new Set([...original.matchAll(/^\s*"([^"]+)"\s*:\s*"/gm)].map(m=>m[1]));
 const laterFiles=[
  'englishFinalAppShell.js','englishFinalOnboarding.js','englishFinalRecording.js',
  'englishFinalConditions.js','englishFinalHomeData.js','englishFinalBackup.js',
  'englishFinalAnnotation.js','englishFinalGps.js','englishFinalInquiry.js'
 ];
 for(const name of laterFiles){
  const later=readFileSync(new URL('../ui/'+name,import.meta.url),'utf8');
  for(const match of later.matchAll(/^\s*"([^"]+)"\s*:\s*"/gm))
   assert.equal(early.has(match[1]),false,'redundant earlier UI translation: '+match[1]+' in '+name);
 }
 for(const [ja,en] of [
  ['距離・時間・ペース','Distance, Duration and Pace'],
  ['記録内容の確認','Review Activity Record'],
  ['保存済みの履歴を見る','View Saved History'],
  ['記録する','Record Activity']
 ])assert.equal(translateUiText(ja),en,'final translation remains unchanged: '+ja);
});

test('an unavailable Learning route has useful Japanese and English guidance',()=>{
 const learning=readFileSync(new URL('../ui/learningExperience.js',import.meta.url),'utf8');
 assert.match(learning,/この教材は利用できません/);
 assert.doesNotMatch(learning,/未公開の教材や不明なリンクを、別の授業へ置き換えずにお知らせします/);
 for(const [ja,en] of [
  ['この教材は利用できません','This Lesson Is Unavailable'],
  ['学習の一覧から利用できる教材を選んでください。','Choose an available lesson from the Learning list.'],
  ['学習の一覧へ戻る','Back to Learning']
 ])assert.equal(translateUiText(ja),en);
});

test('S09 comparison retains English labels and translates only activity-type display composites',()=>{
 for(const [ja,en] of [
  ['比較相手','Comparison Record'],['選択中','Current Record'],
  ['参考値の差','Reference Value Difference'],['ポイント','points'],
  ['ランニング','Running'],['ジョギング','Jogging'],['ウォーキング','Walking']
 ]) assert.equal(translateUiText(ja),en,ja);
 const option={closest:selector=>selector==='.rv4-history'?{}:null,
  matches:selector=>selector==='select[data-compare-select] option'};
 const summary={closest:selector=>selector==='.rv4-history'?{}:null,
  matches:selector=>selector==='.rv4-compare-summary span'};
 assert.equal(translateUiText('2026-11-20 ・ 5.00 km ・ ランニング',{element:option}),
  '2026-11-20 · 5.00 km · Running');
 assert.equal(translateUiText('2026-11-20 ・ 5.00 km ・ ジョギング ・ 同条件2/3（活動種別が異なる）',{element:option}),
  '2026-11-20 · 5.00 km · Jogging · Same-Condition Record 2/3 (Different Activity Type)');
 assert.equal(translateUiText('5.00 km ・ ウォーキング',{element:summary}),'5.00 km · Walking');
 // Composite translation is tightly scoped to comparison UI elements.
 assert.equal(translateUiText('5.00 km ・ ランニング'),'5.00 km ・ ランニング');
 const userText={closest:selector=>selector==='[data-user-authored]'?{}:null,
  matches:selector=>selector==='.rv4-compare-summary span'};
 assert.equal(translateUiText('5.00 km ・ ランニング',{element:userText}),
  '5.00 km ・ ランニング','user-authored text must be immutable');
});

test('S09 English comparison covers numeric cells, dated headers, note fallbacks and scientific limitations',()=>{
 const context=selector=>({element:{matches:pattern=>pattern===selector,
  closest:query=>query==='.rv4-history'?{}:null}});
 const th=context('.rv4-comparison-table th'),td=context('.rv4-comparison-table td,.rv4-compare-card span');
 const method=context('.rv4-region-compare-method p'),question=context('.rv4-question-continuation > p');
 assert.equal(translateUiText('比較相手 2026-11-20',th),'Comparison Record 2026-11-20');
 assert.equal(translateUiText('選択中 2026-11-21',th),'Current Record 2026-11-21');
 for(const [input,expected] of [['28.0 分','28.0 min'],['5:36 分/km','5:36 min/km'],['+7.4 点','+7.4 points']])
  assert.equal(translateUiText(input,td),expected);
 assert.equal(translateUiText('2026-11-20の記録に残した問いです。自動では転記しません。',question),
  'This question was saved with the 2026-11-20 record. It is not copied automatically.');
 const source=readFileSync(new URL('../ui/runReflection.js',import.meta.url),'utf8');
 const region=readFileSync(new URL('../ui/regionReferenceComparison.js',import.meta.url),'utf8');
 const caution=source.match(/uncertainty:'([^']+)'/)[1],note=region.match(/note:'([^']+)'/)[1];
 assert.match(translateUiText(caution),/does not infer within-record/);
 const intro='保存した走行情報を現在の同一モデルで再計算した参考値です。記録当時の結果を再現したものではありません。';
 assert.match(translateUiText(intro+note,method),/injury risk/);
 assert.equal(translateUiText('メモなし'),'No Notes');
 const ui=readFileSync(new URL('../ui/englishUi.js',import.meta.url),'utf8');
 const result=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.ok(!ui.includes('.rv4-comparison-memos, .rv4-note p'));
 assert.match(result,/comparison\.other\.memo\?' data-user-authored'/);
 assert.match(result,/comparison\.current\.memo\?' data-user-authored'/);
});

test('S09 T10: selected reference region is singular in English, without changing plural conditions or saved notes',()=>{
 const selected={matches:selector=>selector==='.rv4-reading > small',
  closest:selector=>selector==='.rv4-body'?{}:null};
 assert.equal(translateUiText('選択中の部位',{element:selected}),'Selected Region');
 assert.equal(translateUiText('  選択中の部位  ',{element:selected}),'  Selected Region  ');
 assert.equal(translateUiText('選択中の部位'),'Selected Regions',
  'the multi-region conditions label must keep its plural dictionary entry');
 const other={matches:()=>false,closest:()=>null};
 assert.equal(translateUiText('選択中の部位',{element:other}),'Selected Regions');
 const authored={matches:selector=>selector==='.rv4-reading > small',
  closest:selector=>selector==='[data-user-authored]'||selector==='.rv4-body'?{}:null};
 assert.equal(translateUiText('選択中の部位',{element:authored}),'選択中の部位',
  'a personally written note may contain the same words without being translated');
});


test('History search help is bilingual and Manual abbreviation is limited to its filter',()=>{
 assert.equal(translateUiText('検索期間'),'Search Period');
 assert.equal(translateUiText('検索条件の説明'),'Search Filter Help');
 assert.match(translateUiText('全期間を選んでも、月間集計は表示中の月のみです。'),/monthly summary/);
 const element={matches:selector=>selector==='.hx-source-controls button[data-record-source="MANUAL"]'};
 assert.equal(translateUiText('手入力',{element}),'Manual');
 assert.equal(translateUiText('手入力'),'Manual Entry');
});


test('History advanced disclosure labels are translated without altering user data',()=>{
 assert.equal(translateUiText('詳細な絞り込み'),'More Filters');
 assert.equal(translateUiText('有効な絞り込み'),'Active Filters');
 assert.equal(translateUiText('検索期間'),'Search Period');
 assert.equal(translateUiText('手入力'),'Manual Entry');
});


test('Profile Optional heading and description are bilingual and concise',()=>{
 assert.equal(translateUiText('任意'),'Optional');
 assert.equal(translateUiText('身長・体重・走る目的など'),'Height, Weight, Goals, and More');
});

test('Course-only short labels do not change research or accessible full terms',()=>{
 const grade={matches:s=>s==='.rv-course [data-rv-grade]'};
 const mode={matches:s=>s==='.rv-course [data-rv-surface-mode]'};
 const tile={matches:s=>s==='.rv-course .rv-surface-tile span:first-child'};
 assert.equal(translateUiText('割合',{element:grade}),'By %');
 assert.equal(translateUiText('1種類',{element:mode}),'Single');
 assert.equal(translateUiText('複数・割合',{element:mode}),'Mixed %');
 assert.equal(translateUiText('陸上トラック',{element:tile}),'Running Track');
 assert.equal(translateUiText('締まった土道',{element:tile}),'Packed Dirt');
 assert.equal(translateUiText('割合'),'Percentage');
 assert.equal(translateUiText('複数・割合'),'Multiple Surfaces by Proportion');
 assert.equal(translateUiText('締まった土道'),'Compacted Dirt');
});


test('Course shortened text has descriptive aria labels and English percentage editor copy',()=>{
 const a={matches:sel=>sel==='.rv-course [data-rv-grade],.rv-course [data-rv-surface-mode]'};
 const n={matches:sel=>sel==='.rv-course [data-rv-slope-number],.rv-course [data-rv-surface-value]'};
 const strong={matches:sel=>sel==='.rv-course .rv-fine-top > strong'};
 assert.equal(translateUiText('上り・下りの距離割合を設定',{element:a,attribute:'aria-label'}),'Set Uphill and Downhill Distance Shares');
 assert.equal(translateUiText('複数路面の距離割合を設定',{element:a,attribute:'aria-label'}),'Set Distance Shares for Multiple Surfaces');
 assert.equal(translateUiText('未入力',{element:n,attribute:'placeholder'}),'—');
 assert.equal(translateUiText('未入力'),'Not Entered');
 assert.equal(translateUiText('上りを調整',{element:strong}),'Adjust Uphill');
 assert.equal(translateUiText('締まった土道を調整',{element:strong}),'Adjust Compacted Dirt');
});


test('UX12 generated history date accessible names preserve the exact activity or rest date',()=>{
 const element=(iso,{authored=false,match=true}={})=>({
  matches:selector=>match&&selector==='time.datebox[datetime]',
  closest:selector=>authored&&selector==='[data-user-authored]'?{}:null,
  getAttribute:name=>name==='datetime'?iso:null
 });
 for(const [ja,iso,en] of [
  ['走行日：2026年11月11日','2026-11-11','Activity Date: 2026-11-11'],
  ['休養日：2026年1月2日','2026-01-02','Rest Day Date: 2026-01-02'],
  ['走行日：2024年2月29日','2024-02-29','Activity Date: 2024-02-29']
 ]){
  const context={element:element(iso),attribute:'aria-label'};
  assert.equal(translateUiText(ja,context),en);
  assert.equal(translateUiText(' '+ja+' ',context),' '+en+' ');
  assert.equal(translateUiText(en,context),en);
  assert.equal(translateUiText(ja,{...context,element:element('2026-01-01')}),ja,'mismatched dates not reinterpreted');
  assert.equal(translateUiText(ja,{...context,element:element(iso,{authored:true})}),ja,'user text untouched');
  assert.equal(translateUiText(ja,{...context,element:element(iso,{match:false})}),ja,'unrelated element untouched');
  assert.equal(translateUiText(ja,{...context,attribute:'title'}),ja,'unrelated attribute untouched');
 }
 assert.equal(translateUiText('走行日：日付未取得',{element:element(''),attribute:'aria-label'}),'走行日：日付未取得');
});

test('linked-note presentation translates without exposing machine terminology',()=>{
 for(const [ja,en] of [
 ['以前の文章を保持し、本人の言葉だけを修正します。元の走行との関連は変更しません。','Previous text is kept. Editing your note does not change its link to the original activity.'],
 ['関連する走行記録：','Linked activity:'],
 ['関連する走行記録あり','Linked to an activity'],
 ['関連する走行記録を確認できません','The linked activity could not be verified'],
 ['走行記録に関連づけていないメモ','Note not linked to an activity']
 ])assert.equal(translateUiText(ja),en);
});
