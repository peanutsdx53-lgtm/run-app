/** E5 T05: personal inquiry about declared course and weather conditions.
 * NO GPS route analysis, weather API, new measurements or scientific loads.
 * Generic guides own general questions; manual input/M5 own writing. This only
 * exposes the runner's specific signed and source-checked claims after opt-in.
 */
import {normalizeRecordRef,encodeTypedRecordQuery} from './recordRef.js';
import {fatigueInquiryModel} from './explorationInquiry.js';
import {originalFieldValue,postHocValue} from './annotationEditorCore.js';
import {validateAnnotationPayload} from './annotationSchema.js';
import {MENTAL_PHASES,MENTAL_BASIS} from './mentalExperience.js';

export const CONDITION_INQUIRY=Object.freeze({
 id:'T05',category:'03',topic:'気温・天候',
 question:'この走りの道や天候について、自分が残した情報から何が気になった？',
 role:'本人の条件申告・欠測・後日申告の出所を区別し、原因を決めずに問いを考える'
});
export const CONDITION_FIELDS=Object.freeze([
 Object.freeze({field:'courseName',label:'コース名'}),
 Object.freeze({field:'gradeBundle',label:'坂道・傾斜'}),
 Object.freeze({field:'surfaceBundle',label:'路面'}),
 Object.freeze({field:'temperatureC',label:'気温'}),
 Object.freeze({field:'environmentNote',label:'天候・環境メモ'})
]);
const err=(status,reason,extra={})=>Object.freeze({status,reason,...extra});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fieldKeys=CONDITION_FIELDS.map(s=>s.field);
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

export function conditionInquiryModel({ref=null,record=null,reads=null}={}){
 const parent=fatigueInquiryModel({ref,record});
 if(parent.state==='NO_RECORD')return err('NO_RECORD','本人の走行記録は指定されていません');
 if(parent.state!=='VERIFIED')return err('UNVERIFIED','指定した元の走行記録を安全に照合できません');
 const nr=normalizeRecordRef(ref);
 if(!nr.ok)return err('UNVERIFIED','記録のIDと出所が正しくありません');
 if(reads===null)return err('NOT_REQUESTED','本人の条件申告はまだ開いていません',{ref:nr.value});
 if(!reads||typeof reads!=='object'||Array.isArray(reads))
  return err('READ_ERROR','保存領域の応答を照合できません',{ref:nr.value});
 const rows=[];
 for(const {field,label} of CONDITION_FIELDS){
  if(!hasOwn(reads,field)||reads[field]?.ok!==true)
   return err('READ_ERROR','走行条件の一部を安全に読み取れません',{ref:nr.value});
  const item=reads[field].value;
  if(item?.status==='ORPHANED')return err('UNVERIFIED','元記録のない追記は表示できません');
  if(!['NO_ANSWER','ACTIVE','RETRACTED'].includes(item?.status))
   return err('READ_ERROR','走行条件の申告状態を確認できません',{ref:nr.value});
  let posthoc=null,phase=null,basis=null;
  if(item.status==='ACTIVE'){
   const e=item.latest;
   if(item.provenance!=='POST_HOC_SELF_REPORT'||!e||
      e.fieldKey!==field||!['ADD','CORRECT'].includes(e.operation)||
      e.recordRef?.sourceType!==nr.value.sourceType||e.recordRef?.recordId!==nr.value.recordId||
      !Object.hasOwn(MENTAL_PHASES,e.declaredPhase)||
      !Object.hasOwn(MENTAL_BASIS,e.timeBasis)||
      !validateAnnotationPayload(field,e.payload,{ref:nr.value,record}).ok)
    return err('READ_ERROR','走行条件の追記形式・出所が不正です',{ref:nr.value});
   posthoc=postHocValue(field,e.payload);
   phase=e.declaredPhase;basis=e.timeBasis;
  }else if(item.status==='RETRACTED'&&item.latest?.operation!=='RETRACT')
   return err('READ_ERROR','撤回状態を照合できません',{ref:nr.value});
  const original=nr.value.sourceType==='MANUAL'
   ?originalFieldValue(nr.value,record,field):null;
  rows.push(Object.freeze({field,label,original,status:item.status,posthoc,phase,basis}));
 }
 return err('READY','選択した本人の条件申告を出所別に確認しました',
  {ref:nr.value,source:nr.value.sourceType,rows:Object.freeze(rows)});
}
export function renderConditionInquiry(input={}){
 const m=conditionInquiryModel(input);
 const canRead=m.status==='NOT_REQUESTED'||m.status==='READ_ERROR'&&!!m.ref;
 let evidence='';
 if(m.status==='NO_RECORD'||m.status==='UNVERIFIED')
  evidence='<p data-e-condition-evidence role="status">'+esc(m.reason)+'。ほかの記録に自動で切り替えません。</p>';
 else if(m.status==='NOT_REQUESTED')
  evidence='<p data-e-condition-evidence>本人が確認を選ぶまで、記録した道・気温・天候についての文章や後日追記を表示しません。</p>';
 else if(m.status==='READ_ERROR')
  evidence='<p data-e-condition-evidence role="alert">'+esc(m.reason)+'。未入力・未回答と決めつけず、原本の私的な文章も表示しません。</p>';
 else{
  evidence=(m.source==='MANUAL'?
   '<p class="ex-e-provenance">出所：本人が手入力した走行条件。気温も本人入力であり、気象観測値ではありません。</p>':
   '<p class="ex-e-provenance">出所：GPSで計測した距離等とは別の本人の後日申告です。GPSの位置情報から坂道・路面・気温・天候を推定しません。元のGPS記録にはこれらの申告欄がありません。</p>')+
   '<div class="ex-e-condition-fields">'+m.rows.map(r=>
    '<section class="ex-e-condition-field" data-e-condition-field="'+r.field+'"><strong>'+esc(r.label)+'</strong>'+
    (m.source==='MANUAL'?
     '<p>元の手入力記録：'+esc(r.original)+'</p>':
     '<p>元のGPS記録：該当する本人申告欄なし</p>')+
    (r.status==='ACTIVE'?
     '<p>後日追記（本人申告）：'+esc(r.posthoc)+'</p>'+
     '<p class="ex-e-provenance">本人が指定した対象時点：'+esc(MENTAL_PHASES[r.phase])+
     '／申告時点区分：'+esc(MENTAL_BASIS[r.basis])+'</p>':
     r.status==='RETRACTED'?
     '<p>後日の追記は撤回済みです。以前の追記本文は表示しません。</p>':
     '<p>後日の追記は未回答です。条件が存在しなかった意味ではありません。</p>')+
    '</section>').join('')+'</div>';
 }
 const action=canRead?'<button type="button" class="ex-e-memo" data-e-condition-reveal>'+
  (m.status==='READ_ERROR'?'もう一度、保存した条件を確認する':'この走行の道・天候の記録を確認する')+'</button>':'';
 const edit=m.status==='READY'?
  '<a class="ex-e-compare-link" href="#/annotation?'+encodeTypedRecordQuery(m.ref)+
   '">後日の条件申告の追記・訂正・撤回は別画面で行う</a>':'';
 return '<section class="ex-e-inquiry ex-e-condition-inquiry" data-e-condition-inquiry="T05" data-e-state="'+
  m.status+'" aria-labelledby="ex-e-t05-title"><small class="ex-e-kicker">本人の走行条件を考える問い</small>'+
  '<h3 id="ex-e-t05-title" tabindex="-1">'+CONDITION_INQUIRY.question+'</h3>'+evidence+action+edit+
  '<div class="ex-e-boundary"><strong>この記録だけでは分からないこと</strong>'+
  '<p>天候は環境メモに本人が明示的に保存した文章であり、気象APIの測定・自動照合ではありません。記録にない情報を補わず、条件と疲れや身体負荷の因果関係、文献12部位値への適用を推定しません。申告の対象時点は実際の発生日時を証明しません。</p></div>'+
  '<p class="ex-e-prompt">どの条件を自分で確かめたいですか？ 次に比べてみたい状況や感覚を自由に考えられます。</p>'+
  '<p><a class="ex-e-compare-link" href="#/exploration-tree?category=03&amp;topic='+encodeURIComponent('路面')+
   '">記録に結びつけず「路面」の一般的な観察ガイドを見る</a></p>'+
  '<small>一般知識・比較計算・記録編集とは別の問いです。ここでは保存も採点もしません。既存テーマの任意メモはそのまま利用できます。</small></section>';
}
