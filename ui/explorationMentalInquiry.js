/** E3 T03 — read-only reflection on independently saved optional mental response.
 * Mental input/edit/retract belongs to M4/M5; ROF-J is not a substitute.
 * No mental values are read without an affirmative button press in the SPA.
 */
import {normalizeRecordRef,encodeTypedRecordQuery} from './recordRef.js';
import {fatigueInquiryModel} from './explorationInquiry.js';
import {MENTAL_CHOICES,MENTAL_PHASES,MENTAL_BASIS} from './mentalExperience.js';
export const MENTAL_INQUIRY=Object.freeze({
 id:'T03',category:'05',topic:'気分・ストレス',
 question:'この気持ち・考える面の疲れの申告から、何が気になった？',
 role:'本人が選んだ実在記録の任意申告と限界から自分の疑問を考える'
});
const fail=(status,reason)=>Object.freeze({status,reason});
export function mentalInquiryModel({ref=null,record=null,read=null}={}){
 const verified=fatigueInquiryModel({ref,record});
 if(verified.state==='NO_RECORD')return fail('NO_RECORD','走行記録を指定していません');
 if(verified.state!=='VERIFIED')return fail('UNVERIFIED','元の走行記録を照合できません');
 const nr=normalizeRecordRef(ref);if(!nr.ok)return fail('UNVERIFIED','記録のIDと出所を確認できません');
 if(read===null)return Object.freeze({status:'NOT_REQUESTED',ref:nr.value});
 if(read?.ok!==true)return fail('READ_ERROR','任意申告の保存状態を安全に読み取れません');
 const status=read.value?.status;
 if(status==='NO_ANSWER')return Object.freeze({status:'NO_ANSWER',ref:nr.value});
 if(status==='RETRACTED')return Object.freeze({status:'RETRACTED',ref:nr.value});
 if(status==='ORPHANED')return fail('UNVERIFIED','元の走行記録を確認できません');
 if(status!=='ACTIVE')return fail('READ_ERROR','任意申告の状態を確認できません');
 const event=read.value?.latest;
 if(!event||event.fieldKey!=='mentalExperience'||event.operation==='RETRACT'||
    event.recordRef?.sourceType!==nr.value.sourceType||event.recordRef?.recordId!==nr.value.recordId||
    !Object.hasOwn(MENTAL_CHOICES,event.payload?.answer)||
    !Object.hasOwn(MENTAL_PHASES,event.declaredPhase)||
    !Object.hasOwn(MENTAL_BASIS,event.timeBasis)||
    read.value.provenance!=='POST_HOC_SELF_REPORT')
  return fail('READ_ERROR','任意申告の出所と内容を確認できません');
 // Do NOT echo freeText or previous events; withdrawn answers stay private.
 return Object.freeze({status:'ACTIVE',ref:nr.value,answer:event.payload.answer,
  phase:event.declaredPhase,basis:event.timeBasis});
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderMentalInquiry(input={}){
 const m=mentalInquiryModel(input);
 const active=m.status==='ACTIVE';
 const allowed=['NOT_REQUESTED','READ_ERROR'].includes(m.status)&&
  (m.status==='NOT_REQUESTED'||input.ref&&input.record);
 const evidence=m.status==='NO_RECORD'?
  '<p data-e-mental-status>記録を指定していません。ご自身の申告を示しているわけではありません。</p>':
  m.status==='UNVERIFIED'?
  '<p data-e-mental-status role="alert">'+esc(m.reason)+'。別の走行に自動で切り替えません。</p>':
  m.status==='NOT_REQUESTED'?
  '<p data-e-mental-status>この走行の任意申告はまだ開いていません。本人が選んだときだけ確認します。</p>':
  m.status==='READ_ERROR'?
  '<p data-e-mental-status role="alert">'+esc(m.reason)+'。未回答だとは扱いません。</p>':
  m.status==='NO_ANSWER'?
  '<p data-e-mental-status>この記録には精神面の任意申告がありません（未回答）。「感じなかった」とは異なります。</p>':
  m.status==='RETRACTED'?
  '<p data-e-mental-status>この記録の以前の精神面の申告は撤回済みです。過去の回答内容は表示しません。</p>':
  '<p data-e-mental-status><strong>本人の任意申告：'+esc(MENTAL_CHOICES[m.answer])+
   '</strong>（尺度得点ではありません）</p>'+
  '<p>対象とした時点：'+esc(MENTAL_PHASES[m.phase])+'／申告の扱い：'+esc(MENTAL_BASIS[m.basis])+
   '。いずれも本人が選択した情報で、客観的な測定時刻ではありません。</p>';
 const action=allowed?'<button type="button" class="ex-e-memo" data-e-mental-reveal>'+
  (m.status==='READ_ERROR'?'もう一度、申告を確認する':'この走行の任意申告を確認する')+'</button>':'';
 const edit=active||['NO_ANSWER','RETRACTED'].includes(m.status)?
  '<a class="ex-e-compare-link" href="#/annotation?'+encodeTypedRecordQuery(m.ref)+
   '">任意申告の確認・修正は別画面で行う</a>':'';
 return '<section class="ex-e-inquiry ex-e-mental-inquiry" data-e-mental-inquiry="T03" data-e-state="'+
  m.status+'" aria-labelledby="ex-e-t03-title"><small class="ex-e-kicker">本人の経験を考える問い</small>'+
  '<h3 id="ex-e-t03-title">'+MENTAL_INQUIRY.question+'</h3>'+evidence+action+edit+
  '<div class="ex-e-boundary"><strong>この回答だけでは分からないこと</strong>'+
  '<p>気持ちや考える面の疲れは本人の任意申告です。ROF-Jと合算せず、心理状態・診断・運動による原因を推定しません。</p></div>'+
  '<p class="ex-e-prompt">回答の有無や意味について、今どのような疑問がありますか？ 書くことも、何も残さず戻ることも自由です。</p>'+
  '<small>ここでは新しく回答を収集しません。本人の自由文は初期表示しません。既存の任意メモは別の機能です。</small>'+
  '</section>';
}
