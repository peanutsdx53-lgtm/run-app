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
