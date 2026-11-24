import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_EXPLORE_UI,translateExploreDynamic} from '../ui/englishExploreDynamic.js';
import {ENGLISH_EXPLORE_KNOWLEDGE} from '../ui/englishExploreKnowledge.js';
import {translateUiText} from '../ui/englishUi.js';

const el=(inside=true,user=false)=>({
 closest(selector){
  if(selector==='.ex-page')return inside?{}:null;
  return user&&selector.includes('[data-user-authored]')?{}:null;
 }
});
const english=el();
test('explicit-run date, fatigue and distance composites translate without changing values',()=>{
 for(const [raw,translation] of [
  ['保存済み走行：2026-11-20、5.00 km、経過時間 35.0 分','Saved Run: 2026-11-20 · 5.00 km · 35.0 min elapsed'],
  ['本人の疲労感：運動前 2 ／ 運動後 10','Perceived Fatigue: Before 2 / After 10'],
  ['本人の疲労感：運動前 未回答 ／ 運動後 0','Perceived Fatigue: Before Unanswered / After 0'],
  ['経過時間：35分00秒','Elapsed Time: 35 min 00 sec'],
  ['保存された手入力走行は2件です。2件以上あれば結果画面から記録を選んで比較できます。','2 saved manual runs. Select two or more in Results to compare.'],
  ['2026-11-20 に保存したROF-Jの入力に関連','Related to self-reported ROF-J saved on 2026-11-20']
 ]){
  assert.equal(translateExploreDynamic(raw,{element:english}),translation,raw);
 }
});
test('UX13 visible system headings have concise correct English and preserve authored text',()=>{
 for(const [ja,en] of [['7つの分野','7 Areas'],['読むテーマ','Topics'],['選んだ分野','Category'],['走る前後の工夫','Before & After Runs'],['上りの動き','Uphill Movement'],['下りの動き','Downhill Movement'],['押して進む','Push Uphill'],['記録や経験を手がかりにする','Use Records or Experience as Clues'],['情報の出所と限界','Sources & Limits'],['参考知識と研究出典','Background & Research Sources']]){
  assert.equal(translateUiText(ja,{element:english}),en,ja);
  assert.equal(translateUiText(ja,{element:el(true,true)}),ja,'authored text must stay unchanged');
 }
});
test('non-Explore and authored records are never translated',()=>{
 assert.equal(translateExploreDynamic('保存済み走行：2026-11-20、5.00 km、経過時間 35.0 分',{element:el(false)}),null);
 assert.equal(translateExploreDynamic('保存済み走行：2026-11-20、5.00 km、経過時間 35.0 分',{element:el(true,true)}),null);
 assert.equal(translateExploreDynamic('昨日、膝が痛い',{element:english}),null);
 assert.equal(translateUiText('昨日、膝が痛い',{element:english}),'昨日、膝が痛い');
 assert.equal(translateUiText('昨日、膝が痛い',{element:el(true,true)}),'昨日、膝が痛い');
});
test('new modal help, research sources and state captions have exact English equivalents',()=>{
 for(const k of ['強調表示の意味','選んだ分野と強調表示の説明','情報の限界・出所',
  '平均ペースと平均速度の見方','走るとき、脚の関節はどう働く？',
  '文献の参考値をどう読めばよい？','日本語版ROF-Jは大学生85人と大学運動部員35人などで検討された、主観的な疲労感を記録する尺度です。初心者ランナー全員での妥当性や傷害リスクの予測を保証するものではありません。原著で運動前後を比較した大学運動部員35人の研究手順と、本アプリで本人が後から入力する記録は同じではありません。本人が回答した0と未回答を区別します。「運動前／後」は回答区分であり、記録した時点や運動との客観的な時間的順序を証明するものではありません。同一走行内の時間的な前後差は判定しません。'])
  assert.ok(ENGLISH_EXPLORE_KNOWLEDGE[k],k);
 assert.equal(ENGLISH_EXPLORE_UI['自分の情報と照らす'],'Review Your Information');
 assert.equal(translateUiText('強調表示の意味',{element:english}),'Meaning of Highlighting');
});

// UX14: the same full category name must appear in visible titles and
// accessible names, including the real draft/saved/example provenance suffixes.
test('UX14 category names agree across plain and related accessible labels',()=>{
 const node={...english,matches:selector=>selector==='.ex-node'};
 const ctx={element:node,attribute:'aria-label'};
 for(const [ja,en] of [['走りの記録','Your Running Records'],['身体のしくみ','How the Body Works'],['コースと環境','Course & Environment'],['疲れと回復','Fatigue & Recovery'],['暮らしと気持ち','Life & Feelings'],['走る前後の工夫','Before & After Runs'],['目的と楽しみ方','Goals & Enjoyment']]){
  assert.equal(translateUiText(ja,{element:node}),en);
  assert.equal(translateUiText(ja,ctx),en);
  assert.equal(translateUiText(ja,{element:el(true,true)}),ja);
 }
 for(const [ja,en,reason,description] of [
  ['走りの記録','Your Running Records','入力中の走行距離・時間などに関連','Related to Unsaved Running Distance and Duration'],
  ['身体のしくみ','How the Body Works','入力中の身体に関するメモに関連','Related to Unsaved Body Notes'],
  ['コースと環境','Course & Environment','入力中の上り坂・下り坂の情報に関連','Related to Unsaved Uphill and Downhill Data'],
  ['疲れと回復','Fatigue & Recovery','入力中の運動前後の疲れに関連','Related to Unsaved Perceived Fatigue'],
  ['疲れと回復','Fatigue & Recovery','2026-11-11 に保存したROF-Jの入力に関連','Related to self-reported ROF-J saved on 2026-11-11'],
  ['暮らしと気持ち','Life & Feelings','2026-11-20 の生活コンディション記録に関連','Related to the Daily Condition Entry on 2026-11-20'],
  ['走りの記録','Your Running Records','表示例：走行距離の入力','Example: Running Distance Entry'],
  ['コースと環境','Course & Environment','表示例：上り坂の入力','Example: Uphill Entry']
 ])assert.equal(translateUiText(ja+'、'+reason,ctx),en+', '+description);
 const authored='走りの記録、入力中の走行距離・時間などに関連';
 assert.equal(translateUiText(authored,{element:el(true,true),attribute:'aria-label'}),authored);
 assert.equal(translateUiText('目的と楽しみ方、不明な説明',ctx),'目的と楽しみ方、不明な説明');
 assert.equal(translateExploreDynamic('目的と楽しみ方、入力中の身体に関するメモに関連',{element:node}),'Goals & Enjoyment, Related to Unsaved Body Notes');
});
