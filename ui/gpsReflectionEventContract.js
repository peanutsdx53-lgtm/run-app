/**
 * G4-B0: pure, non-persistent GPS V2 voluntary-reflection event contract.
 * No IndexedDB, localStorage, GPS sources, page state, export, or consent mutations.
 * Future storage code MUST recheck the exact GPS parent in its commit transaction
 * and use a compare-and-swap revision before appending events.
 * All revisions are metadata ONLY; current private text must be kept in a distinct
 * mutable row and physically erased in the same commit on DELETE.
 * This module alone does NOT authorize adding a GPS note UI.
 */
import {normalizeRecordRef} from './recordRef.js';
import {inspectGpsReflectionDraft} from './gpsReflectionPreflight.js';

export const GPS_REFLECTION_EVENT_SCHEMA=1;
export const GPS_REFLECTION_MAX_EVENTS=10000;
// CREATE/EDIT revision ceiling. A final DELETE may use one extra revision.
export const GPS_REFLECTION_MAX_REVISIONS=1000;
const EVENT=/^gps-refevent-[a-z0-9-]{8,64}$/;
const NOTE=/^gps-refnote-[a-z0-9-]{8,64}$/;
const REQUEST=/^gps-refrequest-[a-z0-9-]{8,64}$/;
const ACTIONS=new Set(['CREATE','EDIT','DELETE']);
// History stores metadata only. Prior user text MUST NOT be copied into revisions.
const keys=['action','eventId','noteId','predecessorEventId','recordRef','requestId','revision','savedAt','schemaVersion'];
const fail=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
const exactKeys=(data,expected)=>data&&typeof data==='object'&&!Array.isArray(data)&&
 Object.keys(data).length===expected.length&&expected.every(key=>Object.hasOwn(data,key));
const validDate=x=>typeof x==='string'&&x.length===24&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const sameRef=(a,b)=>a.sourceType===b.sourceType&&a.recordId===b.recordId;

/** Validate an immutable event before it is admitted to any persistent store. */
export function validateGpsReflectionEvent(event){
 if(!exactKeys(event,keys))return fail('BAD_EVENT','記述履歴の項目構成が不正です');
 const ref=normalizeRecordRef(event.recordRef);
 if(!ref.ok||ref.value.sourceType!=='GPS_V2')return fail('SOURCE_MISMATCH','GPS V2に関連づく記述だけを扱います');
 if(event.schemaVersion!==GPS_REFLECTION_EVENT_SCHEMA||
    typeof event.eventId!=='string'||!EVENT.test(event.eventId)||
    typeof event.noteId!=='string'||!NOTE.test(event.noteId)||
    typeof event.requestId!=='string'||!REQUEST.test(event.requestId)||
    !ACTIONS.has(event.action)||
    !Number.isSafeInteger(event.revision)||event.revision<1||
    event.revision>GPS_REFLECTION_MAX_REVISIONS+(event.action==='DELETE'?1:0)||
    !validDate(event.savedAt))return fail('BAD_EVENT','記述履歴のID・版・日時が不正です');
 if(event.action==='CREATE'){
  if(event.revision!==1||event.predecessorEventId!==null)return fail('BAD_EVENT','新規作成は改訂1から開始します');
 }else if(typeof event.predecessorEventId!=='string'||!EVENT.test(event.predecessorEventId)||event.revision===1)
  return fail('BAD_EVENT','修正・削除には直前イベントが必要です');
 return ok(Object.freeze({...event,recordRef:ref.value}));
}

/**
 * Validate ephemeral current-note content independently of the history events.
 * A future writer MUST retain only the current text in a separate mutable row,
 * erase it atomically on DELETE, and never leak it into historical metadata.
 */
export function inspectGpsReflectionContent(input){
 if(!exactKeys(input,['recordRef','noteId','text'])||typeof input.noteId!=='string'||!NOTE.test(input.noteId))
  return fail('BAD_CONTENT','自由記述の指定が不正です');
 const checked=inspectGpsReflectionDraft({recordRef:input.recordRef,text:input.text});
 if(!checked.ok)return checked;
 return ok(Object.freeze({noteId:input.noteId,...checked.value}));
}

/** Validate a complete, explicitly ordered stream; never repair/migrate or silently sort. */
export function inspectGpsReflectionThread(recordRef,noteId,events){
 const ref=normalizeRecordRef(recordRef);
 if(!ref.ok||ref.value.sourceType!=='GPS_V2')return fail('SOURCE_MISMATCH','GPS V2記録を指定してください');
 if(typeof noteId!=='string'||!NOTE.test(noteId))return fail('BAD_NOTE_ID','自由記述IDが不正です');
 if(!Array.isArray(events)||events.length>GPS_REFLECTION_MAX_EVENTS)return fail('BAD_THREAD','改訂履歴を検証できません');
 const ids=new Set(),requests=new Set();let last=null,deleted=false,firstAt=null;
 for(const [i,event] of events.entries()){
  const v=validateGpsReflectionEvent(event);
  if(!v.ok)return v;
  if(event.noteId!==noteId||!sameRef(event.recordRef,ref.value))return fail('SOURCE_MISMATCH','別記録の改訂履歴が混入しています');
  if(ids.has(event.eventId)||requests.has(event.requestId))return fail('DUPLICATE_EVENT','操作IDが重複しています');
  if(event.revision!==i+1||event.predecessorEventId!==(last?.eventId??null))
   return fail('BROKEN_CHAIN','改訂番号または前のイベントとの関係が不正です');
  if(i===0&&event.action!=='CREATE'||i>0&&event.action==='CREATE'||deleted)
   return fail('BROKEN_CHAIN','作成・修正・削除の順序が不正です');
  if(last&&event.savedAt<last.savedAt)return fail('BROKEN_CHAIN','保存日時が逆順です');
  ids.add(event.eventId);requests.add(event.requestId);
  if(event.action==='DELETE')deleted=true;
  if(i===0)firstAt=event.savedAt;
  last=event;
 }
 return ok(Object.freeze({recordRef:ref.value,noteId,revision:last?.revision??0,
  latestEventId:last?.eventId??null,
  status:!last?'ABSENT':deleted?'DELETED':'ACTIVE',createdAt:firstAt,
  updatedAt:last?.savedAt??null}));
}

/** Compare-and-swap planning only. Must re-evaluate under an IDB write transaction. */
export function inspectGpsReflectionChange(thread,request={}){
 if(thread?.ok!==true||!thread.value)return fail('BAD_THREAD','改訂履歴が未検証です');
 if(!request||typeof request!=='object'||Array.isArray(request))
  return fail('BAD_CHANGE','変更の指定が不正です');
 const {expectedRevision,expectedLastEventId,action}=request;
 const {revision,latestEventId,status}=thread.value;
 if(!Number.isSafeInteger(revision)||revision<0||
    revision>GPS_REFLECTION_MAX_REVISIONS+(status==='DELETED'?1:0)||
    !['ABSENT','ACTIVE','DELETED'].includes(status)||
    (revision===0)!==(status==='ABSENT')||
    (revision===0?latestEventId!==null:typeof latestEventId!=='string'||!EVENT.test(latestEventId)))
  return fail('BAD_THREAD','改訂履歴の状態が不正です');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==revision||
   expectedLastEventId!==latestEventId)return fail('HEAD_CONFLICT','別の操作で自由記述が変更されました');
 if(action==='CREATE'&&status==='ABSENT'||action==='EDIT'&&status==='ACTIVE'||
    action==='DELETE'&&status==='ACTIVE'){
  if(revision===GPS_REFLECTION_MAX_REVISIONS&&action!=='DELETE')
   return fail('REVISION_LIMIT','改訂回数の安全上限に達しています');
  return ok(Object.freeze({nextRevision:revision+1,predecessorEventId:latestEventId}));
 }
 return fail('BAD_TRANSITION','削除済みの自由記述の誤復活や二重作成はできません');
}
