/** E2 T08: inquiry ABOUT a selected pair, never a second comparison engine.
 * The approved result comparison is the only source of eligibility and differences.
 * No reference-100 computation, no inferred pair, and no writes.
 */
import {normalizeRecordRef} from './recordRef.js';
import {compareSavedRuns,isComparableManualRun} from './runReflection.js';

export const COMPARISON_INQUIRY=Object.freeze({
 id:'T08',category:'01',topic:'過去の走りとの比較',
 question:'以前の走りとの違いから、何が気になった？',
 role:'自分で選んだ2件の走行について、比べられる内容と比べられない内容を確かめる'
});
const state=(status,reason,extra={})=>Object.freeze({status,reason,...extra});
export function comparisonInquiryModel({currentRef=null,current=null,previousRef=null,previous=null,
 explicit=false,duplicate=false,readable=true}={}){
 if(!currentRef&&current===null&&!explicit)return state('NO_RECORD','走行記録はまだ選ばれていません');
 const first=normalizeRecordRef(currentRef);
 if(!first.ok||first.value.sourceType!=='MANUAL'||!current||
    !isComparableManualRun(current)||current.id!==first.value.recordId)
  return state('UNVERIFIED','今回の手入力走行を安全に照合できません');
 if(!explicit)return state('NEED_SELECTION','比較する記録をまだ選んでいません',{current});
 if(duplicate||!readable)return state('UNVERIFIED','比較相手の指定または保存元を確認できません',{current});
 const otherRef=normalizeRecordRef(previousRef);
 if(!otherRef.ok||otherRef.value.sourceType!=='MANUAL')
  return state('INVALID_SELECTION','比較相手の記録ID・出所が正しくありません',{current});
 if(!previous||previous.id!==otherRef.value.recordId||!isComparableManualRun(previous))
  return state('MISSING','指定された比較相手が保存済みの手入力走行として見つかりません',{current});
 const comparison=compareSavedRuns(current,previous);
 if(comparison.status!=='ready')
  return state('INELIGIBLE',comparison.reason||'この2件は比較できません',{current});
 // Only dates are declared by the runner: they cannot prove start/end times.
 // Same-date saves cannot reliably be called an earlier "run".
 if(previous.date>=current.date)
  return state('ORDER_UNCLEAR','入力された走行日から以前の走行だと確認できません。同日・新しい日付を前回として扱いません',{current});
 const changed=comparison.rows.filter(r=>r.change!==null&&r.change!==0).map(r=>r.label);
 const unavailable=comparison.rows.filter(r=>r.change===null).map(r=>r.label);
 return state('READY','適格な本人の手入力走行2件を選択しています',{
  current,previous,changed,unavailable,comparison});
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;', '>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderComparisonInquiry(input={}){
 const m=comparisonInquiryModel(input);
 const current=m.current;
 const link=current?
  '#/result?record='+encodeURIComponent(current.id)+'&view=compare':'#/history';

 const body=m.status==='READY'?
  '<p data-e-evidence="pair">比較相手：'+esc(m.previous.date)+'の手入力走行／今回：'+esc(m.current.date)+'の手入力走行。</p>'+
  '<p>記録間で数値の違いを確認できる項目：'+esc(m.changed.length?m.changed.join('、'):'該当なし')+'。</p>'+
  (m.unavailable.length?'<p>両方の回答がそろわず差を確認できない項目：'+esc(m.unavailable.join('、'))+'。</p>':'')+
  '<p>ここでは値の比較表を複製しません。数値と文献参考値の同一部位・同一指標・同一計算方法の適格性は結果画面で確認してください。</p>'+
  '<a class="ex-e-compare-link" data-e-compare-return href="'+link+'&compare='+encodeURIComponent(m.previous.id)+'">2件の比較結果と条件を確認する</a>'+
  '<div class="ex-e-boundary"><strong>差からは言えないこと</strong><p>入力された日付は実際の走行順を証明しません。ROF-Jの回答区分から時間的な前後変化を確定せず、違いの原因・能力の向上・身体負荷・安全性を判定しません。</p></div>'+
  '<p class="ex-e-prompt">この2回で、どんな状況や感覚を次に確かめたいですか？</p>'+
  '<small>必要なら下の既存テーマにある「書いてみる」から任意で記述できます。メモは今回の手入力走行にのみ関連づき、比較相手の記録は変更しません。</small>':
  '<p data-e-evidence="unavailable" role="status">'+esc(m.reason)+'。別の走行や数値に自動で差し替えません。</p>'+
  (current?'<a class="ex-e-compare-link" href="'+link+'">結果画面で比較相手を明示的に選ぶ</a>':
   '<a class="ex-e-compare-link" href="#/history">保存済み記録を確認する</a>')+
  '<p>記録がなくても、一般的な過去比較の説明と既存の観察ガイドを読むことはできます。</p>';
 return '<section class="ex-e-inquiry" data-e-inquiry="T08" data-e-state="'+m.status+
  '" aria-labelledby="ex-e-t08-title"><small class="ex-e-kicker">本人の記録について考える</small>'+
  '<h3 id="ex-e-t08-title">'+COMPARISON_INQUIRY.question+'</h3>'+body+
  '<small>ここは本人の問いを考える場です。比較の計算・適格判定は結果画面が担い、知識の正誤は学習・復習のみが扱います。</small></section>';
}
