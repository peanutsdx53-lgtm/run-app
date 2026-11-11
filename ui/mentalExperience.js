/** Professor M4: independent optional user report, NOT a psychological scale. */
export const MENTAL_CHOICES=Object.freeze({FELT:'感じた',NOT_FELT:'感じなかった',UNSURE:'よく分からない'});
export const MENTAL_PHASES=Object.freeze({UNSPECIFIED:'特定しない',BEFORE:'走る前',DURING:'走っている間',AFTER:'走った後'});
export const MENTAL_BASIS=Object.freeze({UNKNOWN:'時点は不明',AT_ENTRY:'この画面の入力時点',RECALLED:'過去を思い出して申告'});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=(table,k)=>Object.prototype.hasOwnProperty.call(table,k);
export const newMentalDraft=()=>({answer:null,declaredPhase:'UNSPECIFIED',timeBasis:'UNKNOWN',freeText:'',open:false});
export function mentalSummary(d){return d?.answer&&has(MENTAL_CHOICES,d.answer)?MENTAL_CHOICES[d.answer]+'（本人の任意申告）':'未回答';}
export function renderMentalInput(d=newMentalDraft(),scope='manual'){
 if(!['manual','gps'].includes(scope))throw TypeError('invalid input scope');
 const radio=Object.entries(MENTAL_CHOICES).map(([key,label])=>'<label class="mx-choice"><input type="radio" name="mental-'+scope+'" data-mental-answer="'+scope+'" value="'+key+'" '+(d.answer===key?'checked':'')+'><span>'+label+'</span></label>').join('');
 const options=(values,current)=>Object.entries(values).map(([key,label])=>'<option value="'+key+'" '+(current===key?'selected':'')+'>'+label+'</option>').join('');
 return '<details class="mx-panel" data-mental-panel="'+scope+'" '+(d.open?'open':'')+'><summary><span class="mx-label">気持ち・考える面の疲れ <small>任意</small></span><span class="mx-current">'+esc(mentalSummary(d))+'</span></summary>'+
 '<div class="mx-content"><fieldset class="mx-choices"><legend>今回の走りについて、気持ちや考えることの面で疲れを感じましたか？</legend><div class="mx-choice-grid">'+radio+'</div></fieldset>'+
 '<button type="button" class="mx-clear" data-mental-clear="'+scope+'">回答を選択しない</button>'+
 '<details class="mx-extra" '+(d.freeText||d.declaredPhase!=='UNSPECIFIED'||d.timeBasis!=='UNKNOWN'?'open':'')+'><summary>時点や自分の言葉も残す（任意）</summary><div class="mx-extra-grid"><label>いつのこと？<select data-mental-phase="'+scope+'">'+options(MENTAL_PHASES,d.declaredPhase)+'</select></label><label>この申告は？<select data-mental-basis="'+scope+'">'+options(MENTAL_BASIS,d.timeBasis)+'</select></label></div><label class="mx-note">自分の言葉で補足する（500字以内）<textarea data-mental-text="'+scope+'" maxlength="500" rows="3" placeholder="未入力でも構いません">'+esc(d.freeText)+'</textarea></label></details>'+
 '<p class="mx-limit">本人が感じた経験の任意記録です。ROF-Jとは別で、心理尺度・診断ではありません。未選択なら回答は保存されません。</p></div></details>';
}
export function validateMentalDraft(d){
 if(!d||typeof d!=='object'||Array.isArray(d))return {ok:false,reason:'任意回答の形式を確認してください'};
 if(d.answer===null||d.answer===undefined||d.answer==='')return {ok:true,selected:false};
 if(!has(MENTAL_CHOICES,d.answer)||!has(MENTAL_PHASES,d.declaredPhase)||!has(MENTAL_BASIS,d.timeBasis)||typeof d.freeText!=='string'||d.freeText.length>500)
  return {ok:false,reason:'任意回答の内容を確認してください'};
 return {ok:true,selected:true};
}
/** Generate once AFTER a successful original commit. Reuse the returned object for retries. */
export function makeMentalAppendRequest(ref,d,{now=()=>new Date().toISOString(),uuid=()=>globalThis.crypto?.randomUUID?.()}={}){
 const checked=validateMentalDraft(d);if(!checked.ok)return checked;
 if(!checked.selected)return {ok:true,request:null};
 const id1=uuid(),id2=uuid(),enteredAt=now();
 if(!/^[0-9a-f-]{36}$/i.test(id1||'')||!/^[0-9a-f-]{36}$/i.test(id2||'')||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(enteredAt))
  return {ok:false,reason:'保存操作の識別子または時刻を取得できません'};
 return {ok:true,request:{recordRef:ref,fieldKey:'mentalExperience',operation:'ADD',
   payload:{answer:d.answer,...(d.freeText?{freeText:d.freeText}:{})},expectedHeadEventId:null,expectedRevision:0,
   clientRequestId:'mental_req_'+id1,eventId:'mental_evt_'+id2,declaredPhase:d.declaredPhase,
   timeBasis:d.timeBasis,assessedAt:d.timeBasis==='AT_ENTRY'?enteredAt:null,enteredAt}};
}
export function mentalResultHtml(read,{pending=false,reason=''}={}){
 const status=read?.ok?read.value?.status:'READ_ERROR';
 let body='';
 if(status==='ACTIVE'){
  const e=read.value.latest;
  const v=e.payload||{};
  body='<p class="mx-result-value">'+esc(MENTAL_CHOICES[v.answer]||'未確認')+' <small>本人の任意申告</small></p>'+
   '<details class="mx-result-details"><summary>申告時点と記録内容</summary><p>対象時点：'+esc(MENTAL_PHASES[e.declaredPhase]||'不明')+'／申告の区分：'+esc(MENTAL_BASIS[e.timeBasis]||'不明')+'</p><p>入力操作時刻：'+esc(e.enteredAt)+'</p>'+
   (v.freeText?'<p class="mx-result-note">'+esc(v.freeText)+'</p>':'')+'<p>時刻・内容は本人の申告です。測定された状態や因果関係を示しません。</p></details>';
 }else if(status==='RETRACTED')body='<p>以前の申告は取り消されました。</p>';
 else if(status==='NO_ANSWER')body='<p>この項目の申告はありません。</p>';
 else if(status==='ORPHANED')body='<p role="alert">元の走行記録を確認できず、回答を表示できません。</p>';
 else body='<p role="alert">任意回答を確認できません。保存状況を確認してください。</p>';
 if(pending)body+='<div class="mx-retry" role="status"><p>走行記録は保存できましたが、任意の回答は保存を確認できていません。'+esc(reason)+' この記録への回答だけ再試行できます。</p><button type="button" data-mental-retry>任意の回答だけ再試行</button></div>';
 return body;
}
