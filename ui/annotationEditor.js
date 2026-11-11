/** M5 — optional post-hoc field editor, always separate from original measurements. */
import {normalizeRecordRef,resolveRecord,encodeTypedRecordQuery} from './recordRef.js';
import {openAnnotationStore,appendAnnotation,findAnnotationByRequestId} from './annotationStore.js';
import {readEffectiveAnnotation} from './annotationReadModel.js';
import {validateAnnotationPayload,digestAnnotationInput} from './annotationSchema.js';
import {EDIT_FIELDS,SURFACES,MENTAL,GRADE,SURFACE_MODE,FORMAT,esc,parsePostHocPayload,originalFieldValue,postHocValue,makePostHocRequest} from './annotationEditorCore.js';
const err=(code,reason)=>({ok:false,code,reason});
export function parseEditorLink(hash){
 if(typeof hash!=='string'||!hash.startsWith('#/annotation?'))return err('BAD_REF','後日補完のリンク形式が正しくありません');
 const raw=hash.slice('#/annotation?'.length);
 if(/%(?![0-9A-F]{2})/i.test(raw)||raw.includes('#'))return err('BAD_REF','リンクの文字列が不正です');
 const q=new URLSearchParams(raw);
 if([...q.keys()].some(key=>!['record','source'].includes(key))||q.getAll('source').length!==1||q.getAll('record').length!==1)return err('BAD_REF','記録の指定を1件に限定してください');
 const source={manual:'MANUAL','gps-v2':'GPS_V2'}[q.get('source')];
 return normalizeRecordRef({sourceType:source,recordId:q.get('record')});
}
const opts=(items,sel)=>Object.entries(items).map(([k,v])=>`<option value="${esc(k)}" ${k===sel?'selected':''}>${esc(v)}</option>`).join('');
const field=(name,label,type='text',value='',extra='')=>`<label class="ax-field"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const selector=(name,label,items,current)=>`<label class="ax-field"><span>${esc(label)}</span><select name="${name}" data-ax-mode="${name}">${opts(items,current)}</select></label>`;
const textField=(name,label,max,value='')=>`<label class="ax-field"><span>${esc(label)}</span><textarea name="${name}" maxlength="${max}" rows="3">${esc(value)}</textarea></label>`;
const NUM=(name,label,val='',max='100',min='0')=>field(name,label,'number',val,`inputmode="decimal" min="${min}" max="${max}" step="any"`);
function editForm(fieldKey,d={}){
 const x=k=>d[k]??'';
 if(fieldKey==='mentalExperience')return '<label class="ax-field"><span>今回の走りを思い出して、気持ち・考える面の疲れを感じましたか？</span><select name="answer" required><option value="" '+(!x('answer')?'selected':'')+'>選択してください（自動選択なし）</option>'+opts(MENTAL,x('answer'))+'</select></label>'+textField('freeText','補足（任意・500字以内）',500,x('freeText'))+'<p>この3択は心理尺度・診断ではありません。</p>';
 if(['bodyObservation','shoeName','memo','environmentNote','courseName'].includes(fieldKey))return textField('text','本人の言葉による追記',fieldKey==='shoeName'||fieldKey==='courseName'?100:500,x('text'));
 if(fieldKey==='temperatureC')return NUM('celsius','気温（℃）',x('celsius'),'60','-50');
 if(fieldKey==='rofBefore'||fieldKey==='rofAfter')return field('score','ROF-J（本人の申告、0も有効）','number',x('score'),'min="0" max="10" step="1" inputmode="numeric"');
 if(fieldKey==='stepsBundle')return NUM('steps','歩数（0歩も明示回答）',x('steps'),'10000000')+selector('stepsProvenance','歩数の取得方法',{UNKNOWN:'不明',DEVICE_MEASURED:'端末・時計で計測',ESTIMATED:'本人が手入力した概数'},x('stepsProvenance')||'UNKNOWN');
 if(fieldKey==='gradeBundle'){
  const mode=x('gradeMode')||'UNKNOWN';
  if(mode==='SUMMARY')return selector('gradeMode','坂道の入力方法',GRADE,mode)+'<div class="ax-group">'+NUM('upPercent','上りの割合（%）',x('upPercent'))+NUM('downPercent','下りの割合（%）',x('downPercent'))+NUM('upGradePercent','上りの傾斜（%・任意）',x('upGradePercent'))+NUM('downGradePercent','下りの傾斜（%・任意）',x('downGradePercent'))+'</div><p>上り・下りの割合の合計は100%以下。残りは平坦として本人が申告した条件です。</p>';
  if(mode==='SECTIONS'){
   const n=Number(x('sectionCount'))||1;
   return selector('gradeMode','坂道の入力方法',GRADE,mode)+selector('sectionCount','区間数',{1:'1区間',2:'2区間',3:'3区間',4:'4区間',5:'5区間'},String(n))+Array.from({length:n},(_,i)=>'<fieldset class="ax-section"><legend>区間 '+(i+1)+'</legend>'+NUM('share'+i,'全距離に対する割合（%）',x('share'+i))+selector('direction'+i,'坂道の向き',{UNKNOWN:'不明',FLAT:'平坦',UPHILL:'上り',DOWNHILL:'下り'},x('direction'+i)||'UNKNOWN')+NUM('grade'+i,'傾斜（%・任意）',x('grade'+i))+selector('surface'+i,'路面（任意）',{UNKNOWN:'不明',...SURFACES},x('surface'+i)||'UNKNOWN')+'</fieldset>').join('')+'<p>区間の割合の合計は100%にしてください。</p>';
  }
  return selector('gradeMode','坂道の入力方法',GRADE,mode);
 }
 if(fieldKey==='surfaceBundle'){
  const mode=x('surfaceMode')||'UNKNOWN';
  if(mode==='SINGLE')return selector('surfaceMode','路面の入力方法',SURFACE_MODE,mode)+selector('primarySurface','路面を選択',SURFACES,x('primarySurface'));
  if(mode==='MIXED')return selector('surfaceMode','路面の入力方法',SURFACE_MODE,mode)+'<div class="ax-group">'+Object.entries(SURFACES).map(([k,label])=>NUM('surf_'+k,label+'の割合（%）',x('surf_'+k))).join('')+'</div><p>2種類以上の路面を選び、割合合計を100%にしてください。</p>';
  return selector('surfaceMode','路面の入力方法',SURFACE_MODE,mode);
 }
 if(fieldKey==='runWalkBundle'){
  const mode=x('runningFormat')||'UNKNOWN';
  return selector('runningFormat','走行・歩行の区分',FORMAT,mode)+(mode==='RUN_WALK'?'<div class="ax-group">'+NUM('runWalkRunningDistanceKm','走った区間の距離（km）',x('runWalkRunningDistanceKm'),'10000','0.01')+NUM('runWalkRunningDurationMinutes','走った区間の時間（分）',x('runWalkRunningDurationMinutes'),'100000','0.01')+'</div><p>元の総距離・総時間を超える区間を追加しません。科学計算への再適用は行いません。</p>':'');
 }
 return '<p role="alert">この項目の入力画面を準備できません。</p>';
}
function dataOf(form){return Object.fromEntries(new FormData(form));}
const labels=Object.fromEntries(EDIT_FIELDS);
const sourceLabel={MANUAL:'手入力',GPS_V2:'GPS計測'};
export function editorLink(ref){return '#/annotation?'+encodeTypedRecordQuery(ref)}
/** A single request is reused after an ambiguous outcome, never a new generated ID. */
export async function commitPostHocRequest(q,{openStore=openAnnotationStore,append=appendAnnotation,byRequest=findAnnotationByRequestId,read=readEffectiveAnnotation,resolveParent=resolveRecord}={}){
 const nr=normalizeRecordRef(q?.recordRef);if(!nr.ok)return nr;
 const parent=await resolveParent(nr.value);if(!parent?.ok)return err('UNREADABLE_PARENT','元の保存済み走行を再確認できません');
 const checked=q.operation==='RETRACT'?{ok:true}:validateAnnotationPayload(q.fieldKey,q.payload,{ref:nr.value,record:parent.value.record});
 if(!checked.ok)return checked;
 const store=await openStore();if(!store.ok)return store;
 const db=store.value.db;
 try{
  let written=await append(db,q,resolveParent);
  if(!written.ok){
   if(['HEAD_CONFLICT','REQUEST_CONFLICT','BAD_EVENT','BAD_VALUE','ORPHANED','NOT_FOUND'].includes(written.code))return written;
   const found=await byRequest(db,q.clientRequestId);if(!found.ok)return found;
   const value=found.value;
   if(!value)return written;
   const digest=await digestAnnotationInput(q);
   if(value.eventId!==q.eventId||value.requestDigest!==digest||value.recordRef.sourceType!==nr.value.sourceType||value.recordRef.recordId!==nr.value.recordId)return err('REQUEST_CONFLICT','同じ操作IDに異なる内容が保存されています');
  }
  const current=await read(db,nr.value,q.fieldKey,resolveParent);
  if(!current.ok)return current;
  if(current.value.latest?.eventId!==q.eventId||current.value.status!==(q.operation==='RETRACT'?'RETRACTED':'ACTIVE'))return err('HEAD_CONFLICT','別の操作が先に記録を更新しました。再読込してください');
  return {ok:true,value:current.value};
 }catch{return err('WRITE_FAILED','追記の保存を確認できません。同じ操作IDで再確認してください')}
 finally{try{db.close()}catch{}}
}
export async function inspectPostHoc(ref,fieldKey,{openStore=openAnnotationStore,read=readEffectiveAnnotation,resolveParent=resolveRecord}={}){
 const store=await openStore();if(!store.ok)return store;
 try{return await read(store.value.db,ref,fieldKey,resolveParent)}catch{return err('READ_FAILED','追記の読み取りに失敗しました')}
 finally{try{store.value.db.close()}catch{}}
}
/** No automatic fallback to a different date or the most recent record. */
export async function mountAnnotationEditor(root,hash,services={}){
 if(!root)return;
 const parsed=parseEditorLink(hash);
 const style='<link rel="stylesheet" href="./ui/annotationEditor.css?v=20261111-posthoc-design-v2">';
 if(!parsed.ok){root.innerHTML=style+'<section class="ax-page"><p role="alert">'+esc(parsed.reason)+'</p><a href="#/history">履歴へ戻る</a></section>';return;}
 const ref=parsed.value,record=await (services.resolveParent||resolveRecord)(ref);
 if(!root.isConnected)return;
 if(!record.ok){root.innerHTML=style+'<section class="ax-page"><p role="alert">'+esc(record.reason)+'</p><a href="#/history">履歴へ戻る</a></section>';return;}
 const parent=record.value.record,fields=EDIT_FIELDS.filter(([k])=>!(ref.sourceType==='MANUAL'&&['rofBefore','rofAfter'].includes(k)));
 const originalRoute=ref.sourceType==='MANUAL'?'#/result?record='+encodeURIComponent(ref.recordId):ref.sourceType==='GPS_V2'?'#/result?gps='+encodeURIComponent(ref.recordId):'#/history';
 const state={fieldKey:'',outcome:null,notice:'',error:'',busy:false,pending:null,token:0,rawDraft:{},declaredPhase:'UNSPECIFIED',timeBasis:'RECALLED'};
 const base=()=>`<div class="ax-page" data-ax-editor><header class="ax-header"><a href="#/history" class="ax-back">‹ 履歴に戻る</a><div class="ax-heading"><h1>記録に情報を追加（任意）</h1><p class="ax-intro">保存した記録に後から情報を追加できます。</p></div></header>
 <section class="ax-card ax-record"><h2>対象の記録</h2><dl><div><dt>記録種別</dt><dd>${esc(sourceLabel[ref.sourceType])}</dd></div><div><dt>日付</dt><dd>${esc(parent.date)}</dd></div><div><dt>距離と時間</dt><dd>${Number(parent.distanceKm).toFixed(2)} km${document.documentElement.lang==='en'?' · ':'／'}${Number((parent.durationSeconds??parent.activeSeconds)/60).toFixed(1)} ${document.documentElement.lang==='en'?'min':'分'}</dd></div></dl><details class="ax-record-help"><summary>記録時の情報について</summary><p>${esc(sourceLabel[ref.sourceType])}として保存済みの原本を照合済みです。GPSから疲労感、路面、坂道を推定しません。</p></details></section>
 <section class="ax-card ax-form-card"><h2>追加する項目</h2><label class="ax-field ax-field-picker"><span>項目を選ぶ</span><select data-ax-field><option value="" selected>項目を選んでください</option>${fields.map(([k,label])=>`<option value="${k}" ${state.fieldKey===k?'selected':''}>${esc(label)}</option>`).join('')}</select></label><p>本人の任意申告です。未入力のまま戻れます。</p><div data-ax-content></div></section>
 ${ref.sourceType==='MANUAL'?`<section class="ax-card ax-help"><h2>ROF-Jの訂正</h2><p>手入力ROF-Jは別の追記にコピーせず、正式な訂正履歴を利用します。</p><a href="#/result?record=${encodeURIComponent(ref.recordId)}&view=fatigue">結果の疲労感タブから訂正する</a></section>`:''}
 <footer class="ax-footer"><a href="${originalRoute}">元の記録を確認する</a><a href="#/history">保存せず履歴へ</a></footer></div>`;
 root.innerHTML=style+base();
 // Keyboard-only disclosure close must not strand focus inside a collapsed block.
 root.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented)return;
  const detail=event.target.closest('details');
  if(detail?.open){event.preventDefault();detail.open=false;detail.querySelector('summary')?.focus({preventScroll:true});}
 });

 const content=root.querySelector('[data-ax-content]');
 function statusBlock(){
  const a=state.outcome;
  if(!a)return '<p role="status">この項目の追記情報を読み込んでいます…</p>';
  if(!a.ok)return '<p role="alert">後から追加した情報を読み取れません。未回答とは異なる状態です。保存を停止しました。</p>';
  const s=a.value.status;
  if(s==='ORPHANED')return '<p role="alert">原本を確認できない追記です。別の走行へ移しません。</p>';
  if(s==='NO_ANSWER')return '<p>この項目には、まだ後日の申告がありません。</p>';
  if(s==='RETRACTED')return '<p>前の後日申告は取り消されました。過去の履歴として残っています。</p>';
  if(s==='ACTIVE'){
   const event=a.value.latest;
   const phase={BEFORE:'走る前',DURING:'走行中',AFTER:'走った後',UNSPECIFIED:'特定しない'}[event.declaredPhase]||'不明';
   const basis={RECALLED:'後から思い出して申告',AT_ENTRY:'入力時点の感覚',UNKNOWN:'不明'}[event.timeBasis]||'不明';
   return '<p>現在の後日申告：<strong>'+esc(postHocValue(state.fieldKey,event.payload))+'</strong>（元の記録には反映されません）</p><details class="ax-posthoc-meta"><summary>本人申告の時点と出所</summary><p>対象時点：'+esc(phase)+'／申告時点の扱い：'+esc(basis)+'</p><p>入力操作時刻：'+esc(event.enteredAt)+'</p><small>端末の時刻は体験の発生時刻の実測ではありません。</small></details>';
  }
  return '<p role="alert">追記の状態を確認できません。</p>';
 }
 function renderContent(){
  if(!state.fieldKey){content.innerHTML='<p class="ax-no-field" role="status">追加したい項目を選ぶと入力欄が表示されます。保存せずに戻っても元の記録は変わりません。</p>';return;}
  const a=state.outcome,editable=a?.ok&&['ACTIVE','RETRACTED','NO_ANSWER'].includes(a.value.status);
  const orig=originalFieldValue(ref,parent,state.fieldKey);
  const originalDetails=['rofBefore','rofAfter'].includes(state.fieldKey)&&ref.sourceType==='GPS_V2'?'本人の主観は元GPSの計測値ではありません。':'';
  content.innerHTML=`<div class="ax-compare"><div><small>記録時（原本の情報）</small><p>${esc(orig)}</p></div><div><small>後日申告（科学計算に未使用）</small>${statusBlock()}</div></div>
  <div class="ax-history">${a?.ok&&a.value.previous?.length?`<details><summary>過去の追記・訂正・撤回履歴 ${a.value.previous.length}件</summary><ul>${a.value.previous.map(e=>`<li>${esc(e.enteredAt)} — ${esc(({ADD:'追加',CORRECT:'訂正',RETRACT:'撤回'})[e.operation]||e.operation)}：${esc(postHocValue(state.fieldKey,e.payload))}</li>`).join('')}</ul></details>`:''}</div>
  ${editable?`<form data-ax-form novalidate><fieldset ${state.busy?'disabled':''}><legend>${esc(labels[state.fieldKey])}</legend><div class="ax-editor-fields">${editForm(state.fieldKey,state.rawDraft)}</div>${selector('declaredPhase','申告の対象時点',{UNSPECIFIED:'特定しない',BEFORE:'走る前',DURING:'走っている間',AFTER:'走った後'},state.declaredPhase)}${selector('timeBasis','申告した内容の時点',{RECALLED:'以前の経験を思い出した',AT_ENTRY:'いまの感覚を申告した',UNKNOWN:'分からない'},state.timeBasis)}<p class="ax-caution">後日申告は本人が書いた内容です。記録時の計測値・ROF-Jの正本・12部位の文献参考値・過去比較は変更しません。申告時刻は端末の操作時刻で、体験が生じた時刻を保証しません。</p><div class="ax-buttons"><button type="submit" data-ax-save ${state.busy||state.pending?'disabled':''}>${a.value.status==='ACTIVE'?'後日申告を訂正して保存':'後日申告を保存'}</button>${a.value.status==='ACTIVE'?`<button type="button" data-ax-retract ${state.busy||state.pending?'disabled':''}>以前の申告を取り消す</button>`:''}</div></fieldset></form>`:''}
  ${state.pending?'<div class="ax-retry"><p>保存が完了したか確認できません。元の記録は変更されていません。重複を避けるため、この操作の状態を再確認します。</p><button type="button" data-ax-retry>同じ操作を再確認・再試行</button></div>':''}
  <div data-ax-notice role="status" aria-live="polite">${esc(state.notice)}</div>${state.error?`<p role="alert" class="ax-error">${esc(state.error)}</p>`:''}<p class="ax-footnote">${esc(originalDetails)}</p>`;
 }
 async function refresh(){
  const token=++state.token;state.outcome=null;state.notice='';state.error='';renderContent();
  if(!state.fieldKey)return;
  const read=await inspectPostHoc(ref,state.fieldKey,services);
  if(token!==state.token||!root.isConnected)return;
  state.outcome=read;renderContent();
 }
 root.querySelector('[data-ax-field]').addEventListener('change',event=>{
  if(state.pending){event.target.value=state.fieldKey;state.error='保存不明の操作を再確認してください';renderContent();return;}
  if(event.target.value&&!fields.some(([key])=>key===event.target.value))return;
  state.fieldKey=event.target.value;state.rawDraft={};state.declaredPhase='UNSPECIFIED';state.timeBasis='RECALLED';void refresh();
 });
 content.addEventListener('change',event=>{
  if(!event.target.matches('[data-ax-mode]'))return;
  const form=content.querySelector('[data-ax-form]');if(!form)return;
  state.rawDraft=dataOf(form);
  state.declaredPhase=state.rawDraft.declaredPhase||state.declaredPhase;
  state.timeBasis=state.rawDraft.timeBasis||state.timeBasis;
  if(['gradeMode','surfaceMode','runningFormat','sectionCount'].includes(event.target.name))renderContent();
 });
 content.addEventListener('input',event=>{
  if(event.target.closest('[data-ax-form]')){
   const msg=content.querySelector('.ax-error');if(msg)msg.remove();state.error='';
  }
 });
 const save=async action=>{
  if(state.busy||state.pending||!state.outcome?.ok)return;
  const form=content.querySelector('[data-ax-form]');if(!form)return;
  const status=state.outcome.value.status,latest=state.outcome.value.latest??null;
  const data=dataOf(form);state.rawDraft=data;
  let payload=null;
  if(action!=='RETRACT'){
   const parsedPayload=parsePostHocPayload(state.fieldKey,data,parent);
   if(!parsedPayload.ok){state.error=parsedPayload.reason;renderContent();return;}
   const checked=validateAnnotationPayload(state.fieldKey,parsedPayload.payload,{ref,record:parent});
   if(!checked.ok){state.error=checked.reason;renderContent();return;}
   payload=parsedPayload.payload;
  }
  state.rawDraft=data;state.declaredPhase=data.declaredPhase||'UNSPECIFIED';state.timeBasis=data.timeBasis||'RECALLED';
  const made=makePostHocRequest(ref,state.fieldKey,action,status,payload,{latest,declaredPhase:state.declaredPhase,timeBasis:state.timeBasis});
  if(!made.ok){state.error=made.reason;renderContent();return;}
  state.pending=made.request;await tryPending();
 };
 const tryPending=async()=>{
  const req=state.pending;if(!req||state.busy)return;
  state.busy=true;state.notice='後日申告の保存と原本照合を確認しています…';state.error='';renderContent();
  let saved;try{saved=await commitPostHocRequest(req,services)}catch{saved=err('WRITE_FAILED','結果を確認できません')}
  state.busy=false;
  if(saved.ok){state.pending=null;state.rawDraft={};state.notice='この記録の'+labels[req.fieldKey]+'に、本人の後日申告を保存しました。元の記録は変更していません。';
   const result=await inspectPostHoc(ref,req.fieldKey,services);state.outcome=result;
   if(!result.ok)state.error='保存は確認しましたが、再表示の読み取りに失敗しました。';
  }else{
   state.error=saved.code==='HEAD_CONFLICT'?'他の画面でこの項目が更新された可能性があります。保存の状況を確認し、必要に応じて再読み込みしてください。':saved.code==='REQUEST_CONFLICT'?'同じ保存操作で異なる内容が見つかりました。重複を避けるため、内容を確認してください。':'保存状態を確認できません。元の記録は変更されていません。';
  }
  if(root.isConnected)renderContent();
 };
 content.addEventListener('submit',event=>{if(!event.target.matches('[data-ax-form]'))return;event.preventDefault();void save('SAVE')});
 content.addEventListener('click',event=>{
  if(event.target.closest('[data-ax-retract]')){void save('RETRACT');return}
  if(event.target.closest('[data-ax-retry]')){void tryPending();return}
 });
 await refresh();
}
