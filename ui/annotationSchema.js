/** M2: strict, versioned, non-diagnostic post-hoc annotation contract.
 * Never mutates a running record or substitutes a scientific measurement.
 * No user-facing input or export is enabled by this module.
 */
import {normalizeRecordRef} from './recordRef.js';
export const ANNOTATION_SCHEMA_VERSION=1;
export const ANNOTATION_DICTIONARY_VERSION=1;
export const ANNOTATION_MAX_EVENTS=10_000;
export const ANNOTATION_MAX_BYTES=24*1024*1024;
export const ANNOTATION_MAX_EVENT_BYTES=8192;
/** One production predicate for quota boundaries; the store checks validMeta
 * before calling this. > rather than >= admits the exact byte capacity.
 */
export function checkAnnotationCapacity(meta,eventBytes){
 if(meta.eventCount>=ANNOTATION_MAX_EVENTS||meta.totalBytes+eventBytes>ANNOTATION_MAX_BYTES)
  return {ok:false,code:'QUOTA'};
 return {ok:true};
}

const FIELDS=Object.freeze(['mentalExperience','bodyObservation','shoeName','environmentNote','memo','courseName','temperatureC','stepsBundle','gradeBundle','surfaceBundle','runWalkBundle','rofBefore','rofAfter']);
const PHASES=['BEFORE','DURING','AFTER','UNSPECIFIED'];
const TIMES=['UNKNOWN','AT_ENTRY','RECALLED'];
const OPS=['ADD','CORRECT','RETRACT'];
const SURFACES=['paved','track','treadmill','soil','trail','naturalGrass','artificialTurf','sand'];
const DIRECTIONS=['UNKNOWN','FLAT','UPHILL','DOWNHILL'];
const idPattern=/^[A-Za-z0-9_-]{8,96}$/;
const fail=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
const has=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
const strict=(v,required,optional=[])=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&required.every(x=>has(v,x))&&Object.keys(v).every(x=>required.includes(x)||optional.includes(x));
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const nonempty=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const blankOr=(v,f)=>v===null||f(v);
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString()===v;
const percent=v=>num(v,0,100);
const sum=arr=>arr.reduce((n,x)=>n+x,0);
const near100=arr=>Math.abs(sum(arr)-100)<=0.01;
const keysExactly=(p,required,optional=[])=>strict(p,required,optional);
export const ANNOTATION_FIELDS=FIELDS;
export const recordKeyOf=ref=>ref.sourceType+':'+ref.recordId;
export const streamKeyOf=(ref,fieldKey)=>recordKeyOf(ref)+'|'+fieldKey+'|primary';
export const annotationUtf8Bytes=text=>new TextEncoder().encode(text).length;

/** All choices are author's implementation labels, not a validated psychological scale. */
export function validateAnnotationPayload(field,payload,{ref,record}={}){
 if(!FIELDS.includes(field))return fail('BAD_FIELD','未定義の追記項目です');
 if(['rofBefore','rofAfter'].includes(field)&&ref?.sourceType==='MANUAL')
  return fail('BAD_FIELD','手入力ROF-Jは既存の正規訂正APIを使用してください');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return fail('BAD_VALUE','回答の形式が正しくありません');
 const fieldText={bodyObservation:500,shoeName:100,environmentNote:500,memo:500,courseName:100};
 if(has(fieldText,field))
  return keysExactly(payload,['text'])&&nonempty(payload.text,fieldText[field])?ok(payload):fail('BAD_VALUE','文章の長さまたは形式が正しくありません');
 if(field==='mentalExperience')
  return keysExactly(payload,['answer'],['freeText'])&&['FELT','NOT_FELT','UNSURE'].includes(payload.answer)&&
   (!has(payload,'freeText')||(typeof payload.freeText==='string'&&payload.freeText.length<=500))?
   ok(payload):fail('BAD_VALUE','本人申告の選択値が正しくありません');
 if(field==='temperatureC')
  return keysExactly(payload,['celsius'])&&num(payload.celsius,-50,60)?ok(payload):fail('BAD_VALUE','気温の値または単位が正しくありません');
 if(field==='rofBefore'||field==='rofAfter')
  return keysExactly(payload,['score'])&&int(payload.score,0,10)?ok(payload):fail('BAD_VALUE','ROF-Jは0〜10の整数です');
 if(field==='stepsBundle')
  return keysExactly(payload,['steps','stepsProvenance'])&&int(payload.steps,0,10000000)&&
   ['UNKNOWN','DEVICE_MEASURED','ESTIMATED'].includes(payload.stepsProvenance)?
   ok(payload):fail('BAD_VALUE','歩数と申告した取得方法を一緒に確認してください');
 if(field==='gradeBundle'){
  const mode=payload.gradeMode;
  if(mode==='FLAT'||mode==='UNKNOWN')return keysExactly(payload,['gradeMode'])?ok(payload):fail('BAD_VALUE','坂道の項目が矛盾しています');
  if(mode==='SUMMARY')return keysExactly(payload,['gradeMode','upPercent','downPercent'],['upGradePercent','downGradePercent'])&&
   percent(payload.upPercent)&&percent(payload.downPercent)&&payload.upPercent+payload.downPercent<=100.001&&
   (!has(payload,'upGradePercent')||percent(payload.upGradePercent))&&(!has(payload,'downGradePercent')||percent(payload.downGradePercent))?
   ok(payload):fail('BAD_VALUE','坂道の割合を一組で確認してください');
  if(mode==='SECTIONS'){
   if(!keysExactly(payload,['gradeMode','sections'])||!Array.isArray(payload.sections)||payload.sections.length<1||payload.sections.length>5)
    return fail('BAD_VALUE','坂道区間の数が正しくありません');
   const rows=payload.sections;
   if(!rows.every(s=>keysExactly(s,['sharePercent','direction'],['gradePercent','surface'])&&
    percent(s.sharePercent)&&DIRECTIONS.includes(s.direction)&&
    (!has(s,'gradePercent')||percent(s.gradePercent))&&
    (!has(s,'surface')||['UNKNOWN',...SURFACES].includes(s.surface)))||!near100(rows.map(s=>s.sharePercent)))
    return fail('BAD_VALUE','坂道区間の割合・向き・路面の一組が不正です');
   return ok(payload);
  }
  return fail('BAD_VALUE','坂道の指定が正しくありません');
 }
 if(field==='surfaceBundle'){
  if(payload.surfaceMode==='UNKNOWN')return keysExactly(payload,['surfaceMode'])?ok(payload):fail('BAD_VALUE','路面情報が矛盾しています');
  if(payload.surfaceMode==='SINGLE')return keysExactly(payload,['surfaceMode','primarySurface'])&&SURFACES.includes(payload.primarySurface)?ok(payload):fail('BAD_VALUE','単一路面の指定が正しくありません');
  if(payload.surfaceMode==='MIXED'){
   if(!keysExactly(payload,['surfaceMode','shares'])||!payload.shares||typeof payload.shares!=='object'||Array.isArray(payload.shares))
    return fail('BAD_VALUE','複数路面の指定が正しくありません');
   const keys=Object.keys(payload.shares),values=Object.values(payload.shares);
   return keys.length>=2&&keys.every(k=>SURFACES.includes(k))&&values.every(v=>num(v,0,100))&&
    values.filter(v=>v>0).length>=2&&near100(values)?ok(payload):fail('BAD_VALUE','路面割合は2種類以上かつ合計100%にしてください');
  }
  return fail('BAD_VALUE','路面設定の種類が正しくありません');
 }
 if(field==='runWalkBundle'){
  const mode=payload.runningFormat;
  if(['UNKNOWN','CONTINUOUS_RUN'].includes(mode))return keysExactly(payload,['runningFormat'])?ok(payload):fail('BAD_VALUE','走り方の指定が矛盾しています');
  if(mode!=='RUN_WALK'||!keysExactly(payload,['runningFormat','runWalkRunningDistanceKm','runWalkRunningDurationMinutes']))
   return fail('BAD_VALUE','走歩混在の記録が不完全です');
  if(ref&&ref.sourceType!=='MANUAL')return fail('BAD_VALUE','GPSの走歩混在は手入力の距離・時間として追記できません');
  const d=payload.runWalkRunningDistanceKm,t=payload.runWalkRunningDurationMinutes;
  const totalDist=record?.distanceKm,totalTime=record?.durationSeconds??record?.activeSeconds;
  return num(d,0.01,10000)&&num(t,0.01,100000)&&
    (record===undefined||num(totalDist,0.01,10000)&&num(totalTime,1,6000000)&&d<totalDist-1e-9&&t*60<totalTime-1e-6)?
   ok(payload):fail('BAD_VALUE','走った区間は元の総距離・総時間より短くしてください');
 }
 return fail('BAD_FIELD','追記項目の検証が存在しません');
}

export function validateAppendRequest(request,{record}={}){
 if(!strict(request,['recordRef','fieldKey','operation','payload','expectedHeadEventId','expectedRevision','clientRequestId','eventId','declaredPhase','timeBasis','assessedAt','enteredAt']))
  return fail('BAD_EVENT','追記操作のキーに不足または余分があります');
 const nr=normalizeRecordRef(request.recordRef);if(!nr.ok)return nr;
 if(!FIELDS.includes(request.fieldKey))return fail('BAD_FIELD','未知の項目に追記できません');
 if(['rofBefore','rofAfter'].includes(request.fieldKey)&&nr.value.sourceType==='MANUAL')
  return fail('BAD_FIELD','手入力ROF-Jの変更は正規訂正APIのみです');
 if(!OPS.includes(request.operation)||!int(request.expectedRevision,0,ANNOTATION_MAX_EVENTS)||
  !(request.expectedHeadEventId===null||idPattern.test(request.expectedHeadEventId))||
  !idPattern.test(request.eventId)||!idPattern.test(request.clientRequestId)||
  !PHASES.includes(request.declaredPhase)||!TIMES.includes(request.timeBasis)||!iso(request.enteredAt)||
  !(request.assessedAt===null||iso(request.assessedAt)))
  return fail('BAD_EVENT','操作・版・時点・識別子が不正です');
 if(request.timeBasis==='UNKNOWN'&&request.assessedAt!==null||
    request.timeBasis==='AT_ENTRY'&&request.assessedAt!==request.enteredAt||
    request.timeBasis==='RECALLED'&&request.assessedAt!==null)
  return fail('BAD_EVENT','想起時刻を測定日時として確定できません');
 if(request.operation==='RETRACT')return request.payload===null?ok(nr.value):fail('BAD_VALUE','撤回に回答値は保存できません');
 return validateAnnotationPayload(request.fieldKey,request.payload,{ref:nr.value,record}).ok?
  ok(nr.value):validateAnnotationPayload(request.fieldKey,request.payload,{ref:nr.value,record});
}

const digestFields=['recordRef','fieldKey','threadId','operation','predecessorEventId','payload','declaredPhase','timeBasis','assessedAt','enteredAt','dictionaryVersion'];
export function stableJSONStringify(value){
 const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
 return JSON.stringify(canon(value));
}
export async function digestAnnotationInput(request){
 const source={recordRef:request.recordRef,fieldKey:request.fieldKey,threadId:'primary',operation:request.operation,
  predecessorEventId:request.expectedHeadEventId,payload:request.payload,declaredPhase:request.declaredPhase,
  timeBasis:request.timeBasis,assessedAt:request.assessedAt,enteredAt:request.enteredAt,dictionaryVersion:ANNOTATION_DICTIONARY_VERSION};
 const record=Object.fromEntries(digestFields.map(k=>[k,source[k]]));
 if(typeof globalThis.crypto?.subtle?.digest!=='function')throw Error('cryptographic digest unavailable');
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableJSONStringify(record)));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function validateAnnotationEvent(event,{record}={}){
 const attrs=['schemaVersion','eventId','clientRequestId','requestDigest','recordRef','recordKey','streamKey','fieldKey','threadId','operation','predecessorEventId','sequence','payload','declaredPhase','timeBasis','assessedAt','enteredAt','savedAt','dictionaryVersion'];
 if(!strict(event,attrs)||event.schemaVersion!==1||event.dictionaryVersion!==1||event.threadId!=='primary'||
  !int(event.sequence,1,ANNOTATION_MAX_EVENTS)||!iso(event.savedAt)||!(/^[0-9a-f]{64}$/.test(event.requestDigest)))
  return fail('BAD_EVENT','保存イベント形式または版が不正です');
 const req={recordRef:event.recordRef,fieldKey:event.fieldKey,operation:event.operation,payload:event.payload,
  expectedHeadEventId:event.predecessorEventId,expectedRevision:event.sequence-1,clientRequestId:event.clientRequestId,
  eventId:event.eventId,declaredPhase:event.declaredPhase,timeBasis:event.timeBasis,assessedAt:event.assessedAt,enteredAt:event.enteredAt};
 const valid=validateAppendRequest(req,{record});if(!valid.ok)return valid;
 if(recordKeyOf(valid.value)!==event.recordKey||streamKeyOf(valid.value,event.fieldKey)!==event.streamKey)
  return fail('BAD_EVENT','記録の参照先と保存先が一致しません');
 if(annotationUtf8Bytes(JSON.stringify(event))>ANNOTATION_MAX_EVENT_BYTES)return fail('BAD_EVENT','イベントが長すぎます');
 return ok(event);
}
export const validAnnotationId=id=>typeof id==='string'&&idPattern.test(id);
export const validAnnotationIso=iso;
