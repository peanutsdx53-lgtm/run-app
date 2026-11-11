/** E4 T04: inspect the runner's own bodily observations, not inferred pathology.
 * Existing observation guide = generic prompts; M5 editor = collection/correction;
 * result = scientific reference conditional values; inquiry = contextual question.
 * This module never writes and never opens private text before explicit opt-in.
 */
import {normalizeRecordRef,encodeTypedRecordQuery} from './recordRef.js';
import {fatigueInquiryModel} from './explorationInquiry.js';
import {MENTAL_PHASES,MENTAL_BASIS} from './mentalExperience.js';
export const BODY_INQUIRY=Object.freeze({
 id:'T04',category:'04',topic:'筋肉痛・違和感',
 question:'自分の身体についての記述を読み直して、次に何を確かめたい？',
 role:'本人が入力時と後日申告の出所・欠測・時点を吟味し、暫定的な問いを持つ'
});
const result=(status,reason,other={})=>Object.freeze({status,reason,...other});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;', '>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bodyInquiryModel({ref=null,record=null,read=null}={}){
 const parent=fatigueInquiryModel({ref,record});
 if(parent.state==='NO_RECORD')return result('NO_RECORD','保存した走行記録を選んでいません');
 if(parent.state!=='VERIFIED')return result('UNVERIFIED','元の走行記録を安全に照合できません');
 const nr=normalizeRecordRef(ref);if(!nr.ok)return result('UNVERIFIED','記録の種類またはIDを確認できません');
 if(read===null)return result('NOT_REQUESTED','自分の身体についての記述はまだ開いていません',{ref:nr.value});
 if(read?.ok!==true)return result('READ_ERROR','保存済みの身体の追記状態を読み取れません',{ref:nr.value});
 const status=read.value?.status;
 if(status==='ORPHANED')return result('UNVERIFIED','元の走行記録がないため追記の内容を表示できません');
 if(!['ACTIVE','NO_ANSWER','RETRACTED'].includes(status))
  return result('READ_ERROR','追記の状態を確認できません',{ref:nr.value});
 // Data disclosure starts here, AFTER the caller has opted in and M5 has
 // validated its event chain and source's immutable parent.
 const raw=nr.value.sourceType==='MANUAL'?record.draft?.bodyObservation:null;
 const original=typeof raw==='string'&&raw.trim()&&raw.length<=500?raw:null;
 const common={ref:nr.value,source:nr.value.sourceType,original};
 if(status!=='ACTIVE')return result(status,status==='RETRACTED'?'後から追加された記述は撤回済みです':'後日追記の回答はありません',common);
 const e=read.value.latest;
 if(read.value.provenance!=='POST_HOC_SELF_REPORT'||!e||
    e.fieldKey!=='bodyObservation'||!['ADD','CORRECT'].includes(e.operation)||
    e.recordRef?.sourceType!==nr.value.sourceType||e.recordRef?.recordId!==nr.value.recordId||
    typeof e.payload?.text!=='string'||!e.payload.text.trim()||e.payload.text.length>500||
    !Object.hasOwn(MENTAL_PHASES,e.declaredPhase)||
    !Object.hasOwn(MENTAL_BASIS,e.timeBasis))
  return result('READ_ERROR','追記の出所・形式を確認できません',{ref:nr.value});
 return result('ACTIVE','元記録と後日申告を区別して表示します',
  {...common,posthoc:e.payload.text,phase:e.declaredPhase,basis:e.timeBasis,
   enteredAt:typeof e.enteredAt==='string'?e.enteredAt:null});
}
export function renderBodyInquiry(input={}){
 const m=bodyInquiryModel(input);
 const canRead=m.status==='NOT_REQUESTED'||m.status==='READ_ERROR'&&!!m.ref;
 const original=m.source==='MANUAL'?
  '<div class="ex-e-body-original"><strong>元の手入力走行の本人記述</strong>'+
   '<p>'+(m.original?esc(m.original):'元記録には記述がありません。')+'</p></div>':
  '<p class="ex-e-body-original">元のGPS記録には、独立した身体観察の申告欄がありません。計測値から身体感覚を推定しません。</p>';
 let evidence;
 if(m.status==='NO_RECORD'||m.status==='UNVERIFIED')
  evidence='<p data-e-body-evidence role="status">'+esc(m.reason)+'。別の記録に自動で切り替えません。</p>';
 else if(m.status==='NOT_REQUESTED')
  evidence='<p data-e-body-evidence>本人が明示的に選ぶまで、元記録の私的な記述や後日追記を画面に表示しません。</p>';
 else if(m.status==='READ_ERROR')
  evidence='<p data-e-body-evidence role="alert">'+esc(m.reason)+'。未回答とは扱いません。元の私的な文章も表示しません。</p>';
 else{
  evidence=original+
   (m.status==='ACTIVE'?
    '<div class="ex-e-body-posthoc"><strong>別に保存した本人の後日追記</strong><p>'+esc(m.posthoc)+'</p>'+
     '<p>対象とした時点：'+esc(MENTAL_PHASES[m.phase])+'／申告時点の扱い：'+esc(MENTAL_BASIS[m.basis])+
     '。実際の発生時刻や入力時点との順序は証明できません。</p></div>':
    '<p data-e-body-evidence>'+esc(m.reason)+
     (m.status==='RETRACTED'?'。撤回した追記の文章は表示しません。元記録の記述は別の情報です。':'。本人が「異常なし」と申告した意味ではありません。')+'</p>');
 }
 const action=canRead?'<button type="button" class="ex-e-memo" data-e-body-reveal>'+
  (m.status==='READ_ERROR'?'もう一度、記述を確認する':'この走行の身体についての記述を確認する')+'</button>':'';
 const edit=['ACTIVE','NO_ANSWER','RETRACTED'].includes(m.status)?
  '<a class="ex-e-compare-link" href="#/annotation?'+encodeTypedRecordQuery(m.ref)+
  '">後日申告の追加・訂正・撤回は別画面で行う</a>':'';
 return '<section class="ex-e-inquiry ex-e-body-inquiry" data-e-body-inquiry="T04" data-e-state="'+
  m.status+'" aria-labelledby="ex-e-t04-title"><small class="ex-e-kicker">本人の身体観察を振り返る問い</small>'+
  '<h3 id="ex-e-t04-title" tabindex="-1">'+BODY_INQUIRY.question+'</h3>'+
  evidence+action+edit+
  '<div class="ex-e-boundary"><strong>分からないことと出所の違い</strong><p>この記述は本人の感覚・申告です。文献の12部位参考値は本人の組織負荷や痛みの実測ではありません。両者を数値で照合したり、病名・原因・傷害リスクを推定しません。</p></div>'+
  '<p class="ex-e-prompt">いつ・どこで・どんなふうに感じたか、次に何を確かめたいですか？ 答えに正誤はありません。</p>'+
  '<small>新しい身体情報の入力・保存は行いません。一般的な観察ガイドと任意メモは、これまでのテーマ内で利用できます。強い痛みや続く症状は医療の専門家へ相談してください。</small>'+
  '</section>';
}
